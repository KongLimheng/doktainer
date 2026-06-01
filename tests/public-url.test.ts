import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicHttpsUrl,
  resolvePublicAppOrigin,
  resolvePublicAppUrl,
} from "../src/server/lib/public-url";

const originalWindow = globalThis.window;

test("prefers configured public URL over runtime request data", () => {
  const origin = resolvePublicAppOrigin({
    env: {
      ...process.env,
      FRONTEND_URL: "https://panel.example.com/",
    },
    headers: {
      host: "10.0.0.5:3000",
      "x-forwarded-proto": "http",
    },
    protocol: "http",
  });

  assert.equal(origin, "https://panel.example.com");
});

test("ignores bind-only env origins like 0.0.0.0 and falls back to request origin", () => {
  const origin = resolvePublicAppOrigin({
    env: {
      ...process.env,
      FRONTEND_URL: "http://0.0.0.0:3000",
      NEXT_PUBLIC_PANEL_URL: "",
    },
    headers: {
      "x-forwarded-host": "panel.example.com",
      "x-forwarded-proto": "https",
    },
    protocol: "http",
  });

  assert.equal(origin, "https://panel.example.com");
});

test("builds origin from forwarded request headers when no env URL exists", () => {
  const env = {
    ...process.env,
    FRONTEND_URL: "",
    NEXT_PUBLIC_PANEL_URL: "",
  };

  const origin = resolvePublicAppOrigin({
    env,
    headers: {
      "x-forwarded-host": "panel.example.com",
      "x-forwarded-proto": "https",
    },
    protocol: "http",
  });

  assert.equal(origin, "https://panel.example.com");
  assert.equal(
    resolvePublicAppUrl("/invite/token-123", {
      env,
      headers: {
        "x-forwarded-host": "panel.example.com",
        "x-forwarded-proto": "https",
      },
      protocol: "http",
    }),
    "https://panel.example.com/invite/token-123",
  );
});

test("falls back to browser origin before localhost when running in the browser", () => {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        origin: "https://runtime.example.com",
      },
    },
    configurable: true,
    writable: true,
  });

  const origin = resolvePublicAppOrigin({
    env: {
      ...process.env,
      FRONTEND_URL: "",
      NEXT_PUBLIC_PANEL_URL: "",
    },
  });

  assert.equal(origin, "https://runtime.example.com");
});

test("recognizes only public https URLs as valid public panel URLs", () => {
  assert.equal(isPublicHttpsUrl("https://panel.example.com"), true);
  assert.equal(isPublicHttpsUrl("http://panel.example.com"), false);
  assert.equal(isPublicHttpsUrl("https://localhost:3000"), false);
});

test.afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
    return;
  }

  Object.defineProperty(globalThis, "window", {
    value: originalWindow,
    configurable: true,
    writable: true,
  });
});
