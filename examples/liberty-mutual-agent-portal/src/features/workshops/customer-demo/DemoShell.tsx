import Link from "next/link";
import { ArrowUpRight, Globe2, ListOrdered, Users } from "lucide-react";
import { WorkshopSignOut } from "../WorkshopControls";
import type { WorkshopSession } from "@/server/workshops/auth";
import type { DemoChapter } from "./types";

/** Presenter navigation stays in the unlinked guide, outside the two sites. */
export function DemoShell({
  session,
  chapterId,
  children,
}: {
  session: WorkshopSession | null;
  chapterId?: DemoChapter["id"];
  children: React.ReactNode;
}) {
  return (
    <div className="workshop-app">
      <a className="workshop-skip" href="#workshop-main">
        Skip to guide
      </a>
      <header className="workshop-header">
        <Link
          href={session ? "/workshops/demo" : "/demo/public"}
          className="workshop-brand"
          aria-label="Liberty Mutual demonstration guides"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/liberty-mutual-horizontal.svg"
            alt="Liberty Mutual Insurance"
            width="154"
            height="50"
          />
          <span>
            SitecoreAI <strong>Demonstration guide</strong>
          </span>
        </Link>
        <nav aria-label="Demonstration guides">
          <Link
            href="/demo/public"
            className={chapterId === "public" ? "active" : ""}
            aria-current={chapterId === "public" ? "page" : undefined}
          >
            <Globe2 size={16} /> Public Website
          </Link>
          <Link
            href="/demo"
            className={chapterId === "portal" ? "active" : ""}
            aria-current={chapterId === "portal" ? "page" : undefined}
          >
            <Users size={16} /> Agent Portal
          </Link>
          {session && (
            <Link
              href="/workshops/demo"
              className={!chapterId ? "active" : ""}
              aria-current={!chapterId ? "page" : undefined}
            >
              <ListOrdered size={16} /> Full sequence
            </Link>
          )}
        </nav>
        {session && (
          <div className="workshop-account">
            <span>
              Signed in as <strong>{session.username}</strong>
            </span>
            <WorkshopSignOut />
          </div>
        )}
      </header>
      {children}
      <footer className="workshop-footer">
        <span>Liberty Mutual · SitecoreAI demonstration guides</span>
        <a
          href="https://liberty-mutual-public-site.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Public Website <ArrowUpRight size={14} />
        </a>
        <a
          href="https://liberty-mutual-agent-portal.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Agent Portal <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
