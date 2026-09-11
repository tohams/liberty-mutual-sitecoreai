interface PageVisit {
  key: string;
  recorded: boolean;
  pending?: Promise<void>;
}

/** Retain only the current navigation, so returning to a page creates a new VIEW. */
export class PortalPageViews {
  private current?: PageVisit;

  clear() {
    this.current = undefined;
  }

  record(
    key: string,
    prepare: () => Promise<boolean>,
    send: () => Promise<unknown>,
  ): Promise<void> {
    if (this.current?.key !== key) this.current = { key, recorded: false };
    const visit = this.current;
    if (visit.recorded) return Promise.resolve();
    if (visit.pending) return visit.pending;

    const pending = Promise.resolve()
      .then(async () => {
        // Navigation or logout may supersede an optional identity lookup.
        if (
          this.current !== visit ||
          !(await prepare()) ||
          this.current !== visit
        )
          return;
        const receipt = await send();
        if (this.current === visit && receipt) visit.recorded = true;
      })
      .catch(() => {
        // A failed attempt can be retried by the next effect for this visit.
      })
      .finally(() => {
        if (visit.pending === pending) visit.pending = undefined;
      });
    visit.pending = pending;
    return pending;
  }
}
