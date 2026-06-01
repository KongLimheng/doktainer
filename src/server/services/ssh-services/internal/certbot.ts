import { Server } from "@prisma/client";

import { execStrict } from "../commands";
import { escapeShellArg } from "./shell";
import { privilegedCommand } from "./privilege";

type WebStackAction = "install" | "upgrade" | "reinstall" | "remove";

const certbotBinaryCandidates = [
  "certbot",
  "/snap/bin/certbot",
  "/usr/bin/certbot",
  "/usr/local/bin/certbot",
];

export function buildCertbotResolveScript(): string {
  const candidates = certbotBinaryCandidates.join(" ");

  return [
    'resolved=""',
    `for candidate in ${candidates}; do`,
    '  if command -v "$candidate" >/dev/null 2>&1; then',
    '    resolved=$(command -v "$candidate")',
    "    break",
    "  fi",
    '  if [ -x "$candidate" ]; then',
    '    resolved="$candidate"',
    "    break",
    "  fi",
    "done",
    'if [ -z "$resolved" ] && command -v python3 >/dev/null 2>&1; then',
    "  if python3 -m certbot --version >/dev/null 2>&1; then",
    '    resolved="python3 -m certbot"',
    "  fi",
    "fi",
    'if [ -n "$resolved" ]; then',
    '  printf "%s\\n" "$resolved"',
    "fi",
  ].join("\n");
}

export function buildCertbotCommandTest(): string {
  return [
    buildCertbotResolveScript(),
    'resolved=$(printf "%s" "$resolved")',
    '[ -n "$resolved" ]',
  ].join("\n");
}

export function buildCertbotVersionCommand(): string {
  return [
    `resolved=$(${buildCertbotResolveScript()})`,
    'if [ -n "$resolved" ]; then',
    '  eval "$resolved --version" 2>/dev/null | head -n1',
    "fi",
  ].join("\n");
}

export function buildAptCertbotCommand(
  action: Exclude<WebStackAction, "remove">,
): string {
  const aptRepairPrefix = [
    "export DEBIAN_FRONTEND=noninteractive",
    "dpkg --configure -a || true",
    "apt-get install -f -y || true",
    "apt-get update",
  ];

  const installStep =
    action === "upgrade"
      ? [
          "if apt-cache show certbot >/dev/null 2>&1; then",
          "  apt-get install --only-upgrade -y certbot || apt-get install --only-upgrade -y python3-certbot",
          "elif apt-cache show python3-certbot >/dev/null 2>&1; then",
          "  apt-get install --only-upgrade -y python3-certbot",
          "else",
          "  apt-get install --only-upgrade -y certbot || true",
          "fi",
        ]
      : action === "reinstall"
        ? [
            "if apt-cache show certbot >/dev/null 2>&1; then",
            "  apt-get install --reinstall -y certbot || apt-get install --reinstall -y python3-certbot",
            "elif apt-cache show python3-certbot >/dev/null 2>&1; then",
            "  apt-get install --reinstall -y python3-certbot",
            "else",
            "  apt-get install --reinstall -y certbot || true",
            "fi",
          ]
        : [
            "if apt-cache show certbot >/dev/null 2>&1; then",
            "  apt-get install -y certbot || apt-get install -y python3-certbot",
            "elif apt-cache show python3-certbot >/dev/null 2>&1; then",
            "  apt-get install -y python3-certbot",
            "else",
            "  apt-get install -y certbot || true",
            "fi",
          ];

  return [
    ...aptRepairPrefix,
    ...installStep,
    `${buildCertbotCommandTest()} >/dev/null 2>&1`,
  ].join("\n");
}

export function buildCertbotEmailFlag(domainName: string): string {
  const configuredEmail = process.env.CERTBOT_EMAIL?.trim();
  if (configuredEmail) {
    return `--email ${escapeShellArg(configuredEmail)}`;
  }

  const fallbackEmail = `admin@${domainName}`;
  return `--email ${escapeShellArg(fallbackEmail)}`;
}

export async function ensureCertbotInstalled(server: Server): Promise<void> {
  await resolveCertbotCommand(server);
}

export async function resolveCertbotCommand(server: Server): Promise<string> {
  try {
    const result = await execStrict(
      server,
      privilegedCommand(
        server,
        `bash -lc ${escapeShellArg(`${buildCertbotResolveScript()} | grep -q . && ${buildCertbotResolveScript()}`)}`,
      ),
    );
    return result.trim().split(/\r?\n/).find(Boolean) ?? "certbot";
  } catch {
    throw new Error(
      `certbot is not installed or not executable on server ${server.name}`,
    );
  }
}
