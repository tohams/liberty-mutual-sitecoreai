"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { usePathname } from "next/navigation";
import { Image, Link, Text, useSitecore } from "@sitecore-content-sdk/nextjs";
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

export const Default = (props: PublicHeaderProps) => {
  const pathname = usePathname();
  return <PublicHeader key={pathname} {...props} />;
};

function PublicHeader({ fields, params }: PublicHeaderProps) {
  const { page } = useSitecore();
  const searchId = useId();
  const headerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback((restoreFocus = false) => {
    setSearchOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);
  const closeMenus = useCallback((restoreFocus = false) => {
    const openMenus = Array.from(
      headerRef.current?.querySelectorAll<HTMLDetailsElement>(
        "details[open]",
      ) || [],
    );
    const trigger = openMenus[0]?.querySelector<HTMLElement>("summary");
    openMenus.forEach((menu) => {
      menu.open = false;
    });
    if (restoreFocus) trigger?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus({ preventScroll: true });
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      ) {
        closeSearch();
        closeMenus();
      }
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!searchOpen && !headerRef.current?.querySelector("details[open]"))
        return;
      event.preventDefault();
      if (searchOpen) closeSearch(true);
      else closeMenus(true);
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape);
    };
  }, [searchOpen, closeSearch, closeMenus]);

  const toggleSearch = () => {
    closeMenus();
    setSearchOpen((open) => !open);
  };
  const dismissForNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("a"))
      closeMenus();
    if (
      searchOpen &&
      event.target instanceof Element &&
      event.target.closest("a, summary")
    )
      closeSearch();
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    const input = inputRef.current;
    if (!input) return;
    input.value = input.value.trim();
    if (!input.value) {
      event.preventDefault();
      input.setCustomValidity("Enter a search term.");
      input.reportValidity();
    }
    // A regular GET navigation also refreshes a query submitted from /search.
    // Keep the form mounted until the browser completes its submission.
  };

  if (!fields) return null;
  const groups = Array.isArray(fields.navigation) ? fields.navigation : [];
  return (
    <div
      className={`component public-header ${searchOpen ? "public-header--search-open" : ""} ${params.styles || ""}`}
      id={params.RenderingIdentifier}
      ref={headerRef}
      onClickCapture={dismissForNavigation}
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
            <details
              className="public-header__dropdown"
              name={`${searchId}-navigation`}
              key={group.id}
            >
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
          {page.mode.isEditing ? (
            <Link
              className="public-header__search"
              field={fields.searchLink}
              aria-label={fields.searchLink?.value?.text || "Search"}
            >
              <SearchIcon />
              <span>{fields.searchLink?.value?.text}</span>
            </Link>
          ) : (
            <button
              className="public-header__search"
              type="button"
              aria-label={fields.searchLink?.value?.text || "Search"}
              aria-expanded={searchOpen}
              aria-controls={searchId}
              onClick={toggleSearch}
              ref={triggerRef}
            >
              <SearchIcon />
              <span>{fields.searchLink?.value?.text || "Search"}</span>
            </button>
          )}
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
              <details name={`${searchId}-mobile-navigation`} key={group.id}>
                <summary>
                  <Text tag="span" field={group.fields.label} />
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
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
            <Link field={fields.loginLink} />
          </nav>
        </details>
        <section
          className="public-header__search-panel"
          id={searchId}
          hidden={!searchOpen}
          aria-labelledby={`${searchId}-label`}
        >
          <div className="public-header__search-heading">
            <label id={`${searchId}-label`} htmlFor={`${searchId}-input`}>
              Search
            </label>
            <button
              className="public-header__search-close"
              type="button"
              aria-label="Close search"
              onClick={() => closeSearch(true)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="m6 6 12 12M18 6 6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <form
            className="public-header__search-form"
            action={fields.searchLink?.value?.href || "/search"}
            method="get"
            role="search"
            aria-label="Search insurance information"
            onSubmit={submitSearch}
          >
            <input
              id={`${searchId}-input`}
              ref={inputRef}
              type="search"
              name="q"
              placeholder="Search"
              autoComplete="off"
              maxLength={250}
              required
              onInput={() => inputRef.current?.setCustomValidity("")}
            />
            <button type="submit" className="public-button">
              <SearchIcon />
              Search
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
