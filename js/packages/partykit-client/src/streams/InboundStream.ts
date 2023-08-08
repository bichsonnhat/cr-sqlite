import {
  Changes,
  bytesToHex,
  tags,
  greaterThanOrEqual,
} from "@vlcn.io/partykit-common";
import { Transport } from "../transport/Transport";
import { DB } from "../config";

/**
 * Represents a stream of changes coming into the local
 * database from one or more remote databases.
 */
export default class InboundStream {
  readonly #transport;
  readonly #db;
  /**
   * Used to ensure changes are applied in-order from all the peers
   * that are upstream of us.
   * While we do support out-of-order delivery it is more complicated
   * to track than just doing in-order delivery.
   */
  readonly #lastSeens: Map<string, [bigint, number]> = new Map();

  constructor(db: DB, transport: Transport) {
    this.#transport = transport;
    this.#db = db;
  }

  prepare(lastSeens: [Uint8Array, [bigint, number]][]) {
    for (const entry of lastSeens) {
      this.#lastSeens.set(bytesToHex(entry[0]), entry[1]);
    }
  }

  async receiveChanges(msg: Changes) {
    const senderHex = bytesToHex(msg.sender);
    const lastSeen = this.#lastSeens.get(senderHex) || [0n, 0];

    if (!greaterThanOrEqual(lastSeen, msg.since)) {
      await this.#transport.rejectChanges({
        _tag: tags.RejectChanges,
        whose: msg.sender,
        since: lastSeen,
      });
      return;
    }

    if (msg.changes.length == 0) {
      return;
    }
    const lastChange = msg.changes[msg.changes.length - 1];
    this.#db.applyChangesetAndSetLastSeen(msg.changes, msg.sender, [
      lastChange[5],
      0,
    ]);
  }
}
