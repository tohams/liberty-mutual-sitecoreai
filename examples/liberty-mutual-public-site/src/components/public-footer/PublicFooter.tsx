import NextLink from "next/link";
import NextImage from "next/image";
import { Image, Link, RichText, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicFooterProps } from "./public-footer.props";

const SOCIAL_ICONS = new Set(["facebook", "instagram", "youtube", "linkedin"]);

export const Default = ({ fields, params }: PublicFooterProps) => {
  if (!fields) return null;
  const columns = Array.isArray(fields.columns) ? fields.columns : [];
  const social = Array.isArray(fields.socialLinks) ? fields.socialLinks : [];
  const legal = Array.isArray(fields.legalLinks) ? fields.legalLinks : [];
  return (
    <div
      className={`component public-footer ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-footer__main">
        <div className="public-container">
          <div className="public-footer__columns">
            <div className="public-footer__brand">
              <NextLink href="/" aria-label="Liberty Mutual home">
                <Image
                  className="public-footer__logo--desktop"
                  field={fields.logo}
                />
                <Image
                  className="public-footer__logo--mobile"
                  field={fields.mobileLogo}
                />
              </NextLink>
            </div>
            {columns.map((column, index) => (
              <div className="public-footer__column" key={column.id}>
                <Text tag="h2" field={column.fields.heading} />
                <RichText field={column.fields.body} />
                <ul>
                  {(Array.isArray(column.fields.links)
                    ? column.fields.links
                    : []
                  ).map((item) => (
                    <li key={item.id}>
                      <Link field={item.fields.link} />
                    </li>
                  ))}
                </ul>
                {index === 0 && (
                  <nav
                    className="public-footer__social"
                    aria-label="Social media"
                  >
                    {social.map((item) => (
                      <Link
                        key={item.id}
                        field={item.fields.link}
                        aria-label={item.fields.link.value.text}
                      >
                        <span aria-hidden="true">
                          {SOCIAL_ICONS.has(item.fields.icon?.value || "") && (
                            <NextImage
                              src={`/brand/social-${item.fields.icon?.value}.svg`}
                              alt=""
                              width={32}
                              height={32}
                            />
                          )}
                        </span>
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
            ))}
          </div>
          <nav className="public-footer__legal" aria-label="Legal policies">
            {legal.map((item) => (
              <Link key={item.id} field={item.fields.link} />
            ))}
          </nav>
        </div>
      </div>
      <div className="public-footer__bottom">
        <div className="public-container">
          <RichText className="public-footer__body" field={fields.body} />
          <RichText
            className="public-footer__disclaimer"
            field={fields.disclaimer}
          />
        </div>
      </div>
    </div>
  );
};
