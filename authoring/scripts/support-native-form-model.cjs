"use strict";
/** The native Form rendering is owned by Sitecore. Only our layout/slots are serialized. */
const {
  uid,
  brace,
  field,
  record,
  SITE,
  LP,
  PP,
  SP,
  IDS,
} = require("./campaign-authoring-model.cjs");
const KEY = "headless-support-form";
const SUPPORT = SITE + "/Home/support";
const FORM = "62dd1639-9f28-4040-8738-c886480b2127";
const SUPPORT_ID = "312b0e22-ce78-5810-b4c3-150766789153";
const LAYOUT = LP + "/SupportLayout";
const ORIGINAL_LAYOUT = "3d40b9c9-8126-5ff8-81e1-a48afb1ba1a8";
const AVAILABLE = SITE + "/Presentation/Available Renderings/Forms";
const GUIDANCE_PLACEHOLDER = "427c0c0a-38cb-5c1b-aa2d-34b20594a9aa";
const FORM_UID = uid(SUPPORT + "/rendering/Contact your team");
function modelRecords() {
  return [
    record(LAYOUT, IDS.layoutRoot, "e4e11508-04a4-4b0b-a263-5201f811c9cd", [
      field(
        "a036b2bc-ba04-44f6-a75f-bae6cd242abf",
        "Path",
        "/Views/SXA JSS/SXA JSS Layout.cshtml",
      ),
      field(
        "80334869-86dc-4472-aa89-44cf1b2f6c9b",
        "Placeholders",
        [GUIDANCE_PLACEHOLDER, uid(PP + "/" + KEY)].map(brace).join("|"),
      ),
    ]),
    ...[
      [PP, IDS.placeholderRoot, "5c547d4e-7111-4995-95b0-6b561751bf2e"],
      [SP, IDS.sitePlaceholderRoot, "d2a6884c-04d5-4089-a64e-d27ca9d68d4c"],
    ].map(([root, parent, template]) =>
      record(root + "/" + KEY, parent, template, [
        field("7256bdab-1fd2-49dd-b205-cb4873d2917c", "Placeholder Key", KEY),
        field(
          "e391b526-d0c5-439d-803e-17512eae6222",
          "Allowed Controls",
          brace(FORM),
        ),
      ]),
    ),
  ];
}
module.exports = {
  KEY,
  SUPPORT,
  SUPPORT_ID,
  FORM,
  FORM_UID,
  LAYOUT,
  ORIGINAL_LAYOUT,
  AVAILABLE,
  GUIDANCE_PLACEHOLDER,
  SITE,
  LP,
  PP,
  SP,
  IDS,
  uid,
  brace,
  modelRecords,
};
if (require.main === module)
  process.stdout.write(
    JSON.stringify({ ...module.exports, model: modelRecords() }, null, 2),
  );
