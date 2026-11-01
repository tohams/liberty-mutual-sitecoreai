import { Image, Link, Text } from "@sitecore-content-sdk/nextjs";
import type { PublicHeaderProps } from "./public-header.props";

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle cx="10" cy="10" r="6.1" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="m14.5 14.5 5.8 5.8"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);
const LockIcon = () => (
  <svg
    aria-hidden="true"
    width="18"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
  >
    <rect
      x="5"
      y="10"
      width="14"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"
      stroke="currentColor"
      strokeWidth="1.3"
    />
  </svg>
);

export const Default = ({ fields, params }: PublicHeaderProps) => {
  if (!fields) return null;
  const groups = Array.isArray(fields.navigation) ? fields.navigation : [];
  return (
    <div
      className={`component public-header ${params.styles || ""}`}
      id={params.RenderingIdentifier}
    >
      <div className="public-header__bar">
        <Link
          className="public-header__brand"
          field={fields.homeLink}
          aria-label="Liberty Mutual home"
        >
          <Image field={fields.logo} />
        </Link>
        <nav className="public-header__nav" aria-label="Main navigation">
          {groups.map((group) => (
            <details className="public-header__dropdown" key={group.id}>
              <summary>
                <Text tag="span" field={group.fields.label} />
              </summary>
              <ul>
                {(Array.isArray(group.fields.links)
                  ? group.fields.links
                  : []
                ).map((item) => (
                  <li key={item.id}>
                    <Link field={item.fields.link} />
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <Link className="public-header__contact" field={fields.contactLink} />
        </nav>
        <div className="public-header__actions">
          <Link className="public-header__search" field={fields.searchLink}>
            <SearchIcon />
            <span>{fields.searchLink?.value?.text}</span>
          </Link>
          <Link className="public-header__login" field={fields.loginLink}>
            <LockIcon />
            <span>{fields.loginLink?.value?.text}</span>
          </Link>
        </div>
        <details className="public-header__mobile">
          <summary aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </summary>
          <nav aria-label="Mobile navigation">
            {groups.map((group) => (
              <details key={group.id}>
                <summary>
                  <Text tag="span" field={group.fields.label} />
                </summary>
                <ul>
                  {(Array.isArray(group.fields.links)
                    ? group.fields.links
                    : []
                  ).map((item) => (
                    <li key={item.id}>
                      <Link field={item.fields.link} />
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            <Link field={fields.contactLink} />
            <Link field={fields.searchLink} />
            <Link field={fields.loginLink} />
          </nav>
        </details>
      </div>
    </div>
  );
};
