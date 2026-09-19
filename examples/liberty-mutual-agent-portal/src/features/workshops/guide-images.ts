import type {
  GuideImage,
  GuideImageAnnotation,
  GuideImageCrop,
  GuideStep,
} from "./types";

export function guideStepImages(
  step: Pick<GuideStep, "image" | "images">,
): GuideImage[] {
  return step.images ?? (step.image ? [step.image] : []);
}

function withinBounds(
  box: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
): boolean {
  return (
    [box.x, box.y, box.width, box.height, width, height].every(
      Number.isFinite,
    ) &&
    width > 0 &&
    height > 0 &&
    box.x >= 0 &&
    box.y >= 0 &&
    box.width > 0 &&
    box.height > 0 &&
    box.x + box.width <= width + 0.000001 &&
    box.y + box.height <= height + 0.000001
  );
}

export function validImageCrop(crop: GuideImageCrop): boolean {
  return withinBounds(crop, crop.sourceWidth, crop.sourceHeight);
}

export function validImageAnnotation(
  annotation: GuideImageAnnotation,
): boolean {
  return (
    annotation.label.trim().length > 0 && withinBounds(annotation, 100, 100)
  );
}

/** Position the original image inside a responsive crop without modifying its pixels. */
export function guideCropGeometry(crop: GuideImageCrop) {
  if (!validImageCrop(crop))
    throw new Error("Workshop screenshot crop exceeds its source bounds.");
  return {
    aspectRatio: `${crop.width} / ${crop.height}`,
    image: {
      width: `${(crop.sourceWidth / crop.width) * 100}%`,
      height: `${(crop.sourceHeight / crop.height) * 100}%`,
      left: `${(-crop.x / crop.width) * 100}%`,
      top: `${(-crop.y / crop.height) * 100}%`,
    },
  };
}

export function guideImageAssetUrl(file: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,79}\.(png|webp)$/.test(file)) {
    throw new Error("Workshop screenshots require a protected asset filename.");
  }
  return `/api/workshops/assets/${file}`;
}
