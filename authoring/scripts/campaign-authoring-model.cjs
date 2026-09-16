"use strict";
/** Shared, deterministic CMS contract. No network access and no authoring writes. */
const {
  uuidV5: uid,
  brace,
  appendId,
  norm,
} = require("./resource-page-authoring-model.cjs");
const SITE = "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal";
const TP = "/sitecore/templates/Project/LibertyMutual";
const RP = "/sitecore/layout/Renderings/Project/LibertyMutual";
const LP = "/sitecore/layout/Layouts/Project/LibertyMutual";
const PP = "/sitecore/layout/Placeholder Settings/Project/LibertyMutual";
const SP = SITE + "/Presentation/Placeholder Settings";
const BRANCH = SITE + "/Presentation/Page Branches/Campaign page";
const GROWTH = SITE + "/Home/growth";
const PAGE = GROWTH + "/small-business";
const PRACTICE = GROWTH + "/campaign-practice";
const CREATED = "20260916T160000Z";
const IDS = {
  templateRoot: "94b480f8-5b0a-4487-99bb-238569489481",
  renderingRoot: "705f29fc-a5de-489e-9e2e-2dac8e03d084",
  placeholderRoot: "e26a2d36-9ee9-49df-bb07-0073d8e20ccc",
  layoutRoot: "306e6bad-84d3-56c5-8f41-5ee83728dfb3",
  sitePlaceholderRoot: "e601261f-f47f-4831-b91e-ef70efab3276",
  branchRoot: "303950e1-bb10-4155-b993-9435c33f9aeb",
  variantRoot: "19a63bdd-f9c6-403b-8068-c1884e9bb413",
  availableRoot: "2bcfce89-293c-4ddb-870a-78bce4777859",
  growth: "1cd6ea9d-6b78-5caa-aadd-53f9f0d61bea",
  portalPage: "d8e5d742-1ae3-5b2e-aba9-553d4a53c3fc",
  parameters: "785ffd8a-b31d-51fa-9f9f-5f3475dd6eed",
  device: "fe5d7fdf-89c0-4d99-9aa3-b5fbd009c9f3",
  workflow: "b4f49b23-4bba-4c79-ba22-f89f5f0d4e4f",
  draft: "57cc7dce-e6b1-4564-9581-0e5850b8bdf2",
  approved: "f7fe5bdd-a991-4a58-9735-cd08f9b097ab",
  datasourceWorkflow: "a053ed9f-4099-4682-9411-2b4c98e481e4",
  datasourceDraft: "12ffac4c-565f-4c9a-b63e-7f77e96b4d1f",
  datasourceApproved: "4460e76c-87e9-4859-9de6-de122774937f",
};
const F = {
  base: "12c33f3f-86c5-43a5-aeb4-5598cec45116",
  standard: "f7d48a55-2158-4f02-9356-756654404f73",
  sort: "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e",
  icon: "06d5295c-ed2f-4a54-9bf2-26228d113318",
  layout: "f1a1fe9e-a60c-4ddb-a3a0-bb5b29fe732e",
  workflow: "a4f985d9-98b3-4b52-aaaf-4344f6e747c6",
  defaultWorkflow: "ca9b9f52-4fb0-4f87-a79f-24dea62cda65",
  state: "3e431de1-525e-47a3-b6b0-1ccbec3a8c98",
  masters: "1172f251-dad4-4efb-a329-0c63500e4f1e",
  display: "b5e02ad9-d56f-4c41-a065-a133db87bdeb",
  created: "25bed78c-4957-4165-998a-ca1b52f67497",
  title: "d3bed2bd-a5f0-49ab-b7a5-6b72b0f34e4b",
  navigation: "4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8",
};
const COMPONENTS = {
  CampaignHero: [
    ["eyebrow", "Eyebrow", "Single-Line Text"],
    ["title", "Title", "Single-Line Text"],
    ["summary", "Summary", "Multi-Line Text"],
    ["icon", "Icon", "Single-Line Text"],
  ],
  CampaignAlert: [
    ["title", "Title", "Single-Line Text"],
    ["body", "Body", "Rich Text"],
    ["startsAt", "Visible from (UTC)", "Datetime"],
    ["endsAt", "Visible until (UTC)", "Datetime"],
  ],
  CampaignCallout: [
    ["eyebrow", "Eyebrow", "Single-Line Text"],
    ["title", "Title", "Single-Line Text"],
    ["body", "Body", "Rich Text"],
    ["actionLink", "Action link", "General Link"],
  ],
  CampaignAccordion: [
    ["title", "Question", "Single-Line Text"],
    ["body", "Answer", "Rich Text"],
  ],
  CampaignLinkList: [
    ["title", "Title", "Single-Line Text"],
    ["icon", "Icon", "Single-Line Text"],
    ["link1", "First link", "General Link"],
    ["link2", "Second link", "General Link"],
    ["link3", "Third link", "General Link"],
  ],
  CampaignContact: [
    ["title", "Title", "Single-Line Text"],
    ["summary", "Summary", "Multi-Line Text"],
    ["buttonLabel", "Button label", "Single-Line Text"],
  ],
};
const PLACEHOLDERS = {
  "headless-campaign-page": ["CampaignPage"],
  "headless-campaign-hero": ["CampaignHero"],
  "headless-campaign-main": [
    "CampaignAlert",
    "CampaignCallout",
    "CampaignAccordion",
  ],
  "headless-campaign-sidebar": ["CampaignLinkList", "CampaignContact"],
};
const instances = [
  { component: "CampaignHero", name: "Campaign introduction", region: "hero" },
  { component: "CampaignAlert", name: "Preparation update", region: "main" },
  {
    component: "CampaignCallout",
    name: "Growth opportunity",
    region: "main",
    anchor: "growth-opportunity",
  },
  {
    component: "CampaignAccordion",
    name: "Start the conversation",
    region: "main",
    anchor: "growth-questions",
  },
  {
    component: "CampaignAccordion",
    name: "Prepare for review",
    region: "main",
  },
  {
    component: "CampaignLinkList",
    name: "Useful resources",
    region: "sidebar",
  },
  {
    component: "CampaignContact",
    name: "Your next step",
    region: "sidebar",
    anchor: "growth-contact",
  },
];
const link = (text, url) =>
  '<link text="' +
  text +
  '" linktype="external" url="' +
  url.replace(/&/g, "&amp;") +
  '" />';
const CONTENT = {
  "Campaign introduction": {
    eyebrow: "Agency growth",
    title: "Build your next chapter in small business",
    summary:
      "Bring your team, your client knowledge and a clear preparation plan together for your next small-business conversation.",
    icon: "growth",
  },
  "Preparation update": {
    title: "Make the next conversation count",
    body: "<p><strong>Start with the risk state.</strong> Start in Products &amp; appetite and choose the account’s risk state to keep preparation resources relevant. Bring questions about the business to your Liberty Mutual relationship team.</p>",
    startsAt: "",
    endsAt: "",
  },
  "Growth opportunity": {
    eyebrow: "A practical growth path",
    title: "Turn local knowledge into a stronger submission",
    body: "<p>Your knowledge of a client’s business is the starting point. Build a useful first conversation around three steps:</p><ol><li><strong>Understand the operation.</strong> Capture the work, locations and changes that shape the account.</li><li><strong>Prepare the essentials.</strong> Organize the risk information and supporting documents before review.</li><li><strong>Agree the next step.</strong> Bring open questions to your relationship team and keep the client conversation moving.</li></ol>",
    actionLink: link(
      "Prepare a BOP submission",
      "/resources/build-a-bop-submission",
    ),
  },
  "Start the conversation": {
    title: "Where should my team begin?",
    body: "<p>Start with an account your team understands. Discuss the operation, risk locations and business changes, then use the small-business growth guide to plan the next conversation. Product availability and eligibility remain subject to the account and risk state.</p>",
  },
  "Prepare for review": {
    title: "What should we prepare before asking for a review?",
    body: "<p>Bring the business description, location details, relevant experience and any outstanding questions together. Use the preparation checklist as a starting point, and confirm account-specific requirements with your Liberty Mutual relationship team.</p>",
  },
  "Useful resources": {
    title: "Keep useful guidance close",
    icon: "book",
    link1: link(
      "Develop your small-business practice",
      "/resources/expand-small-business-practice",
    ),
    link2: link(
      "Explore small-business products",
      "/products/small-commercial",
    ),
    link3: link(
      "Browse preparation resources",
      "/resources?line=small-commercial",
    ),
  },
  "Your next step": {
    title: "Make a plan with your relationship team",
    summary:
      "Bring an account question or a development goal to your Liberty Mutual relationship contact.",
    buttonLabel: "Plan a conversation",
  },
};
function field(id, name, value) {
  return { ID: id, Hint: name, Value: String(value) };
}
function record(
  path,
  parent,
  template,
  shared = [],
  values = [],
  languageFields = [],
) {
  return {
    ID: uid(path),
    Parent: parent,
    Template: template,
    Path: path,
    ...(shared.length ? { SharedFields: shared } : {}),
    Languages: [
      {
        Language: "en",
        ...(languageFields.length ? { Fields: languageFields } : {}),
        Versions: [
          {
            Version: 1,
            Fields: [field(F.created, "__Created", CREATED), ...values],
          },
        ],
      },
    ],
  };
}
function layout(path) {
  const root =
    '<r><d id="' +
    brace(IDS.device) +
    '" l="' +
    brace(uid(LP + "/CampaignLayout")) +
    '">';
  let xml =
    root +
    '<r uid="' +
    brace(uid(path + "/rendering/CampaignPage")) +
    '" id="' +
    brace(uid(RP + "/CampaignPage")) +
    '" ph="headless-campaign-page" par="DynamicPlaceholderId=1" />';
  instances.forEach((i, n) => {
    const params =
      "DynamicPlaceholderId=" +
      (n + 2) +
      (i.anchor ? "&amp;RenderingIdentifier=" + i.anchor : "");
    xml +=
      '<r uid="' +
      brace(uid(path + "/rendering/" + i.name)) +
      '" id="' +
      brace(uid(RP + "/" + i.component)) +
      '" ph="/headless-campaign-page/headless-campaign-' +
      i.region +
      '-1" ds="page:/Data/' +
      i.name +
      '" par="' +
      params +
      '" />';
  });
  return xml + "</d></r>";
}
function modelRecords() {
  const result = [];
  for (const [name, defs] of Object.entries({
    CampaignPage: [],
    CampaignDataFolder: [],
    ...COMPONENTS,
  })) {
    const path = TP + "/" + name,
      base =
        name === "CampaignPage"
          ? IDS.portalPage
          : name === "CampaignDataFolder"
            ? "1c82e550-ebcd-4e5d-8abd-d50d0809541e"
            : "1930bbeb-7805-471a-a3be-4858ac7cf696";
    result.push(
      record(path, IDS.templateRoot, "ab86861a-6030-46c5-b394-e8f99e8b87db", [
        field(F.base, "__Base template", brace(base)),
        field(
          F.standard,
          "__Standard values",
          brace(uid(path + "/__Standard Values")),
        ),
        field(F.icon, "__Icon", "Office/32x32/document_text.png"),
      ]),
    );
    if (defs.length) {
      const section = path + "/Content";
      result.push(
        record(section, uid(path), "e269fbb5-3750-427a-9149-7aa950b49301"),
      );
      defs.forEach(([key, label, type], n) => {
        const f = record(
          section + "/" + key,
          uid(section),
          "455a3e98-a627-4b40-8035-e683a0331ac7",
          [
            field("ab162cc0-dc80-4abf-8871-998ee5d7ba32", "Type", type),
            field(F.sort, "__Sortorder", (n + 1) * 100),
            ...(type === "Rich Text"
              ? [
                  field(
                    "1eb8ae32-e190-44a6-968d-ed904c794ebf",
                    "Source",
                    "query:$xaRichTextProfile",
                  ),
                ]
              : []),
          ],
          [],
          [
            field("19a69332-a23e-4e70-8d16-b2640cb24cc8", "Title", label),
            field(F.display, "__Display name", label),
            field(
              "9541e67d-ce8c-4225-803d-33f7f29f09ef",
              "__Short description",
              key === "startsAt" || key === "endsAt"
                ? "Controls the published alert’s visibility only. This is not scheduled publishing or unpublishing. Use UTC; leave empty for no boundary."
                : key === "icon"
                  ? "Use growth, briefcase, shield or book."
                  : "Editable campaign content; never include private client or agency data.",
            ),
          ],
        );
        f.ID = uid("field/" + name + "/" + key);
        result.push(f);
      });
    }
    const defaults =
      name === "CampaignDataFolder"
        ? [
            field(
              F.masters,
              "__Masters",
              Object.keys(COMPONENTS)
                .map((c) => brace(uid(TP + "/" + c)))
                .join("|"),
            ),
          ]
        : [
            field(
              F.defaultWorkflow,
              "__Default workflow",
              brace(
                name === "CampaignPage" ? IDS.workflow : IDS.datasourceWorkflow,
              ),
            ),
          ];
    if (name === "CampaignPage")
      defaults.push(
        field(F.masters, "__Masters", brace(uid(TP + "/CampaignDataFolder"))),
        field(
          F.layout,
          "__Renderings",
          '<r><d id="' +
            brace(IDS.device) +
            '" l="' +
            brace(uid(LP + "/CampaignLayout")) +
            '" /></r>',
        ),
      );
    result.push(
      record(path + "/__Standard Values", uid(path), uid(path), defaults),
    );
  }
  for (const name of ["CampaignPage", ...Object.keys(COMPONENTS)]) {
    const shared = [
      field("037fe404-dd19-4bf7-8e30-4dadf68b27b0", "componentName", name),
      field(
        "a77e8568-1ab3-44f1-a664-b7c37ec7810d",
        "Parameters Template",
        brace(IDS.parameters),
      ),
      field(F.icon, "__Icon", "Office/32x32/document_text.png"),
    ];
    if (name === "CampaignPage")
      shared.push(
        field(
          "e829c217-5e94-4306-9c48-2634b094fdc2",
          "OtherProperties",
          "IsRenderingsWithDynamicPlaceholders=true",
        ),
        field(
          "069a8361-b1cd-437c-8c32-a3be78941446",
          "Placeholders",
          Object.keys(PLACEHOLDERS)
            .slice(1)
            .map((k) => brace(uid(PP + "/" + k)))
            .join("|"),
        ),
      );
    else
      shared.push(
        field(
          "1a7c85e5-dc0b-490d-9187-bb1dbcb4c72f",
          "Datasource Template",
          TP + "/" + name,
        ),
        field(
          "b5b27af1-25ef-405c-87ce-369b3a004016",
          "Datasource Location",
          "query:./Data",
        ),
      );
    result.push(
      record(
        RP + "/" + name,
        IDS.renderingRoot,
        "04646a89-996f-4ee7-878a-ffdbf1f0ef0d",
        shared,
        [
          field(
            "1b58d065-fe74-43e3-ba20-54c9588b3011",
            "AllowedOnTemplates",
            brace(uid(TP + "/CampaignPage")),
          ),
        ],
      ),
    );
  }
  for (const [key, components] of Object.entries(PLACEHOLDERS))
    for (const [root, parent, template] of [
      [PP, IDS.placeholderRoot, "5c547d4e-7111-4995-95b0-6b561751bf2e"],
      [SP, IDS.sitePlaceholderRoot, "d2a6884c-04d5-4089-a64e-d27ca9d68d4c"],
    ])
      result.push(
        record(root + "/" + key, parent, template, [
          field(
            "7256bdab-1fd2-49dd-b205-cb4873d2917c",
            "Placeholder Key",
            key + (key === "headless-campaign-page" ? "" : "-{*}"),
          ),
          field(
            "e391b526-d0c5-439d-803e-17512eae6222",
            "Allowed Controls",
            components.map((c) => brace(uid(RP + "/" + c))).join("|"),
          ),
        ]),
      );
  result.push(
    record(
      LP + "/CampaignLayout",
      IDS.layoutRoot,
      "e4e11508-04a4-4b0b-a263-5201f811c9cd",
      [
        field(
          "a036b2bc-ba04-44f6-a75f-bae6cd242abf",
          "Path",
          "/Views/SXA JSS/SXA JSS Layout.cshtml",
        ),
        field(
          "80334869-86dc-4472-aa89-44cf1b2f6c9b",
          "Placeholders",
          brace(uid(PP + "/headless-campaign-page")),
        ),
      ],
    ),
  );
  return result;
}
function branchRecords() {
  const proto = BRANCH + "/$name";
  return [
    record(BRANCH, IDS.branchRoot, "35e75c72-4985-4e09-88c3-0eac6cd1e64f"),
    record(
      proto,
      uid(BRANCH),
      uid(TP + "/CampaignPage"),
      [
        field(F.layout, "__Renderings", layout(proto)),
        field(F.workflow, "__Workflow", brace(IDS.workflow)),
      ],
      [
        field(F.title, "Title", "$name"),
        field(F.navigation, "NavigationTitle", "$name"),
        field(F.state, "__Workflow state", brace(IDS.draft)),
      ],
    ),
    record(proto + "/Data", uid(proto), uid(TP + "/CampaignDataFolder")),
    ...instances.map((i) =>
      record(
        proto + "/Data/" + i.name,
        uid(proto + "/Data"),
        uid(TP + "/" + i.component),
        [field(F.workflow, "__Workflow", brace(IDS.datasourceWorkflow))],
        [
          ...COMPONENTS[i.component].map(([key]) =>
            field(uid("field/" + i.component + "/" + key), key, ""),
          ),
          field(F.state, "__Workflow state", brace(IDS.datasourceDraft)),
        ],
      ),
    ),
  ];
}
function rule() {
  return (
    '<rule uid="' +
    brace(uid(BRANCH + "/rule")) +
    '" name="Campaign page beneath Agency growth"><conditions><condition id="{4F5389E9-79B7-4FE1-A43A-EEA4ECD19C94}" uid="' +
    brace(uid(BRANCH + "/condition")) +
    '" operatorid="{066602E2-ED1D-44C2-A698-7ED27FD3A2CC}" value="' +
    brace(IDS.growth) +
    '" /></conditions><actions><action id="{D46EC8E5-7B46-47DE-B44A-4C5C30EF48D1}" uid="' +
    brace(uid(BRANCH + "/action")) +
    '" PageBranchId="' +
    brace(uid(BRANCH)) +
    '" /></actions></rule>'
  );
}
module.exports = {
  SITE,
  TP,
  RP,
  LP,
  PP,
  SP,
  BRANCH,
  GROWTH,
  PAGE,
  PRACTICE,
  IDS,
  F,
  COMPONENTS,
  PLACEHOLDERS,
  instances,
  CONTENT,
  CREATED,
  uid,
  brace,
  norm,
  appendId,
  field,
  record,
  layout,
  modelRecords,
  branchRecords,
  rule,
};
if (require.main === module)
  process.stdout.write(
    JSON.stringify(
      {
        ...module.exports,
        model: modelRecords(),
        branch: branchRecords(),
        branchRule: rule(),
      },
      null,
      2,
    ),
  );
