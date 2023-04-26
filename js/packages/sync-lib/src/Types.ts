export type Config = {
  /**
   * Service name is available in case you host many different sync services.
   * Maybe you have several where each get their own schema and db dirs.
   */
  readonly serviceName: string;
  /**
   * Where schema files should be uploaded to on your server.
   */
  readonly schemasDir: string;
  /**
   * Where SQLite databases should be created and persisted.
   */
  readonly dbsDir: string;

  // readonly connectionProvider: (path: string) => DB | DBAsync
};

export type Seq = readonly [bigint, number];

export type CID = string;
export type QuoteConcatedPKs = string;
export type TableName = string;
export type Version = bigint;
export type Val = string | null;

export type Tag = {
  applyChanges: 0;
  getChanges: 1;
  establishStream: 2;
  ackChanges: 3;
};

export const tags: Tag = {
  applyChanges: 0,
  getChanges: 1,
  establishStream: 2,
  ackChanges: 3,
};

export type Change = readonly [
  TableName,
  QuoteConcatedPKs,
  CID,
  Val,
  Version, // col version
  Version // db version
  // site_id is omitted. Will be applied by the receiver
  // who always knows site ids in client-server setup.
  // server masks site ids of clients. This masking
  // is disallowed in p2p topologies.
];

export type MSg =
  | ApplyChangesMsg
  | GetChangesMsg
  | EstablishStreamMsg
  | AckChangesMsg;

export type ApplyChangesMsg = {
  readonly _tag: Tag["applyChanges"];
  /**
   * The database to apply the changes to.
   */
  readonly toDbid: string;
  /**
   * The database sending the changes.
   */
  readonly fromDbid: string;
  /**
   * Given the protocol is stateless, we need to pass the schema version
   * on every request.
   *
   * This ensures the client does not try to sync changes to the server
   * during a schema mismatch.
   */
  readonly schemaVersion: string;
  /**
   * The versioning information of the database sending the changes.
   */
  readonly seqStart: Seq;

  /**
   * The changes to apply
   */
  readonly changes: readonly Change[];
};

export type GetChangesMsg = {
  readonly _tag: Tag["getChanges"];
  /**
   * The db from which to get the changes
   */
  readonly dbid: string;
  /**
   * Since when?
   */
  readonly since: Seq;
  /**
   * The schema version of the requestor.
   * Changes will not be sent if there is a mismatch.
   */
  readonly schemaVersion: string;
  /**
   * For query based sync, the query id(s) to get changes for.
   * TODO: do we need a seq per query id?
   */
  readonly queryIds?: readonly string[];
};

/**
 * Start streaming changes to made to dbid to the client.
 * Starting from the version indicated by seqStart.
 */
export type EstablishStreamMsg = {
  readonly _tag: Tag["establishStream"];
  readonly dbid: string;
  readonly seqStart: Seq;
  readonly schemaVersion: string;
  /**
   * For query based sync, the query id(s) to get changes for.
   */
  readonly queryIds?: readonly string[];
};

export type AckChangesMsg = {
  readonly _tag: Tag["ackChanges"];
  readonly seqEnd: Seq;
  // TODO: queryIds?
};
