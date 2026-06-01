import { Container } from "@/lib/api";
import { DB_META, DatabaseKind } from "./database-constants";
import type { DatabaseContainer } from "./database-types";

export function detectDatabaseType(container: Container): DatabaseKind | null {
  const source = `${container.name} ${container.image}`.toLowerCase();

  if (source.includes("postgres")) return "postgres";
  if (source.includes("mariadb")) return "mariadb";
  if (source.includes("mysql")) return "mysql";
  if (source.includes("mongo")) return "mongodb";
  if (source.includes("redis")) return "redis";

  return null;
}

export function extractPort(container: Container, fallback: string): string {
  const firstPort = container.ports[0];
  if (!firstPort) return fallback;

  const hostMatch = firstPort.match(/:(\d+)->/);
  if (hostMatch?.[1]) return hostMatch[1];

  const containerMatch = firstPort.match(/(\d+)\/(tcp|udp)/i);
  if (containerMatch?.[1]) return containerMatch[1];

  return fallback;
}

export function toDatabaseContainer(
  container: Container,
): DatabaseContainer | null {
  const databaseType = detectDatabaseType(container);
  if (!databaseType) return null;

  const meta = DB_META[databaseType];

  return {
    ...container,
    databaseType,
    databaseLabel: meta.label,
    databaseColor: meta.color,
    exposedPort: extractPort(container, meta.port),
  };
}
