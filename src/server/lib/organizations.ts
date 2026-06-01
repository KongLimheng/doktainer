import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

export interface OrganizationListItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  serverCount: number;
}

function slugifyOrganizationName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "organization";
}

async function generateUniqueOrganizationSlug(db: DbClient, name: string) {
  const base = slugifyOrganizationName(name);
  let slug = base;
  let counter = 2;

  while (await db.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function listOrganizationsForUser(
  userId: string,
): Promise<OrganizationListItem[]> {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: {
      isDefault: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
              servers: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    logoUrl: membership.organization.logoUrl,
    isDefault: membership.isDefault,
    createdAt: membership.organization.createdAt,
    updatedAt: membership.organization.updatedAt,
    memberCount: membership.organization._count.members,
    serverCount: membership.organization._count.servers,
  }));
}

export async function createOrganizationForUser(
  db: DbClient,
  input: {
    userId: string;
    name: string;
    logoUrl?: string | null;
    createdById?: string;
    makeDefault?: boolean;
  },
) {
  const name = input.name.trim() || "My Organization";
  const slug = await generateUniqueOrganizationSlug(db, name);

  if (input.makeDefault ?? true) {
    await db.organizationMembership.updateMany({
      where: { userId: input.userId },
      data: { isDefault: false },
    });
  }

  const organization = await db.organization.create({
    data: {
      name,
      slug,
      logoUrl: input.logoUrl ?? null,
      createdById: input.createdById ?? input.userId,
    },
  });

  await db.organizationMembership.create({
    data: {
      organizationId: organization.id,
      userId: input.userId,
      isDefault: input.makeDefault ?? true,
    },
  });

  if (input.makeDefault ?? true) {
    await db.user.update({
      where: { id: input.userId },
      data: { activeOrganizationId: organization.id },
    });
  }

  return organization;
}

export async function setDefaultOrganizationForUser(
  db: DbClient,
  userId: string,
  organizationId: string,
) {
  await db.organizationMembership.updateMany({
    where: { userId },
    data: { isDefault: false },
  });

  await db.organizationMembership.update({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    data: { isDefault: true },
  });

  await db.user.update({
    where: { id: userId },
    data: { activeOrganizationId: organizationId },
  });
}

export async function userHasOrganizationAccess(
  userId: string,
  organizationId: string,
) {
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: { organizationId: true },
  });

  return Boolean(membership);
}
