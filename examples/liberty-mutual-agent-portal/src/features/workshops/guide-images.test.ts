import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { workshopGuides } from "./content";
import {
  guideCropGeometry,
  guideImageAssetUrl,
  guideStepImages,
  validImageAnnotation,
  validImageCrop,
} from "./guide-images";
import type { GuideImage, GuideImageAnnotation, GuideImageCrop } from "./types";

const image: GuideImage = {
  file: "sample.png",
  alt: "Sample controls",
  caption: "Select **Content**.",
};
const crop: GuideImageCrop = {
  x: 500,
  y: 250,
  width: 1000,
  height: 500,
  sourceWidth: 2000,
  sourceHeight: 1000,
};
const annotation: GuideImageAnnotation = {
  x: 12.5,
  y: 25,
  width: 30,
  height: 15,
  label: "Open **Content**.",
};

// Some browser captures keep a .png filename even when their encoded bytes are JPEG.
function encodedImageDimensions(buffer: Buffer) {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(pngSignature)) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8) return;
  let offset = 2;
  while (offset + 4 <= buffer.length && buffer[offset] === 0xff) {
    while (buffer[offset] === 0xff) offset++;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) return;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return;
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker) &&
      length >= 7
    ) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    offset += length;
  }
}

test("source dimensions are read from image signatures instead of filename extensions", () => {
  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(1600, 16);
  png.writeUInt32BE(900, 20);
  assert.deepEqual(encodedImageDimensions(png), { width: 1600, height: 900 });
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 7, 8, 3, 0x84, 6, 0x40,
  ]);
  assert.deepEqual(encodedImageDimensions(jpeg), { width: 1600, height: 900 });
  assert.equal(encodedImageDimensions(Buffer.alloc(24)), undefined);
});

test("ordered screenshot lists replace the legacy image while old steps remain supported", () => {
  const second = { ...image, file: "second.png" };
  assert.deepEqual(guideStepImages({ image }), [image]);
  assert.deepEqual(guideStepImages({ image, images: [second, image] }), [
    second,
    image,
  ]);
  assert.deepEqual(guideStepImages({ image, images: [] }), []);
  assert.deepEqual(guideStepImages({}), []);
});

test("crops preserve the original image geometry inside a responsive viewport", () => {
  assert.deepEqual(guideCropGeometry(crop), {
    aspectRatio: "1000 / 500",
    image: { width: "200%", height: "200%", left: "-50%", top: "-50%" },
  });
  assert.ok(validImageCrop({ ...crop, x: 0, y: 0, width: 2000, height: 1000 }));
  for (const invalid of [
    { ...crop, x: -1 },
    { ...crop, width: 0 },
    { ...crop, height: Number.NaN },
    { ...crop, x: 1001 },
    { ...crop, y: 501 },
    { ...crop, sourceWidth: Number.POSITIVE_INFINITY },
  ]) {
    assert.equal(validImageCrop(invalid), false);
    assert.throws(() => guideCropGeometry(invalid), /source bounds/);
  }
});

test("annotations stay inside the displayed crop and require a readable legend label", () => {
  assert.ok(validImageAnnotation(annotation));
  assert.ok(
    validImageAnnotation({
      ...annotation,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    }),
  );
  for (const invalid of [
    { ...annotation, x: -1 },
    { ...annotation, y: 99 },
    { ...annotation, width: 101 },
    { ...annotation, height: 0 },
    { ...annotation, x: Number.NaN },
    { ...annotation, label: " " },
  ])
    assert.equal(validImageAnnotation(invalid), false);
});

test("screenshots always use the authenticated asset route", () => {
  assert.equal(
    guideImageAssetUrl("sample.png"),
    "/api/workshops/assets/sample.png",
  );
  for (const file of [
    "../sample.png",
    "/sample.png",
    "https://example.com/sample.png",
    "sample.png?public=1",
  ]) {
    assert.throws(() => guideImageAssetUrl(file), /protected asset filename/);
  }
});

test("every displayed screenshot and overlay resolves to a protected source with valid geometry", () => {
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  for (const guide of workshopGuides) {
    for (const [stepIndex, step] of guide.steps.entries()) {
      for (const image of guideStepImages(step)) {
        const context = `${guide.slug}, step ${stepIndex + 1}, ${image.file}`;
        assert.ok(
          image.alt.trim() && image.caption.trim(),
          `${context}: descriptive context`,
        );
        assert.ok(guideImageAssetUrl(image.file));
        const source = join(appRoot, "workshop-assets", image.file);
        assert.ok(existsSync(source), `${context}: source asset exists`);
        assert.ok(
          !existsSync(join(appRoot, "public", image.file)),
          `${context}: no public copy`,
        );
        assert.ok(
          !existsSync(join(appRoot, "public/workshop-assets", image.file)),
          `${context}: no public asset directory`,
        );
        if (image.crop) {
          assert.ok(validImageCrop(image.crop), `${context}: crop bounds`);
          const dimensions = encodedImageDimensions(readFileSync(source));
          if (dimensions) {
            assert.equal(
              image.crop.sourceWidth,
              dimensions.width,
              `${context}: actual source width`,
            );
            assert.equal(
              image.crop.sourceHeight,
              dimensions.height,
              `${context}: actual source height`,
            );
          }
        }
        for (const [index, annotation] of (image.annotations ?? []).entries()) {
          assert.ok(
            validImageAnnotation(annotation),
            `${context}: annotation ${index + 1}`,
          );
        }
      }
    }
  }
});
