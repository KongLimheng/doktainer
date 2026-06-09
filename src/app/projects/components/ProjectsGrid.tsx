import Link from "next/link";
import { FolderTree, Layers3, Trash2, Wrench } from "lucide-react";
import type { ProjectRecord } from "@/lib/api";

interface ProjectsGridProps {
  projects: ProjectRecord[];
  deletingProjectId: string | null;
  onEditProject: (project: ProjectRecord) => void;
  onDeleteProject: (project: ProjectRecord) => void;
}

export default function ProjectsGrid({
  projects,
  deletingProjectId,
  onEditProject,
  onDeleteProject,
}: ProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <section
        className="card"
        style={{
          padding: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <FolderTree size={30} style={{ marginBottom: 12, color: "#7dd3fc" }} />
        <h3 style={{ margin: 0 }}>No projects yet</h3>
        <p
          style={{
            color: "var(--text-muted)",
            margin: "10px auto 0",
            maxWidth: 620,
          }}
        >
          Start by creating a new project. Projects help you organize your
          environments and containers.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
        gap: 14,
      }}
    >
      {projects.map((project) => (
        <article
          key={project.id}
          className="card"
          style={{
            padding: 18,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#3b82f6",
              opacity: 0.05,
              filter: "blur(20px)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  background: "rgba(59,130,246,0.09)",
                  border: "1px solid rgba(59,130,246,0.26)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FolderTree size={18} style={{ color: "#3b82f6" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.name}
                </h3>
                <p
                  style={{
                    margin: "3px 0 0",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.description ||
                    "Project deployment for environments."}
                </p>
              </div>
            </div>
            <span
              style={{
                background: "rgba(100,116,139,0.1)",
                color: "#94a3b8",
                border: "1px solid rgba(100,116,139,0.3)",
                padding: "3px 9px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {project.environmentCount} env
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {[
              { label: "Project", value: project.slug },
              { label: "Environment", value: project.environmentCount },
              { label: "Container", value: project.containersCount },
              {
                label: "Created",
                value: new Date(project.createdAt).toLocaleDateString(),
              },
            ].map((meta) => (
              <div
                key={meta.label}
                style={{
                  background: "var(--bg-input)",
                  borderRadius: 7,
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginBottom: 2,
                  }}
                >
                  {meta.label}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontFamily: "JetBrains Mono, monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {meta.value}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => onEditProject(project)}
              style={{
                flex: "1 1 120px",
                fontSize: 11,
                padding: "5px",
              }}
            >
              <Wrench size={11} />
              Detail/Ops
            </button>
            <Link
              href={`/projects/${project.id}`}
              className="btn btn-primary"
              style={{
                flex: "1 1 120px",
                fontSize: 11,
                padding: "5px",
                textDecoration: "none",
              }}
            >
              <Layers3 size={11} />
              Open
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onDeleteProject(project)}
              disabled={deletingProjectId === project.id}
              style={{ flex: "1 1 120px", fontSize: 11, padding: "5px" }}
            >
              <Trash2 size={11} />
              {deletingProjectId === project.id ? "Deleting..." : "Remove"}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
