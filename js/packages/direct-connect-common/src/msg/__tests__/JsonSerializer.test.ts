import { test, expect } from "vitest";
import JsonSerializer from "../JsonSerializer";
import { tags } from "../../types";
import fc from "fast-check";

test("encoded, decode pairing ApplyChangesMsg", () => {
  fc.assert(
    fc.property(
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.bigIntN(64),
      fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })),
      fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })),
      fc.array(
        fc.tuple(
          fc.string(),
          fc.string(),
          fc.string(),
          fc.string(),
          fc.bigIntN(64),
          fc.bigIntN(64)
        )
      ),
      (toDbid, fromDbid, schemaVersion, seqStart, seqEnd, changes) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.applyChanges,
          toDbid,
          fromDbid,
          schemaVersion,
          seqStart,
          seqEnd,
          changes,
        } as const;
        const encoded = serializer.encode(msg);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

test("encode, decode pairing for GetChangesMsg", () => {
  fc.assert(
    fc.property(
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })),
      fc.bigIntN(64),
      (dbid, requestorDbid, since, schemaVersion) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.getChanges,
          dbid,
          requestorDbid,
          since,
          schemaVersion,
        } as const;
        const encoded = serializer.encode(msg);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

// Now repeat for all other Msg types
test("encode, decode pairing for EstablishOutboundStreamMsg", () => {
  fc.assert(
    fc.property(
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })),
      fc.bigIntN(64),
      (toDbid, fromDbid, seqStart, schemaVersion) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.establishOutboundStream,
          toDbid,
          fromDbid,
          seqStart,
          schemaVersion,
        } as const;
        const encoded = serializer.encode(msg);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

test("encode, decode pairing for AckChangesMsg", () => {
  fc.assert(
    fc.property(fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })), (seqEnd) => {
      const serializer = new JsonSerializer();
      const msg = { _tag: tags.ackChanges, seqEnd } as const;
      const encoded = serializer.encode(msg);
      const decoded = serializer.decode(encoded);
      expect(decoded).toEqual(msg);
    })
  );
});

test("StreamingChangesMsg", () => {
  fc.assert(
    fc.property(
      fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })),
      fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })),
      fc.array(
        fc.tuple(
          fc.string(),
          fc.string(),
          fc.string(),
          fc.string(),
          fc.bigIntN(64),
          fc.bigIntN(64)
        )
      ),
      (seqStart, seqEnd, changes) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.streamingChanges,
          seqStart,
          seqEnd,
          changes,
        } as const;
        const encoded = serializer.encode(msg);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

test("ApplyChangesResponse", () => {
  fc.assert(
    fc.property(
      fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })),
      fc.oneof(
        fc.constant("ok"),
        fc.constant("schemaMismatch"),
        fc.constant("outOfOrder")
      ),
      (seqEnd, status) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.applyChangesResponse,
          seqEnd,
          status,
        } as const;
        const encoded = serializer.encode(msg as any);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

test("CreateOrMigrateResponse", () => {
  fc.assert(
    fc.property(
      fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })),
      fc.oneof(
        fc.constant("noop"),
        fc.constant("apply"),
        fc.constant("migrate")
      ),
      (seq, status) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.createOrMigrateResponse,
          seq,
          status,
        } as const;
        const encoded = serializer.encode(msg as any);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

test("CreateOrMigrateMsg", () => {
  fc.assert(
    fc.property(
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.string(),
      fc.bigIntN(64),
      (dbid, requestorDbid, schemaName, schemaVersion) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.createOrMigrate,
          dbid,
          requestorDbid,
          schemaName,
          schemaVersion,
        } as const;
        const encoded = serializer.encode(msg);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

test("GetLastSeenMsg", () => {
  fc.assert(
    fc.property(
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      fc.uint8Array({ minLength: 16, maxLength: 16 }),
      (toDbid, fromDbid) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.getLastSeen,
          toDbid,
          fromDbid,
        } as const;
        const encoded = serializer.encode(msg);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

test("GetLastSeenResponse", () => {
  fc.assert(
    fc.property(fc.tuple(fc.bigIntN(64), fc.integer({ min: 0 })), (seq) => {
      const serializer = new JsonSerializer();
      const msg = {
        _tag: tags.getLastSeenResponse,
        seq,
      } as const;
      const encoded = serializer.encode(msg);
      const decoded = serializer.decode(encoded);
      expect(decoded).toEqual(msg);
    })
  );
});

test("UploadSchemaMsg", () => {
  fc.assert(
    fc.property(
      fc.string(),
      fc.bigIntN(64),
      fc.string(),
      fc.boolean(),
      (name, version, content, activate) => {
        const serializer = new JsonSerializer();
        const msg = {
          _tag: tags.uploadSchema,
          name,
          version,
          content,
          activate,
        } as const;
        const encoded = serializer.encode(msg);
        const decoded = serializer.decode(encoded);
        expect(decoded).toEqual(msg);
      }
    )
  );
});

test("ActivateSchemaMsg", () => {
  fc.assert(
    fc.property(fc.string(), fc.bigIntN(64), (name, version) => {
      const serializer = new JsonSerializer();
      const msg = {
        _tag: tags.activateSchema,
        name,
        version,
      } as const;
      const encoded = serializer.encode(msg);
      const decoded = serializer.decode(encoded);
      expect(decoded).toEqual(msg);
    })
  );
});
