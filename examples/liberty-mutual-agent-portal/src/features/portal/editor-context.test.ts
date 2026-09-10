import test from "node:test";
import assert from "node:assert/strict";
import { getEditorBootstrap } from "../../server/data/portal";
import { createReadonlyEditorContext } from "./portal-editor-state";

test("Design Library has a context without identity or an operational write path", async () => {
  const snapshot = getEditorBootstrap();
  const context = createReadonlyEditorContext(snapshot);
  const before = structuredClone(snapshot);
  assert.equal(context.busy, true);
  assert.equal(context.data.udlIdentity, null);
  assert.equal(context.data.session.profileId, "");
  assert.equal(
    await context.act({ type: "toggle-favorite", resourceId: "any-resource" }),
    null,
  );
  assert.equal(context.notify("An editor message"), undefined);
  assert.deepEqual(snapshot, before);
});

test("Design Library rejects an operational run or a tracking identity", () => {
  const snapshot = getEditorBootstrap();
  assert.throws(
    () =>
      createReadonlyEditorContext({
        ...snapshot,
        session: { ...snapshot.session, runId: "active-agent-run" },
      }),
    /isolated editor snapshot/,
  );
  assert.throws(
    () =>
      createReadonlyEditorContext({
        ...snapshot,
        udlIdentity: { provider: "liberty-mutual-agent", id: "active-agent" },
      }),
    /isolated editor snapshot/,
  );
});
