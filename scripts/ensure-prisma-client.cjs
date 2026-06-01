const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const backendRoot = path.resolve(__dirname, "..");
const generatedClientTypesPath = path.join(
  backendRoot,
  "node_modules",
  ".prisma",
  "client",
  "index.d.ts",
);

function hasGeneratedPrismaClient() {
  if (!fs.existsSync(generatedClientTypesPath)) {
    return false;
  }

  const content = fs.readFileSync(generatedClientTypesPath, "utf8");
  return (
    content.includes("export type Server =") &&
    !content.includes("export declare const PrismaClient: any")
  );
}

if (hasGeneratedPrismaClient()) {
  console.log("Prisma client already generated.");
  process.exit(0);
}

console.log("Prisma client missing or placeholder detected. Running prisma generate...");

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "generate"], {
  cwd: backendRoot,
  stdio: "inherit",
  shell: false,
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
