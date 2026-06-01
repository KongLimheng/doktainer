#!/bin/sh
set -eu

node <<'NODE'
const net = require("net");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const url = new URL(databaseUrl);
const host = url.hostname;
const port = Number(url.port || 5432);
const timeoutMs = 90_000;
const intervalMs = 2_000;
const startedAt = Date.now();

function check() {
  const socket = net.createConnection({ host, port });

  socket.once("connect", () => {
    socket.end();
    console.log(`Database is reachable at ${host}:${port}.`);
    process.exit(0);
  });

  socket.once("error", (error) => {
    socket.destroy();

    if (Date.now() - startedAt >= timeoutMs) {
      console.error(`Database is not reachable at ${host}:${port}: ${error.message}`);
      process.exit(1);
    }

    console.log(`Waiting for database at ${host}:${port}...`);
    setTimeout(check, intervalMs);
  });
}

check();
NODE

if [ -d /app/prisma/migrations ] && [ "$(find /app/prisma/migrations -mindepth 1 -maxdepth 1 | wc -l)" -gt 0 ]; then
  npx prisma migrate deploy
else
  npx prisma db push
fi

node dist/server/index.js &
api_pid=$!

cleanup() {
  kill "$api_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

exec node_modules/.bin/next start -p 3000 -H 0.0.0.0
