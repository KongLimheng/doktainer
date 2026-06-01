import prisma from "../lib/prisma";

type ServerAccessScope = {
  role: string;
  allServersAccess: boolean;
  serverIds: string[];
};

export async function getServerAccessScope(
  userId?: string | null,
): Promise<ServerAccessScope | null> {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      allServersAccess: true,
      serverAssignments: { select: { serverId: true } },
    },
  });

  if (!user) return null;

  return {
    role: user.role,
    allServersAccess: user.role === "SUPER_ADMIN" || user.allServersAccess,
    serverIds: user.serverAssignments.map((assignment) => assignment.serverId),
  };
}

export async function getAccessibleServerFilter(userId?: string | null) {
  return getAccessibleServerFilterForOrganization(userId);
}

export async function getAccessibleServerFilterForOrganization(
  userId?: string | null,
  organizationId?: string | null,
) {
  const scope = await getServerAccessScope(userId);
  if (!scope) {
    return organizationId ? { organizationId } : undefined;
  }

  if (scope.allServersAccess) {
    return organizationId ? { organizationId } : undefined;
  }

  return {
    ...(organizationId ? { organizationId } : {}),
    id: {
      in: scope.serverIds.length > 0 ? scope.serverIds : ["__no_access__"],
    },
  };
}

export async function userCanAccessServer(
  userId: string | undefined,
  serverId: string,
  organizationId?: string | null,
) {
  const filter = await getAccessibleServerFilterForOrganization(
    userId,
    organizationId,
  );

  const server = await prisma.server.findFirst({
    where: {
      id: serverId,
      ...(filter ?? {}),
    },
    select: { id: true },
  });

  return Boolean(server);
}

export async function getAccessibleServer(
  userId: string | undefined,
  serverId: string,
  organizationId?: string | null,
) {
  const filter = await getAccessibleServerFilterForOrganization(
    userId,
    organizationId,
  );

  return prisma.server.findFirst({
    where: {
      id: serverId,
      ...(filter ?? {}),
    },
  });
}
