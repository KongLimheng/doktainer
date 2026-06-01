import { EnvironmentKind, Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { auditLog } from "../services/audit.service";

type DbClient = typeof prisma | Prisma.TransactionClient;

const EnvironmentKindSchema = z.enum([
  "PRODUCTION",
  "STAGING",
  "DEVELOPMENT",
  "PREVIEW",
  "CUSTOM",
]);

const ProjectEnvironmentInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: EnvironmentKindSchema,
  serverId: z.string().trim().min(1),
  description: z.string().trim().max(240).optional().or(z.literal("")),
});

const ProjectCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  environments: z.array(ProjectEnvironmentInputSchema).max(12).default([]),
});

const EnvironmentCreateSchema = ProjectEnvironmentInputSchema;

const EnvironmentUpdateSchema = ProjectEnvironmentInputSchema;

const EnvironmentContainersSchema = z.object({
  containerIds: z.array(z.string().trim().min(1)).max(200),
});

const DeleteSchema = z.object({
  confirmation: z.literal("DELETE"),
});

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "item";
}

async function generateUniqueProjectSlug(
  db: DbClient,
  organizationId: string,
  name: string,
) {
  const base = slugify(name);
  let slug = base;
  let counter = 2;

  while (
    await db.project.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    })
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

async function generateUniqueEnvironmentSlug(
  db: DbClient,
  projectId: string,
  name: string,
) {
  const base = slugify(name);
  let slug = base;
  let counter = 2;

  while (
    await db.environment.findFirst({
      where: { projectId, slug },
      select: { id: true },
    })
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

function validateReservedEnvironmentKinds(
  environments: Array<{ kind: EnvironmentKind }>,
) {
  const seen = new Set<EnvironmentKind>();

  for (const environment of environments) {
    if (environment.kind === "CUSTOM") {
      continue;
    }

    if (seen.has(environment.kind)) {
      return environment.kind;
    }

    seen.add(environment.kind);
  }

  return null;
}

async function ensureServersBelongToOrganization(
  organizationId: string,
  serverIds: string[],
) {
  const uniqueServerIds = [...new Set(serverIds)];
  if (uniqueServerIds.length === 0) {
    return new Map<string, { id: string; name: string }>();
  }

  const servers = await prisma.server.findMany({
    where: {
      organizationId,
      id: { in: uniqueServerIds },
    },
    select: { id: true, name: true },
  });

  if (servers.length !== uniqueServerIds.length) {
    throw new Error(
      "One or more selected servers are invalid for this organization",
    );
  }

  return new Map(servers.map((server) => [server.id, server]));
}

async function getProjectByIdForOrganization(
  projectId: string,
  organizationId: string,
) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId },
    include: {
      environments: {
        orderBy: [{ createdAt: "asc" }],
        include: {
          server: {
            select: {
              id: true,
              name: true,
              ip: true,
              status: true,
            },
          },
          _count: {
            select: { containers: true },
          },
        },
      },
      _count: {
        select: { environments: true },
      },
    },
  });
}

function serializeProject(
  project: NonNullable<
    Awaited<ReturnType<typeof getProjectByIdForOrganization>>
  >,
) {
  const containersCount = project.environments.reduce(
    (total, environment) => total + environment._count.containers,
    0,
  );

  return {
    id: project.id,
    organizationId: project.organizationId,
    name: project.name,
    slug: project.slug,
    description: project.description,
    environmentCount: project._count.environments,
    containersCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    environments: project.environments.map((environment) => ({
      id: environment.id,
      projectId: environment.projectId,
      serverId: environment.serverId,
      name: environment.name,
      slug: environment.slug,
      kind: environment.kind,
      description: environment.description,
      containersCount: environment._count.containers,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
      server: environment.server,
    })),
  };
}

function serializeEnvironment(
  environment: Prisma.EnvironmentGetPayload<{
    include: {
      server: {
        select: {
          id: true;
          name: true;
          ip: true;
          status: true;
        };
      };
      _count: {
        select: { containers: true };
      };
    };
  }>,
) {
  return {
    id: environment.id,
    projectId: environment.projectId,
    serverId: environment.serverId,
    name: environment.name,
    slug: environment.slug,
    kind: environment.kind,
    description: environment.description,
    containersCount: environment._count.containers,
    createdAt: environment.createdAt,
    updatedAt: environment.updatedAt,
    server: environment.server,
  };
}

export async function projectsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [authenticate] }, async (req, reply) => {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return reply.status(400).send({
        success: false,
        error: "Active organization is required",
      });
    }

    const projects = await prisma.project.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        environments: {
          orderBy: [{ createdAt: "asc" }],
          include: {
            server: {
              select: {
                id: true,
                name: true,
                ip: true,
                status: true,
              },
            },
            _count: {
              select: { containers: true },
            },
          },
        },
        _count: {
          select: { environments: true },
        },
      },
    });

    return reply.send({
      success: true,
      data: projects.map(serializeProject),
    });
  });

  app.get("/:id", { preHandler: [authenticate] }, async (req, reply) => {
    const organizationId = req.organizationId;
    if (!organizationId) {
      return reply.status(400).send({
        success: false,
        error: "Active organization is required",
      });
    }

    const { id } = req.params as { id: string };
    const project = await getProjectByIdForOrganization(id, organizationId);

    if (!project) {
      return reply
        .status(404)
        .send({ success: false, error: "Project not found" });
    }

    return reply.send({
      success: true,
      data: serializeProject(project),
    });
  });

  app.post(
    "/",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return reply
          .status(400)
          .send({ success: false, error: "Active organization is required" });
      }

      const body = ProjectCreateSchema.safeParse(req.body);
      if (!body.success) {
        return reply
          .status(400)
          .send({ success: false, error: body.error.flatten() });
      }

      const duplicateKind = validateReservedEnvironmentKinds(
        body.data.environments,
      );
      if (duplicateKind) {
        return reply.status(400).send({
          success: false,
          error: `Environment kind ${duplicateKind} can only be used once per project`,
        });
      }

      try {
        await ensureServersBelongToOrganization(
          organizationId,
          body.data.environments.map((environment) => environment.serverId),
        );

        const project = await prisma.$transaction(async (tx) => {
          const createdProject = await tx.project.create({
            data: {
              organizationId,
              name: body.data.name,
              slug: await generateUniqueProjectSlug(
                tx,
                organizationId,
                body.data.name,
              ),
              description: body.data.description || null,
            },
          });

          for (const environment of body.data.environments) {
            await tx.environment.create({
              data: {
                projectId: createdProject.id,
                serverId: environment.serverId,
                name: environment.name,
                slug: await generateUniqueEnvironmentSlug(
                  tx,
                  createdProject.id,
                  environment.name,
                ),
                kind: environment.kind,
                description: environment.description || null,
              },
            });
          }

          return createdProject;
        });

        const freshProject = await getProjectByIdForOrganization(
          project.id,
          organizationId,
        );
        if (!freshProject) {
          throw new Error("Project created but could not be loaded");
        }

        await auditLog({
          userId: req.userId,
          organizationId,
          action: "PROJECT_CREATE",
          category: "SYSTEM",
          level: "SUCCESS",
          message: `Project \"${freshProject.name}\" created with ${freshProject.environments.length} environment(s)`,
        });

        return reply
          .status(201)
          .send({ success: true, data: serializeProject(freshProject) });
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create project",
        });
      }
    },
  );

  app.post(
    "/:id/environments",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return reply
          .status(400)
          .send({ success: false, error: "Active organization is required" });
      }

      const { id } = req.params as { id: string };
      const body = EnvironmentCreateSchema.safeParse(req.body);
      if (!body.success) {
        return reply
          .status(400)
          .send({ success: false, error: body.error.flatten() });
      }

      const project = await prisma.project.findFirst({
        where: { id, organizationId },
        include: { environments: { select: { kind: true } } },
      });

      if (!project) {
        return reply
          .status(404)
          .send({ success: false, error: "Project not found" });
      }

      if (
        body.data.kind !== "CUSTOM" &&
        project.environments.some(
          (environment) => environment.kind === body.data.kind,
        )
      ) {
        return reply.status(409).send({
          success: false,
          error: `Environment kind ${body.data.kind} already exists in this project`,
        });
      }

      try {
        await ensureServersBelongToOrganization(organizationId, [
          body.data.serverId,
        ]);

        const environment = await prisma.environment.create({
          data: {
            projectId: project.id,
            serverId: body.data.serverId,
            name: body.data.name,
            slug: await generateUniqueEnvironmentSlug(
              prisma,
              project.id,
              body.data.name,
            ),
            kind: body.data.kind,
            description: body.data.description || null,
          },
          include: {
            server: {
              select: {
                id: true,
                name: true,
                ip: true,
                status: true,
              },
            },
            _count: {
              select: { containers: true },
            },
          },
        });

        await auditLog({
          userId: req.userId,
          organizationId,
          action: "PROJECT_ENVIRONMENT_CREATE",
          category: "SYSTEM",
          level: "INFO",
          message: `Environment \"${environment.name}\" added to project \"${project.name}\"`,
        });

        return reply.status(201).send({
          success: true,
          data: serializeEnvironment(environment),
        });
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create environment",
        });
      }
    },
  );

  app.patch(
    "/environments/:environmentId",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return reply
          .status(400)
          .send({ success: false, error: "Active organization is required" });
      }

      const { environmentId } = req.params as { environmentId: string };
      const body = EnvironmentUpdateSchema.safeParse(req.body);
      if (!body.success) {
        return reply
          .status(400)
          .send({ success: false, error: body.error.flatten() });
      }

      const environment = await prisma.environment.findFirst({
        where: {
          id: environmentId,
          project: { organizationId },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              environments: {
                where: { id: { not: environmentId } },
                select: { kind: true },
              },
            },
          },
          _count: { select: { containers: true } },
        },
      });

      if (!environment) {
        return reply
          .status(404)
          .send({ success: false, error: "Environment not found" });
      }

      if (
        body.data.kind !== "CUSTOM" &&
        environment.project.environments.some(
          (projectEnvironment) => projectEnvironment.kind === body.data.kind,
        )
      ) {
        return reply.status(409).send({
          success: false,
          error: `Environment kind ${body.data.kind} already exists in this project`,
        });
      }

      try {
        await ensureServersBelongToOrganization(organizationId, [
          body.data.serverId,
        ]);

        if (
          body.data.serverId !== environment.serverId &&
          environment._count.containers > 0
        ) {
          return reply.status(409).send({
            success: false,
            error:
              "Detach containers before moving this environment to another server.",
          });
        }

        const updatedEnvironment = await prisma.environment.update({
          where: { id: environment.id },
          data: {
            serverId: body.data.serverId,
            name: body.data.name,
            slug:
              body.data.name === environment.name
                ? environment.slug
                : await generateUniqueEnvironmentSlug(
                    prisma,
                    environment.projectId,
                    body.data.name,
                  ),
            kind: body.data.kind,
            description: body.data.description || null,
          },
          include: {
            server: {
              select: {
                id: true,
                name: true,
                ip: true,
                status: true,
              },
            },
            _count: {
              select: { containers: true },
            },
          },
        });

        await auditLog({
          userId: req.userId,
          organizationId,
          action: "PROJECT_ENVIRONMENT_UPDATE",
          category: "SYSTEM",
          level: "INFO",
          message: `Environment \"${updatedEnvironment.name}\" updated in project \"${environment.project.name}\"`,
        });

        return reply.send({
          success: true,
          data: serializeEnvironment(updatedEnvironment),
        });
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update environment",
        });
      }
    },
  );

  app.put(
    "/environments/:environmentId/containers",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return reply
          .status(400)
          .send({ success: false, error: "Active organization is required" });
      }

      const { environmentId } = req.params as { environmentId: string };
      const body = EnvironmentContainersSchema.safeParse(req.body);
      if (!body.success) {
        return reply
          .status(400)
          .send({ success: false, error: body.error.flatten() });
      }

      const environment = await prisma.environment.findFirst({
        where: {
          id: environmentId,
          project: { organizationId },
        },
        include: {
          project: { select: { name: true } },
        },
      });

      if (!environment) {
        return reply
          .status(404)
          .send({ success: false, error: "Environment not found" });
      }

      const containerIds = [...new Set(body.data.containerIds)];
      const selectedContainers =
        containerIds.length > 0
          ? await prisma.container.findMany({
              where: {
                id: { in: containerIds },
                serverId: environment.serverId,
                server: { organizationId },
              },
              select: { id: true },
            })
          : [];

      if (selectedContainers.length !== containerIds.length) {
        return reply.status(400).send({
          success: false,
          error:
            "One or more selected containers are invalid for this environment server.",
        });
      }

      const updatedEnvironment = await prisma.$transaction(async (tx) => {
        await tx.container.updateMany({
          where: {
            environmentId: environment.id,
            ...(containerIds.length > 0 ? { id: { notIn: containerIds } } : {}),
          },
          data: { environmentId: null },
        });

        if (containerIds.length > 0) {
          await tx.container.updateMany({
            where: {
              id: { in: containerIds },
              serverId: environment.serverId,
              server: { organizationId },
            },
            data: { environmentId: environment.id },
          });
        }

        return tx.environment.findUniqueOrThrow({
          where: { id: environment.id },
          include: {
            server: {
              select: {
                id: true,
                name: true,
                ip: true,
                status: true,
              },
            },
            _count: {
              select: { containers: true },
            },
          },
        });
      });

      await auditLog({
        userId: req.userId,
        organizationId,
        action: "PROJECT_ENVIRONMENT_CONTAINERS_UPDATE",
        category: "SYSTEM",
        level: "INFO",
        message: `Environment \"${environment.name}\" container assignments updated in project \"${environment.project.name}\"`,
      });

      return reply.send({
        success: true,
        data: serializeEnvironment(updatedEnvironment),
      });
    },
  );

  app.delete(
    "/:id",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return reply
          .status(400)
          .send({ success: false, error: "Active organization is required" });
      }

      const { id } = req.params as { id: string };
      const body = DeleteSchema.safeParse(req.body);
      if (!body.success) {
        return reply
          .status(400)
          .send({ success: false, error: body.error.flatten() });
      }

      const project = await prisma.project.findFirst({
        where: { id, organizationId },
        include: {
          environments: {
            select: {
              _count: { select: { containers: true } },
            },
          },
        },
      });

      if (!project) {
        return reply
          .status(404)
          .send({ success: false, error: "Project not found" });
      }

      const attachedContainers = project.environments.reduce(
        (total, environment) => total + environment._count.containers,
        0,
      );
      const attachedEnvironments = project.environments.length;

      if (attachedEnvironments > 0) {
        return reply.status(409).send({
          success: false,
          error:
            "Project still has environments. Delete all environments before deleting this project.",
        });
      }

      if (attachedContainers > 0) {
        return reply.status(409).send({
          success: false,
          error:
            "Project still has environments linked to containers. Reassign or remove those containers first.",
        });
      }

      await prisma.project.delete({ where: { id: project.id } });

      await auditLog({
        userId: req.userId,
        organizationId,
        action: "PROJECT_DELETE",
        category: "SYSTEM",
        level: "WARNING",
        message: `Project \"${project.name}\" deleted`,
      });

      return reply.send({ success: true, message: "Project deleted" });
    },
  );

  app.delete(
    "/environments/:environmentId",
    { preHandler: [requireRole("DEVELOPER")] },
    async (req, reply) => {
      const organizationId = req.organizationId;
      if (!organizationId) {
        return reply
          .status(400)
          .send({ success: false, error: "Active organization is required" });
      }

      const { environmentId } = req.params as { environmentId: string };
      const body = DeleteSchema.safeParse(req.body);
      if (!body.success) {
        return reply
          .status(400)
          .send({ success: false, error: body.error.flatten() });
      }

      const environment = await prisma.environment.findFirst({
        where: {
          id: environmentId,
          project: { organizationId },
        },
        include: {
          project: { select: { name: true } },
          _count: { select: { containers: true } },
        },
      });

      if (!environment) {
        return reply
          .status(404)
          .send({ success: false, error: "Environment not found" });
      }

      if (environment._count.containers > 0) {
        return reply.status(409).send({
          success: false,
          error:
            "Environment is still linked to containers. Reassign or remove those containers first.",
        });
      }

      await prisma.environment.delete({ where: { id: environment.id } });

      await auditLog({
        userId: req.userId,
        organizationId,
        action: "PROJECT_ENVIRONMENT_DELETE",
        category: "SYSTEM",
        level: "WARNING",
        message: `Environment \"${environment.name}\" removed from project \"${environment.project.name}\"`,
      });

      return reply.send({ success: true, message: "Environment deleted" });
    },
  );
}
