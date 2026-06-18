"use client";

import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import DashboardLayout from "@/components/DashboardLayout";
import ProcessLogsModal, {
  type ProcessLogStep,
  useProcessLogsModal,
} from "@/components/ProcessLogsModal";
import ToastViewport from "@/components/ToastViewport";
import { useCallback, useEffect, useState } from "react";
import {
  containers as containersApi,
  servers as serversApi,
  type Container,
  type Server,
} from "@/lib/api";
import {
  readCachedPageData,
  readStoredServerSelection,
  storeServerSelection,
  writeCachedPageData,
} from "@/lib/page-state";
import { useTablePagination } from "@/lib/use-table-pagination";
import { useToastManager } from "@/lib/use-toast-manager";
import ContainerDetailsModal from "./components/modals/ContainerDetailsModal";
import ContainerFileManagerModal from "./components/modals/ContainerFileManagerModal";
import ContainerLogsModal from "./components/modals/ContainerLogsModal";
import ContainersServerFilter from "./components/ContainersServerFilter";
import ContainersSummary from "./components/ContainersSummary";
import ContainersTable from "./components/tables/ContainersTable";
import ContainersToolbar from "./components/ContainersToolbar";
import DeployContainerModal from "./components/modals/DeployContainerModal";

const PAGE_KEY = "containers";

type PendingConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "warning" | "info";
  note?: string;
  onConfirm: () => void;
};

function createRebuildTimeline(activeStep: number): ProcessLogStep[] {
  const steps = [
    { id: "prepare", label: "Preparing rebuild request", progress: 10 },
    {
      id: "rebuild",
      label: "Waiting for rebuild process",
      progress: "Running",
    },
    { id: "sync", label: "Syncing container inventory", progress: 85 },
    { id: "complete", label: "Rebuild completed", progress: 100 },
  ];

  return steps.map((step, index) => ({
    ...step,
    status:
      index < activeStep
        ? ("success" as const)
        : index === activeStep
          ? ("running" as const)
          : ("pending" as const),
  }));
}

function createFailedRebuildTimeline(activeStep: number): ProcessLogStep[] {
  return createRebuildTimeline(activeStep).map((step, index) =>
    index === activeStep
      ? { ...step, status: "error" as const }
      : index < activeStep
        ? { ...step, status: "success" as const }
        : { ...step, status: "pending" as const },
  );
}

export default function ContainersPage() {
  const [data, setData] = useState<Container[]>([]);
  const [serverList, setServerList] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState(() =>
    readStoredServerSelection(PAGE_KEY),
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showDeploy, setShowDeploy] = useState(false);
  const [logsFor, setLogsFor] = useState<Container | null>(null);
  const [detailFor, setDetailFor] = useState<Container | null>(null);
  const [fileManagerFor, setFileManagerFor] = useState<Container | null>(null);
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] =
    useState<PendingConfirmAction | null>(null);
  const { toasts, pushToast, dismissToast } = useToastManager();
  const {
    modalState: processLogsState,
    isProcessLogsOpen,
    openProcessLogs,
    updateProcessLogs,
    closeProcessLogs,
  } = useProcessLogsModal();

  const applyCachedState = useCallback((serverId: string) => {
    const cached = readCachedPageData<{
      items: Container[];
      serverList: Server[];
    }>(PAGE_KEY, serverId);

    if (!cached) return false;

    setData(cached.items);
    setServerList(cached.serverList);
    setLoading(false);
    return true;
  }, []);

  const load = useCallback(
    async (options?: {
      sync?: boolean;
      serverId?: string;
      silent?: boolean;
    }) => {
      if (!options?.silent) setLoading(true);

      try {
        const resolvedServerId = options?.serverId ?? "";
        const serverResponse = await serversApi.list();
        const nextServers = serverResponse.data ?? [];

        let containerResponse;

        if (options?.sync) {
          try {
            containerResponse = await containersApi.sync(
              resolvedServerId ? { serverId: resolvedServerId } : undefined,
            );
          } catch {
            containerResponse = await containersApi.list(
              resolvedServerId ? { serverId: resolvedServerId } : undefined,
            );
          }
        } else {
          containerResponse = await containersApi.list(
            resolvedServerId ? { serverId: resolvedServerId } : undefined,
          );
        }

        const nextItems = containerResponse.data ?? [];
        setData(nextItems);
        setServerList(nextServers);
        setSelectedServerId(resolvedServerId);
        storeServerSelection(PAGE_KEY, resolvedServerId);
        writeCachedPageData(
          PAGE_KEY,
          {
            items: nextItems,
            serverList: nextServers,
          },
          resolvedServerId,
        );
      } catch {
        /* auth redirect handled */
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const storedServerId = readStoredServerSelection(PAGE_KEY);
    const frame = window.requestAnimationFrame(() => {
      const hasCache = applyCachedState(storedServerId);
      void load({
        serverId: storedServerId,
        silent: hasCache,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [applyCachedState, load]);

  useEffect(() => {
    const handleWindowClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await load({ sync: true, serverId: selectedServerId });
    } finally {
      setSyncing(false);
    }
  };

  const handleServerChange = async (serverId: string) => {
    if (serverId === selectedServerId) return;
    storeServerSelection(PAGE_KEY, serverId);
    setSelectedServerId(serverId);
    const hasCache = applyCachedState(serverId);
    await load({ serverId, silent: hasCache });
  };

  const runAction = async (
    id: string,
    action: "start" | "stop" | "restart" | "delete",
  ) => {
    setActing((current) => ({ ...current, [id + action]: true }));

    try {
      const response = await containersApi.action(
        id,
        action === "delete" ? "rm" : action,
      );

      if (action === "delete") {
        setData((current) =>
          current.filter((container) => container.id !== id),
        );
      } else if (response.data) {
        setData((current) =>
          current.map((container) =>
            container.id === id
              ? { ...container, ...response.data }
              : container,
          ),
        );
      } else {
        const nextStatus =
          action === "start"
            ? "RUNNING"
            : action === "stop"
              ? "STOPPED"
              : "STARTING";
        setData((current) =>
          current.map((container) =>
            container.id === id
              ? { ...container, status: nextStatus as Container["status"] }
              : container,
          ),
        );
      }

      pushToast({
        tone: "success",
        title: "Action successful",
        message:
          action === "delete"
            ? "Container has been deleted."
            : `Container has been ${action}ed.`,
        duration: 3500,
        showProgress: true,
      });
    } catch (err: unknown) {
      pushToast({
        tone: "error",
        title: "Action failed",
        message: err instanceof Error ? err.message : "Action failed",
        duration: 6000,
        showProgress: true,
      });
    } finally {
      setActing((current) => ({ ...current, [id + action]: false }));
    }
  };

  const runRebuild = async (container: Container) => {
    setActing((current) => ({ ...current, [container.id + "rebuild"]: true }));
    const baseTerminalLines = [
      `[rebuild] Starting rebuild for ${container.name}`,
      `[rebuild] Source: ${container.sourceType ?? "unknown"}`,
      `[rebuild] Server ID: ${container.serverId}`,
    ];
    let latestTerminalLines = [...baseTerminalLines];

    const updateProcessTerminal = (
      lines: string[],
      patch: Parameters<typeof updateProcessLogs>[0] = {},
    ) => {
      latestTerminalLines = lines;
      updateProcessLogs({
        terminalLogs: latestTerminalLines,
        ...patch,
      });
    };

    openProcessLogs({
      title: `Rebuild Logs - ${container.name}`,
      description:
        "Rebuild progress, inventory sync, and terminal-style output for this request.",
      imageUrl: "/assets/images/img-chibi-fixing.png",
      imageAlt: "Illustration of a character fixing something",
      timelineLogs: createRebuildTimeline(0),
      terminalLogs: latestTerminalLines,
      initialTab: "timeline",
      statusLabel: "Starting",
    });

    try {
      latestTerminalLines = [
        ...baseTerminalLines,
        "[rebuild] Creating backend rebuild job",
      ];
      updateProcessLogs({
        timelineLogs: createRebuildTimeline(1),
        terminalLogs: latestTerminalLines,
        statusLabel: "Starting",
      });

      const jobResponse = await containersApi.createRebuildJob(container.id);
      const job = jobResponse.data;
      let finalStatus = job.status;
      let finalError = job.error;

      updateProcessTerminal(
        [
          ...latestTerminalLines,
          `[job] Rebuild job created: ${job.id}`,
          "[job] Streaming backend rebuild logs",
        ],
        {
          timelineLogs: createRebuildTimeline(1),
          statusLabel: "Streaming",
        },
      );

      await containersApi.streamJob(job.id, {
        onLog: (entry) => {
          updateProcessTerminal([...latestTerminalLines, entry.message], {
            timelineLogs: createRebuildTimeline(1),
            statusLabel: "Streaming",
          });
        },
        onStatus: (nextJob) => {
          finalStatus = nextJob.status;
          finalError = nextJob.error;
        },
      });

      if (finalStatus === "error") {
        throw new Error(finalError || "Rebuild job failed");
      }

      updateProcessLogs({
        timelineLogs: createRebuildTimeline(2),
        terminalLogs: [
          ...latestTerminalLines,
          "[rebuild] Rebuild command completed",
          "[rebuild] Refreshing container inventory",
        ].filter(Boolean),
        statusLabel: "Syncing",
      });

      await load({
        sync: true,
        serverId: selectedServerId,
        silent: true,
      });

      updateProcessLogs({
        timelineLogs: createRebuildTimeline(3).map((step) => ({
          ...step,
          status: "success",
        })),
        terminalLogs: [
          ...latestTerminalLines,
          "[rebuild] Rebuild command completed",
          "[rebuild] Container inventory refreshed",
          "[rebuild] Done",
        ].filter(Boolean),
        statusLabel: "100%",
      });

      pushToast({
        tone: "success",
        title: "Rebuild scheduled",
        message: `Container "${container.name}" berhasil direbuild.`,
        duration: 4500,
        showProgress: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Rebuild failed";
      updateProcessLogs({
        timelineLogs: createFailedRebuildTimeline(1),
        terminalLogs: [
          ...baseTerminalLines,
          "[rebuild] Rebuild failed",
          `[error] ${message}`,
        ],
        statusLabel: "Failed",
      });

      pushToast({
        tone: "error",
        title: "Rebuild failed",
        message,
        duration: 6000,
        showProgress: true,
      });
    } finally {
      setActing((current) => ({
        ...current,
        [container.id + "rebuild"]: false,
      }));
    }
  };

  const handleAction = async (
    id: string,
    action: "start" | "stop" | "restart" | "delete",
  ) => {
    if (action !== "delete") {
      await runAction(id, action);
      return;
    }

    const container = data.find((item) => item.id === id);
    setConfirmDialog({
      title: "Delete Container",
      description: container
        ? `Delete container "${container.name}"?`
        : "Delete this container?",
      confirmLabel: "Delete Container",
      tone: "danger",
      note: "This removes the container from Docker on the selected server.",
      onConfirm: () => {
        void runAction(id, action);
      },
    });
  };

  const handleRebuild = (container: Container) => {
    const isGitSource =
      container.sourceType === "GIT_CLONE" ||
      container.sourceType === "GIT_PROVIDER";

    setConfirmDialog({
      title: "Rebuild Container",
      description: `Rebuild container "${container.name}" now?`,
      confirmLabel: "Rebuild Container",
      tone: "warning",
      note: isGitSource
        ? "Doktainer will fetch the latest changes from the repository, rebuild the image if necessary, and then redeploy the container."
        : "The container will be stopped, removed, and then restarted. Doktainer will attempt to pull the latest image first if available in the registry.",
      onConfirm: () => {
        void runRebuild(container);
      },
    });
  };

  const filtered = data.filter((container) => {
    const matchesSearch =
      !search ||
      container.name.toLowerCase().includes(search.toLowerCase()) ||
      container.image.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || container.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pagination = useTablePagination({
    items: filtered,
    resetKey: `${search}|${statusFilter}|${selectedServerId}`,
  });

  const stats = {
    total: data.length,
    running: data.filter((container) => container.status === "RUNNING").length,
    stopped: data.filter((container) => container.status === "STOPPED").length,
    paused: data.filter((container) => container.status === "PAUSED").length,
    error: data.filter((container) => container.status === "ERROR").length,
  };

  return (
    <DashboardLayout
      title="Containers"
      subtitle="Manage Docker containers across all servers"
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

      {showDeploy ? (
        <DeployContainerModal
          serverList={serverList}
          onClose={() => setShowDeploy(false)}
          onDeployed={load}
          onProcessOpen={openProcessLogs}
          onProcessUpdate={updateProcessLogs}
          onToast={pushToast}
        />
      ) : null}
      {logsFor ? (
        <ContainerLogsModal
          container={logsFor}
          onClose={() => setLogsFor(null)}
        />
      ) : null}
      {detailFor ? (
        <ContainerDetailsModal
          key={detailFor.id}
          container={detailFor}
          onClose={() => setDetailFor(null)}
        />
      ) : null}
      {fileManagerFor ? (
        <ContainerFileManagerModal
          key={fileManagerFor.id}
          container={fileManagerFor}
          onClose={() => setFileManagerFor(null)}
        />
      ) : null}
      <ProcessLogsModal
        open={isProcessLogsOpen}
        onClose={closeProcessLogs}
        closeOnOverlayClick={false}
        {...(processLogsState ?? {
          title: "Process Logs",
          timelineLogs: [],
          terminalLogs: "",
        })}
      />

      <div
        className="animate-slide-in"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <ContainersSummary
          total={stats.total}
          running={stats.running}
          stopped={stats.stopped}
          pausedAndError={stats.paused + stats.error}
        />
        <ContainersServerFilter
          serverList={serverList}
          selectedServerId={selectedServerId}
          onChange={handleServerChange}
        />
        <ContainersToolbar
          search={search}
          statusFilter={statusFilter}
          syncing={syncing}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          onSync={handleSync}
          onDeploy={() => setShowDeploy(true)}
        />
        <ContainersTable
          loading={loading}
          items={filtered}
          paginatedItems={pagination.paginatedItems}
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          startItem={pagination.startItem}
          endItem={pagination.endItem}
          acting={acting}
          openMenuId={openMenuId}
          onPageChange={pagination.setCurrentPage}
          onAction={handleAction}
          onOpenDetails={setDetailFor}
          onOpenLogs={setLogsFor}
          onOpenFileManager={setFileManagerFor}
          onRebuild={handleRebuild}
          onMenuToggle={(containerId) =>
            setOpenMenuId((current) =>
              current === containerId ? null : containerId,
            )
          }
          onMenuClose={() => setOpenMenuId(null)}
        />
      </div>
    </DashboardLayout>
  );
}
