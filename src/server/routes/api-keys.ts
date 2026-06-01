import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../lib/prisma";
import {
  API_KEY_PERMISSIONS,
  isValidApiKeyPermission,
  normalizeApiKeyPermissions,
  requireRole,
} from "../middleware/auth";
import { auditLog } from "../services/audit.service";

function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = "vpk_" + crypto.randomBytes(24).toString("hex");
  const prefix = raw.slice(0, 12) + "_";
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

export async function apiKeysRoutes(app: FastifyInstance) {
  // GET /api-keys
  app.get(
    "/",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const keys = await prisma.apiKey.findMany({
        where: { userId: req.userId!, organizationId: req.organizationId! },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          lastUsed: true,
          expiresAt: true,
          isActive: true,
          requestCount: true,
          createdAt: true,
        },
      });
      return reply.send({ success: true, data: keys });
    },
  );

  // POST /api-keys
  app.post(
    "/",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const body = z
        .object({
          name: z.string().min(1).max(64),
          permissions: z.array(z.string()).default([]),
          expiresIn: z.enum(["never", "30d", "90d", "1y"]).default("never"),
        })
        .safeParse(req.body);
      if (!body.success)
        return reply
          .status(400)
          .send({ success: false, error: body.error.flatten() });

      const invalidPermissions = body.data.permissions.filter(
        (permission) => !isValidApiKeyPermission(permission),
      );
      if (invalidPermissions.length > 0) {
        return reply.status(400).send({
          success: false,
          error: `Invalid API key permissions: ${invalidPermissions.join(", ")}`,
          allowedPermissions: API_KEY_PERMISSIONS,
        });
      }

      const permissions = normalizeApiKeyPermissions(body.data.permissions);

      const { raw, prefix, hash } = generateApiKey();

      const expiresAt =
        body.data.expiresIn === "never"
          ? null
          : body.data.expiresIn === "30d"
            ? new Date(Date.now() + 30 * 86400000)
            : body.data.expiresIn === "90d"
              ? new Date(Date.now() + 90 * 86400000)
              : new Date(Date.now() + 365 * 86400000);

      const key = await prisma.apiKey.create({
        data: {
          name: body.data.name,
          organizationId: req.organizationId!,
          keyHash: hash,
          keyPrefix: prefix,
          permissions,
          userId: req.userId!,
          expiresAt,
        },
      });

      await auditLog({
        userId: req.userId,
        organizationId: req.organizationId,
        action: "API_KEY_CREATE",
        category: "AUTH",
        level: "INFO",
        message: `API key "${key.name}" created`,
      });

      // Return the raw key ONCE — never stored in plaintext
      return reply.status(201).send({
        success: true,
        data: { ...key, rawKey: raw },
        message: "Save this key now — it will NOT be shown again",
      });
    },
  );

  // DELETE /api-keys/:id — revoke
  app.delete(
    "/:id",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const key = await prisma.apiKey.findFirst({
        where: { id, userId: req.userId!, organizationId: req.organizationId! },
      });
      if (!key)
        return reply
          .status(404)
          .send({ success: false, error: "API key not found" });

      await prisma.apiKey.update({ where: { id }, data: { isActive: false } });
      await auditLog({
        userId: req.userId,
        organizationId: req.organizationId,
        action: "API_KEY_REVOKE",
        category: "AUTH",
        level: "WARNING",
        message: `API key "${key.name}" revoked`,
      });

      return reply.send({ success: true, message: "API key revoked" });
    },
  );
}
