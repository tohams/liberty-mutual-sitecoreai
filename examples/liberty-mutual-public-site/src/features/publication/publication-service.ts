import { randomUUID } from "node:crypto";
import {
  digest,
  PublicationError,
  searchDocument,
  type SearchOperation,
} from "./content";
import type { LiveContentReader } from "./live-content";
import type { SearchWriter } from "./search-push";
import type {
  PublicationReceipt,
  PublicationState,
  PublicationStore,
} from "./receipt-store";

export interface PublicationTrigger {
  kind: "edge-publish-complete" | "cms-publish-end" | "reconcile";
  id: string;
  expectedRevisions?: Record<string, string>;
}
export class PublicationFailure extends PublicationError {
  constructor(
    code: string,
    public readonly receipt: PublicationReceipt,
  ) {
    super(code);
  }
}

export class PublicationService {
  constructor(
    private readonly reader: LiveContentReader,
    private readonly writer: SearchWriter,
    private readonly store: PublicationStore,
    private readonly pause: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async reconcile(trigger: PublicationTrigger): Promise<PublicationReceipt> {
    const lease = await this.store.acquire();
    const startedAt = new Date().toISOString();
    const receipt: PublicationReceipt = {
      id: randomUUID(),
      status: "failed",
      trigger: trigger.kind,
      startedAt,
      finishedAt: startedAt,
      upserts: 0,
      deletes: 0,
    };
    const deadline = AbortSignal.timeout(22000);
    try {
      const previous = await this.store.state();
      let answers = await this.reader.readAll(deadline);
      let hash = digest(answers);
      const ready = () => {
        if (trigger.expectedRevisions)
          return Object.entries(trigger.expectedRevisions).every(
            ([id, revision]) =>
              answers.some(
                (answer) => answer.id === id && answer.revision === revision,
              ),
          );
        // CMS publish:end can precede Edge delivery. A changed Live snapshot or an already
        // completed identical trigger is evidence; unchanged old content is not completion.
        return (
          trigger.kind !== "cms-publish-end" ||
          (!!previous &&
            (hash !== previous.snapshotHash ||
              previous.lastTriggerId === trigger.id))
        );
      };
      for (const delay of [700, 1500, 3000]) {
        if (ready()) break;
        if (deadline.aborted)
          throw new PublicationError("PUBLICATION_DEADLINE");
        await this.pause(delay);
        answers = await this.reader.readAll(deadline);
        hash = digest(answers);
      }
      if (!ready()) throw new PublicationError("AWAITING_LIVE_PUBLICATION");
      receipt.snapshotHash = hash;
      const documents: PublicationState["documents"] = {};
      const operations: SearchOperation[] = [];
      for (const answer of answers) {
        const document = searchDocument(answer);
        const documentHash = digest(document);
        documents[answer.id] = { hash: documentHash, url: answer.canonicalUrl };
        if (!previous || previous.documents[answer.id]?.hash !== documentHash)
          operations.push(document);
      }
      for (const [id, document] of Object.entries(previous?.documents ?? {})) {
        if (!documents[id])
          operations.push({
            action: "delete",
            id,
            locale: "en",
            sc_url: document.url,
          });
      }
      receipt.upserts = operations.filter(
        (operation) => operation.action === "upsert",
      ).length;
      receipt.deletes = operations.length - receipt.upserts;
      await this.writer.push(operations, deadline);
      receipt.status = operations.length ? "indexed" : "unchanged";
      receipt.finishedAt = new Date().toISOString();
      await this.store.finish(lease, receipt, {
        schemaVersion: 1,
        snapshotHash: hash,
        lastTriggerId: trigger.id,
        observedAt: receipt.finishedAt,
        documents,
      });
      return receipt;
    } catch (error) {
      receipt.errorCode =
        error instanceof PublicationError ? error.code : "PUBLICATION_FAILED";
      receipt.finishedAt = new Date().toISOString();
      // A failure never advances the manifest. Replayed upserts/deletes are idempotent.
      try {
        await this.store.finish(lease, receipt);
      } catch {
        receipt.errorCode = "PUBLICATION_RECEIPT_NOT_SAVED";
      }
      throw new PublicationFailure(receipt.errorCode, receipt);
    }
  }
}
