import prisma from "../lib/prisma";
import { LogCategory, LogLevel } from "@prisma/client";

interface LogEntry {
  userId?: string;
  organizationId?: string;
  serverId?: string;
  action: string;
  category: LogCategory;
  level?: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
}

async function resolveOrganizationId(entry: LogEntry) {
  if (entry.organizationId) return entry.organizationId;

  if (entry.serverId) {
    const server = await prisma.server.findUnique({
      where: { id: entry.serverId },
      select: { organizationId: true },
    });

    if (server) return server.organizationId;
  }

  if (entry.userId) {
    const user = await prisma.user.findUnique({
      where: { id: entry.userId },
      select: { activeOrganizationId: true },
    });

    if (user?.activeOrganizationId) return user.activeOrganizationId;
  }

  return undefined;
}

export async function auditLog(entry: LogEntry): Promise<void> {
  try {
    const organizationId = await resolveOrganizationId(entry);

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        organizationId,
        serverId: entry.serverId,
        action: entry.action,
        category: entry.category,
        level: entry.level ?? LogLevel.INFO,
        message: entry.message,
        meta: entry.meta as object | undefined,
      },
    });
  } catch (err) {
    // Never let logging crash the main flow
    console.error("[AuditLog] Failed to write log:", err);
  }
}

export async function getLogs(opts: {
  organizationId?: string;
  serverId?: string;
  category?: LogCategory;
  level?: LogLevel;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const {
    organizationId,
    serverId,
    category,
    level,
    search,
    limit = 100,
    offset = 0,
  } = opts;

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where: {
        organizationId,
        serverId,
        category,
        level,
        ...(search
          ? { message: { contains: search, mode: "insensitive" } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: { select: { name: true, email: true } },
        server: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({
      where: {
        organizationId,
        serverId,
        category,
        level,
        ...(search
          ? { message: { contains: search, mode: "insensitive" } }
          : {}),
      },
    }),
  ]);

  return { logs, total };
}
