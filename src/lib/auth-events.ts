const AUTH_EVENT = "vps-auth-changed";

export function emitAuthStateChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function addAuthStateListener(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(AUTH_EVENT, listener);
  return () => window.removeEventListener(AUTH_EVENT, listener);
}
