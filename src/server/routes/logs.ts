import { FastifyInstance } from "fastify";
import { authenticate, requireApiKeyPermission } from "../middleware/auth";
import { getLogs } from "../services/audit.service";
import { LogCategory, LogLevel } from "@prisma/client";

export async function logsRoutes(app: FastifyInstance) {
  // GET /logs — paginated audit logs
  app.get(
    "/",
    { preHandler: [authenticate, requireApiKeyPermission("read:logs")] },
    async (req, reply) => {
      const {
        serverId,
        category,
        level,
        search,
        limit = "100",
        offset = "0",
      } = req.query as Record<string, string>;

      const result = await getLogs({
        organizationId: req.organizationId,
        serverId,
        category: category as LogCategory | undefined,
        level: level as LogLevel | undefined,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return reply.send({
        success: true,
        data: result.logs,
        total: result.total,
      });
    },
  );
}
