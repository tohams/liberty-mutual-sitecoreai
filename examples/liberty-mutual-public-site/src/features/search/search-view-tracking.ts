export interface SearchViewTracker {
  /** The key identifies a search intent, including its raw query and run. */
  record(key: string, send: () => Promise<boolean>): Promise<boolean>;
}

/** Records only accepted sends. Consent and render changes explicitly request another attempt. */
export function createSearchViewTracker(): SearchViewTracker {
  let current: { key: string; recorded: boolean } | undefined;
  const inFlight = new Map<string, Promise<boolean>>();
  return {
    record(key, send) {
      if (current?.key !== key) current = { key, recorded: false };
      if (current.recorded) return Promise.resolve(true);
      const pending = inFlight.get(key);
      if (pending) return pending;
      const view = current;
      const attempt = Promise.resolve()
        .then(send)
        .then((accepted) => {
          if (accepted && current === view) view.recorded = true;
          return accepted;
        })
        .catch(() => false)
        .finally(() => {
          if (inFlight.get(key) === attempt) inFlight.delete(key);
        });
      inFlight.set(key, attempt);
      return attempt;
    },
  };
}
