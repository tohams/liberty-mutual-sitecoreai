import assert from "node:assert/strict";
import test from "node:test";
import manifest from "../../../fixtures/manifest.json";
import { workshopAttendees, workshopUsernamesForPack } from "./attendees";

test("attendee assignments cover each supported reviewer number exactly once with minimal fields", () => {
  assert.deepEqual(
    workshopAttendees.map((attendee) => attendee.reviewerPack),
    manifest.reviewerPacks,
  );
  for (const attendee of workshopAttendees) {
    assert.deepEqual(Object.keys(attendee).sort(), [
      "displayName",
      "reviewerPack",
    ]);
    if (attendee.displayName !== null) {
      assert.ok(attendee.displayName.trim());
      assert.ok(
        !attendee.displayName.includes("@"),
        "contact details do not belong in the display roster",
      );
    }
  }
  assert.equal(workshopAttendees[0].displayName, "Workshop presenters");
  assert.deepEqual(
    workshopAttendees
      .filter((attendee) => attendee.displayName === null)
      .map((attendee) => attendee.reviewerPack),
    ["12", "13", "14", "15"],
  );
});

test("each reviewer receives the seven actual enabled persona usernames for only that pack", () => {
  for (const pack of manifest.reviewerPacks) {
    const usernames = workshopUsernamesForPack(pack);
    assert.equal(usernames.length, 7);
    assert.equal(new Set(usernames).size, 7);
    assert.ok(usernames.every((username) => username.endsWith(`.${pack}`)));
    assert.deepEqual(
      usernames.map((username) => username.split(".")[0]).sort(),
      ["avery", "daniel", "elena", "jordan", "marcus", "maya", "priya"],
    );
  }
  assert.deepEqual(workshopUsernamesForPack("16"), []);
  assert.deepEqual(workshopUsernamesForPack(""), []);
});
