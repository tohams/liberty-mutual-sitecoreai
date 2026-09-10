"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PortalBootstrap } from "@/contracts/portal";
import { PortalIcon } from "@/components/ui/portal-icon";
import { PortalNoticeContext } from "@/components/ui/portal-notice-context";
import {
  clearPortalAnalytics,
  recordPortalAction,
} from "@/lib/portal-analytics";
import { PortalContext } from "./portal-context";
import type { ActionInput, PortalAppProps } from "./portal.types";
import { PortalShell } from "./PortalShell";
import { resourceHref } from "./content-routes";
import { WorkspaceScreen } from "../workspace/WorkspaceScreen";
import { SubmissionsScreen } from "../submissions/SubmissionsScreen";
import { ClientsScreen } from "../clients/ClientsScreen";
import { ProductsScreen } from "../products/ProductsScreen";
import { GrowthScreen } from "../growth/GrowthScreen";
import { ResourcesScreen } from "../resources/ResourcesScreen";
import { SupportScreen } from "../support/SupportScreen";

export function PortalApp({
  initialData,
  route,
  workspaceEditorial,
  resourcesSearch,
  pageContent,
  isEditing = false,
}: PortalAppProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [serverSnapshot, setServerSnapshot] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);
  const actionLock = useRef(false);
  const pendingRequests = useRef(new Map<string, string>());
  // A fresh server navigation may include another team member's saved work.
  // Update before committing children; local action updates retain this source reference.
  if (serverSnapshot !== initialData) {
    setServerSnapshot(initialData);
    setData(initialData);
  }
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  async function act(
    action: ActionInput,
    successMessage?: string,
  ): Promise<PortalBootstrap | null> {
    if (actionLock.current || isEditing) return null;
    actionLock.current = true;
    setBusy(true);
    const requestKey = JSON.stringify(action);
    // Preserve the original idempotency key after an uncertain network outcome.
    const requestBody =
      pendingRequests.current.get(requestKey) ||
      JSON.stringify({
        ...action,
        expectedVersion: data.session.stateVersion,
        runId: data.session.runId,
        idempotencyKey: crypto.randomUUID(),
      });
    pendingRequests.current.set(requestKey, requestBody);
    try {
      const response = await fetch("/api/portal/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status < 500) pendingRequests.current.delete(requestKey);
        if (response.status === 401) {
          clearPortalAnalytics();
          router.replace("/login");
          router.refresh();
          return null;
        }
        if (response.status === 409) {
          const refreshed = await fetch("/api/portal/bootstrap", {
            cache: "no-store",
          });
          if (refreshed.ok) setData(await refreshed.json());
        }
        throw new Error(
          body.error?.message ||
            "We could not save that change. Please try again.",
        );
      }
      pendingRequests.current.delete(requestKey);
      setData(body);
      void recordPortalAction(action.type);
      if (successMessage) setToast({ message: successMessage });
      return body;
    } catch (failure) {
      setToast({
        message:
          failure instanceof Error
            ? failure.message
            : "We could not connect. Your last saved work is safe.",
        error: true,
      });
      return null;
    } finally {
      setBusy(false);
      actionLock.current = false;
    }
  }
  const section = route.split("/").filter(Boolean)[0] || "workspace";
  const selectedId = route.split("/").filter(Boolean)[1];
  const currentResource = data.resources.find(
    (resource) => resourceHref(resource) === route,
  );
  let content;
  if (["quote", "submissions", "appetite", "surety"].includes(section))
    content = (
      <SubmissionsScreen
        key={route}
        initialSelectedId={section !== "surety" ? selectedId : undefined}
        initialBondId={section === "surety" ? selectedId : undefined}
      />
    );
  else if (["clients", "policies", "renewals"].includes(section))
    content = <ClientsScreen key={route} initialSelectedId={selectedId} />;
  else if (section === "products") content = <ProductsScreen />;
  else if (section === "growth") content = <GrowthScreen />;
  else if (["resources", "learning"].includes(section))
    content = (
      <ResourcesScreen
        search={resourcesSearch}
        initialCourseId={section === "learning" ? selectedId : undefined}
      />
    );
  else if (section === "support") content = <SupportScreen />;
  else content = <WorkspaceScreen editorial={workspaceEditorial} />;
  return (
    <PortalNoticeContext.Provider value={toast}>
      <PortalContext.Provider
        value={{
          data,
          busy: busy || isEditing,
          act,
          notify: (message) => setToast({ message }),
        }}
      >
        <PortalShell route={route}>
          {pageContent ? (
            <>
              <div className="content-utility">
                <Link
                  href={section === "products" ? "/products" : "/resources"}
                  className="text-link"
                >
                  <PortalIcon name="arrow" width="16" className="back-arrow" />
                  {section === "products"
                    ? "Back to products & appetite"
                    : "Back to learning & resources"}
                </Link>
                {currentResource && !isEditing && (
                  <button
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() =>
                      act(
                        {
                          type: "toggle-favorite",
                          resourceId: currentResource.id,
                        },
                        data.favorites.includes(currentResource.id)
                          ? "Resource removed from saved items."
                          : "Resource saved.",
                      )
                    }
                  >
                    <PortalIcon name="bookmark" width="15" />
                    {data.favorites.includes(currentResource.id)
                      ? "Saved to your resources"
                      : "Save resource"}
                  </button>
                )}
              </div>
              {pageContent}
            </>
          ) : (
            <>
              {content}
              {section !== "workspace" &&
                !(section === "resources" && resourcesSearch) &&
                workspaceEditorial && (
                  <section className="cms-editorial-slot">
                    {workspaceEditorial}
                  </section>
                )}
            </>
          )}
        </PortalShell>
        {toast && (
          <div
            className={`toast ${toast.error ? "error" : ""}`}
            role={toast.error ? "alert" : "status"}
          >
            <PortalIcon name={toast.error ? "info" : "check"} width="19" />
            <span>{toast.message}</span>
            <button
              className="icon-button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <PortalIcon name="close" width="16" />
            </button>
          </div>
        )}
      </PortalContext.Provider>
    </PortalNoticeContext.Provider>
  );
}

export default PortalApp;
