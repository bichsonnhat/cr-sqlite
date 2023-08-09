import { tags } from "@vlcn.io/ws-common";
import config, { DB } from "./config.js";
import InboundStream from "./streams/InboundStream.js";
import OutboundStream from "./streams/OutboundStream.js";
import { Transport } from "./transport/Transport.js";

export default class SyncedDB {
  readonly #transport;
  readonly #inboundStream;
  readonly #outboundStream;
  readonly #db;

  constructor(db: DB, transport: Transport) {
    this.#db = db;
    this.#transport = transport;
    this.#inboundStream = new InboundStream(db, transport);
    this.#outboundStream = new OutboundStream(db, transport);
    this.#transport.onChangesReceived = this.#inboundStream.receiveChanges;
    this.#transport.onStartStreaming = this.#outboundStream.startStreaming;
    // If a peer rejects our changes we may need to restart at some prior version
    this.#transport.onResetStream = this.#outboundStream.resetStream;
  }

  async start() {
    const lastSeens = await this.#db.getLastSeens();
    const [schemaName, schemaVersion] =
      await this.#db.getSchemaNameAndVersion();
    // Prepare the inbound stream to receive changes from upstreams
    this.#inboundStream.prepare(lastSeens);
    // Announce our presence that we're ready to start receiving and sending changes
    this.#transport.announcePresence({
      _tag: tags.AnnouncePresence,
      lastSeens,
      schemaName,
      schemaVersion,
      sender: this.#db.siteid,
    });
  }

  stop() {
    this.#outboundStream.stop();
    this.#transport.close();
    return true;
  }
}

export async function createSyncedDB<T>(
  dbname: string,
  transportOptions: T
): Promise<SyncedDB> {
  const db = await config.dbProvider(dbname);
  const transport = config.transportProvider(dbname, transportOptions);
  return new SyncedDB(db, transport);
}
