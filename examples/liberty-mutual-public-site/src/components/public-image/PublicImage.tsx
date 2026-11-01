import { Image, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicImageProps } from "./public-image.props";
export const Default = ({ fields, params }: PublicImageProps) =>
  fields ? (
    <div
      className={`component public-section ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <figure className="public-container public-image">
        <Image field={fields.image} loading="lazy" />
        <Text tag="figcaption" field={fields.caption} />
      </figure>
    </div>
  ) : null;
export const Hero = ({ fields, params }: PublicImageProps) =>
  fields ? (
    <div
      className={`component public-hero-photo ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <figure className="public-container">
        <Image field={fields.image} loading="eager" />
        <Text tag="figcaption" field={fields.caption} />
      </figure>
    </div>
  ) : null;
