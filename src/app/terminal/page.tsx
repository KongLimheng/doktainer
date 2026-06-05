"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  ChevronDown,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  servers as serversApi,
  terminal as terminalApi,
  Server as ServerType,
} from "@/lib/api";
import { createClientId } from "@/lib/random-id";
import { sanitizeTerminalStreamChunk } from "@/lib/terminal-output";
import { useSearchParams } from "next/navigation";

interface Tab {
  id: string;
  sessionId: string;
  serverId: string;
  serverName: string;
  serverIp: string;
  label: string;
  status: "connecting" | "connected" | "disconnected" | "error";
}

const STORAGE_KEY = "terminal_tabs_v1";
const INPUT_CHUNK_SIZE = 8192;
const INPUT_BACKPRESSURE_THRESHOLD = 256 * 1024;
const IMMEDIATE_INPUT_MAX_LENGTH = 4;

function readStoredTabs(): Tab[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Tab[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((tab) => ({
      ...tab,
      label: tab.label || tab.serverName,
    }));
  } catch {
    return [];
  }
}

function writeStoredTabs(tabs: Tab[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

function getServerSessionLabel(
  serverId: string,
  serverName: string,
  existingTabs: Tab[],
) {
  const sameServerCount = existingTabs.filter(
    (tab) => tab.serverId === serverId,
  ).length;

  return sameServerCount === 0
    ? serverName
    : `${serverName} (${sameServerCount + 1})`;
}

function TerminalPane({
  tab,
  isActive,
  onStatusChange,
}: {
  tab: Tab;
  isActive: boolean;
  onStatusChange: (tabId: string, status: Tab["status"]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const pendingResizeFrameRef = useRef<number | null>(null);
  const pendingInputTimeoutRef = useRef<number | null>(null);
  const pendingOutputFrameRef = useRef<number | null>(null);
  const pendingInputBufferRef = useRef("");
  const pendingOutputBufferRef = useRef("");
  const encoderRef = useRef<TextEncoder | null>(null);
  const isDisposedRef = useRef(false);

  const flushOutputBuffer = useCallback(() => {
    pendingOutputFrameRef.current = null;

    const term = termRef.current;
    const bufferedOutput = pendingOutputBufferRef.current;
    pendingOutputBufferRef.current = "";

    if (!term || !bufferedOutput) return;
    term.write(bufferedOutput);
  }, []);

  const scheduleOutputFlush = useCallback(() => {
    if (pendingOutputFrameRef.current !== null) return;

    pendingOutputFrameRef.current = requestAnimationFrame(() => {
      flushOutputBuffer();
    });
  }, [flushOutputBuffer]);

  const enqueueTerminalOutput = useCallback(
    (chunk: string) => {
      pendingOutputBufferRef.current += chunk;
      scheduleOutputFlush();
    },
    [scheduleOutputFlush],
  );

  const flushInputBuffer = useCallback(function flushInputBuffer() {
    pendingInputTimeoutRef.current = null;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (ws.bufferedAmount > INPUT_BACKPRESSURE_THRESHOLD) {
      pendingInputTimeoutRef.current = window.setTimeout(() => {
        flushInputBuffer();
      }, 16);
      return;
    }

    const bufferedInput = pendingInputBufferRef.current;
    if (!bufferedInput) return;

    const nextChunk = bufferedInput.slice(0, INPUT_CHUNK_SIZE);
    pendingInputBufferRef.current = bufferedInput.slice(nextChunk.length);

    const encoder = encoderRef.current ?? new TextEncoder();
    encoderRef.current = encoder;
    ws.send(encoder.encode(nextChunk));

    if (pendingInputBufferRef.current) {
      pendingInputTimeoutRef.current = window.setTimeout(() => {
        flushInputBuffer();
      }, 0);
    }
  }, []);

  const scheduleInputFlush = useCallback(() => {
    if (pendingInputTimeoutRef.current !== null) return;

    pendingInputTimeoutRef.current = window.setTimeout(() => {
      flushInputBuffer();
    }, 0);
  }, [flushInputBuffer]);

  const sendImmediateInput = useCallback((data: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    if (ws.bufferedAmount > INPUT_CHUNK_SIZE) return false;

    const encoder = encoderRef.current ?? new TextEncoder();
    encoderRef.current = encoder;
    ws.send(encoder.encode(data));
    return true;
  }, []);

  const flushResize = useCallback(() => {
    const term = termRef.current;
    const fitAddon = fitRef.current;
    const ws = wsRef.current;
    const container = containerRef.current;

    if (!term || !fitAddon || !container || isDisposedRef.current) return;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    try {
      fitAddon.fit();
    } catch {
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows,
        }),
      );
    }
  }, []);

  const scheduleResize = useCallback(() => {
    if (pendingResizeFrameRef.current !== null) {
      cancelAnimationFrame(pendingResizeFrameRef.current);
    }

    pendingResizeFrameRef.current = requestAnimationFrame(() => {
      pendingResizeFrameRef.current = requestAnimationFrame(() => {
        flushResize();
      });
    });
  }, [flushResize]);

  useEffect(() => {
    if (!containerRef.current) return;
    // Lazy-load xterm to avoid SSR issues
    let destroyed = false;
    isDisposedRef.current = false;

    async function init() {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (destroyed) return;

      const term = new Terminal({
        theme: {
          background: "#0d1117",
          foreground: "#e6edf3",
          cursor: "#58a6ff",
          black: "#0d1117",
          brightBlack: "#6e7681",
          red: "#ff7b72",
          brightRed: "#ffa198",
          green: "#3fb950",
          brightGreen: "#56d364",
          yellow: "#d29922",
          brightYellow: "#e3b341",
          blue: "#58a6ff",
          brightBlue: "#79c0ff",
          magenta: "#bc8cff",
          brightMagenta: "#d2a8ff",
          cyan: "#39c5cf",
          brightCyan: "#56d4dd",
          white: "#b1bac4",
          brightWhite: "#f0f6fc",
        },
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
        fontSize: 13,
        lineHeight: 1.3,
        cursorBlink: true,
        allowTransparency: true,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current!);
      term.element?.classList.add("terminal-pane__xterm");
      if (term.element) {
        term.element.style.width = "100%";
        term.element.style.height = "100%";
      }

      try {
        fitAddon.fit();
      } catch {
        // Fallback to the scheduled resize pass when the pane is not measurable yet.
      }

      termRef.current = term;
      fitRef.current = fitAddon;
      scheduleResize();

      // Connect WebSocket
      const cols = Math.max(term.cols || 0, 80);
      const rows = Math.max(term.rows || 0, 24);
      const ticketResponse = await terminalApi.wsTicket(
        tab.serverId,
        tab.sessionId,
      );
      if (destroyed) return;
      const wsUrl = terminalApi.wsUrl(tab.serverId, cols, rows, {
        sessionId: tab.sessionId,
        ticket: ticketResponse.data.ticket,
      });
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      onStatusChange(tab.id, "connecting");

      ws.onopen = () => {
        onStatusChange(tab.id, "connected");
        enqueueTerminalOutput(
          "\x1b[32m✔ SSH connection established\x1b[0m\r\n",
        );
        term.focus();
        if (pendingInputBufferRef.current) {
          scheduleInputFlush();
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === "ready")
            enqueueTerminalOutput(sanitizeTerminalStreamChunk(msg.data));
          if (msg.type === "data")
            enqueueTerminalOutput(sanitizeTerminalStreamChunk(msg.data));
          if (msg.type === "error")
            enqueueTerminalOutput(
              "\x1b[31m" +
                sanitizeTerminalStreamChunk(msg.data) +
                "\x1b[0m\r\n",
            );
          if (msg.type === "exit")
            enqueueTerminalOutput("\x1b[33m\r\n[Shell exited]\x1b[0m\r\n");
        } catch {
          enqueueTerminalOutput(sanitizeTerminalStreamChunk(ev.data as string));
        }
      };

      ws.onerror = () => {
        onStatusChange(tab.id, "error");
        enqueueTerminalOutput("\x1b[31m\r\n✖ WebSocket error\x1b[0m\r\n");
      };

      ws.onclose = () => {
        onStatusChange(tab.id, "disconnected");
        enqueueTerminalOutput("\x1b[33m\r\n[Connection closed]\x1b[0m\r\n");
      };

      // Send input to server
      term.onData((data) => {
        if (
          data.length <= IMMEDIATE_INPUT_MAX_LENGTH &&
          pendingInputBufferRef.current.length === 0 &&
          sendImmediateInput(data)
        ) {
          return;
        }

        pendingInputBufferRef.current += data;
        scheduleInputFlush();
      });

      // Resize handler
      const resizeObs = new ResizeObserver(() => {
        scheduleResize();
      });
      resizeObs.observe(containerRef.current!);
      resizeObserverRef.current = resizeObs;

      return () => {
        resizeObs.disconnect();
        resizeObserverRef.current = null;
      };
    }

    const cleanup = init();

    return () => {
      destroyed = true;
      isDisposedRef.current = true;
      if (pendingResizeFrameRef.current !== null) {
        cancelAnimationFrame(pendingResizeFrameRef.current);
        pendingResizeFrameRef.current = null;
      }
      if (pendingOutputFrameRef.current !== null) {
        cancelAnimationFrame(pendingOutputFrameRef.current);
        pendingOutputFrameRef.current = null;
      }
      if (pendingInputTimeoutRef.current !== null) {
        window.clearTimeout(pendingInputTimeoutRef.current);
        pendingInputTimeoutRef.current = null;
      }
      pendingInputBufferRef.current = "";
      pendingOutputBufferRef.current = "";
      encoderRef.current = null;
      resizeObserverRef.current?.disconnect();
      cleanup.then((fn) => fn?.());
      wsRef.current?.close();
      termRef.current?.dispose();
      termRef.current = null;
      wsRef.current = null;
      fitRef.current = null;
    };
  }, [
    onStatusChange,
    enqueueTerminalOutput,
    sendImmediateInput,
    scheduleInputFlush,
    scheduleResize,
    tab.id,
    tab.serverId,
    tab.sessionId,
  ]);

  useEffect(() => {
    if (isActive) {
      scheduleResize();
      termRef.current?.focus();
    }
  }, [isActive, scheduleResize]);

  return (
    <div
      ref={containerRef}
      className="terminal-pane"
      onMouseDown={() => termRef.current?.focus()}
      style={{
        position: "absolute",
        inset: 0,
        background: "#0d1117",
        visibility: isActive ? "visible" : "hidden",
        pointerEvents: isActive ? "auto" : "none",
        zIndex: isActive ? 1 : 0,
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "8px 8px 18px",
        margin: "5px 5px 0 0",
      }}
    />
  );
}

function TerminalPageContent() {
  const searchParams = useSearchParams();
  const [serverList, setServerList] = useState<ServerType[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickerError, setPickerError] = useState("");

  useEffect(() => {
    Promise.all([serversApi.list(), terminalApi.sessions()])
      .then(([serversRes, sessionsRes]) => {
        const nextServers = serversRes.data ?? [];
        const remoteSessions = sessionsRes.data ?? [];
        const storedTabs = readStoredTabs();
        const restoredTabs = storedTabs.filter((tab) =>
          nextServers.some((server) => server.id === tab.serverId),
        );
        const mergedTabs = [...restoredTabs];

        for (const session of remoteSessions) {
          if (mergedTabs.some((tab) => tab.sessionId === session.id)) continue;
          mergedTabs.push({
            id: session.id,
            sessionId: session.id,
            serverId: session.serverId,
            serverName: session.serverName,
            serverIp: session.serverIp,
            label: getServerSessionLabel(
              session.serverId,
              session.serverName,
              mergedTabs,
            ),
            status: "disconnected",
          });
        }

        setServerList(nextServers);
        setTabs(mergedTabs);
        setActiveTab(mergedTabs[0]?.id ?? null);
        writeStoredTabs(mergedTabs);
      })
      .catch((err: unknown) => {
        setPickerError(
          err instanceof Error ? err.message : "Failed to load terminal data",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    writeStoredTabs(tabs);
  }, [tabs]);

  const openTab = useCallback(
    (
      serverId: string,
      name: string,
      ip: string,
      options?: { reuseExisting?: boolean },
    ) => {
      setTabs((current) => {
        const existing = current.find((tab) => tab.serverId === serverId);
        if (options?.reuseExisting && existing) {
          setActiveTab(existing.id);
          setShowPicker(false);
          return current;
        }

        const id = `${serverId}-${Date.now()}`;
        const tab: Tab = {
          id,
          sessionId: createClientId(),
          serverId,
          serverName: name,
          serverIp: ip,
          label: getServerSessionLabel(serverId, name, current),
          status: "connecting",
        };
        setActiveTab(id);
        setShowPicker(false);
        return [...current, tab];
      });
    },
    [],
  );

  // Auto-open tab from query param (e.g. from Servers page "Terminal" button)
  useEffect(() => {
    const serverId = searchParams.get("serverId");
    const name = searchParams.get("name") || "server";
    const ip = searchParams.get("ip") || "";
    if (!serverId || serverList.length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      openTab(serverId, name, ip, { reuseExisting: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [openTab, searchParams, serverList]);

  const closeTab = useCallback(
    async (id: string) => {
      const target = tabs.find((tab) => tab.id === id);
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeTab === id) setActiveTab(next[next.length - 1]?.id ?? null);
        return next;
      });

      if (target) {
        try {
          await terminalApi.closeSession(target.sessionId);
        } catch {
          /* ignore session cleanup failures */
        }
      }
    },
    [activeTab, tabs],
  );

  const updateTabStatus = useCallback(
    (tabId: string, status: Tab["status"]) => {
      setTabs((current) =>
        current.map((tab) => (tab.id === tabId ? { ...tab, status } : tab)),
      );
    },
    [],
  );

  const addTab = (server: ServerType) => {
    openTab(server.id, server.name, server.ip);
  };

  return (
    <DashboardLayout
      title="SSH Terminal"
      subtitle="Multi-session interactive shell"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          height: "calc(100vh - 120px)",
        }}
      >
        {/* Tab bar */}
        <div
          className="card"
          style={{
            borderRadius: "10px 10px 0 0",
            padding: "0",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
            overflow: "visible",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              overflowX: "auto",
              gap: 0,
            }}
          >
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  cursor: "pointer",
                  borderRight: "1px solid var(--border)",
                  background:
                    activeTab === tab.id
                      ? "var(--bg-secondary)"
                      : "transparent",
                  borderBottom:
                    activeTab === tab.id
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  minWidth: 160,
                  whiteSpace: "nowrap",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background:
                      tab.status === "connected"
                        ? "#10b981"
                        : tab.status === "connecting"
                          ? "#f59e0b"
                          : "#ef4444",
                    flexShrink: 0,
                  }}
                />
                <TerminalIcon
                  size={12}
                  style={{ color: "var(--text-muted)", flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color:
                      activeTab === tab.id
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {tab.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                    marginLeft: 4,
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Add tab button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowPicker(!showPicker)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={13} />
                New Session
                <ChevronDown size={11} />
              </button>
            </div>
          </div>

          {/* Status info */}
          <div style={{ padding: "0 16px", flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {tabs.length} session{tabs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Terminal area */}
        <div
          style={{
            flex: 1,
            background: "#0d1117",
            borderRadius: "0 0 10px 10px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {tabs.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 16,
              }}
            >
              <TerminalIcon
                size={48}
                style={{ color: "var(--text-muted)", opacity: 0.3 }}
              />
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 15,
                    marginBottom: 6,
                  }}
                >
                  No active sessions
                </p>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  Click the New Session button to open an SSH terminal
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: 13 }}
                onClick={() => setShowPicker(true)}
              >
                <Plus size={14} /> Open Session
              </button>
            </div>
          ) : (
            tabs.map((tab) => (
              <TerminalPane
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onStatusChange={updateTabStatus}
              />
            ))
          )}
        </div>
      </div>

      {showPicker && (
        <div
          className="modal-overlay"
          onClick={() => setShowPicker(false)}
          style={{ zIndex: 200 }}
        >
          <div
            className="modal"
            style={{ maxWidth: 480, width: "100%" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Open Terminal Session
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  Choose a server to open or restore an SSH session.
                </p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {pickerError && (
              <div
                className="card"
                style={{
                  padding: 12,
                  marginBottom: 12,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={14} />
                <span style={{ fontSize: 12 }}>{pickerError}</span>
              </div>
            )}

            <div
              style={{
                maxHeight: 320,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--bg-input)",
              }}
            >
              {loading ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <Loader2
                    size={16}
                    className="animate-spin"
                    style={{ color: "var(--accent)" }}
                  />
                </div>
              ) : serverList.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    fontSize: 13,
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  No servers. Add one first.
                </div>
              ) : (
                serverList.map((server) => (
                  <button
                    key={server.id}
                    onClick={() => addTab(server)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          server.status === "ONLINE" ? "#10b981" : "#64748b",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {server.name}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        {server.ip}:{server.sshPort}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: "#3b82f6",
                        fontWeight: 600,
                      }}
                    >
                      {tabs.filter((tab) => tab.serverId === server.id).length}{" "}
                      OPEN
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function TerminalPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout
          title="Terminal"
          subtitle="SSH terminal access to your servers"
        >
          <div className="card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--text-muted)",
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              Loading terminal...
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <TerminalPageContent />
    </Suspense>
  );
}
