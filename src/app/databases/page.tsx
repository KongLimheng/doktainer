"use client";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import DashboardLayout from "@/components/DashboardLayout";
import ToastViewport from "@/components/ToastViewport";
import { useState, useEffect, useCallback } from "react";
import {
  containers as containersApi,
  servers as serversApi,
  Server,
} from "@/lib/api";
import {
  readCachedPageData,
  readStoredServerSelection,
  storeServerSelection,
  writeCachedPageData,
} from "@/lib/page-state";
import { useToastManager } from "@/lib/use-toast-manager";
import AddDatabaseModal from "./components/AddDatabaseModal";
import DatabaseServerFilter from "./components/DatabaseServerFilter";
import DatabaseStatePanel from "./components/DatabaseStatePanel";
import DatabaseSummary from "./components/DatabaseSummary";
import DatabaseToolbar from "./components/DatabaseToolbar";
import DatabaseGrid from "./components/DatabaseGrid";
import { toDatabaseContainer } from "./components/database-utils";
import type { DatabaseContainer } from "./components/database-types";

const PAGE_KEY = "databases";

type PendingConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "warning" | "info";
  note?: string;
  onConfirm: () => void;
};

export default function DatabasesPage() {
  const { toasts, pushToast, dismissToast } = useToastManager();
  const [data, setData] = useState<DatabaseContainer[]>([]);
  const [serverList, setServerList] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [confirmDialog, setConfirmDialog] =
    useState<PendingConfirmAction | null>(null);

  const applyCachedState = useCallback((serverId: string) => {
    const cached = readCachedPageData<{
      items: DatabaseContainer[];
      serverList: Server[];
    }>(PAGE_KEY, serverId);

    if (!cached) return false;

    setData(cached.items);
    setServerList(cached.serverList);
    setLoading(false);
    return true;
  }, []);

  const load = useCallback(
    async (options?: { sync?: boolean; serverId?: string }) => {
      setLoading(true);
      try {
        const resolvedServerId = options?.serverId ?? "";
        const sr = await serversApi.list();
        const nextServers = sr.data ?? [];

        let ir;

        try {
          ir = options?.sync
            ? await containersApi.sync(
                resolvedServerId ? { serverId: resolvedServerId } : undefined,
              )
            : await containersApi.list(
                resolvedServerId ? { serverId: resolvedServerId } : undefined,
              );
        } catch (error) {
          if (!options?.sync) {
            throw error;
          }

          ir = await containersApi.list(
            resolvedServerId ? { serverId: resolvedServerId } : undefined,
          );
        }

        const dbs = (ir.data ?? [])
          .map(toDatabaseContainer)
          .filter((item): item is DatabaseContainer => item !== null);
        setData(dbs);
        setServerList(nextServers);
        setSelectedServerId(resolvedServerId);
        storeServerSelection(PAGE_KEY, resolvedServerId);
        writeCachedPageData(
          PAGE_KEY,
          {
            items: dbs,
            serverList: nextServers,
          },
          resolvedServerId,
        );
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const storedServerId = readStoredServerSelection(PAGE_KEY);
    setSelectedServerId(storedServerId);
    const hasCache = applyCachedState(storedServerId);
    if (!hasCache) {
      void load({ sync: false, serverId: storedServerId });
    }
  }, [applyCachedState, load]);

  const handleAction = async (
    container: DatabaseContainer,
    action: "start" | "stop",
  ) => {
    setActioning(container.id);
    try {
      await containersApi.action(container.id, action);
      setData((current) =>
        current.map((item) =>
          item.id === container.id
            ? { ...item, status: action === "start" ? "RUNNING" : "STOPPED" }
            : item,
        ),
      );
      pushToast({
        tone: "success",
        title: "Database Action",
        message: `${container.name} ${action === "start" ? "started" : "stopped"} successfully`,
        showProgress: true,
      });
    } catch (err: unknown) {
      pushToast({
        tone: "error",
        title: "Database Action",
        message: err instanceof Error ? err.message : "Action failed",
        showProgress: true,
      });
    } finally {
      setActioning(null);
    }
  };

  const removeDatabase = async (id: string, name: string) => {
    setRemoving(id);
    try {
      await containersApi.action(id, "rm");
      setData((prev) => prev.filter((d) => d.id !== id));
      pushToast({
        tone: "success",
        title: "Database Removed",
        message: `${name} removed successfully`,
        showProgress: true,
      });
    } catch (err: unknown) {
      pushToast({
        tone: "error",
        title: "Database Removed",
        message: err instanceof Error ? err.message : "Remove failed",
        showProgress: true,
      });
    } finally {
      setRemoving(null);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    setConfirmDialog({
      title: "Remove Database",
      description: `Remove database "${name}"?`,
      confirmLabel: "Remove Database",
      tone: "danger",
      note: "The database container will be removed from the selected server.",
      onConfirm: () => {
        void removeDatabase(id, name);
      },
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await load({ sync: true, serverId: selectedServerId });
      pushToast({
        tone: "success",
        title: "Sync Complete",
        message: "Database inventory refreshed successfully",
        showProgress: true,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleServerChange = async (serverId: string) => {
    if (serverId === selectedServerId) return;
    storeServerSelection(PAGE_KEY, serverId);
    setSelectedServerId(serverId);
    const hasCache = applyCachedState(serverId);
    if (!hasCache) {
      await load({ sync: false, serverId });
    }
  };

  const query = search.trim().toLowerCase();
  const filteredData = data.filter((db) => {
    if (!query) return true;

    return (
      db.name.toLowerCase().includes(query) ||
      db.image.toLowerCase().includes(query) ||
      db.databaseLabel.toLowerCase().includes(query) ||
      db.databaseType.toLowerCase().includes(query) ||
      (db.server?.name ?? "").toLowerCase().includes(query) ||
      (db.server?.ip ?? "").toLowerCase().includes(query)
    );
  });
  const running = data.filter((d) => d.status === "RUNNING").length;

  return (
    <DashboardLayout
      title="Databases"
      subtitle="Manage database instances across all servers"
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
      {showAdd && (
        <AddDatabaseModal
          serverList={serverList}
          onClose={() => setShowAdd(false)}
          onAdded={() => load({ sync: true, serverId: selectedServerId })}
        />
      )}
      <div
        className="animate-slide-in"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <DatabaseSummary
          total={data.length}
          running={running}
          serverCount={new Set(data.map((d) => d.serverId)).size}
          typeCount={new Set(data.map((d) => d.databaseType)).size}
        />
        <DatabaseServerFilter
          serverList={serverList}
          selectedServerId={selectedServerId}
          onChange={handleServerChange}
        />
        <DatabaseToolbar
          search={search}
          syncing={syncing}
          onSearchChange={setSearch}
          onSync={handleSync}
          onAdd={() => setShowAdd(true)}
        />
        <DatabaseStatePanel
          loading={loading}
          isEmpty={filteredData.length === 0}
          searchActive={Boolean(search.trim())}
          onAdd={() => setShowAdd(true)}
        />
        {/* Cards */}
        {!loading && filteredData.length > 0 && (
          <DatabaseGrid
            filteredData={filteredData}
            actioning={actioning}
            removing={removing}
            onAction={handleAction}
            onRemove={handleRemove}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
