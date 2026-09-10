"use client";

import Link from "next/link";
import { PortalIcon } from "@/components/ui/portal-icon";
import { dateLabel, money, usePortal } from "../portal/portal-context";

export function GrowthScreen() {
  const { data } = usePortal();
  const total = data.agency.production.reduce(
    (sum, item) => sum + item.writtenPremiumCents,
    0,
  );
  const prior = data.agency.production.reduce(
    (sum, item) => sum + item.priorPeriodPremiumCents,
    0,
  );
  const newBusiness = data.agency.production.reduce(
    (sum, item) => sum + item.newBusinessPremiumCents,
    0,
  );
  const maximum = Math.max(
    ...data.agency.production.map((item) => item.writtenPremiumCents),
    1,
  );
  const campaign = data.growthCampaign;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="breadcrumb">BUILD ON YOUR MOMENTUM</div>
          <h1>Agency growth</h1>
          <p>A clearer view of your business. A confident next step.</p>
        </div>
        <span className="context-chip">
          <PortalIcon name="clock" width="15" />
          {data.productionPeriod.label}
        </span>
      </div>
      <section className="growth-hero">
        <div>
          <span className="eyebrow">{data.agency.name}</span>
          <h2>
            Your ambition.
            <br />
            Our shared opportunity.
          </h2>
          <p>
            See where your strengths are taking you, and make room for the
            possibilities ahead.
          </p>
          <a href="#growth-plan" className="button button-primary">
            Explore a growth path
            <PortalIcon name="arrow" width="16" />
          </a>
        </div>
        <div className="growth-hero-chart" aria-hidden="true">
          <span style={{ height: "27%" }} />
          <span style={{ height: "37%" }} />
          <span style={{ height: "48%" }} />
          <span style={{ height: "62%" }} />
          <span style={{ height: "80%" }} />
          <span style={{ height: "100%" }} />
          <div className="growth-chart-line" />
          <small>GROWING TOGETHER</small>
        </div>
      </section>
      <div className="growth-metrics">
        <div>
          <span>Total written premium</span>
          <strong>{money(total, true)}</strong>
          <small>
            {prior ? `${(((total - prior) / prior) * 100).toFixed(1)}%` : "—"}{" "}
            change from prior period
          </small>
        </div>
        <div>
          <span>New business premium</span>
          <strong>{money(newBusiness, true)}</strong>
          <small>
            {total ? `${((newBusiness / total) * 100).toFixed(1)}%` : "—"} of
            total written premium
          </small>
        </div>
        <div>
          <span>Policies in your workspace</span>
          <strong>
            {data.agency.production
              .reduce((sum, item) => sum + item.policyCount, 0)
              .toLocaleString()}
          </strong>
          <small>Across the business lines available to you</small>
        </div>
      </div>
      <div className="growth-columns">
        <section className="panel production-panel">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">A BALANCED PERSPECTIVE</span>
              <h2>Your business mix</h2>
            </div>
            <span className="subtle">Written premium</span>
          </header>
          <div className="production-bars">
            {data.agency.production.map((item, index) => (
              <div className="production-row" key={item.line}>
                <div>
                  <span>{item.label}</span>
                  <strong>{money(item.writtenPremiumCents, true)}</strong>
                </div>
                <div className="production-track">
                  <span
                    className={`bar-color-${index % 5}`}
                    style={{
                      width: `${(item.writtenPremiumCents / maximum) * 100}%`,
                    }}
                  />
                </div>
                <small>
                  {item.policyCount.toLocaleString()} policies ·{" "}
                  {total
                    ? ((item.writtenPremiumCents / total) * 100).toFixed(1)
                    : "0"}
                  % of premium
                </small>
              </div>
            ))}
          </div>
          <p className="chart-note">
            {dateLabel(data.productionPeriod.start)} –{" "}
            {dateLabel(data.productionPeriod.end)}. Written premium, USD. Each
            line is shown on the same scale.
          </p>
        </section>
        <aside className="growth-opportunity">
          <span className="round-icon">
            <PortalIcon name="growth" width="25" />
          </span>
          <span className="eyebrow">PRACTICE DEVELOPMENT</span>
          <h2>{campaign.agencyGoal}</h2>
          <p>{campaign.description}</p>
          <Link href="/support" className="text-link">
            Plan with your relationship team
            <PortalIcon name="arrow" width="17" />
          </Link>
          <div className="growth-opportunity-note">
            <PortalIcon name="users" width="18" />
            <span>{campaign.audienceLabel}</span>
          </div>
        </aside>
      </div>
      <section id="growth-plan" className="campaign-section">
        <header className="section-heading">
          <div>
            <span className="eyebrow">A PRACTICAL PATH FORWARD</span>
            <h2>{campaign.title}</h2>
            <p>{campaign.description}</p>
          </div>
          <span className="campaign-label">
            <PortalIcon name="growth" width="16" />
            Agency development
          </span>
        </header>
        <div className="campaign-steps">
          {campaign.steps.map((step, index) => (
            <article key={step.id}>
              <span className="step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <Link href={step.href} className="text-link small">
                Take the next step
                <PortalIcon name="arrow" width="16" />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <div className="source-note">
        <PortalIcon name="info" width="15" />
        <p>
          Production reflects the business lines in your workspace and the
          reporting period shown. Product exploration does not change your
          current appointments or transaction permissions.
        </p>
      </div>
    </>
  );
}
