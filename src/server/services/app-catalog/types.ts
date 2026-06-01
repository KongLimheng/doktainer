import { AppTemplate } from "../../config/app-templates";

export type CatalogSourceMode =
  | "local"
  | "auto-detect"
  | "manifest-url"
  | "github-archive";

export interface CatalogMeta {
  source: CatalogSourceMode;
  label: string;
  url?: string;
  fetchedAt: string;
  isRemote: boolean;
  cached?: boolean;
  expiresAt?: string;
  format?: string;
}

export interface CatalogSyncResult {
  templates: AppTemplate[];
  meta: CatalogMeta;
}

export interface CatalogSourceOption {
  id: CatalogSourceMode;
  label: string;
  description: string;
  requiresUrl: boolean;
  placeholder?: string;
  exampleUrl?: string;
}

export interface CacheEntry {
  templates: AppTemplate[];
  meta: CatalogMeta;
  expiresAt: number;
}
