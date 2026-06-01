import assert from "node:assert/strict";
import test from "node:test";

import {
  buildManagedNginxFileBase,
  buildManagedNginxSharedFileBase,
  getDomainConfigAnchor,
} from "../../src/server/services/domain-provisioning/names";

test("isolated nginx config uses a single domain file name", () => {
  assert.equal(
    buildManagedNginxFileBase("my-next-app", "app.example.com"),
    "app.example.com",
  );
});

test("shared nginx config anchor uses the common parent domain", () => {
  assert.equal(
    getDomainConfigAnchor([
      "api.example.com",
      "admin.example.com",
      "app.example.com",
    ]),
    "example.com",
  );

  assert.equal(
    buildManagedNginxSharedFileBase("my-next-app", [
      "api.example.com",
      "admin.example.com",
      "app.example.com",
    ]),
    "example.com",
  );
});

test("shared nginx config anchor keeps service files separate across roots", () => {
  assert.equal(
    getDomainConfigAnchor(["app.example.com", "app.example.net"]),
    "example.com",
  );

  assert.equal(
    buildManagedNginxSharedFileBase("my-next-app", [
      "*.example.com",
      "api.example.com",
    ]),
    "example.com",
  );
});
