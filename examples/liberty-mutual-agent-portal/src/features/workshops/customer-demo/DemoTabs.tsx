import { ArrowUpRight } from "lucide-react";
import { CopyValue } from "./CopyValue";
import type { PresenterProfileRef } from "./demo-profiles.server";
import { customerDemoTabGroups, demoTabNames } from "./demo-tabs";
import styles from "./DemoTabs.module.css";

/** Visible setup outside the timed customer demonstration. */
export function DemoTabs({
  profiles = [],
}: {
  profiles?: PresenterProfileRef[];
}) {
  return (
    <section
      id="demo-tabs"
      className={styles.setup}
      aria-labelledby="demo-tabs-title"
    >
      <h2 id="demo-tabs-title" className={styles.title}>
        P0 — Open your demo tabs
      </h2>
      <p className={styles.instruction}>
        Use separate browser profiles for the named windows, and reserve one
        Incognito / Private window for Prospera. Copy each link address into its
        assigned window to preserve the sign-ins. Reuse these tabs throughout
        the demonstration.
      </p>
      <div className={styles.groups}>
        {customerDemoTabGroups.map((group) => (
          <section
            key={group.id}
            className={`${styles.group} ${group.wide ? styles.wide : ""}`}
            aria-labelledby={`demo-tabs-${group.id}`}
          >
            <h3 id={`demo-tabs-${group.id}`} className={styles.groupTitle}>
              {group.title}
            </h3>
            <p className={styles.groupNote}>{group.note}</p>
            <ul
              className={`${styles.tabs} ${group.wide ? styles.tabColumns : ""}`}
            >
              {group.tabs.map((tab) => (
                <li key={tab.id} className={styles.tab}>
                  <a href={tab.href} target="_blank" rel="noopener noreferrer">
                    {demoTabNames[tab.id]}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                  <span>{tab.cue}</span>
                  {tab.id === "profiles" && profiles.length > 0 && (
                    <div className={styles.profileRefs}>
                      <p className={styles.profileNote}>
                        Current profiles for number <strong>01</strong>. Copy
                        the agent identity to find the record in Profiles, or
                        open its native link. Refresh this guide after a reset.
                      </p>
                      {profiles.map((profile) => (
                        <div key={profile.username}>
                          <a
                            href={profile.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {profile.label}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </a>
                          <CopyValue
                            label={`${profile.username} — Agent identity`}
                            value={profile.identifier}
                          />
                          <CopyValue
                            label={`${profile.username} — Native profile ID`}
                            value={profile.profileId}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
