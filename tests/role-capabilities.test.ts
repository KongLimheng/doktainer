import assert from "node:assert/strict";
import test from "node:test";

import { getRoleCapabilities } from "../src/lib/rbac";

test("viewer stays read-only in frontend capabilities", () => {
  const capabilities = getRoleCapabilities("VIEWER");

  assert.equal(capabilities.isReadOnly, true);
  assert.equal(capabilities.canManageInfrastructure, false);
  assert.equal(capabilities.canManageDeveloperTools, false);
  assert.equal(capabilities.canManageUsers, false);
});

test("developer keeps technical management capabilities without admin rights", () => {
  const capabilities = getRoleCapabilities("DEVELOPER");

  assert.equal(capabilities.isReadOnly, false);
  assert.equal(capabilities.canManageInfrastructure, true);
  assert.equal(capabilities.canManageDeveloperTools, true);
  assert.equal(capabilities.canManageUsers, false);
  assert.equal(capabilities.canManageSettings, false);
});

test("operator inherits developer rights and user administration", () => {
  const capabilities = getRoleCapabilities("OPERATOR");

  assert.equal(capabilities.canManageInfrastructure, true);
  assert.equal(capabilities.canManageUsers, true);
  assert.equal(capabilities.canManageSettings, true);
  assert.equal(capabilities.canManageUserRoles, false);
});
