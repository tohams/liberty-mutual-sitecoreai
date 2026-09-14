"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ClientSDK, type PagesContext } from "@sitecore-marketplace-sdk/client";
import { XMC } from "@sitecore-marketplace-sdk/xmc";
import { createMetadataService } from "./metadata-service";
import {
  METADATA_FIELDS,
  MetadataError,
  type MetadataField,
  type MetadataSnapshot,
  type MetadataValues,
} from "./metadata-contract";

const EXPECTED_TENANT_ID = "97eea84c-ac47-4d91-7e4f-08defdaaa7df";
const EXPECTED_ORGANIZATION_ID = "org_XqL3u1MSNVuubOTb";

type PanelNotice = { kind: "success" | "warning" | "error"; text: string };
type PanelStatus = "connecting" | "standalone" | "loading" | "ready" | "error";
type MetadataService = ReturnType<typeof createMetadataService>;

function normalizedId(value?: string) {
  return value?.replace(/[{}-]/g, "").toLowerCase() ?? "";
}

function contextKey(context?: PagesContext) {
  const page = context?.pageInfo;
  return [
    normalizedId(context?.siteInfo?.id),
    context?.siteInfo?.name ?? "",
    normalizedId(page?.id),
    page?.language ?? "",
    page?.version ?? "",
  ].join("|");
}

function stableContextValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableContextValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableContextValue(entry)]),
    );
  }
  return value;
}

function capabilitiesKey(context?: PagesContext) {
  const page = context?.pageInfo;
  return JSON.stringify(
    stableContextValue({
      canWrite: page?.permissions?.canWrite,
      canWriteLanguage: page?.permissions?.canWriteLanguage,
      isLocked: page?.locking?.isLocked,
      lockedByCurrentUser: page?.locking?.lockedByCurrentUser,
      workflow: page?.workflow,
    }),
  );
}

function safeError(error: unknown, fallback: string) {
  return error instanceof MetadataError ? error.message : fallback;
}

const subscribeToFrame = () => () => {};
const readFrame = () => window.parent !== window;
const serverFrame = () => null;

/** Owns the iframe connection and its subscriptions; no credentials or selections are persisted. */
export function useResourceMetadataPanel() {
  const embedded = useSyncExternalStore<boolean | null>(
    subscribeToFrame,
    readFrame,
    serverFrame,
  );
  const [status, setStatus] = useState<PanelStatus>("connecting");
  const [snapshot, setSnapshot] = useState<MetadataSnapshot | null>(null);
  const [values, setValues] = useState<MetadataValues | null>(null);
  const [notice, setNotice] = useState<PanelNotice | null>(null);
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const serviceRef = useRef<MetadataService | null>(null);
  const clientRef = useRef<ClientSDK | null>(null);
  const snapshotRef = useRef<MetadataSnapshot | null>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const requestRef = useRef(0);
  const contextRevisionRef = useRef(0);
  const fieldRevisionRef = useRef(0);
  const loadRef = useRef<(notice?: PanelNotice | null) => Promise<void>>(
    async () => {},
  );

  const changedFields =
    snapshot && values
      ? METADATA_FIELDS.filter(
          ({ name }) => values[name] !== snapshot.values[name],
        )
      : [];
  const invalidFields =
    snapshot && values
      ? METADATA_FIELDS.filter(
          ({ name }) =>
            !snapshot.options[name].some(
              (option) => option.value === values[name],
            ),
        )
      : [];
  useEffect(() => {
    dirtyRef.current = changedFields.length > 0;
    snapshotRef.current = snapshot;
  }, [changedFields.length, snapshot]);

  useEffect(() => {
    // The public URL is intentionally inert. Only the Marketplace host can initialize the panel.
    if (!embedded) return;

    let active = true;
    let ownedClient: ClientSDK | null = null;
    const unsubscribe: (() => void)[] = [];
    let selectedContextKey: string | null = null;
    let selectedCapabilitiesKey: string | null = null;
    let selectedContext: PagesContext | undefined;

    const load = async (nextNotice: PanelNotice | null = null) => {
      const service = serviceRef.current;
      if (!active || !service) return;
      const request = ++requestRef.current;
      setStatus("loading");
      snapshotRef.current = null;
      dirtyRef.current = false;
      setSnapshot(null);
      setValues(null);
      setStale(false);
      setNotice(nextNotice);
      try {
        const loaded = await service.load();
        if (!active || request !== requestRef.current) return;
        setSnapshot(loaded);
        setValues({ ...loaded.values });
        setStatus("ready");
      } catch (error) {
        if (!active || request !== requestRef.current) return;
        setStatus("error");
        setNotice({
          kind: "error",
          text: safeError(
            error,
            "Resource metadata could not be loaded. Check your Sitecore connection, then try again.",
          ),
        });
      }
    };
    loadRef.current = load;

    const connectionFailed = () => {
      if (!active) return;
      requestRef.current += 1;
      contextRevisionRef.current += 1;
      serviceRef.current = null;
      setStale(true);
      setStatus("error");
      setNotice({
        kind: "error",
        text: "The Page Builder connection was interrupted. Refresh to reconnect before saving.",
      });
    };

    const receiveContext = (context: PagesContext) => {
      if (!active) return;
      const nextKey = contextKey(context);
      const nextCapabilities = capabilitiesKey(context);
      const capabilitiesChanged =
        selectedCapabilitiesKey !== null &&
        selectedCapabilitiesKey !== nextCapabilities;
      selectedContext = context;
      selectedCapabilitiesKey = nextCapabilities;
      if (nextKey === selectedContextKey) {
        if (capabilitiesChanged) {
          contextRevisionRef.current += 1;
          requestRef.current += 1;
          if (dirtyRef.current || savingRef.current) {
            setStale(true);
            setNotice({
              kind: "warning",
              text: "The page’s permissions, lock, or workflow changed. Your selections are still shown. Refresh the saved values before continuing.",
            });
          } else {
            void load({
              kind: "warning",
              text: "The page’s permissions, lock, or workflow changed. Metadata has been refreshed.",
            });
          }
        }
        return;
      }
      const changedPage = selectedContextKey !== null;
      selectedContextKey = nextKey;
      contextRevisionRef.current += 1;
      requestRef.current += 1;
      const hadChanges = dirtyRef.current;
      dirtyRef.current = false;
      if (changedPage) {
        void load(
          hadChanges
            ? {
                kind: "warning",
                text: "The selected page, language, or version changed. Unsaved selections were cleared.",
              }
            : null,
        );
      }
    };

    const connect = async () => {
      try {
        const client = await ClientSDK.init({
          target: window.parent,
          modules: [XMC],
          timeout: 15000,
        });
        ownedClient = client;
        if (!active) {
          client.destroy();
          return;
        }
        clientRef.current = client;
        const appResult = await client.query("application.context");
        const application = appResult.data;
        if (appResult.isError || !application) {
          throw new MetadataError(
            "CONTEXT",
            "Sitecore could not verify this app connection. Reopen Resource metadata from Page Builder.",
          );
        }
        if (application.organizationId !== EXPECTED_ORGANIZATION_ID) {
          throw new MetadataError(
            "CONTEXT",
            "This resource metadata app is configured for the Liberty Mutual Sitecore environment.",
          );
        }
        const resources = application.resourceAccess?.filter(
          (resource) =>
            normalizedId(resource.tenantId) ===
            normalizedId(EXPECTED_TENANT_ID),
        );
        const sitecoreContextId =
          resources?.length === 1 ? resources[0].context?.live : undefined;
        if (!sitecoreContextId) {
          throw new MetadataError(
            "CONTEXT",
            "This app does not have access to the Liberty Mutual authoring environment. Ask a Sitecore administrator to check its installation.",
          );
        }
        const service = createMetadataService({
          getContext: async () => {
            if (!active)
              throw new MetadataError(
                "CONTEXT",
                "The metadata panel was closed.",
              );
            const result = await client.query("pages.context");
            if (result.isError || !result.data) {
              throw new MetadataError(
                "CONTEXT",
                "The current Page Builder selection could not be verified. Reopen the panel and try again.",
              );
            }
            return result.data;
          },
          query: async (document, variables) => {
            if (!active)
              throw new MetadataError(
                "CONTEXT",
                "The metadata panel was closed.",
              );
            const result = await client.mutate("xmc.authoring.graphql", {
              params: {
                query: { sitecoreContextId },
                body: { query: document, variables },
              },
            });
            if (
              ("error" in result && result.error) ||
              result.data?.errors?.length ||
              !result.data?.data
            ) {
              throw new MetadataError(
                "READ_FAILED",
                "Sitecore could not complete the metadata request. Refresh the saved values before trying again.",
              );
            }
            return result.data.data;
          },
        });
        if (!active) return;
        serviceRef.current = service;
        const pageResult = await client.query("pages.context", {
          subscribe: true,
          onSuccess: receiveContext,
          onError: connectionFailed,
        });
        if (!active) {
          pageResult.unsubscribe?.();
          return;
        }
        if (pageResult.unsubscribe) unsubscribe.push(pageResult.unsubscribe);
        if (pageResult.isError || !pageResult.data) {
          throw new MetadataError(
            "CONTEXT",
            "Open a resource page in Page Builder, then reopen Resource metadata.",
          );
        }
        receiveContext(pageResult.data);
        unsubscribe.push(
          client.subscribe("pages.content.fieldsUpdated", {
            onData: (update) => {
              const page = selectedContext?.pageInfo;
              if (
                !active ||
                normalizedId(update.itemId) !== normalizedId(page?.id) ||
                update.language !== page?.language ||
                update.itemVersion !== page?.version
              )
                return;
              // Invalidate preflight even during a save; its own post-write event is resolved by readback.
              fieldRevisionRef.current += 1;
              if (savingRef.current) return;
              if (!snapshotRef.current) {
                void load();
                return;
              }
              requestRef.current += 1;
              setStale(true);
              setNotice({
                kind: "warning",
                text: "This page changed in Page Builder. Refresh the saved values before editing metadata.",
              });
            },
            onError: connectionFailed,
          }),
        );
        await load();
      } catch (error) {
        if (!active) return;
        serviceRef.current = null;
        setStatus("error");
        setNotice({
          kind: "error",
          text: safeError(
            error,
            "The connection to Page Builder could not be established. Reopen the panel or try again.",
          ),
        });
      }
    };
    void connect();

    return () => {
      active = false;
      requestRef.current += 1;
      contextRevisionRef.current += 1;
      unsubscribe.forEach((stop) => stop());
      ownedClient?.destroy();
      if (clientRef.current === ownedClient) clientRef.current = null;
      serviceRef.current = null;
    };
  }, [connectionAttempt, embedded]);

  const update = (field: MetadataField, value: string) => {
    if (status !== "ready" || stale || saving || !snapshot?.editable || !values)
      return;
    const nextValues = { ...values, [field]: value };
    dirtyRef.current = METADATA_FIELDS.some(
      ({ name }) => nextValues[name] !== snapshot.values[name],
    );
    setValues(nextValues);
    setNotice(null);
  };

  const discard = () => {
    if (!snapshot || saving) return;
    dirtyRef.current = false;
    setValues({ ...snapshot.values });
    if (!stale) setNotice(null);
  };

  const refresh = () => {
    if (saving) return;
    if (serviceRef.current) void loadRef.current();
    else {
      setStatus("connecting");
      setNotice(null);
      setSnapshot(null);
      setValues(null);
      setStale(false);
      setConnectionAttempt((attempt) => attempt + 1);
    }
  };

  const save = async () => {
    const service = serviceRef.current;
    const client = clientRef.current;
    if (
      !service ||
      !client ||
      !snapshot ||
      !values ||
      savingRef.current ||
      stale ||
      !snapshot.editable ||
      changedFields.length === 0 ||
      invalidFields.length > 0
    )
      return;
    const contextRevision = contextRevisionRef.current;
    const fieldRevision = fieldRevisionRef.current;
    const request = ++requestRef.current;
    savingRef.current = true;
    setSaving(true);
    setNotice(null);
    try {
      const result = await service.save(
        snapshot,
        { ...values },
        {
          isCurrent: () =>
            contextRevision === contextRevisionRef.current &&
            fieldRevision === fieldRevisionRef.current &&
            clientRef.current === client,
        },
      );
      if (
        request !== requestRef.current ||
        contextRevision !== contextRevisionRef.current
      )
        return;
      setSnapshot(result.snapshot);
      setValues({ ...result.snapshot.values });
      setStale(false);
      setNotice({
        kind: "success",
        text: "Metadata saved. Review and publish this resource to update the live site. Then open Content → Search Sources → Liberty Mutual Agent Resources and select Reindex Content to update search.",
      });
      if (result.changedFields.length > 0) {
        try {
          await client.mutate("pages.reloadCanvas");
        } catch {
          if (
            request !== requestRef.current ||
            contextRevision !== contextRevisionRef.current
          )
            return;
          setNotice({
            kind: "warning",
            text: "Metadata was saved, but the page preview could not refresh. Refresh Page Builder to see the saved changes.",
          });
        }
      }
    } catch (error) {
      if (
        request !== requestRef.current ||
        contextRevision !== contextRevisionRef.current
      )
        return;
      setStale(true);
      setNotice({
        kind: "error",
        text: safeError(
          error,
          "The save could not be confirmed. Refresh the saved values before making another change.",
        ),
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return {
    status: embedded === false ? ("standalone" as const) : status,
    snapshot,
    values,
    notice,
    saving,
    stale,
    changedCount: changedFields.length,
    invalidFields: invalidFields.map(({ name }) => name),
    canSave:
      status === "ready" &&
      !!snapshot?.editable &&
      !saving &&
      !stale &&
      changedFields.length > 0 &&
      invalidFields.length === 0,
    update,
    discard,
    refresh,
    save,
  };
}
