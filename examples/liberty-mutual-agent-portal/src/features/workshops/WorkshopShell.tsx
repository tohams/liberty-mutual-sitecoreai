import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Code2,
  Compass,
  RotateCcw,
  Users,
} from "lucide-react";
import { WorkshopSignOut } from "./WorkshopControls";
import type { WorkshopSession } from "@/server/workshops/auth";

export function WorkshopShell({
  session,
  active,
  children,
}: {
  session: WorkshopSession;
  active?: "marketing" | "development" | "reset" | "attendees";
  children: React.ReactNode;
}) {
  return (
    <div className="workshop-app">
      <a className="workshop-skip" href="#workshop-main">
        Skip to guide
      </a>
      <header className="workshop-header">
        <Link
          href="/workshops"
          className="workshop-brand"
          aria-label="Liberty Mutual workshop guide home"
        >
          {/* Static brand artwork; private guide screenshots use their authenticated endpoint. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/liberty-mutual-horizontal.svg"
            alt="Liberty Mutual Insurance"
            width="154"
            height="50"
          />
          <span>
            SitecoreAI <strong>Workshop guide</strong>
          </span>
        </Link>
        <nav aria-label="Workshop navigation">
          <Link href="/workshops" className={!active ? "active" : ""}>
            <Compass size={16} />
            Overview
          </Link>
          <Link
            href="/workshops/marketing"
            className={active === "marketing" ? "active" : ""}
          >
            <BookOpen size={16} />
            Marketing
          </Link>
          <Link
            href="/workshops/development"
            className={active === "development" ? "active" : ""}
          >
            <Code2 size={16} />
            Development & architecture
          </Link>
        </nav>
        <div className="workshop-account">
          <Link
            href="/workshops/attendees"
            aria-label={`Attendee assignments: workshop number ${session.reviewerPack}`}
            aria-current={active === "attendees" ? "page" : undefined}
          >
            Workshop number <strong>{session.reviewerPack}</strong>
          </Link>
          <WorkshopSignOut />
        </div>
      </header>
      {children}
      <footer className="workshop-footer">
        <span>Liberty Mutual · SitecoreAI workshop guide</span>
        <a href="/login" target="_blank" rel="noreferrer">
          Open Agent Portal <ArrowUpRight size={14} />
        </a>
        <Link
          href="/workshops/attendees"
          aria-current={active === "attendees" ? "page" : undefined}
        >
          <Users size={14} /> Attendee assignments
        </Link>
        <Link
          href="/workshops/reset"
          aria-current={active === "reset" ? "page" : undefined}
        >
          <RotateCcw size={14} /> Reset a workshop number
        </Link>
        <span>Evaluation sandbox · September 2026</span>
      </footer>
    </div>
  );
}
