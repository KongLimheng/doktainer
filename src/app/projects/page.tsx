"use client";

import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ToastViewport from "@/components/ToastViewport";
import ProjectFormModal from "@/app/projects/components/ProjectFormModal";
import ProjectsGrid from "@/app/projects/components/ProjectsGrid";
import ProjectsStatePanel from "@/app/projects/components/ProjectsStatePanel";
import ProjectsSummary from "@/app/projects/components/ProjectsSummary";
import ProjectsToolbar from "@/app/projects/components/ProjectsToolbar";
import {
  type ProjectCreateBody,
  type ProjectRecord,
  projectsApi,
} from "@/lib/api";
import { useToastManager } from "@/lib/use-toast-manager";

type PendingConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "warning" | "info";
  note?: string;
  onConfirm: () => void;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(
    null,
  );
  const [creatingProject, setCreatingProject] = useState(false);
  const [updatingProject, setUpdatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );
  const [confirmDialog, setConfirmDialog] =
    useState<PendingConfirmAction | null>(null);
  const { toasts, pushToast, dismissToast } = useToastManager();

  const load = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const projectsResponse = await projectsApi.list();
        setProjects(projectsResponse.data ?? []);
        if (showRefreshState) {
          pushToast({
            tone: "success",
            title: "Projects refreshed",
            message: "Project data has been updated.",
          });
        }
      } catch (error) {
        pushToast({
          tone: "error",
          title: "Projects load failed",
          message:
            error instanceof Error
              ? error.message
              : "Project data cannot be loaded at this time.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pushToast],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void load();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const summary = useMemo(() => {
    const environmentCount = projects.reduce(
      (total, project) => total + project.environments.length,
      0,
    );
    const containerCount = projects.reduce(
      (total, project) => total + project.containersCount,
      0,
    );
    const assignedServerCount = new Set(
      projects.flatMap((project) =>
        project.environments.map((environment) => environment.serverId),
      ),
    ).size;

    return {
      projectCount: projects.length,
      environmentCount,
      containerCount,
      assignedServerCount,
    };
  }, [projects]);

  const query = search.trim().toLowerCase();
  const filteredProjects = useMemo(() => {
    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const projectMatches =
        project.name.toLowerCase().includes(query) ||
        project.slug.toLowerCase().includes(query) ||
        (project.description ?? "").toLowerCase().includes(query);

      if (projectMatches) {
        return true;
      }

      return false;
    });
  }, [projects, query]);

  const handleCreateProject = useCallback(
    async (payload: ProjectCreateBody) => {
      setCreatingProject(true);
      try {
        const response = await projectsApi.create(payload);
        const createdProject = response.data;
        if (createdProject) {
          setProjects((current) => [createdProject, ...current]);
        }
        setShowProjectModal(false);
        pushToast({
          tone: "success",
          title: "Project created",
          message: `Project ${payload.name} has been successfully created.`,
        });
      } catch (error) {
        pushToast({
          tone: "error",
          title: "Create failed",
          message:
            error instanceof Error ? error.message : "Project creation failed.",
        });
      } finally {
        setCreatingProject(false);
      }
    },
    [pushToast],
  );

  const handleUpdateProject = useCallback(
    async (payload: ProjectCreateBody) => {
      if (!editingProject) {
        return;
      }

      setUpdatingProject(true);
      try {
        const response = await projectsApi.update(editingProject.id, {
          name: payload.name,
          description: payload.description,
        });
        const updatedProject = response.data;
        if (updatedProject) {
          setProjects((current) =>
            current.map((project) =>
              project.id === updatedProject.id ? updatedProject : project,
            ),
          );
        }
        setEditingProject(null);
        pushToast({
          tone: "success",
          title: "Project updated",
          message: `Project ${payload.name} has been successfully updated.`,
        });
      } catch (error) {
        pushToast({
          tone: "error",
          title: "Update failed",
          message:
            error instanceof Error ? error.message : "Project update failed.",
        });
      } finally {
        setUpdatingProject(false);
      }
    },
    [editingProject, pushToast],
  );

  const performDeleteProject = useCallback(
    async (project: ProjectRecord) => {
      setDeletingProjectId(project.id);
      try {
        await projectsApi.remove(project.id, { confirmation: "DELETE" });
        setProjects((current) =>
          current.filter((item) => item.id !== project.id),
        );
        pushToast({
          tone: "success",
          title: "Project deleted",
          message: `Project ${project.name} has been successfully deleted.`,
        });
      } catch (error) {
        pushToast({
          tone: "error",
          title: "Delete failed",
          message:
            error instanceof Error ? error.message : "Project deletion failed.",
        });
      } finally {
        setDeletingProjectId(null);
      }
    },
    [pushToast],
  );

  const handleDeleteProject = useCallback(
    (project: ProjectRecord) => {
      setConfirmDialog({
        title: "Delete Project",
        description: `Delete project \"${project.name}\"?`,
        confirmLabel: "Delete Project",
        tone: "danger",
        note: "Projects with environments cannot be deleted. Delete all environments first, including any connected containers inside them.",
        onConfirm: () => {
          void performDeleteProject(project);
        },
      });
    },
    [performDeleteProject],
  );

  return (
    <DashboardLayout
      title="Projects"
      subtitle="Create and manage your projects."
    >
      <ConfirmActionDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        tone={confirmDialog?.tone ?? "danger"}
        note={confirmDialog?.note}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => {
          const current = confirmDialog;
          setConfirmDialog(null);
          current?.onConfirm();
        }}
      />
      <ToastViewport
        toasts={toasts}
        onClose={dismissToast}
        position="top-right"
      />
      <div
        className="animate-slide-in"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <ProjectsSummary {...summary} />

        <ProjectsToolbar
          search={search}
          refreshing={refreshing}
          canCreate={true}
          searchPlaceholder="Filter projects..."
          refreshLabel="Refresh Projects"
          addLabel="Create Project"
          onSearchChange={setSearch}
          onRefresh={() => load(true)}
          onAdd={() => {
            setEditingProject(null);
            setShowProjectModal(true);
          }}
        />

        <ProjectsStatePanel
          loading={loading}
          isEmpty={filteredProjects.length === 0}
          searchActive={Boolean(search.trim())}
          canCreate={true}
          onAdd={() => {
            setEditingProject(null);
            setShowProjectModal(true);
          }}
        />

        {!loading && filteredProjects.length > 0 ? (
          <ProjectsGrid
            projects={filteredProjects}
            deletingProjectId={deletingProjectId}
            onEditProject={setEditingProject}
            onDeleteProject={handleDeleteProject}
          />
        ) : null}
      </div>

      {showProjectModal || editingProject ? (
        <ProjectFormModal
          project={editingProject ?? undefined}
          submitting={editingProject ? updatingProject : creatingProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
          onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        />
      ) : null}
    </DashboardLayout>
  );
}
