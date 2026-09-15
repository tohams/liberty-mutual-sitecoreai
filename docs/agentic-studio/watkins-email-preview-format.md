# Readable HTML email artifacts

The Watkins example uses native **Content Item** artifacts for its email previews. In this tenant, the earlier **Code** artifacts displayed source and offered no rendered Preview. Keeping HTML in a content field is therefore insufficient by itself: the saved artifact must use the content-item presentation contract.

The September 15 native export uses this structure:

```json
{
  "title": "A unique email preview title",
  "subject": "The message subject",
  "preheader": "A short inbox preview",
  "content": "<!doctype html><html>...</html>",
  "htmlTemplate": "{{{content}}}",
  "presentation": {
    "mode": "rendered_html",
    "rawHtmlField": "content"
  }
}
```

`content` contains the complete reviewed HTML email. The native artifact type is `content_item`. Its viewer exposes **Content**, **JSON**, **HTML** and **Preview**. **Preview** renders the email; **HTML** is available when a developer wants to inspect the source. This is the observed contract in this tenant, not a promise that every artifact type or future product version uses the same fields.

Each email has a unique title containing **email preview**, so reviewers can distinguish the finished message from earlier generated source and research history. The current artifact identifiers and actual Preview checks belong in the [execution record](watkins-native-evidence.md).

The email HTML uses a readable body size, short paragraphs, a responsive email container, contrasting button labels and a working official resource URL. It contains no executable script, form submission, tracking pixel, fake calendar or recipient-address collection. Account research and editorial evidence live in a separate artifact rather than in the email body.

No global HTML template was published for this example. Each email content item carries its own small rendering template. Editorial review and delivery through an approved sending platform remain separate from saving or previewing an artifact.
