import {
  getSensitiveStorageItem,
  removeSensitiveStorageItem,
  sensitiveStorageKeys,
  setSensitiveStorageItem,
} from "@/lib/browser-storage";

const ORGANIZATION_STORAGE_KEY = "vps_active_organization";
const ORGANIZATION_EVENT = "vps:organization-changed";

export function getStoredOrganizationId(): string | null {
  return getSensitiveStorageItem(sensitiveStorageKeys.organization);
}

export function setStoredOrganizationId(organizationId: string | null): void {
  if (typeof window === "undefined") return;

  if (organizationId) {
    setSensitiveStorageItem(sensitiveStorageKeys.organization, organizationId);
  } else {
    removeSensitiveStorageItem(sensitiveStorageKeys.organization);
  }

  window.dispatchEvent(new CustomEvent(ORGANIZATION_EVENT));
}

export function clearStoredOrganizationId(): void {
  setStoredOrganizationId(null);
}

export function addOrganizationStateListener(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(ORGANIZATION_EVENT, listener as EventListener);

  return () => {
    window.removeEventListener(ORGANIZATION_EVENT, listener as EventListener);
  };
}
