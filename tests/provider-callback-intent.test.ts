import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import { markGitProviderCallbackIntent } from "../src/lib/git-provider-callback-intent.ts";

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;

beforeEach(() => {
  const cookieJar: string[] = [];

  globalThis.window = {
    location: {
      protocol: "https:",
    },
  } as Window;

  globalThis.document = {
    get cookie() {
      return cookieJar.join("; ");
    },
    set cookie(value: string) {
      cookieJar.push(value);
    },
  } as Document;
});

afterEach(() => {
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }

  if (originalDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = originalDocument;
  }
});

test("marks callback intent with a provider-scoped secure cookie", () => {
  markGitProviderCallbackIntent("gitlab");

  assert.match(document.cookie, /vps_git_callback_intent_gitlab=/);
  assert.match(document.cookie, /Path=\/api\/providers\/gitlab\/callback/);
  assert.match(document.cookie, /SameSite=Lax/);
  assert.match(document.cookie, /Secure/);
});
