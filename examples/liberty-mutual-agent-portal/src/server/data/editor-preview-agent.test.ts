import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Page } from "@sitecore-content-sdk/nextjs";
import { editorPreviewAgent } from "./editor-preview-agent";
import { getEditorBootstrap } from "./portal";

const native = JSON.parse(
  readFileSync(
    new URL(
      "../../../../../authoring/items/liberty-mutual-public/portal-relevance-contract.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
function preview(datasource: string): Page {
  return {
    mode: { isEditing: false, isPreview: true, isDesignLibrary: false },
    layout: {
      sitecore: {
        route: {
          itemId: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
          name: "Home",
          placeholders: {
            "headless-agency-priorities": [
              {
                componentName: "AgencyPriorities",
                uid: native.instances.homePriorities,
                dataSource: datasource,
              },
            ],
          },
        },
      },
    },
  } as unknown as Page;
}

test("only the signed native Home preview and selected recommendation datasource align the operational shell", () => {
  const principal = preview(native.datasources.principal.id);
  const producer = preview(native.datasources.producer.id);
  const before = structuredClone(producer);
  assert.equal(editorPreviewAgent(principal, true), "avery");
  assert.equal(editorPreviewAgent(producer, true), "daniel");
  assert.deepEqual(producer, before);
  assert.equal(editorPreviewAgent(producer, false), undefined);
  assert.equal(
    editorPreviewAgent(preview(native.datasources.neutral.id), true),
    undefined,
  );
  assert.equal(
    editorPreviewAgent(preview("00000000-0000-0000-0000-000000000000"), true),
    undefined,
  );
});

test("normal delivery, other items, and unselected native experiences cannot select an editor persona", () => {
  const normal = preview(native.datasources.producer.id);
  normal.mode.isPreview = false;
  assert.equal(editorPreviewAgent(normal, true), undefined);
  const library = preview(native.datasources.producer.id);
  library.mode.isDesignLibrary = true;
  assert.equal(editorPreviewAgent(library, true), undefined);
  const resource = preview(native.datasources.producer.id);
  resource.layout.sitecore.route!.itemId =
    "00000000-0000-0000-0000-000000000000";
  assert.equal(editorPreviewAgent(resource, true), undefined);
  const unselected = preview(native.datasources.neutral.id);
  const component =
    unselected.layout.sitecore.route!.placeholders[
      "headless-agency-priorities"
    ][0];
  Object.assign(component, {
    experiences: {
      ignored: {
        componentName: "AgencyPriorities",
        dataSource: native.datasources.producer.id,
      },
    },
  });
  assert.equal(editorPreviewAgent(unselected, true), undefined);
  const anotherInstance = preview(native.datasources.producer.id);
  anotherInstance.layout.sitecore.route!.placeholders[
    "headless-agency-priorities"
  ][0].uid = "00000000-0000-0000-0000-000000000000";
  assert.equal(editorPreviewAgent(anotherInstance, true), undefined);
});

test("both operational preview contexts stay identity-free and read-only while keeping the correct licenses", () => {
  const avery = getEditorBootstrap("avery");
  const daniel = getEditorBootstrap("daniel");
  assert.equal(avery.agent.id, "avery");
  assert.equal(daniel.agent.id, "daniel");
  assert.equal(avery.agent.licensedStates.includes("FL"), true);
  assert.equal(daniel.agent.licensedStates.includes("FL"), false);
  for (const data of [avery, daniel]) {
    assert.equal(data.session.runId, "editor");
    assert.equal(data.session.profileId, "");
    assert.equal(data.udlIdentity, null);
  }
});
