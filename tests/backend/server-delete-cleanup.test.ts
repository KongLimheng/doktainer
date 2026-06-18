import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

function assertEnvironmentCleanupBeforeServerDelete(source: string) {
  const environmentCleanup = source.indexOf("tx.environment.deleteMany");
  const serverDelete = source.indexOf("tx.server.delete");

  assert.notEqual(environmentCleanup, -1);
  assert.notEqual(serverDelete, -1);
  assert.ok(
    environmentCleanup < serverDelete,
    "server deletion must remove environments before deleting servers",
  );
}

function assertStorageDestinationCleanupBeforeServerDelete(source: string) {
  const storageCleanup = source.indexOf("tx.userStorageDestination.deleteMany");
  const serverDelete = source.indexOf("tx.server.delete");

  assert.notEqual(storageCleanup, -1);
  assert.notEqual(serverDelete, -1);
  assert.ok(
    storageCleanup < serverDelete,
    "server deletion must remove server-specific storage destinations before deleting servers",
  );
}

test("server deletion removes dependent records before deleting the server", () => {
  const source = readSource("src/server/routes/servers.ts");

  assertEnvironmentCleanupBeforeServerDelete(source);
  assertStorageDestinationCleanupBeforeServerDelete(source);
});

test("organization deletion removes dependent records before deleting servers", () => {
  const source = readSource("src/server/routes/organizations.ts");

  assertEnvironmentCleanupBeforeServerDelete(source);
  assertStorageDestinationCleanupBeforeServerDelete(source);
});
