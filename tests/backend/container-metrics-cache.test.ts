import assert from "node:assert/strict";
import test from "node:test";

import {
  clearContainerMetricsCacheForTest,
  invalidateContainerMetricsCache,
  parseStoredVolumeMounts,
  readContainerMetricsWithCache,
  resolveContainerPathToHostMountPath,
} from "../../src/server/routes/containers";

const stats = {
  cpuPercent: 12.5,
  memoryPercent: 32.1,
  pids: 4,
  memory: {
    raw: "128MiB / 512MiB",
    used: "128MiB",
    limit: "512MiB",
    usedBytes: 134217728,
    limitBytes: 536870912,
  },
  network: {
    raw: "1kB / 2kB",
    read: "1kB",
    write: "2kB",
    totalBytes: null,
    readBytes: null,
    writeBytes: null,
  },
  io: {
    raw: "3kB / 4kB",
    read: "3kB",
    write: "4kB",
    totalBytes: null,
    readBytes: null,
    writeBytes: null,
  },
};

function readMetrics(loadStats: () => Promise<typeof stats>) {
  return readContainerMetricsWithCache({
    organizationId: "org-1",
    serverId: "server-1",
    containerId: "container-1",
    containerName: "app",
    containerStatus: "RUNNING",
    dockerId: "abc123",
    runtimeId: "abc123",
    loadStats,
  });
}

test("container metrics cache dedupes concurrent samples and reuses short-lived results", async () => {
  clearContainerMetricsCacheForTest();
  let loadCount = 0;
  let resolveStats: (value: typeof stats) => void = () => undefined;

  const loadStats = async () => {
    loadCount += 1;
    return new Promise<typeof stats>((resolve) => {
      resolveStats = resolve;
    });
  };

  const first = readMetrics(loadStats);
  const second = readMetrics(loadStats);

  assert.equal(loadCount, 1);
  resolveStats(stats);

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.deepEqual(firstResult.stats, stats);
  assert.deepEqual(secondResult.stats, stats);
  assert.equal(loadCount, 1);

  const cachedResult = await readMetrics(loadStats);

  assert.deepEqual(cachedResult.stats, stats);
  assert.equal(loadCount, 1);
});

test("container metrics cache invalidation forces a fresh sample", async () => {
  clearContainerMetricsCacheForTest();
  let loadCount = 0;
  const loadStats = async () => {
    loadCount += 1;
    return stats;
  };

  await readMetrics(loadStats);
  await readMetrics(loadStats);
  assert.equal(loadCount, 1);

  invalidateContainerMetricsCache({
    organizationId: "org-1",
    serverId: "server-1",
    containerId: "container-1",
  });

  await readMetrics(loadStats);
  assert.equal(loadCount, 2);
});

test("container metrics cache does not retain failed samples", async () => {
  clearContainerMetricsCacheForTest();
  let loadCount = 0;
  const loadStats = async () => {
    loadCount += 1;
    if (loadCount === 1) {
      throw new Error("docker stats failed");
    }
    return stats;
  };

  await assert.rejects(() => readMetrics(loadStats), /docker stats failed/);
  const result = await readMetrics(loadStats);

  assert.deepEqual(result.stats, stats);
  assert.equal(loadCount, 2);
});

test("project env path resolver maps container paths to the most specific host mount", () => {
  const mounts = [
    {
      Source: "/srv/apps/example",
      Destination: "/app",
      RW: true,
    },
    {
      Source: "/srv/apps/example/storage",
      Destination: "/app/storage",
      RW: true,
    },
  ];

  assert.equal(
    resolveContainerPathToHostMountPath("/app/.env", mounts),
    "/srv/apps/example/.env",
  );
  assert.equal(
    resolveContainerPathToHostMountPath("/app/storage/.env", mounts),
    "/srv/apps/example/storage/.env",
  );
  assert.equal(
    resolveContainerPathToHostMountPath("/workspace/.env", mounts),
    null,
  );
});

test("project env path resolver can use stored container volume bindings", () => {
  const mounts = parseStoredVolumeMounts([
    "/srv/laravel:/bitnami/laravel",
    "named-volume:/ignored",
    "/srv/read-only:/readonly:ro",
  ]);

  assert.deepEqual(mounts, [
    {
      Source: "/srv/laravel",
      Destination: "/bitnami/laravel",
      RW: true,
    },
    {
      Source: "/srv/read-only",
      Destination: "/readonly",
      RW: false,
    },
  ]);
  assert.equal(
    resolveContainerPathToHostMountPath("/bitnami/laravel/.env", mounts),
    "/srv/laravel/.env",
  );
  assert.equal(mounts[0]?.Destination, "/bitnami/laravel");
});
