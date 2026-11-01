import assert from "node:assert/strict";
import test from "node:test";
import contract from "../../../../../authoring/items/liberty-mutual-public/public-contract.json";
import model from "../../data/public-metadata-model.json";
import { MetadataError, normalizeMetadataId } from "./metadata-contract";
import {
  createPublicMetadataService,
  publicAnswerReferences,
} from "./public-metadata-service";

const guid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pageId = guid(1),
  answerId = guid(2),
  otherId = guid(3),
  renderingUid = guid(4);
const layout = (datasource = answerId) =>
  `<r><d id="${guid(5)}"><r uid="${renderingUid}" id="${model.answerRenderingId}" ds="{${datasource}}" /></d></r>`;
type NativeField = { fieldId: string; name: string; value: string };
function fixture() {
  let generated = 1000;
  const native = (
    id: string,
    path: string,
    template: string,
    kind: "page" | "answer",
  ) => {
    const field = (name: string, value: string): NativeField => ({
      fieldId: guid(generated++),
      name,
      value,
    });
    return {
      id,
      path,
      template,
      version: 2,
      canEdit: true,
      canSave: true,
      fields: [
        ...model.fields[kind].map((definition) => ({
          fieldId: definition.fieldId,
          name: definition.name,
          value:
            definition.name === "state"
              ? "All"
              : definition.name === "product"
                ? "auto-home"
                : "consumer",
        })),
        field(
          kind === "page" ? "metadataTitle" : "question",
          kind === "page"
            ? "Review insurance choices"
            : "Can I bundle auto and home?",
        ),
        field("answer", "Existing approved wording must remain unchanged."),
        field("sourceLink", "Existing authoritative source"),
        field("__Renderings", kind === "page" ? layout() : ""),
        field("__Final Renderings", ""),
        field("__Workflow", model.workflowId),
        field("__Workflow state", model.draftStateId),
        field("__Revision", guid(generated++)),
        field("__Shared revision", guid(generated++)),
        field("__Lock", ""),
        field("__Created", "20261101T000000Z"),
      ],
    };
  };
  const page = native(
    pageId,
    model.pageRoot + "/insurance-resources/bundle",
    model.pageTemplateId,
    "page",
  );
  const answer = native(
    answerId,
    model.answerRoot + "/Bundle",
    model.answerTemplateId,
    "answer",
  );
  const context = {
    siteInfo: { name: model.siteName as string },
    pageInfo: {
      id: pageId,
      path: page.path,
      language: "en",
      version: 2,
      template: { id: model.pageTemplateId as string },
      permissions: { canWrite: true, canWriteLanguage: true },
      locking: { isLocked: false, lockedByCurrentUser: false },
    },
  };
  const definitions = [...model.fields.page, ...model.fields.answer];
  const folders = model.fields.page.map((definition, index) => ({
    itemId: guid(20 + index),
    path: definition.sourcePath,
    parent: { itemId: model.taxonomyRootId },
    template: { templateId: model.folderTemplateId },
    revision: { value: guid(30 + index) },
    children: {
      pageInfo: { hasNextPage: false },
      nodes: (definition.name === "state"
        ? ["All", "FL", "TX"]
        : definition.name === "product"
          ? ["auto-home", "auto"]
          : ["consumer", "customer"]
      ).map((name, n) => ({
        itemId: guid(50 + index * 10 + n),
        name,
        path: definition.sourcePath + "/" + name,
        parent: { itemId: guid(20 + index) },
        template: { templateId: model.optionTemplateId },
        revision: { value: guid(90 + n) },
        display: { value: "Managed " + name },
        description: {
          fieldId: model.descriptionFieldId,
          name: "description",
          value: "A managed description",
        },
      })),
    },
  }));
  const state = {
    context,
    page,
    answer,
    folders,
    updates: [] as Array<Record<string, unknown>>,
    throwAfterWrite: false,
    corruptAfterWrite: false,
    fieldShared: "",
    fieldUnversioned: "",
    fieldType: "Single-Line Text",
  };
  const get = (item: typeof page, name: string) =>
    item.fields.find((field) => field.name === name)!.value;
  const set = (item: typeof page, name: string, value: string) => {
    item.fields.find((field) => field.name === name)!.value = value;
  };
  const service = createPublicMetadataService({
    getContext: async () => structuredClone(state.context),
    query: async (document, variables) => {
      if (document.startsWith("query PublicMetadataOptions")) {
        const where = variables.where as { path: string },
          definition = definitions.find(
            (field) => field.fieldId === variables.fieldId,
          )!;
        return {
          fieldDefinition: {
            itemId: definition.fieldId,
            name: definition.name,
            path: definition.definitionPath,
            template: { templateId: "455a3e98-a627-4b40-8035-e683a0331ac7" },
            type: { value: state.fieldType },
            shared: { value: state.fieldShared },
            unversioned: { value: state.fieldUnversioned },
          },
          item: structuredClone(
            state.folders.find((folder) => folder.path === where.path),
          ),
        };
      }
      if (document.startsWith("query PublicMetadataItem")) {
        const where = variables.where as {
          itemId: string;
          version?: number;
          existingVersionOnly: boolean;
        };
        assert.equal(where.existingVersionOnly, true);
        const item = sameId(where.itemId, pageId)
          ? state.page
          : sameId(where.itemId, answerId)
            ? state.answer
            : null;
        if (!item) return { item: null };
        if (where.version) assert.equal(where.version, item.version);
        return {
          item: {
            itemId: item.id,
            name: item.path.split("/").at(-1),
            path: item.path,
            version: item.version,
            template: { templateId: item.template },
            revision: { value: get(item, "__Revision") },
            sharedRevision: { value: get(item, "__Shared revision") },
            workflow: {
              canEdit: item.canEdit,
              canSave: item.canSave,
              workflow: { workflowId: model.workflowId },
              workflowState: {
                stateId: get(item, "__Workflow state"),
                final: !sameId(
                  get(item, "__Workflow state"),
                  model.draftStateId,
                ),
              },
            },
            fields: {
              nodes: structuredClone(item.fields),
              pageInfo: { hasNextPage: false },
            },
          },
        };
      }
      assert(document.startsWith("mutation SavePublicMetadata"));
      const input = variables.input as {
        itemId: string;
        version: number;
        fields: Array<{ name: string; value: string }>;
      };
      const item = sameId(input.itemId, pageId) ? state.page : state.answer;
      assert.equal(input.version, item.version);
      state.updates.push(structuredClone(input));
      for (const update of input.fields)
        item.fields.find((field) => sameId(field.fieldId, update.name))!.value =
          update.value;
      set(item, "__Revision", guid(generated++));
      if (state.corruptAfterWrite)
        set(item, "answer", "Unexpected unrelated write");
      if (state.throwAfterWrite) throw new Error("Private transport error");
      return { updateItem: { item: { itemId: item.id } } };
    },
  });
  return { state, service, get, set };
}
const sameId = (a: string, b: string) =>
  normalizeMetadataId(a) === normalizeMetadataId(b);
const errorCode = (code: string) => (error: unknown) =>
  error instanceof MetadataError && error.code === code;

test("public metadata model matches the native public content contracts", () => {
  assert.equal(model.sitePath, contract.sitePath);
  assert.equal(model.pageTemplateId, contract.templateIds.PublicPage);
  assert.equal(
    model.answerTemplateId,
    contract.templateIds.PublicApprovedAnswer,
  );
  assert.equal(
    model.answerRenderingId,
    contract.renderingIds.PublicApprovedAnswer,
  );
  for (const [kind, template] of [
    ["page", "PublicPage"],
    ["answer", "PublicApprovedAnswer"],
  ] as const)
    for (const definition of model.fields[kind]) {
      assert.equal(
        definition.fieldId,
        contract.fieldIds[
          `${template}.${definition.name}` as keyof typeof contract.fieldIds
        ],
      );
      assert(definition.sourcePath.startsWith(model.taxonomyRoot + "/"));
    }
});

test("shared and final presentation resolve actual default sources by rendering identity", () => {
  assert.deepEqual(publicAnswerReferences(layout(), ""), [
    normalizeMetadataId(answerId),
  ]);
  assert.deepEqual(
    publicAnswerReferences(
      layout(),
      `<r><d><r uid="${renderingUid}" s:ds="${otherId}" /></d></r>`,
    ),
    [normalizeMetadataId(otherId)],
  );
  assert.deepEqual(
    publicAnswerReferences(
      layout(),
      `<r><d><r uid="${renderingUid}" p:delete="true" /></d></r>`,
    ),
    [],
  );
  assert.deepEqual(
    publicAnswerReferences(
      `<r><d><r uid="${renderingUid}" id="${guid(99)}" ds="${answerId}" /></d></r>`,
      "",
    ),
    [],
  );
});

test("a page opens on its own metadata; shared answer edits require explicit selection", async () => {
  const f = fixture(),
    page = await f.service.load();
  assert.equal(page.target?.kind, "page");
  assert.deepEqual(
    page.targets?.map((target) => target.kind),
    ["page", "answer"],
  );
  assert.equal(f.state.updates.length, 0);
  const answer = await f.service.load(answerId);
  assert.equal(answer.target?.kind, "answer");
  assert.equal(answer.context.itemId, normalizeMetadataId(pageId));
  assert.equal(answer.target?.itemId, normalizeMetadataId(answerId));
  const result = await f.service.save(answer, {
    ...answer.values,
    state: "FL",
  });
  assert.deepEqual(result.changedFields, ["state"]);
  assert.equal(f.state.updates.length, 1);
  assert.equal(f.state.updates[0].itemId, normalizeMetadataId(answerId));
  assert.deepEqual(f.state.updates[0].fields, [
    {
      name: model.fields.answer.find((field) => field.name === "state")!
        .fieldId,
      value: "FL",
    },
  ]);
  assert.equal(f.get(f.state.page, "state"), "All");
  assert.equal(
    f.get(f.state.answer, "answer"),
    "Existing approved wording must remain unchanged.",
  );
});

test("page metadata writes use only that page's fields and version", async () => {
  const f = fixture(),
    snapshot = await f.service.load();
  const saved = await f.service.save(snapshot, {
    ...snapshot.values,
    state: "TX",
  });
  assert.equal(saved.snapshot.target?.kind, "page");
  assert.equal(f.get(f.state.answer, "state"), "All");
  assert.equal(
    (await f.service.save(saved.snapshot, saved.snapshot.values)).changedFields
      .length,
    0,
  );
  assert.equal(f.state.updates.length, 1);
});

test("another target, site, template, or out-of-scope answer is rejected", async () => {
  const unreferenced = fixture();
  await assert.rejects(
    unreferenced.service.load(otherId),
    errorCode("CONTEXT"),
  );
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => {
      f.state.context.siteInfo.name = "other-site";
    },
    (f: ReturnType<typeof fixture>) => {
      f.state.context.pageInfo.path = model.sitePath + "/Data/Other";
    },
    (f: ReturnType<typeof fixture>) => {
      f.state.context.pageInfo.template.id = guid(50);
    },
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(f.service.load(), errorCode("CONTEXT"));
  }
  const outside = fixture();
  outside.state.answer.path =
    model.sitePath.replace("public-site", "agent-portal") +
    "/Data/Approved answers/Other";
  await assert.rejects(outside.service.load(answerId), errorCode("MODEL"));
});

test("native permissions, approved workflow, and answer locks are read-only", async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => {
      f.state.answer.canEdit = false;
    },
    (f: ReturnType<typeof fixture>) => {
      f.state.answer.canSave = false;
    },
    (f: ReturnType<typeof fixture>) => {
      f.set(f.state.answer, "__Workflow state", contract.workflow.approved);
    },
    (f: ReturnType<typeof fixture>) => {
      f.set(f.state.answer, "__Lock", '<r owner="another-author" />');
    },
  ]) {
    const f = fixture();
    mutate(f);
    const snapshot = await f.service.load(answerId);
    assert.equal(snapshot.editable, false);
    await assert.rejects(
      f.service.save(snapshot, { ...snapshot.values, state: "FL" }),
      errorCode("READ_ONLY"),
    );
    assert.equal(f.state.updates.length, 0);
  }
});

test("page and shared-answer permissions follow the explicitly chosen content owner", async () => {
  const f = fixture();
  f.state.context.pageInfo.permissions.canWrite = false;
  const page = await f.service.load();
  assert.equal(page.editable, false);
  const answer = await f.service.load(answerId);
  assert.equal(answer.editable, true);
  await f.service.save(answer, { ...answer.values, state: "FL" });
  assert.equal(f.get(f.state.page, "state"), "All");
  assert.equal(f.get(f.state.answer, "state"), "FL");
  f.state.answer.canSave = false;
  assert.equal((await f.service.load(answerId)).editable, false);
});

test("altering a returned form cannot bypass the private read-only baseline", async () => {
  const f = fixture();
  f.set(f.state.answer, "__Workflow state", contract.workflow.approved);
  const snapshot = await f.service.load(answerId);
  snapshot.editable = true;
  await assert.rejects(
    f.service.save(snapshot, { ...snapshot.values, state: "FL" }),
    errorCode("READ_ONLY"),
  );
  assert.equal(f.state.updates.length, 0);
});

test("page, target, unrelated fields, taxonomy, or workflow changes block stale saves", async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) =>
      f.set(f.state.page, "__Revision", guid(500)),
    (f: ReturnType<typeof fixture>) =>
      f.set(f.state.answer, "__Revision", guid(501)),
    (f: ReturnType<typeof fixture>) =>
      f.set(f.state.answer, "sourceLink", "Another editor changed the source"),
    (f: ReturnType<typeof fixture>) => {
      f.state.folders[0].children.nodes[0].display.value = "Changed label";
    },
  ]) {
    const f = fixture(),
      snapshot = await f.service.load(answerId);
    mutate(f);
    await assert.rejects(
      f.service.save(snapshot, { ...snapshot.values, state: "FL" }),
      errorCode("STALE"),
    );
    assert.equal(f.state.updates.length, 0);
  }
  const changed = fixture(),
    snapshot = await changed.service.load(answerId);
  changed.set(
    changed.state.answer,
    "__Workflow state",
    contract.workflow.awaitingApproval,
  );
  await assert.rejects(
    changed.service.save(snapshot, { ...snapshot.values, state: "FL" }),
    errorCode("READ_ONLY"),
  );
});

test("missing lists, wrong field types, or shared/unversioned fields cannot broaden edits", async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => {
      f.state.folders[0].children.nodes = [];
    },
    (f: ReturnType<typeof fixture>) => {
      f.state.fieldType = "Droplist";
    },
    (f: ReturnType<typeof fixture>) => {
      f.state.fieldShared = "1";
    },
    (f: ReturnType<typeof fixture>) => {
      f.state.fieldUnversioned = "1";
    },
  ]) {
    const f = fixture();
    mutate(f);
    await assert.rejects(f.service.load());
    assert.equal(f.state.updates.length, 0);
  }
});

test("invalid choices and canceled navigation never submit a mutation", async () => {
  const f = fixture(),
    snapshot = await f.service.load(answerId);
  await assert.rejects(
    f.service.save(snapshot, { ...snapshot.values, state: "UNKNOWN" }),
    errorCode("SELECTION"),
  );
  await assert.rejects(
    f.service.save(
      snapshot,
      { ...snapshot.values, state: "FL" },
      { isCurrent: () => false },
    ),
    errorCode("STALE"),
  );
  assert.equal(f.state.updates.length, 0);
});

test("an uncertain save requires readback and cannot be replayed from the old form", async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => {
      f.state.throwAfterWrite = true;
    },
    (f: ReturnType<typeof fixture>) => {
      f.state.corruptAfterWrite = true;
    },
  ]) {
    const f = fixture(),
      snapshot = await f.service.load(answerId);
    mutate(f);
    await assert.rejects(
      f.service.save(snapshot, { ...snapshot.values, state: "FL" }),
      errorCode("SAVE_UNCERTAIN"),
    );
    await assert.rejects(
      f.service.save(snapshot, { ...snapshot.values, state: "TX" }),
      errorCode("STALE"),
    );
    assert.equal(f.state.updates.length, 1);
  }
});
