"use client";

import { PortalLink as Link } from "@/components/ui/portal-link";
import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { PortalIcon, type IconName } from "@/components/ui/portal-icon";
import { PortalDialog } from "@/components/ui/portal-dialog";
import { usePortal, stateNames } from "./portal-context";
import { clearPortalAnalytics } from "@/lib/portal-analytics";
import { readRiskState, withRiskState } from "./risk-state-navigation";
import { isPortalNavigationActive } from "./content-routes";

const navigation: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "My workspace", icon: "grid" },
  { href: "/quote", label: "Quote & submit", icon: "file" },
  { href: "/clients", label: "Clients & policies", icon: "users" },
  { href: "/products", label: "Products & appetite", icon: "shield" },
  { href: "/growth", label: "Agency growth", icon: "growth" },
  { href: "/resources", label: "Learning & resources", icon: "book" },
  { href: "/support", label: "Support", icon: "headset" },
];

export function PortalShell({
  route,
  children,
}: {
  route: string;
  children: ReactNode;
}) {
  const { data, notify } = usePortal();
  const searchParams = useSearchParams();
  const riskState = readRiskState(
    searchParams.get("state"),
    data.agent.licensedStates,
  );
  const editorPreview = data.session.runId === "editor";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [growthOpen, setGrowthOpen] = useState(route.startsWith("/growth"));
  const growthToggle = useRef<HTMLButtonElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const openTasks = data.tasks.filter((task) => task.status === "Open");
  const activeRoute =
    route.startsWith("/submissions") ||
    route.startsWith("/appetite") ||
    route.startsWith("/surety")
      ? "/quote"
      : route.startsWith("/policies") || route.startsWith("/renewals")
        ? "/clients"
        : route.startsWith("/learning")
          ? "/resources"
          : route;
  async function signOut() {
    if (editorPreview) return;
    setSigningOut(true);
    try {
      clearPortalAnalytics();
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        // A new document discards private client state and the previous analytics identity.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login");
      } else throw new Error("Sign out failed");
    } catch {
      setSigningOut(false);
      notify("We could not sign you out. Please try again.");
    }
  }
  return (
    <div
      className="portal-app"
      onKeyDown={(event) => {
        if (event.key === "Escape") setMobileOpen(false);
      }}
    >
      <a className="skip-link" href="#portal-main">
        Skip to main content
      </a>
      <header className="portal-header">
        <div className="brand-area">
          <button
            className="icon-button mobile-menu"
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          >
            <PortalIcon name="menu" />
          </button>
          <Link
            href="/"
            aria-label="Liberty Mutual, my workspace"
            className="brand-logo"
          >
            <Image
              src="/brand/liberty-mutual-horizontal.svg"
              alt="Liberty Mutual"
              width="142"
              height="40"
              priority
            />
          </Link>
          <span className="brand-divider" />
          <span className="portal-wordmark">AGENT PORTAL</span>
        </div>
        <form action="/resources" className="global-search" role="search">
          <PortalIcon name="search" />
          <input
            name="q"
            aria-label="Search resources, products, and guidance"
            placeholder="Find a resource, product, or answer"
          />
          <kbd>Search</kbd>
        </form>
        <div className="header-actions">
          <button
            type="button"
            className="icon-button notification-button"
            aria-label={`${openTasks.length} open ${openTasks.length === 1 ? "priority" : "priorities"}`}
            onClick={() => setNotificationsOpen(true)}
          >
            <PortalIcon name="bell" />
            {openTasks.length > 0 && <i />}
          </button>
          <span className="header-separator" />
          <button
            type="button"
            className="profile-trigger"
            aria-label={`Your profile, ${data.agent.name}`}
            onClick={() => setProfileOpen(true)}
          >
            <span className="avatar">{data.agent.initials}</span>
            <span className="header-profile-text">
              <strong>{data.agent.name}</strong>
              <small>{data.agency.name}</small>
            </span>
            <PortalIcon name="chevron" className="rotate-down" width="14" />
          </button>
        </div>
      </header>
      <aside
        className={`portal-sidebar ${mobileOpen ? "is-open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="sidebar-top">
          <span className="eyebrow">YOUR PARTNERSHIP. YOUR POTENTIAL.</span>
          <nav>
            {navigation.map((item) =>
              item.href === "/growth" ? (
                <div
                  key={item.href}
                  className="nav-group"
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && growthOpen) {
                      event.stopPropagation();
                      setGrowthOpen(false);
                      growthToggle.current?.focus();
                    }
                  }}
                >
                  <div
                    className={`nav-group-trigger ${isPortalNavigationActive(activeRoute, item.href) ? "active" : ""}`}
                  >
                    <Link
                      href={withRiskState(item.href, riskState)}
                      className="nav-item"
                      aria-current={
                        activeRoute === item.href ? "page" : undefined
                      }
                      onClick={() => setMobileOpen(false)}
                    >
                      <PortalIcon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                    <button
                      ref={growthToggle}
                      type="button"
                      className="nav-group-toggle"
                      aria-expanded={growthOpen}
                      aria-controls="agency-growth-pages"
                      aria-label={
                        growthOpen
                          ? "Hide Agency growth pages"
                          : "Show Agency growth pages"
                      }
                      onClick={() => setGrowthOpen(!growthOpen)}
                    >
                      <PortalIcon name="chevron" width="16" />
                    </button>
                  </div>
                  <ul
                    id="agency-growth-pages"
                    className="nav-submenu"
                    hidden={!growthOpen}
                  >
                    <li>
                      <Link
                        href={withRiskState("/growth", riskState)}
                        aria-current={route === "/growth" ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        Overview
                      </Link>
                    </li>
                    <li>
                      <Link
                        href={withRiskState(
                          "/growth/small-business",
                          riskState,
                        )}
                        aria-current={
                          route === "/growth/small-business"
                            ? "page"
                            : undefined
                        }
                        onClick={() => setMobileOpen(false)}
                      >
                        Small business growth
                      </Link>
                    </li>
                  </ul>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={withRiskState(item.href, riskState)}
                  className={`nav-item ${isPortalNavigationActive(activeRoute, item.href) ? "active" : ""}`}
                  aria-current={
                    isPortalNavigationActive(activeRoute, item.href)
                      ? "page"
                      : undefined
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  <PortalIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.href === "/quote" &&
                    data.submissions.filter(
                      (item) => item.status === "Information needed",
                    ).length > 0 && (
                      <span className="nav-count">
                        {
                          data.submissions.filter(
                            (item) => item.status === "Information needed",
                          ).length
                        }
                      </span>
                    )}
                </Link>
              ),
            )}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="partnership-card">
            <span className="partnership-mark">
              <PortalIcon name="headset" width="23" height="23" />
            </span>
            <strong>People in your corner.</strong>
            <p>Your dedicated team is here to help move business forward.</p>
            <Link href="/support">
              Meet your team <PortalIcon name="arrow" width="16" />
            </Link>
          </div>
          <div className="sidebar-state">
            <PortalIcon name="pin" width="16" />
            <span>
              {data.agency.city}, {stateNames[data.agency.state]}
            </span>
          </div>
          <p className="sidebar-copyright">
            © {new Date(data.asOfDate).getUTCFullYear()} Liberty Mutual
            Insurance
          </p>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main
        id="portal-main"
        className="portal-main"
        tabIndex={-1}
        inert={mobileOpen}
      >
        {children}
        <footer className="portal-footer">
          <span>Liberty Mutual. Here for your next.</span>
          <div>
            <a
              href="https://www.libertymutual.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Privacy
            </a>
            <Link href="/support">Contact & support</Link>
            <span>
              <PortalIcon name="lock" width="13" /> Secure workspace
            </span>
          </div>
        </footer>
      </main>
      <PortalDialog
        title="Your profile"
        eyebrow="ACCOUNT"
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      >
        <div className="profile-overview">
          <span className="avatar avatar-large">{data.agent.initials}</span>
          <div>
            <h3>{data.agent.name}</h3>
            <p>{data.agent.roleLabel}</p>
            <p>{data.agency.name}</p>
          </div>
        </div>
        <dl className="detail-list">
          <div>
            <dt>Home state</dt>
            <dd>{stateNames[data.agent.state]}</dd>
          </div>
          <div>
            <dt>Licensed states</dt>
            <dd>
              {data.agent.licensedStates
                .map((state) => stateNames[state])
                .join(", ")}
            </dd>
          </div>
          <div>
            <dt>Partnership since</dt>
            <dd>{data.agency.relationshipSince}</dd>
          </div>
          <div>
            <dt>Distribution channel</dt>
            <dd>
              {data.agency.channel === "wholesale"
                ? "Wholesale"
                : "Independent agency"}
            </dd>
          </div>
        </dl>
        <button
          className="button button-secondary"
          type="button"
          onClick={signOut}
          disabled={signingOut || editorPreview}
        >
          <PortalIcon name="logout" /> Sign out
        </button>
      </PortalDialog>
      <PortalDialog
        title="Your priorities"
        eyebrow="NOTIFICATIONS"
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      >
        {openTasks.length ? (
          openTasks.map((task) => (
            <Link className="notification-row" href={task.href} key={task.id}>
              <span className="round-icon">
                <PortalIcon name="clock" />
              </span>
              <div>
                <strong>{task.title}</strong>
                <p>{task.description}</p>
              </div>
              <PortalIcon name="chevron" />
            </Link>
          ))
        ) : (
          <p>You&apos;re all caught up. New priorities will appear here.</p>
        )}
      </PortalDialog>
    </div>
  );
}
