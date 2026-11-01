import model from "../../data/public-metadata-model.json";
import {
  MetadataError,
  normalizeMetadataId,
  type MetadataContext,
  type MetadataField,
  type MetadataOption,
  type MetadataSnapshot,
  type MetadataTarget,
  type MetadataValues,
} from "./metadata-contract";
import type { MetadataTransport } from "./metadata-service";

type ObjectValue = Record<string, unknown>;
type NativeField = { fieldId: string; name: string; value: string };
type Definition = (typeof model.fields.page)[number];
type NativeItem = {
  id: string;
  path: string;
  name: string;
  version: number;
  template: string;
  fields: NativeField[];
  revision: string;
  sharedRevision: string;
  workflow: ObjectValue;
};
type PublicContext = { context: MetadataContext; blockedReason?: string };
type State = {
  page: NativeItem;
  targets: Array<{ item: NativeItem; target: MetadataTarget }>;
  selected: { item: NativeItem; target: MetadataTarget };
};
type Baseline = {
  snapshot: MetadataSnapshot;
  page: NativeItem;
  item: NativeItem;
  lists: string;
  consumed: boolean;
};

const READ = `query PublicMetadataItem($where:ItemQueryInput!,$after:String) {
  item(where:$where) { itemId name path version template { templateId }
    revision:field(name:"__Revision"){value} sharedRevision:field(name:"__Shared revision"){value}
    workflow { canEdit canSave workflow { workflowId } workflowState { stateId final } }
    fields(first:100,after:$after,excludeStandardFields:false,ownFields:false,withLanguageFallback:false) {
      nodes { fieldId name value } pageInfo { hasNextPage endCursor }
    }
  }
}`;
const OPTIONS = `query PublicMetadataOptions($where:ItemQueryInput!,$fieldId:ID!) {
  fieldDefinition:item(where:{database:"master",itemId:$fieldId,language:"en"}) {
    itemId name path template { templateId } type:field(name:"Type"){value}
    shared:field(name:"Shared"){value} unversioned:field(name:"Unversioned"){value}
  }
  item(where:$where) { itemId path parent { itemId } template { templateId }
    revision:field(name:"__Revision"){value}
    children(first:100) { nodes { itemId name path parent { itemId } template { templateId }
      display:field(name:"__Display name"){value} description:field(name:"description"){fieldId name value}
      revision:field(name:"__Revision"){value}
    } pageInfo { hasNextPage } }
  }
}`;
const UPDATE = `mutation SavePublicMetadata($input:UpdateItemInput!) { updateItem(input:$input){item{itemId}} }`;
const CHANGED_STANDARD_FIELDS = new Set([
  "__Revision",
  "__Shared revision",
  "__Updated",
  "__Updated by",
]);
const STALE =
  "The page, selected content, or managed choices changed. Refresh this panel before saving.";
const PUBLICATION_HELP =
  "Review and publish the selected content through its normal workflow. Approved-answer metadata is then synchronized automatically with public Search and the content API. Page metadata applies to this page.";
const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : {};
const text = (value: unknown) => (typeof value === "string" ? value : "");
const sameId = (a: unknown, b: unknown) =>
  !!normalizeMetadataId(a) && normalizeMetadataId(a) === normalizeMetadataId(b);
function assert(
  condition: unknown,
  code: MetadataError["code"],
  message: string,
): asserts condition {
  if (!condition) throw new MetadataError(code, message);
}
const value = (item: NativeItem, name: string) =>
  item.fields.find((field) => field.name === name)?.value ?? "";
const fingerprint = (item: NativeItem) =>
  JSON.stringify([
    item.id,
    item.path,
    item.version,
    item.revision,
    item.sharedRevision,
  ]);
const sameContext = (a: MetadataContext, b: MetadataContext) =>
  sameId(a.itemId, b.itemId) &&
  a.path === b.path &&
  a.language === b.language &&
  a.version === b.version;

export function isPublicMetadataContext(raw: unknown): boolean {
  return object(object(raw).siteInfo).name === model.siteName;
}

/** Resolve only default, explicit GUID datasources. Final-layout changes override shared-layout values by rendering UID. */
export function publicAnswerReferences(
  shared: string,
  final: string,
): string[] {
  const renderings = new Map<
    string,
    { renderingId: string; datasource: string }
  >();
  for (const xml of [shared, final]) {
    assert(
      !/<!DOCTYPE|<!ENTITY/i.test(xml),
      "MODEL",
      "The page presentation could not be verified.",
    );
    for (const tag of xml.match(/<r(?=\s)[^>]*>/g) ?? []) {
      const attributes = Object.fromEntries(
        [...tag.matchAll(/(?:\s)([\w:]+)="([^"]*)"/g)].map((match) => [
          match[1],
          match[2],
        ]),
      );
      const uid = normalizeMetadataId(attributes.uid);
      if (!uid) continue;
      if (Object.hasOwn(attributes, "p:delete")) {
        renderings.delete(uid);
        continue;
      }
      const previous = renderings.get(uid) ?? {
        renderingId: "",
        datasource: "",
      };
      renderings.set(uid, {
        renderingId:
          attributes["s:id"] ?? attributes.id ?? previous.renderingId,
        datasource: attributes["s:ds"] ?? attributes.ds ?? previous.datasource,
      });
    }
  }
  return [
    ...new Set(
      [...renderings.values()]
        .filter((rendering) =>
          sameId(rendering.renderingId, model.answerRenderingId),
        )
        .map((rendering) => normalizeMetadataId(rendering.datasource))
        .filter(Boolean),
    ),
  ];
}

export function createPublicMetadataService(transport: MetadataTransport) {
  const baselines = new WeakMap<MetadataSnapshot, Baseline>();
  let saving = false;
  async function query(document: string, variables: Record<string, unknown>) {
    try {
      return object(await transport.query(document, variables));
    } catch {
      throw new MetadataError(
        "READ_FAILED",
        "Sitecore could not be reached. Refresh the panel and try again.",
      );
    }
  }
  async function context(): Promise<PublicContext> {
    const raw = object(await transport.getContext()),
      site = object(raw.siteInfo),
      page = object(raw.pageInfo);
    const path = text(page.path),
      language = text(page.language),
      version = page.version;
    assert(
      site.name === model.siteName &&
        (path === model.pageRoot || path.startsWith(model.pageRoot + "/")) &&
        !path.includes("/../") &&
        sameId(object(page.template).id, model.pageTemplateId) &&
        normalizeMetadataId(page.id) &&
        /^[a-z]{2}(?:-[a-z0-9]{2,8})*$/i.test(language) &&
        typeof version === "number" &&
        Number.isInteger(version) &&
        version > 0,
      "CONTEXT",
      "Open a Liberty Mutual public website page in Page Builder to manage its metadata.",
    );
    const permissions = object(page.permissions),
      locking = object(page.locking);
    const blockedReason =
      permissions.canWrite !== true || permissions.canWriteLanguage !== true
        ? "Your Sitecore account does not have permission to edit this page and language."
        : locking.isLocked !== false && locking.lockedByCurrentUser !== true
          ? "The page is locked by another author, or its lock status is unavailable."
          : undefined;
    return {
      context: {
        itemId: normalizeMetadataId(page.id),
        path,
        language,
        version,
      },
      blockedReason,
    };
  }
  async function read(
    itemId: string,
    language: string,
    version?: number,
  ): Promise<NativeItem> {
    const fields: NativeField[] = [];
    let after: string | undefined,
      initial: ObjectValue | undefined,
      revision = "";
    for (let page = 0; page < 10; page++) {
      const data = await query(READ, {
        where: {
          database: "master",
          itemId,
          language,
          ...(version ? { version } : {}),
          existingVersionOnly: true,
        },
        after,
      });
      const item = object(data.item),
        connection = object(item.fields),
        info = object(connection.pageInfo);
      assert(
        sameId(item.itemId, itemId) &&
          Array.isArray(connection.nodes) &&
          typeof info.hasNextPage === "boolean",
        "MODEL",
        "The selected content could not be read completely.",
      );
      const chunk = (connection.nodes as unknown[]).map((raw): NativeField => {
        const field = object(raw);
        assert(
          normalizeMetadataId(field.fieldId) &&
            typeof field.name === "string" &&
            typeof field.value === "string",
          "MODEL",
          "A metadata field could not be verified.",
        );
        return {
          fieldId: normalizeMetadataId(field.fieldId),
          name: field.name,
          value: field.value,
        };
      });
      const nextRevision = text(object(item.revision).value);
      if (!initial) {
        initial = item;
        revision = nextRevision;
      }
      assert(
        normalizeMetadataId(nextRevision) &&
          nextRevision === revision &&
          item.version === initial.version &&
          object(item.sharedRevision).value ===
            object(initial.sharedRevision).value,
        "STALE",
        STALE,
      );
      fields.push(...chunk);
      if (!info.hasNextPage) break;
      const cursor = text(info.endCursor);
      assert(
        cursor && cursor !== after && page < 9,
        "MODEL",
        "The complete metadata fields could not be read.",
      );
      after = cursor;
    }
    assert(
      initial &&
        new Set(fields.map((field) => field.fieldId)).size === fields.length,
      "MODEL",
      "The selected metadata fields are incomplete or duplicated.",
    );
    const item: NativeItem = {
      id: normalizeMetadataId(initial.itemId),
      name: text(initial.name),
      path: text(initial.path),
      version: Number(initial.version),
      template: normalizeMetadataId(object(initial.template).templateId),
      fields,
      revision:
        fields.find((field) => field.name === "__Revision")?.value ?? "",
      sharedRevision:
        fields.find((field) => field.name === "__Shared revision")?.value ?? "",
      workflow: object(initial.workflow),
    };
    assert(
      normalizeMetadataId(item.revision) &&
        item.revision === revision &&
        normalizeMetadataId(item.sharedRevision) &&
        item.sharedRevision === object(initial.sharedRevision).value &&
        Number.isInteger(item.version) &&
        item.version > 0 &&
        (!version || item.version === version),
      "MODEL",
      "The selected content revision could not be verified.",
    );
    return item;
  }
  function target(
    item: NativeItem,
    kind: MetadataTarget["kind"],
  ): MetadataTarget {
    return {
      itemId: item.id,
      path: item.path,
      version: item.version,
      kind,
      title:
        value(item, kind === "page" ? "metadataTitle" : "question") ||
        item.name,
    };
  }
  async function state(
    selected: MetadataContext,
    selectedId?: string,
  ): Promise<State> {
    const page = await read(
      selected.itemId,
      selected.language,
      selected.version,
    );
    assert(
      page.path === selected.path &&
        sameId(page.template, model.pageTemplateId),
      "MODEL",
      "The selected page no longer matches this panel.",
    );
    const targets = [{ item: page, target: target(page, "page") }];
    const refs = publicAnswerReferences(
      value(page, "__Renderings"),
      value(page, "__Final Renderings"),
    );
    assert(
      refs.length <= 10,
      "MODEL",
      "This page has too many approved-answer sources to manage here.",
    );
    for (const id of refs) {
      const answer = await read(id, selected.language);
      assert(
        sameId(answer.template, model.answerTemplateId) &&
          answer.path.startsWith(model.answerRoot + "/") &&
          answer.path.slice(model.answerRoot.length + 1).indexOf("/") === -1,
        "MODEL",
        "An approved answer must come from the public website’s managed Approved answers library.",
      );
      targets.push({ item: answer, target: target(answer, "answer") });
    }
    const chosen = targets.find((entry) =>
      sameId(entry.item.id, selectedId || page.id),
    );
    assert(
      chosen,
      "CONTEXT",
      "Choose this page or an approved answer that it currently uses.",
    );
    return { page, targets, selected: chosen };
  }
  const definitions = (kind: MetadataTarget["kind"]) => model.fields[kind];
  function metadata(item: NativeItem, fields: Definition[]): MetadataValues {
    return Object.fromEntries(
      fields.map((definition) => {
        const field = item.fields.find((entry) =>
          sameId(entry.fieldId, definition.fieldId),
        );
        assert(
          field && field.name === definition.name,
          "MODEL",
          "The public metadata field definitions have changed.",
        );
        return [definition.name, field.value];
      }),
    );
  }
  function protectedFields(item: NativeItem, fields: Definition[]): string {
    const allowed = new Set(
      fields.map((definition) => normalizeMetadataId(definition.fieldId)),
    );
    return JSON.stringify(
      item.fields
        .filter(
          (field) =>
            !allowed.has(field.fieldId) &&
            !CHANGED_STANDARD_FIELDS.has(field.name),
        )
        .map((field) => [field.fieldId, field.name, field.value])
        .sort((a, b) => a[0].localeCompare(b[0])),
    );
  }
  function blocked(
    item: NativeItem,
    kind: MetadataTarget["kind"],
  ): string | undefined {
    const workflow = item.workflow,
      nativeWorkflow = object(workflow.workflow),
      nativeState = object(workflow.workflowState);
    assert(
      sameId(value(item, "__Workflow"), model.workflowId) &&
        sameId(nativeWorkflow.workflowId, model.workflowId) &&
        sameId(nativeState.stateId, value(item, "__Workflow state")),
      "MODEL",
      "The public editorial workflow could not be verified.",
    );
    if (
      !sameId(nativeState.stateId, model.draftStateId) ||
      nativeState.final !== false
    )
      return kind === "answer"
        ? "This approved answer is read only. Open its item in Page Builder Content, create a draft version, then return to this page and refresh the panel."
        : "Create a draft version of this page in Page Builder before editing its metadata.";
    if (workflow.canEdit !== true || workflow.canSave !== true)
      return "Your account or the current workflow does not allow this content to be edited.";
    if (
      kind === "answer" &&
      value(item, "__Lock").trim() &&
      !/^<r\s*\/\s*>$/.test(value(item, "__Lock").trim())
    )
      return "The approved answer is locked. Unlock it in Page Builder Content before editing its metadata here.";
  }
  async function taxonomy(language: string, fields: Definition[]) {
    const options: Record<string, MetadataOption[]> = {},
      fingerprints: unknown[] = [];
    for (const definition of fields) {
      const data = await query(OPTIONS, {
        where: {
          database: "master",
          path: definition.sourcePath,
          language,
          existingVersionOnly: true,
        },
        fieldId: definition.fieldId,
      });
      const field = object(data.fieldDefinition),
        folder = object(data.item),
        children = object(folder.children);
      assert(
        sameId(field.itemId, definition.fieldId) &&
          field.name === definition.name &&
          field.path === definition.definitionPath &&
          sameId(
            object(field.template).templateId,
            "455a3e98-a627-4b40-8035-e683a0331ac7",
          ) &&
          object(field.type).value === "Single-Line Text" &&
          [field.shared, field.unversioned].every(
            (entry) =>
              typeof object(entry).value === "string" &&
              ["", "0"].includes(text(object(entry).value)),
          ),
        "MODEL",
        "Public metadata must retain its versioned Single-Line Text fields for Search compatibility.",
      );
      assert(
        folder.path === definition.sourcePath &&
          sameId(object(folder.parent).itemId, model.taxonomyRootId) &&
          sameId(object(folder.template).templateId, model.folderTemplateId) &&
          normalizeMetadataId(object(folder.revision).value) &&
          Array.isArray(children.nodes) &&
          children.nodes.length > 0 &&
          object(children.pageInfo).hasNextPage === false,
        "TAXONOMY",
        "A managed public metadata list is missing, empty, or too large. Ask a content administrator to review the public website’s Data/Taxonomy folder.",
      );
      const entries = (children.nodes as unknown[]).map((raw) => {
        const option = object(raw),
          description = object(option.description),
          name = text(option.name);
        assert(
          normalizeMetadataId(option.itemId) &&
            name.trim() === name &&
            name.length > 0 &&
            !/[\/\\<>|{}]/.test(name) &&
            option.path === definition.sourcePath + "/" + name &&
            sameId(object(option.parent).itemId, folder.itemId) &&
            sameId(
              object(option.template).templateId,
              model.optionTemplateId,
            ) &&
            sameId(description.fieldId, model.descriptionFieldId) &&
            description.name === "description" &&
            typeof description.value === "string" &&
            typeof object(option.display).value === "string" &&
            normalizeMetadataId(object(option.revision).value),
          "TAXONOMY",
          "A public metadata option has an unexpected template or location.",
        );
        return {
          id: normalizeMetadataId(option.itemId),
          value: name,
          label: text(object(option.display).value) || name,
          description: description.value as string,
          revision: text(object(option.revision).value),
        };
      });
      assert(
        new Set(entries.map((entry) => entry.value)).size === entries.length &&
          new Set(entries.map((entry) => entry.id)).size === entries.length,
        "TAXONOMY",
        "A public metadata list contains duplicate values.",
      );
      options[definition.name] = entries.map(
        ({ id, value, label, description }) => ({
          id,
          value,
          label,
          description,
        }),
      );
      fingerprints.push([
        definition.fieldId,
        folder.path,
        text(object(folder.revision).value),
        entries,
      ]);
    }
    return { options, fingerprint: JSON.stringify(fingerprints) };
  }
  function remember(
    selected: PublicContext,
    source: State,
    lists: Awaited<ReturnType<typeof taxonomy>>,
  ) {
    const { item, target } = source.selected;
    const fields = definitions(target.kind),
      reason =
        (target.kind === "page" ? selected.blockedReason : undefined) ||
        blocked(item, target.kind);
    const snapshot: MetadataSnapshot = {
      context: selected.context,
      title: target.title,
      revision: item.revision,
      sharedRevision: item.sharedRevision,
      workflowId: value(item, "__Workflow"),
      workflowStateId: value(item, "__Workflow state"),
      values: metadata(item, fields),
      options: lists.options,
      editable: !reason,
      ...(reason ? { blockedReason: reason } : {}),
      target,
      targets: source.targets.map((entry) => entry.target),
      fieldDefinitions: fields.map((field) => ({
        name: field.name as MetadataField,
        label: field.label,
      })),
      publicationHelp: PUBLICATION_HELP,
    };
    baselines.set(snapshot, {
      snapshot: structuredClone(snapshot),
      page: structuredClone(source.page),
      item: structuredClone(item),
      lists: lists.fingerprint,
      consumed: false,
    });
    return snapshot;
  }
  async function load(targetId?: string): Promise<MetadataSnapshot> {
    const selected = await context(),
      source = await state(selected.context, targetId),
      lists = await taxonomy(
        selected.context.language,
        definitions(source.selected.target.kind),
      );
    const fresh = await context();
    assert(sameContext(selected.context, fresh.context), "STALE", STALE);
    return remember(fresh, source, lists);
  }
  async function save(
    snapshot: MetadataSnapshot,
    values: MetadataValues,
    options?: { isCurrent?: () => boolean },
  ) {
    const baseline = baselines.get(snapshot);
    assert(
      baseline && !baseline.consumed && !saving && baseline.snapshot.target,
      "STALE",
      "Refresh this panel before attempting another save.",
    );
    const original = baseline.snapshot;
    assert(
      original.editable,
      "READ_ONLY",
      original.blockedReason || "This content is read only.",
    );
    const fields = definitions(original.target!.kind);
    assert(
      Object.keys(values).length === fields.length &&
        fields.every((field) => typeof values[field.name] === "string"),
      "SELECTION",
      "Select one managed option for every metadata field.",
    );
    saving = true;
    try {
      const selected = await context();
      assert(sameContext(selected.context, original.context), "STALE", STALE);
      if (original.target!.kind === "page")
        assert(
          !selected.blockedReason,
          "READ_ONLY",
          selected.blockedReason || "The page cannot be edited.",
        );
      const source = await state(selected.context, original.target!.itemId),
        item = source.selected.item;
      const reason = blocked(item, source.selected.target.kind);
      assert(!reason, "READ_ONLY", reason || "This content is read only.");
      const lists = await taxonomy(selected.context.language, fields);
      assert(
        fingerprint(source.page) === fingerprint(baseline.page) &&
          fingerprint(item) === fingerprint(baseline.item) &&
          protectedFields(item, fields) ===
            protectedFields(baseline.item, fields) &&
          lists.fingerprint === baseline.lists,
        "STALE",
        STALE,
      );
      assert(
        fields.every((field) =>
          lists.options[field.name].some(
            (option) => option.value === values[field.name],
          ),
        ),
        "SELECTION",
        "Select a current managed option for every field.",
      );
      const fresh = await context();
      assert(
        sameContext(fresh.context, selected.context) &&
          (!options?.isCurrent || options.isCurrent()),
        "STALE",
        STALE,
      );
      if (original.target!.kind === "page")
        assert(
          !fresh.blockedReason,
          "READ_ONLY",
          fresh.blockedReason || "The page cannot be edited.",
        );
      const changedFields = fields
        .filter((field) => values[field.name] !== original.values[field.name])
        .map((field) => field.name);
      if (!changedFields.length)
        return { snapshot: remember(fresh, source, lists), changedFields };
      baseline.consumed = true;
      try {
        const result = await transport.query(UPDATE, {
          input: {
            database: "master",
            itemId: item.id,
            language: selected.context.language,
            version: item.version,
            fields: fields
              .filter((field) => changedFields.includes(field.name))
              .map((field) => ({
                name: field.fieldId,
                value: values[field.name],
              })),
          },
        });
        assert(
          sameId(
            object(object(object(result).updateItem).item).itemId,
            item.id,
          ),
          "SAVE_UNCERTAIN",
          "Save confirmation was incomplete.",
        );
        const verified = await read(
          item.id,
          selected.context.language,
          item.version,
        );
        assert(
          fields.every(
            (field) => value(verified, field.name) === values[field.name],
          ) &&
            protectedFields(verified, fields) ===
              protectedFields(item, fields) &&
            !blocked(verified, source.selected.target.kind),
          "SAVE_UNCERTAIN",
          "The saved metadata could not be verified.",
        );
        const verifiedSource = {
          ...source,
          selected: {
            item: verified,
            target: target(verified, source.selected.target.kind),
          },
        };
        // A page save changes the context item's own revision; preserve that new baseline.
        if (source.selected.target.kind === "page")
          verifiedSource.page = verified;
        return {
          snapshot: remember(fresh, verifiedSource, lists),
          changedFields,
        };
      } catch {
        throw new MetadataError(
          "SAVE_UNCERTAIN",
          "The save result could not be confirmed. Refresh this panel and inspect the saved values before making another change.",
        );
      }
    } finally {
      saving = false;
    }
  }
  return { load, save };
}
