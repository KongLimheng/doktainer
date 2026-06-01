"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { UserInfo } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { canAccessRoute } from "@/lib/permissions";
import { useCurrentUser } from "@/lib/auth-state";

interface GuardedPageProps {
  route: string;
  title: string;
  subtitle?: string;
  redirectSubtitle?: string;
  redirectMessage?: string;
  currentUser?: UserInfo | null;
  children: ReactNode;
}

export default function GuardedPage({
  route,
  title,
  subtitle,
  redirectSubtitle = "Redirecting to a page you can access",
  redirectMessage = "You do not have access to this page. Redirecting...",
  currentUser: currentUserProp,
  children,
}: GuardedPageProps) {
  const router = useRouter();
  const hookUser = useCurrentUser();
  const currentUser = currentUserProp ?? hookUser;
  const canViewPage = canAccessRoute(route, currentUser?.role);

  useEffect(() => {
    if (currentUser && !canViewPage) {
      router.replace("/");
    }
  }, [canViewPage, currentUser, router]);

  if (currentUser && !canViewPage) {
    return (
      <DashboardLayout title={title} subtitle={redirectSubtitle}>
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {redirectMessage}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={title} subtitle={subtitle}>
      {children}
    </DashboardLayout>
  );
}
