import { Server } from "@prisma/client";
import { exec, execStrict } from "./commands";
import type { ServerPlatformInfo } from "./platform";
import { detectServerPlatform } from "./platform";
import { escapeShellArg } from "./internal/shell";
import { privilegedCommand } from "./internal/privilege";
import { ensureCertbotInstalled } from "./internal/certbot";

// NOTE: This file is a modularization of ssh.service.ts (domain: web stack).
// Implementation is moved as-is to maintain backward-compatibility.

const WEB_STACK_DOCKER_DIAGNOSTIC_TIMEOUT_MS = 10_000;

function webStackDockerDiagnosticTimeout() {
  return {
    timeoutMs: WEB_STACK_DOCKER_DIAGNOSTIC_TIMEOUT_MS,
    queueTimeoutMs: WEB_STACK_DOCKER_DIAGNOSTIC_TIMEOUT_MS,
  };
}

export type WebStackComponentKey =
  | "nginx"
  | "apache"
  | "caddy"
  | "php"
  | "nodejs"
  | "pm2"
  | "mysql"
  | "redis"
  | "postgresql"
  | "composer"
  | "certbot";

export type WebStackAction = "install" | "upgrade" | "reinstall" | "remove";

export interface WebStackComponentStatus {
  key: WebStackComponentKey;
  label: string;
  category:
    | "web-server"
    | "runtime"
    | "tooling"
    | "process-manager"
    | "database"
    | "cache";
  description: string;
  installed: boolean;
  version: string | null;
  serviceName: string | null;
  active: string | null;
  enabled: string | null;
  availableActions: WebStackAction[];
  recommendedFor: string[];
  notes: string[];
}

export interface ServerWebCapability {
  ready: boolean;
  summary: string;
  notes: string[];
  packageManager: ServerPlatformInfo["packageManager"];
  canManage: boolean;
  primaryWebServer: string | null;
  support: {
    staticSites: boolean;
    phpApps: boolean;
    javascriptApps: boolean;
    sslAutomation: boolean;
    processManager: boolean;
    relationalDatabase: boolean;
    cache: boolean;
  };
  components: WebStackComponentStatus[];
}

export interface WebStackServiceSnapshot {
  name: string;
  active: string;
  enabled: string;
  description: string | null;
}

interface WebStackComponentDefinition {
  label: string;
  category:
    | "web-server"
    | "runtime"
    | "tooling"
    | "process-manager"
    | "database"
    | "cache";
  description: string;
  recommendedFor: string[];
  commandTest: string;
  versionCommand: string;
  serviceCandidates: string[];
  packages: Record<NonNullable<ServerPlatformInfo["packageManager"]>, string[]>;
  customCommands?: Partial<Record<WebStackAction, string>>;
}

const commonHostServiceCandidates = [
  "docker",
  "ssh",
  "sshd",
  "fail2ban",
  "ufw",
];

const certbotBinaryCandidates = [
  "certbot",
  "/snap/bin/certbot",
  "/usr/bin/certbot",
  "/usr/local/bin/certbot",
  "/root/.local/bin/certbot",
];

const nginxBinaryCandidates = [
  "nginx",
  "/usr/sbin/nginx",
  "/usr/bin/nginx",
  "/usr/local/sbin/nginx",
  "/usr/local/bin/nginx",
  "/usr/local/nginx/sbin/nginx",
];

const apacheBinaryCandidates = [
  "apache2",
  "httpd",
  "/usr/sbin/apache2",
  "/usr/bin/apache2",
  "/usr/sbin/httpd",
  "/usr/bin/httpd",
  "/usr/local/apache2/bin/httpd",
];

const caddyBinaryCandidates = [
  "caddy",
  "/usr/bin/caddy",
  "/usr/sbin/caddy",
  "/usr/local/bin/caddy",
  "/usr/local/sbin/caddy",
];

const phpBinaryCandidates = [
  "php",
  "/usr/bin/php",
  "/usr/local/bin/php",
  "/usr/local/php/bin/php",
];

const nodeBinaryCandidates = [
  "node",
  "nodejs",
  "/usr/bin/node",
  "/usr/bin/nodejs",
  "/usr/local/bin/node",
  "/usr/local/bin/nodejs",
];

const npmBinaryCandidates = [
  "npm",
  "/usr/bin/npm",
  "/usr/local/bin/npm",
  "/usr/local/node/bin/npm",
];

const pm2BinaryCandidates = [
  "pm2",
  "/usr/bin/pm2",
  "/usr/local/bin/pm2",
  "/opt/homebrew/bin/pm2",
];

const mysqlBinaryCandidates = [
  "mysql",
  "mariadb",
  "/usr/bin/mysql",
  "/usr/bin/mariadb",
  "/usr/local/bin/mysql",
  "/usr/local/bin/mariadb",
];

const redisBinaryCandidates = [
  "redis-server",
  "redis-cli",
  "/usr/bin/redis-server",
  "/usr/bin/redis-cli",
  "/usr/local/bin/redis-server",
  "/usr/local/bin/redis-cli",
];

const postgresqlBinaryCandidates = [
  "psql",
  "/usr/bin/psql",
  "/usr/local/bin/psql",
  "/usr/lib/postgresql/16/bin/psql",
  "/usr/lib/postgresql/15/bin/psql",
  "/usr/lib/postgresql/14/bin/psql",
  "/usr/lib/postgresql/13/bin/psql",
  "/usr/lib/postgresql/12/bin/psql",
];

const composerBinaryCandidates = [
  "composer",
  "composer2",
  "/usr/bin/composer",
  "/usr/bin/composer2",
  "/usr/local/bin/composer",
  "/usr/local/bin/composer2",
  "/usr/local/sbin/composer",
  "/usr/sbin/composer",
  "/opt/composer/bin/composer",
];

const composerPharCandidates = [
  "/usr/local/bin/composer.phar",
  "/usr/bin/composer.phar",
  "/usr/local/bin/composer2.phar",
  "/opt/composer/composer.phar",
  "/usr/local/src/composer.phar",
  "/root/.config/composer/composer.phar",
  "/root/.local/bin/composer.phar",
];

function buildBinaryResolveScript(candidates: string[]): string {
  const serialized = candidates.join(" ");

  return [
    'resolved=""',
    `for candidate in ${serialized}; do`,
    '  if command -v "$candidate" >/dev/null 2>&1; then',
    '    resolved=$(command -v "$candidate")',
    "    break",
    "  fi",
    '  if [ -x "$candidate" ]; then',
    '    resolved="$candidate"',
    "    break",
    "  fi",
    "done",
    'if [ -n "$resolved" ]; then',
    '  printf "%s\n" "$resolved"',
    "fi",
  ].join("\n");
}

function buildResolvedBinaryCommandTest(candidates: string[]): string {
  return [
    buildBinaryResolveScript(candidates),
    'resolved=$(printf "%s" "$resolved")',
    '[ -n "$resolved" ]',
  ].join("\n");
}

function buildResolvedBinaryVersionCommand(
  candidates: string[],
  args = "--version",
): string {
  return [
    `resolved=$(${buildBinaryResolveScript(candidates)})`,
    'if [ -n "$resolved" ]; then',
    `  "$resolved" ${args} 2>/dev/null | head -n1`,
    "fi",
  ].join("\n");
}

function buildShellFallbackCommandTest(commands: string[]): string {
  return commands.join(" || ");
}

function buildShellFallbackVersionCommand(commands: string[]): string {
  return `(${commands.join(" || ")}) | head -n1`;
}

export function getInspectableHostServices(): string[] {
  const ordered = [
    ...commonHostServiceCandidates,
    ...Object.values(webStackComponentDefinitions).flatMap(
      (definition) => definition.serviceCandidates,
    ),
  ];

  return ordered.filter((service, index) => ordered.indexOf(service) === index);
}

function buildCertbotResolveScript(): string {
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
    'if [ -z "$resolved" ] && command -v snap >/dev/null 2>&1; then',
    "  if snap list certbot >/dev/null 2>&1; then",
    '    resolved="snap-certbot"',
    "  fi",
    "fi",
    'if [ -n "$resolved" ]; then',
    '  printf "%s\n" "$resolved"',
    "fi",
  ].join("\n");
}

function buildCertbotCommandTest(): string {
  return [
    buildCertbotResolveScript(),
    'resolved=$(printf "%s" "$resolved")',
    '[ -n "$resolved" ]',
  ].join("\n");
}

function buildCertbotVersionCommand(): string {
  return [
    `resolved=$(${buildCertbotResolveScript()})`,
    'if [ -n "$resolved" ]; then',
    '  if [ "$resolved" = "snap-certbot" ]; then',
    '    snap list certbot --color=never 2>/dev/null | awk "NR==2 {print \$2}" | head -n1',
    "  else",
    '  eval "$resolved --version" 2>/dev/null | head -n1',
    "  fi",
    "fi",
  ].join("\n");
}

function buildPm2ResolveScript(): string {
  const candidates = pm2BinaryCandidates.join(" ");
  const npmResolver = buildBinaryResolveScript(npmBinaryCandidates);

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
    'if [ -z "$resolved" ]; then',
    `  resolved_npm=$(${npmResolver})`,
    '  if [ -n "$resolved_npm" ]; then',
    '    npm_root=$("$resolved_npm" root -g 2>/dev/null || true)',
    '    if [ -n "$npm_root" ] && [ -d "$npm_root/pm2" ]; then',
    '      resolved="$resolved_npm"',
    "    fi",
    "  fi",
    "fi",
    'if [ -n "$resolved" ]; then',
    '  printf "%s\n" "$resolved"',
    "fi",
  ].join("\n");
}

function buildPm2CommandTest(): string {
  return [
    buildPm2ResolveScript(),
    'resolved=$(printf "%s" "$resolved")',
    '[ -n "$resolved" ]',
  ].join("\n");
}

function buildPm2VersionCommand(): string {
  return [
    `resolved=$(${buildPm2ResolveScript()})`,
    'if [ -n "$resolved" ]; then',
    '  case "$resolved" in',
    '    *npm) "$resolved" list -g pm2 --depth=0 2>/dev/null | grep -Eo "pm2@[0-9][^[:space:]]*" | head -n1 | sed "s/^pm2@//" ;;',
    '    *) "$resolved" --version 2>/dev/null | head -n1 ;;',
    "  esac",
    "fi",
  ].join("\n");
}

function buildComposerResolveScript(): string {
  const directCandidates = composerBinaryCandidates.join(" ");
  const pharCandidates = composerPharCandidates.join(" ");

  return [
    'resolved=""',
    `for candidate in ${directCandidates}; do`,
    '  if command -v "$candidate" >/dev/null 2>&1; then',
    '    resolved=$(command -v "$candidate")',
    "    break",
    "  fi",
    '  if [ -x "$candidate" ]; then',
    '    resolved="$candidate"',
    "    break",
    "  fi",
    "done",
    'if [ -z "$resolved" ] && command -v php >/dev/null 2>&1; then',
    `  for candidate in ${pharCandidates}; do`,
    '    if [ -f "$candidate" ]; then',
    '      resolved="php $candidate"',
    "      break",
    "    fi",
    "  done",
    "fi",
    'if [ -n "$resolved" ]; then',
    '  printf "%s\n" "$resolved"',
    "fi",
  ].join("\n");
}

function buildComposerCommandTest(): string {
  return [
    buildComposerResolveScript(),
    'resolved=$(printf "%s" "$resolved")',
    '[ -n "$resolved" ]',
  ].join("\n");
}

function buildComposerVersionCommand(): string {
  return [
    `resolved=$(${buildComposerResolveScript()})`,
    'if [ -n "$resolved" ]; then',
    '  eval "$resolved --version" 2>/dev/null | head -n1',
    "fi",
  ].join("\n");
}

function buildAptCertbotCommand(
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

const webStackComponentDefinitions: Record<
  WebStackComponentKey,
  WebStackComponentDefinition
> = {
  nginx: {
    label: "Nginx",
    category: "web-server",
    description:
      "Reverse proxy and static web server for PHP, Laravel, and JS apps.",
    recommendedFor: ["Laravel", "PHP Native", "Node.js Apps", "Static Sites"],
    commandTest: buildResolvedBinaryCommandTest(nginxBinaryCandidates),
    versionCommand: [
      `resolved=$(${buildBinaryResolveScript(nginxBinaryCandidates)})`,
      'if [ -n "$resolved" ]; then',
      '  "$resolved" -v 2>&1 | sed "s/^nginx version: //" | head -n1',
      "fi",
    ].join("\n"),
    serviceCandidates: ["nginx"],
    packages: {
      "apt-get": ["nginx"],
      dnf: ["nginx"],
      yum: ["nginx"],
      zypper: ["nginx"],
      apk: ["nginx"],
    },
  },
  apache: {
    label: "Apache",
    category: "web-server",
    description:
      "Classic HTTP server suitable for PHP native apps and legacy stacks.",
    recommendedFor: ["PHP Native", "Laravel", "Legacy Apps"],
    commandTest: buildResolvedBinaryCommandTest(apacheBinaryCandidates),
    versionCommand: [
      `resolved=$(${buildBinaryResolveScript(apacheBinaryCandidates)})`,
      'if [ -n "$resolved" ]; then',
      '  "$resolved" -v 2>&1 | sed -n "s/^Server version: //p" | head -n1',
      "fi",
    ].join("\n"),
    serviceCandidates: ["apache2", "httpd"],
    packages: {
      "apt-get": ["apache2"],
      dnf: ["httpd"],
      yum: ["httpd"],
      zypper: ["apache2"],
      apk: ["apache2"],
    },
  },
  caddy: {
    label: "Caddy",
    category: "web-server",
    description:
      "Modern web server with automatic HTTPS and simple reverse proxy config.",
    recommendedFor: ["Static Sites", "Node.js Apps", "Auto HTTPS"],
    commandTest: buildResolvedBinaryCommandTest(caddyBinaryCandidates),
    versionCommand: buildResolvedBinaryVersionCommand(
      caddyBinaryCandidates,
      "version",
    ),
    serviceCandidates: ["caddy"],
    packages: {
      "apt-get": ["caddy"],
      dnf: ["caddy"],
      yum: ["caddy"],
      zypper: ["caddy"],
      apk: ["caddy"],
    },
  },
  php: {
    label: "PHP + FPM",
    category: "runtime",
    description:
      "PHP runtime for Laravel, WordPress, and native PHP applications.",
    recommendedFor: ["Laravel", "PHP Native", "WordPress"],
    commandTest: buildResolvedBinaryCommandTest(phpBinaryCandidates),
    versionCommand: buildResolvedBinaryVersionCommand(
      phpBinaryCandidates,
      "-v",
    ),
    serviceCandidates: [
      "php8.3-fpm",
      "php8.2-fpm",
      "php8.1-fpm",
      "php8.0-fpm",
      "php7.4-fpm",
      "php-fpm",
      "php-fpm8",
      "php-fpm83",
      "php-fpm82",
      "php-fpm81",
    ],
    packages: {
      "apt-get": [
        "php",
        "php-fpm",
        "php-cli",
        "php-mbstring",
        "php-xml",
        "php-curl",
        "php-zip",
      ],
      dnf: [
        "php",
        "php-fpm",
        "php-cli",
        "php-mbstring",
        "php-xml",
        "php-curl",
        "php-zip",
      ],
      yum: [
        "php",
        "php-fpm",
        "php-cli",
        "php-mbstring",
        "php-xml",
        "php-curl",
        "php-zip",
      ],
      zypper: [
        "php8",
        "php8-fpm",
        "php8-cli",
        "php8-mbstring",
        "php8-xmlreader",
        "php8-curl",
        "php8-zip",
      ],
      apk: [
        "php83",
        "php83-fpm",
        "php83-phar",
        "php83-mbstring",
        "php83-xml",
        "php83-curl",
        "php83-zip",
      ],
    },
  },
  nodejs: {
    label: "Node.js",
    category: "runtime",
    description:
      "JavaScript runtime for Next.js, Nuxt, APIs, and frontend build pipelines.",
    recommendedFor: ["Next.js", "React/Vite", "Node APIs"],
    commandTest: buildResolvedBinaryCommandTest(nodeBinaryCandidates),
    versionCommand: buildResolvedBinaryVersionCommand(
      nodeBinaryCandidates,
      "--version",
    ),
    serviceCandidates: [],
    packages: {
      "apt-get": ["nodejs", "npm"],
      dnf: ["nodejs", "npm"],
      yum: ["nodejs", "npm"],
      zypper: ["nodejs", "npm"],
      apk: ["nodejs", "npm"],
    },
  },
  pm2: {
    label: "PM2",
    category: "process-manager",
    description:
      "Node.js process manager for background workers, queue consumers, and long-running app processes.",
    recommendedFor: ["Node APIs", "Next.js SSR", "Workers", "Background Jobs"],
    commandTest: buildPm2CommandTest(),
    versionCommand: buildPm2VersionCommand(),
    serviceCandidates: [],
    packages: {
      "apt-get": [],
      dnf: [],
      yum: [],
      zypper: [],
      apk: [],
    },
    customCommands: {
      install: "npm install -g pm2",
      upgrade: "npm update -g pm2",
      reinstall: "npm uninstall -g pm2 || true && npm install -g pm2",
      remove: "npm uninstall -g pm2",
    },
  },
  mysql: {
    label: "MariaDB / MySQL",
    category: "database",
    description:
      "Relational database service for Laravel, PHP apps, CMS workloads, and general SQL-backed deployments.",
    recommendedFor: ["Laravel", "WordPress", "SQL Apps", "APIs"],
    commandTest: buildResolvedBinaryCommandTest(mysqlBinaryCandidates),
    versionCommand: buildResolvedBinaryVersionCommand(
      mysqlBinaryCandidates,
      "--version",
    ),
    serviceCandidates: ["mariadb", "mysql", "mysqld"],
    packages: {
      "apt-get": ["mariadb-server", "mariadb-client"],
      dnf: ["mariadb-server", "mariadb"],
      yum: ["mariadb-server", "mariadb"],
      zypper: ["mariadb", "mariadb-client"],
      apk: ["mariadb", "mariadb-client"],
    },
  },
  redis: {
    label: "Redis",
    category: "cache",
    description:
      "In-memory cache and queue backend for sessions, caching, Horizon, and async workloads.",
    recommendedFor: ["Laravel Cache", "Queues", "Sessions", "Background Jobs"],
    commandTest: buildResolvedBinaryCommandTest(redisBinaryCandidates),
    versionCommand: buildResolvedBinaryVersionCommand(
      redisBinaryCandidates,
      "--version",
    ),
    serviceCandidates: ["redis-server", "redis"],
    packages: {
      "apt-get": ["redis-server"],
      dnf: ["redis"],
      yum: ["redis"],
      zypper: ["redis"],
      apk: ["redis"],
    },
  },
  postgresql: {
    label: "PostgreSQL",
    category: "database",
    description:
      "Relational database for modern apps, analytics workloads, and production-grade SQL deployments.",
    recommendedFor: ["Laravel", "Next.js APIs", "Analytics", "SQL Apps"],
    commandTest: buildResolvedBinaryCommandTest(postgresqlBinaryCandidates),
    versionCommand: buildResolvedBinaryVersionCommand(
      postgresqlBinaryCandidates,
      "--version",
    ),
    serviceCandidates: [
      "postgresql",
      "postgresql-16",
      "postgresql-15",
      "postgresql-14",
      "postgresql-13",
      "postgresql-12",
    ],
    packages: {
      "apt-get": ["postgresql", "postgresql-contrib"],
      dnf: ["postgresql-server", "postgresql"],
      yum: ["postgresql-server", "postgresql"],
      zypper: ["postgresql-server", "postgresql"],
      apk: ["postgresql", "postgresql-client"],
    },
  },
  composer: {
    label: "Composer",
    category: "tooling",
    description:
      "PHP dependency manager required by Laravel and modern PHP projects.",
    recommendedFor: ["Laravel", "PHP Native"],
    commandTest: buildComposerCommandTest(),
    versionCommand: buildComposerVersionCommand(),
    serviceCandidates: [],
    packages: {
      "apt-get": ["composer"],
      dnf: ["composer"],
      yum: ["composer"],
      zypper: ["composer"],
      apk: ["composer"],
    },
  },
  certbot: {
    label: "Certbot",
    category: "tooling",
    description:
      "TLS automation tooling for issuing and renewing Let's Encrypt certificates.",
    recommendedFor: ["HTTPS", "Production Sites"],
    commandTest: buildCertbotCommandTest(),
    versionCommand: buildCertbotVersionCommand(),
    serviceCandidates: [],
    packages: {
      "apt-get": ["certbot"],

      dnf: ["certbot"],
      yum: ["certbot"],
      zypper: ["certbot"],
      apk: ["certbot"],
    },
  },
};

webStackComponentDefinitions.certbot.packages["apt-get"] = [
  "certbot",
  "python3-certbot",
];

function buildWebStackInspectScript(): string {
  const lines = [
    "probe_component() {",
    '  key="$1"',
    '  command_test="$2"',
    '  version_cmd="$3"',
    '  service_candidates="$4"',
    '  installed="0"',
    '  version=""',
    '  service_name=""',
    '  active=""',
    '  enabled=""',
    '  service_desc=""',
    '  if eval "$command_test" >/dev/null 2>&1; then',
    '    installed="1"',
    '    version=$(eval "$version_cmd" 2>/dev/null | head -n1 | tr "\t" " ")',
    "  fi",
    '  if [ -n "$service_candidates" ] && command -v systemctl >/dev/null 2>&1; then',
    "    for svc in $service_candidates; do",
    '      load_state=$(systemctl show "$svc" --property=LoadState --value 2>/dev/null || true)',
    '      if [ -n "$load_state" ] && [ "$load_state" != "not-found" ]; then',
    '        installed="1"',
    '        service_name="$svc"',
    '        active=$(systemctl is-active "$svc" 2>/dev/null || echo inactive)',
    '        enabled=$(systemctl is-enabled "$svc" 2>/dev/null || echo unknown)',
    '        service_desc=$(systemctl show "$svc" --property=Description --value 2>/dev/null || true)',
    "        break",
    "      fi",
    "    done",
    "  fi",
    '  printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "$key" "$installed" "$version" "$service_name" "$active" "$enabled" "$service_desc"',
    "}",
  ];

  for (const [key, definition] of Object.entries(
    webStackComponentDefinitions,
  ) as Array<[WebStackComponentKey, WebStackComponentDefinition]>) {
    lines.push(
      `probe_component ${escapeShellArg(key)} ${escapeShellArg(definition.commandTest)} ${escapeShellArg(definition.versionCommand)} ${escapeShellArg(definition.serviceCandidates.join(" "))}`,
    );
  }

  return lines.join("\n");
}

function buildPackagePresenceInspectScript(
  packageManager: NonNullable<ServerPlatformInfo["packageManager"]>,
): string {
  const lines = [
    "probe_package_component() {",
    '  key="$1"',
    "  shift",
    '  installed="0"',
    '  for pkg in "$@"; do',
    '    case "$PACKAGE_MANAGER" in',
    '      apt-get) if dpkg-query -W -f=\'${Status}\' "$pkg" 2>/dev/null | grep -q "install ok installed"; then installed="1"; break; fi ;;',
    '      dnf|yum|zypper) if rpm -q "$pkg" >/dev/null 2>&1; then installed="1"; break; fi ;;',
    '      apk) if apk info -e "$pkg" >/dev/null 2>&1; then installed="1"; break; fi ;;',
    "    esac",
    "  done",
    '  printf "%s\t%s\n" "$key" "$installed"',
    "}",
    `PACKAGE_MANAGER=${escapeShellArg(packageManager)}`,
  ];

  for (const [key, definition] of Object.entries(
    webStackComponentDefinitions,
  ) as Array<[WebStackComponentKey, WebStackComponentDefinition]>) {
    const packages = getPackagePresencePackages(
      key,
      packageManager,
      definition,
    );
    if (!packages.length) {
      continue;
    }

    lines.push(
      `probe_package_component ${escapeShellArg(key)} ${packages.map((pkg) => escapeShellArg(pkg)).join(" ")}`,
    );
  }

  return lines.join("\n");
}

function getPackagePresencePackages(
  component: WebStackComponentKey,
  packageManager: NonNullable<ServerPlatformInfo["packageManager"]>,
  definition: WebStackComponentDefinition,
): string[] {
  if (component === "nodejs" && packageManager === "apt-get") {
    return ["nodejs"];
  }

  return definition.packages[packageManager];
}

function getWebStackPackageManagerLabel(
  packageManager: ServerPlatformInfo["packageManager"],
): string {
  return packageManager ?? "none";
}

const nginxConfigSearchDirs = [
  "/etc/nginx",
  "/usr/local/nginx/conf",
  "/usr/local/etc/nginx",
  "/etc/openresty",
  "/usr/local/openresty/nginx/conf",
  "/www/server/nginx/conf",
];

function buildNginxIpv4OnlyPatchScript(): string {
  const dirs = nginxConfigSearchDirs.join(" ");

  return [
    "if [ ! -f /proc/net/if_inet6 ]; then",
    `  for dir in ${dirs}; do`,
    '    if [ -d "$dir" ]; then',
    '      find -L "$dir" -type f 2>/dev/null | while IFS= read -r file; do',
    '        if grep -Iq . "$file" 2>/dev/null && grep -Eq "^[[:space:]]*listen[[:space:]]+\\[::\\]:((80|443)[^;]*);" "$file" 2>/dev/null; then',
    '          sed -i -E "/^[[:space:]]*#/! s/^([[:space:]]*)listen[[:space:]]+\\[::\\]:((80|443)[^;]*);/\\1# portainer-disabled-ipv6 listen [::]:\\2;/" "$file"',
    "        fi",
    "      done",
    "    fi",
    "  done",
    "fi",
  ].join("\n");
}

function buildNginxIpv6ListenerScanCommand(): string {
  const dirs = nginxConfigSearchDirs.join(" ");

  return [
    `for dir in ${dirs}; do`,
    '  if [ -d "$dir" ]; then',
    '    find -L "$dir" -type f 2>/dev/null | while IFS= read -r file; do',
    '      if grep -Iq . "$file" 2>/dev/null && grep -Eq "^[[:space:]]*listen[[:space:]]+\\[::\\]:((80|443)[^;]*);" "$file" 2>/dev/null; then',
    '        printf "%s\n" "$file"',
    "      fi",
    "    done",
    "  fi",
    "done | awk '!seen[$0]++'",
  ].join("\n");
}

// This script ensures that the default Nginx server block is configured with a basic static file setup and listens on both IPv4 and IPv6 (if applicable). It creates a simple index.html if none exists and generates self-signed certificates if they are missing. The script is idempotent and can be safely run multiple times without causing issues.
// You can setting in file /etc/nginx/sites-available/default or /etc/nginx/sites-enabled/default, it will add listen directives if missing and create a basic index.html if the default root is set to /var/www/html. It also ensures that the default SSL snakeoil certificates exist for HTTPS support.
function buildNginxDefaultServerBootstrapScript(): string {
  return [
    "set -e",
    'DEFAULT_PATH=""',
    "for candidate in /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default; do",
    '  if [ -f "$candidate" ]; then DEFAULT_PATH="$candidate"; break; fi',
    "done",
    'if [ -z "$DEFAULT_PATH" ]; then exit 0; fi',
    'if ! grep -Eq "^[[:space:]]*server_name[[:space:]]+_[[:space:]]*;" "$DEFAULT_PATH" && ! grep -Eq "^[[:space:]]*root[[:space:]]+/var/www/html[[:space:]]*;" "$DEFAULT_PATH"; then exit 0; fi',
    "mkdir -p /var/www/html",
    "if [ ! -f /var/www/html/index.html ] && [ ! -f /var/www/html/index.nginx-debian.html ]; then",
    "  printf '%s\\n' '<!DOCTYPE html>' '<html>' '<head><title>Welcome to nginx!</title></head>' '<body>' '<h1>Welcome to nginx!</h1>' '<p>If you see this page, the nginx web server is successfully installed and working.</p>' '</body>' '</html>' > /var/www/html/index.html",
    "fi",
    "if [ ! -f /etc/ssl/certs/ssl-cert-snakeoil.pem ] || [ ! -f /etc/ssl/private/ssl-cert-snakeoil.key ]; then",
    "  if command -v make-ssl-cert >/dev/null 2>&1; then",
    "    make-ssl-cert generate-default-snakeoil --force-overwrite >/dev/null 2>&1 || true",
    "  elif command -v openssl >/dev/null 2>&1; then",
    "    mkdir -p /etc/ssl/certs /etc/ssl/private",
    "    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -keyout /etc/ssl/private/ssl-cert-snakeoil.key -out /etc/ssl/certs/ssl-cert-snakeoil.pem -subj /CN=localhost >/dev/null 2>&1 || true",
    "  fi",
    "fi",
    "chmod 600 /etc/ssl/private/ssl-cert-snakeoil.key 2>/dev/null || true",
    "python3 - \"$DEFAULT_PATH\" <<'PY'",
    "import re",
    "import sys",
    "from pathlib import Path",
    "",
    "path = Path(sys.argv[1])",
    "text = path.read_text()",
    'match = re.search(r"server\\s*\\{", text)',
    "if not match:",
    "    sys.exit(0)",
    "",
    "start = match.start()",
    "brace_start = text.find('{', match.start())",
    "depth = 0",
    "end = None",
    "for index in range(brace_start, len(text)):",
    "    char = text[index]",
    "    if char == '{':",
    "        depth += 1",
    "    elif char == '}':",
    "        depth -= 1",
    "        if depth == 0:",
    "            end = index + 1",
    "            break",
    "if end is None:",
    "    sys.exit(0)",
    "",
    "block = text[start:end]",
    'if not (re.search(r"^[ \\t]*server_name[ \\t]+_[ \\t]*;", block, re.M) or re.search(r"^[ \\t]*root[ \\t]+/var/www/html[ \\t]*;", block, re.M)):',
    "    sys.exit(0)",
    "",
    "changed = False",
    'has_any_plain_default = bool(re.search(r"^[ \\t]*listen[ \\t]+(?:\\[::\\]:)?\\d+[^;]*\\bdefault_server\\b", block, re.M))',
    'has_any_ssl_default = bool(re.search(r"^[ \\t]*listen[ \\t]+(?:\\[::\\]:)?\\d+[^;]*\\bssl\\b[^;]*\\bdefault_server\\b", block, re.M))',
    'if not has_any_plain_default and not re.search(r"^[ \\t]*listen[ \\t]+80[ \\t]+default_server[ \\t]*;", block, re.M):',
    '    updated = re.sub(r"^[ \\t]*#\\s*listen[ \\t]+80[ \\t]+default_server[ \\t]*;", "\\tlisten 80 default_server;", block, count=1, flags=re.M)',
    "    if updated == block:",
    "        updated = block.replace('{', '{\\n\\tlisten 80 default_server;', 1)",
    "    block = updated",
    "    changed = True",
    "",
    'if not has_any_ssl_default and not re.search(r"^[ \\t]*listen[ \\t]+443[ \\t]+ssl[ \\t]+default_server[ \\t]*;", block, re.M):',
    '    updated = re.sub(r"^[ \\t]*#\\s*listen[ \\t]+443[ \\t]+ssl[ \\t]+default_server[ \\t]*;", "\\tlisten 443 ssl default_server;", block, count=1, flags=re.M)',
    "    if updated == block:",
    '        insert_after = re.search(r"^[ \\t]*listen[ \\t]+80[ \\t]+default_server[ \\t]*;.*$", block, re.M)',
    "        if insert_after:",
    "            pos = insert_after.end()",
    '            updated = block[:pos] + "\\n\\tlisten 443 ssl default_server;" + block[pos:]',
    "        elif not has_any_plain_default:",
    "            updated = block.replace('{', '{\\n\\tlisten 443 ssl default_server;', 1)",
    "    block = updated",
    "    changed = True",
    "",
    'if not re.search(r"^[ \\t]*include[ \\t]+snippets/snakeoil\\.conf[ \\t]*;", block, re.M) and not re.search(r"^[ \\t]*ssl_certificate[ \\t]+", block, re.M):',
    '    updated = re.sub(r"^[ \\t]*#\\s*include[ \\t]+snippets/snakeoil\\.conf[ \\t]*;", "\\tinclude snippets/snakeoil.conf;", block, count=1, flags=re.M)',
    "    if updated == block:",
    '        insert_after = re.search(r"^[ \\t]*listen[ \\t]+443[ \\t]+ssl[ \\t]+default_server[ \\t]*;.*$", block, re.M)',
    "        if insert_after:",
    "            pos = insert_after.end()",
    '            updated = block[:pos] + "\\n\\tinclude snippets/snakeoil.conf;" + block[pos:]',
    "    block = updated",
    "    changed = True",
    "",
    "if changed:",
    "    path.write_text(text[:start] + block + text[end:])",
    "PY",
    "if [ -f /etc/nginx/sites-available/default ]; then",
    "  mkdir -p /etc/nginx/sites-enabled",
    "  ln -sfn /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default",
    "fi",
    "nginx -t",
  ].join("\n");
}

function buildWebStackPackageCommand(
  packageManager: NonNullable<ServerPlatformInfo["packageManager"]>,
  action: WebStackAction,
  packages: string[],
): string {
  if (packages.length === 0) {
    throw new Error(
      "This component does not define package manager packages for the requested action",
    );
  }

  const joined = packages.join(" ");
  const isAptNginx = packages.length === 1 && packages[0] === "nginx";
  const aptLockWaitScript = buildAptLockWaitScript();
  const aptRepairPrefix = [
    aptLockWaitScript,
    "export DEBIAN_FRONTEND=noninteractive",
    "wait_for_apt_locks",
    "dpkg --configure -a || true",
    "wait_for_apt_locks",
    "apt-get install -f -y || true",
  ].join("\n");

  switch (packageManager) {
    case "apt-get":
      if (isAptNginx && action !== "remove") {
        const aptInstallCommand =
          action === "upgrade"
            ? `apt-get install --only-upgrade -y ${joined}`
            : action === "reinstall"
              ? `apt-get install --reinstall -y ${joined}`
              : `apt-get install -y ${joined}`;

        return [
          aptLockWaitScript,
          "export DEBIAN_FRONTEND=noninteractive",
          "cleanup_policy_rcd() { if [ -f /usr/sbin/policy-rc.d ] && grep -q 'portainer-temporary-policy-rcd' /usr/sbin/policy-rc.d 2>/dev/null; then rm -f /usr/sbin/policy-rc.d; fi; }",
          "cleanup_policy_rcd",
          "trap cleanup_policy_rcd EXIT",
          "printf '#!/bin/sh\n# portainer-temporary-policy-rcd\nexit 101\n' > /usr/sbin/policy-rc.d",
          "chmod +x /usr/sbin/policy-rc.d",
          "wait_for_apt_locks",
          "dpkg --configure -a || true",
          "wait_for_apt_locks",
          "apt-get install -f -y || true",
          "wait_for_apt_locks",
          "apt-get update",
          "wait_for_apt_locks",
          aptInstallCommand,
          "cleanup_policy_rcd",
          "trap - EXIT",
          buildNginxIpv4OnlyPatchScript(),
        ].join("\n");
      }

      if (action === "install") {
        return [
          aptRepairPrefix,
          "wait_for_apt_locks",
          "apt-get update",
          "wait_for_apt_locks",
          `apt-get install -y ${joined}`,
        ].join("\n");
      }
      if (action === "upgrade") {
        return [
          aptRepairPrefix,
          "wait_for_apt_locks",
          "apt-get update",
          "wait_for_apt_locks",
          `apt-get install --only-upgrade -y ${joined}`,
        ].join("\n");
      }
      if (action === "reinstall") {
        return [
          aptRepairPrefix,
          "wait_for_apt_locks",
          "apt-get update",
          "wait_for_apt_locks",
          `apt-get install --reinstall -y ${joined}`,
        ].join("\n");
      }
      return [
        aptRepairPrefix,
        "wait_for_apt_locks",
        `apt-get purge -y ${joined}`,
        "wait_for_apt_locks",
        "apt-get autoremove -y",
      ].join("\n");
    case "dnf":
      if (action === "install") return `dnf install -y ${joined}`;
      if (action === "upgrade") return `dnf upgrade -y ${joined}`;
      if (action === "reinstall") return `dnf reinstall -y ${joined}`;
      return `dnf remove -y ${joined}`;
    case "yum":
      if (action === "install") return `yum install -y ${joined}`;
      if (action === "upgrade") return `yum update -y ${joined}`;
      if (action === "reinstall") return `yum reinstall -y ${joined}`;
      return `yum remove -y ${joined}`;
    case "zypper":
      if (action === "install")
        return `zypper --non-interactive install ${joined}`;
      if (action === "upgrade")
        return `zypper --non-interactive update ${joined}`;
      if (action === "reinstall")
        return `zypper --non-interactive install --force ${joined}`;
      return `zypper --non-interactive remove ${joined}`;
    case "apk":
      if (action === "install") return `apk add ${joined}`;
      if (action === "upgrade") return `apk upgrade ${joined}`;
      if (action === "reinstall")
        return `apk del ${joined} || true && apk add ${joined}`;
      return `apk del ${joined}`;
  }
}

function buildAptLockWaitScript(timeoutSeconds = 180): string {
  return [
    "wait_for_apt_locks() {",
    `  timeout_seconds=${timeoutSeconds}`,
    "  waited=0",
    "  while true; do",
    "    if command -v fuser >/dev/null 2>&1; then",
    "      if ! fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock >/dev/null 2>&1; then",
    "        break",
    "      fi",
    "    else",
    '      if ! ps -eo comm= 2>/dev/null | grep -Eq "^(apt|apt-get|dpkg|unattended-upgrade)$"; then',
    "        break",
    "      fi",
    "    fi",
    '    if [ "$waited" -ge "$timeout_seconds" ]; then',
    '      echo "Timed out waiting for apt/dpkg lock to be released" >&2',
    "      exit 1",
    "    fi",
    "    sleep 2",
    "    waited=$((waited + 2))",
    "  done",
    "}",
  ].join("\n");
}

function buildEnableDetectedServiceCommand(
  serviceCandidates: string[],
): string | null {
  if (serviceCandidates.length === 0) {
    return null;
  }

  const list = serviceCandidates.join(" ");
  const nginxIpv4OnlyPatch = buildNginxIpv4OnlyPatchScript();

  return [
    "if command -v systemctl >/dev/null 2>&1; then",
    `  for svc in ${list}; do`,
    '    load_state=$(systemctl show "$svc" --property=LoadState --value 2>/dev/null || true)',
    '    if [ -n "$load_state" ] && [ "$load_state" != "not-found" ]; then',
    '      if [ "$svc" = "nginx" ]; then',
    nginxIpv4OnlyPatch
      .split("\n")
      .map((line) => `      ${line}`)
      .join("\n"),
    "      fi",
    '      systemctl enable --now "$svc"',
    "      break",
    "    fi",
    "  done",
    "fi",
  ].join("\n");
}

function buildAptPurgePrefixPackagesCommand(prefixes: string[]): string {
  const prefixPattern = prefixes.join("|");

  return [
    buildAptLockWaitScript(),
    "export DEBIAN_FRONTEND=noninteractive",
    "wait_for_apt_locks",
    `packages=$(dpkg-query -W -f=\"${"${Package}"}\\n\" 2>/dev/null | grep -E \"^(${prefixPattern})\" || true)`,
    'if [ -n "$packages" ]; then',
    "  wait_for_apt_locks",
    "  apt-get purge -y $packages",
    "fi",
    "wait_for_apt_locks",
    "apt-get autoremove -y",
  ].join("\n");
}

function buildAptNodejsRemoveCommand(): string {
  return [
    buildAptLockWaitScript(),
    "export DEBIAN_FRONTEND=noninteractive",
    "wait_for_apt_locks",
    "dpkg --configure -a || true",
    "wait_for_apt_locks",
    "apt-get install -f -y || true",
    `if dpkg-query -W -f=\"${"${Package}"}\\n\" nodejs >/dev/null 2>&1; then`,
    "  wait_for_apt_locks",
    "  apt-get remove -y nodejs || true",
    "  wait_for_apt_locks",
    "  apt-get purge -y nodejs || true",
    "  wait_for_apt_locks",
    "  apt-get autoremove -y || true",
    "fi",
    "hash -r || true",
  ].join("\n");
}

function buildAptPostgresqlRemoveCommand(): string {
  return [
    buildAptLockWaitScript(),
    "export DEBIAN_FRONTEND=noninteractive",
    "wait_for_apt_locks",
    "dpkg --configure -a || true",
    "wait_for_apt_locks",
    "apt-get install -f -y || true",
    "if command -v systemctl >/dev/null 2>&1; then",
    "  systemctl stop postgresql >/dev/null 2>&1 || true",
    "fi",
    `packages=$(dpkg-query -W -f=\"${"${Package}"}\\n\" 2>/dev/null | grep -E \"^postgresql\" || true)`,
    'if [ -n "$packages" ]; then',
    "  wait_for_apt_locks",
    "  apt-get --purge remove -y $packages || true",
    "  wait_for_apt_locks",
    "  apt-get autoremove -y || true",
    "  wait_for_apt_locks",
    "  apt-get autoclean -y || true",
    "fi",
  ].join("\n");
}

function buildStopDetectedServicesCommand(
  serviceCandidates: string[],
): string | null {
  if (serviceCandidates.length === 0) {
    return null;
  }

  const uniqueCandidates = serviceCandidates.filter(
    (candidate, index) => serviceCandidates.indexOf(candidate) === index,
  );

  return [
    "if command -v systemctl >/dev/null 2>&1; then",
    `  for svc in ${uniqueCandidates.join(" ")}; do`,
    '    load_state=$(systemctl show "$svc" --property=LoadState --value 2>/dev/null || true)',
    '    if [ -n "$load_state" ] && [ "$load_state" != "not-found" ]; then',
    '      systemctl disable --now "$svc" >/dev/null 2>&1 || systemctl stop "$svc" >/dev/null 2>&1 || true',
    "    fi",
    "  done",
    "fi",
  ].join("\n");
}

function buildPm2StopCommand(): string {
  return [
    "if command -v pm2 >/dev/null 2>&1; then",
    "  pm2 kill >/dev/null 2>&1 || true",
    "fi",
    "if command -v systemctl >/dev/null 2>&1; then",
    "  systemctl disable --now pm2-root >/dev/null 2>&1 || true",
    '  systemctl disable --now "pm2-$(id -un)" >/dev/null 2>&1 || true',
    "fi",
  ].join("\n");
}

function buildWebStackPreRemoveCommand(
  component: WebStackComponentKey,
  definition: WebStackComponentDefinition,
): string | null {
  const commands: string[] = [];

  if (component === "nodejs" || component === "pm2") {
    commands.push(buildPm2StopCommand());
  }

  const stopServicesCommand = buildStopDetectedServicesCommand(
    definition.serviceCandidates,
  );
  if (stopServicesCommand) {
    commands.push(stopServicesCommand);
  }

  if (commands.length === 0) {
    return null;
  }

  return commands.join("\n");
}

async function collectSupplementalToolingDetections(
  server: Server,
  commandOptions: { timeoutMs?: number; queueTimeoutMs?: number } = {},
): Promise<
  Map<WebStackComponentKey, { installed: boolean; version: string | null }>
> {
  const keys: WebStackComponentKey[] = ["certbot", "composer", "pm2", "nodejs"];

  const results: Array<
    [WebStackComponentKey, { installed: boolean; version: string | null }]
  > = await Promise.all(
    keys.map(async (key) => {
      const definition = webStackComponentDefinitions[key];
      const testResult = await exec(
        server,
        `bash -lc ${escapeShellArg(definition.commandTest)}`,
        commandOptions,
      ).catch(() => null);

      if (!testResult || testResult.code !== 0) {
        return [key, { installed: false, version: null }];
      }

      const versionResult = await exec(
        server,
        `bash -lc ${escapeShellArg(definition.versionCommand)}`,
        commandOptions,
      ).catch(() => null);

      return [
        key,
        {
          installed: true,
          version: versionResult?.stdout?.trim() || null,
        },
      ];
    }),
  );

  return new Map(results);
}

function buildPm2ManagementCommand(
  packageManager: NonNullable<ServerPlatformInfo["packageManager"]>,
  action: WebStackAction,
): string {
  const npmResolver = buildBinaryResolveScript(npmBinaryCandidates);
  const ensureNodePackages = buildWebStackPackageCommand(
    packageManager,
    "install",
    webStackComponentDefinitions.nodejs.packages[packageManager],
  );

  const pm2Command =
    action === "install"
      ? '"$resolved_npm" install -g pm2'
      : action === "upgrade"
        ? '"$resolved_npm" update -g pm2'
        : action === "reinstall"
          ? '"$resolved_npm" uninstall -g pm2 || true\n"$resolved_npm" install -g pm2'
          : '"$resolved_npm" uninstall -g pm2';

  return [
    `resolved_npm=$(${npmResolver})`,
    'if [ -z "$resolved_npm" ]; then',
    ensureNodePackages
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n"),
    `  resolved_npm=$(${npmResolver})`,
    "fi",
    'if [ -z "$resolved_npm" ]; then',
    '  echo "npm command not found after installing Node.js packages" >&2',
    "  exit 1",
    "fi",
    pm2Command,
  ].join("\n");
}

function resolveWebStackPackageCommand(
  platform: ServerPlatformInfo,
  component: WebStackComponentKey,
  action: WebStackAction,
  definition: WebStackComponentDefinition,
): string {
  if (!platform.packageManager) {
    throw new Error("No supported package manager found on the target server");
  }

  if (
    component === "certbot" &&
    platform.packageManager === "apt-get" &&
    action !== "remove"
  ) {
    return buildAptCertbotCommand(action);
  }

  if (component === "pm2") {
    return buildPm2ManagementCommand(platform.packageManager, action);
  }

  if (platform.packageManager === "apt-get" && action === "remove") {
    if (component === "nodejs") {
      return buildAptNodejsRemoveCommand();
    }

    if (component === "php") {
      return buildAptPurgePrefixPackagesCommand(["php", "libapache2-mod-php"]);
    }

    if (component === "postgresql") {
      return buildAptPostgresqlRemoveCommand();
    }
  }

  return (
    definition.customCommands?.[action] ??
    buildWebStackPackageCommand(
      platform.packageManager,
      action,
      definition.packages[platform.packageManager],
    )
  );
}

async function collectNginxInstallDiagnostics(server: Server): Promise<string> {
  const [statusResult, journalResult, portResult, dockerResult] =
    await Promise.all([
      exec(
        server,
        privilegedCommand(
          server,
          `bash -lc ${escapeShellArg("systemctl status nginx.service --no-pager -l 2>&1 | tail -n 40 || true")}`,
        ),
      ).catch(() => null),
      exec(
        server,
        privilegedCommand(
          server,
          `bash -lc ${escapeShellArg("journalctl -xeu nginx.service --no-pager -n 40 2>&1 || true")}`,
        ),
      ).catch(() => null),
      exec(
        server,
        privilegedCommand(
          server,
          `bash -lc ${escapeShellArg("(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null || true) | grep -E ':(80|443)[[:space:]]' || true")}`,
        ),
      ).catch(() => null),
      exec(
        server,
        privilegedCommand(
          server,
          `bash -lc ${escapeShellArg("docker ps --format '{{.Names}}|{{.Image}}|{{.Ports}}' 2>/dev/null | grep -E '0\\.0\\.0\\.0:(80|443)|:::(80|443)' || true")}`,
        ),
        webStackDockerDiagnosticTimeout(),
      ).catch(() => null),
    ]);

  const combined = [
    statusResult?.stdout,
    statusResult?.stderr,
    journalResult?.stdout,
    journalResult?.stderr,
    portResult?.stdout,
    portResult?.stderr,
    dockerResult?.stdout,
    dockerResult?.stderr,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");

  if (
    /socket\(\) \[::\]:(80|443) failed \(97: Address family not supported by protocol\)/i.test(
      combined,
    )
  ) {
    return [
      "Nginx package installed, but the host service could not start because the default or existing Nginx config still enables an IPv6 listener like `listen [::]:80` on a server without IPv6 support.",
      "Disable the IPv6 listener in the host Nginx config, then run Nginx reinstall or restart again.",
    ].join(" ");
  }

  if (
    /address already in use|bind\(\) to .*:(80|443) failed|0\.0\.0\.0:(80|443)|:::(80|443)/i.test(
      combined,
    )
  ) {
    return [
      "Nginx package installed, but the host service could not start because port 80 or 443 is already in use.",
      "This is often caused by a Docker container, another web server, or a stale host process already binding those ports.",
    ].join(" ");
  }

  const tail = combined
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-10)
    .join(" | ");

  return tail
    ? `Nginx package installed, but the host service could not start. Recent diagnostics: ${tail}`
    : "Nginx package installed, but the host service could not start. Check systemctl status nginx.service and journalctl -xeu nginx.service on the target server.";
}

async function collectWebServerServiceDiagnostics(
  server: Server,
  options: {
    serviceName: string;
    label: string;
  },
): Promise<string | null> {
  const [
    statusResult,
    journalResult,
    portResult,
    dockerResult,
    ipv6FilesResult,
  ] = await Promise.all([
    exec(
      server,
      privilegedCommand(
        server,
        `bash -lc ${escapeShellArg(`systemctl status ${options.serviceName}.service --no-pager -l 2>&1 | tail -n 40 || true`)}`,
      ),
    ).catch(() => null),
    exec(
      server,
      privilegedCommand(
        server,
        `bash -lc ${escapeShellArg(`journalctl -xeu ${options.serviceName}.service --no-pager -n 40 2>&1 || true`)}`,
      ),
    ).catch(() => null),
    exec(
      server,
      privilegedCommand(
        server,
        `bash -lc ${escapeShellArg("(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null || true) | grep -E ':(80|443)[[:space:]]' || true")}`,
      ),
    ).catch(() => null),
    exec(
      server,
      privilegedCommand(
        server,
        `bash -lc ${escapeShellArg("docker ps --format '{{.Names}}|{{.Image}}|{{.Ports}}' 2>/dev/null | grep -E '0\\.0\\.0\\.0:(80|443)|:::(80|443)' || true")}`,
      ),
      webStackDockerDiagnosticTimeout(),
    ).catch(() => null),
    exec(
      server,
      privilegedCommand(
        server,
        `bash -lc ${escapeShellArg(`${buildNginxIpv6ListenerScanCommand()} || true`)}`,
      ),
    ).catch(() => null),
  ]);

  const combined = [
    statusResult?.stdout,
    statusResult?.stderr,
    journalResult?.stdout,
    journalResult?.stderr,
    portResult?.stdout,
    portResult?.stderr,
    dockerResult?.stdout,
    dockerResult?.stderr,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");

  if (!combined.trim()) {
    return null;
  }

  const dockerPortLines = `${dockerResult?.stdout ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const ipv6ListenerFiles = `${ipv6FilesResult?.stdout ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (ipv6ListenerFiles.length > 0) {
    return `${options.label} host service failed because active Nginx config files still enable IPv6 listeners on a server without IPv6 support: ${ipv6ListenerFiles.join(", ")}.`;
  }

  if (
    /socket\(\) \[::\]:(80|443) failed \(97: Address family not supported by protocol\)/i.test(
      `${statusResult?.stdout ?? ""}\n${statusResult?.stderr ?? ""}`,
    )
  ) {
    return `${options.label} host service still reports an IPv6 listener startup error, but no active listen [::] directive was found in the standard Nginx config paths. Check custom include paths or generated configs outside the standard directories.`;
  }

  if (
    /address already in use|bind\(\) to .*:(80|443) failed|listen tcp .*:(80|443)|0\.0\.0\.0:(80|443)|:::(80|443)/i.test(
      combined,
    )
  ) {
    return dockerPortLines.length > 0
      ? `${options.label} host service could not start because port 80 or 443 is already in use. Docker containers currently publishing those ports: ${dockerPortLines.join(", ")}.`
      : `${options.label} host service could not start because port 80 or 443 is already in use by another process.`;
  }

  const tail = combined
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-6)
    .join(" | ");

  return tail
    ? `${options.label} host service failed to start. Recent diagnostics: ${tail}`
    : `${options.label} host service failed to start.`;
}

export async function inspectWebServerCapability(
  server: Server,
  platformOverride?: ServerPlatformInfo,
  serviceSnapshot?: WebStackServiceSnapshot[],
  commandOptions: { timeoutMs?: number; queueTimeoutMs?: number } = {},
): Promise<ServerWebCapability> {
  const platform = platformOverride ?? (await detectServerPlatform(server));
  const [result, packagePresenceResult, supplementalDetections] =
    await Promise.all([
      exec(
        server,
        `bash -lc ${escapeShellArg(buildWebStackInspectScript())}`,
        commandOptions,
      ),
      platform.packageManager
        ? exec(
            server,
            `bash -lc ${escapeShellArg(buildPackagePresenceInspectScript(platform.packageManager))}`,
            commandOptions,
          ).catch(() => null)
        : Promise.resolve(null),
      collectSupplementalToolingDetections(server, commandOptions).catch(
        () => new Map(),
      ),
    ]);

  const inspection = new Map<
    WebStackComponentKey,
    {
      installed: boolean;
      version: string | null;
      serviceName: string | null;
      active: string | null;
      enabled: string | null;
      serviceDescription: string | null;
    }
  >();

  for (const line of result.stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)) {
    const [
      keyRaw,
      installedRaw,
      versionRaw,
      serviceNameRaw,
      activeRaw,
      enabledRaw,
      serviceDescriptionRaw,
    ] = line.split("\t");

    const key = keyRaw as WebStackComponentKey;
    inspection.set(key, {
      installed: installedRaw === "1",
      version: versionRaw?.trim() || null,
      serviceName: serviceNameRaw?.trim() || null,
      active: activeRaw?.trim() || null,
      enabled: enabledRaw?.trim() || null,
      serviceDescription: serviceDescriptionRaw?.trim() || null,
    });
  }

  const normalizedServices = new Map(
    (serviceSnapshot ?? []).map((service) => [
      service.name.toLowerCase(),
      service,
    ]),
  );

  const packagePresence = new Map<WebStackComponentKey, boolean>();
  for (const line of `${packagePresenceResult?.stdout ?? ""}`
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)) {
    const [keyRaw, installedRaw] = line.split("\t");
    packagePresence.set(keyRaw as WebStackComponentKey, installedRaw === "1");
  }

  for (const [key, definition] of Object.entries(
    webStackComponentDefinitions,
  ) as Array<[WebStackComponentKey, WebStackComponentDefinition]>) {
    const matchedService = definition.serviceCandidates
      .map((candidate) => normalizedServices.get(candidate.toLowerCase()))
      .find((service): service is WebStackServiceSnapshot => Boolean(service));

    if (!matchedService) {
      continue;
    }

    const existing = inspection.get(key);
    inspection.set(key, {
      installed:
        existing?.installed === true ||
        Boolean(matchedService) ||
        packagePresence.get(key) === true,
      version: existing?.version ?? null,
      serviceName: existing?.serviceName ?? matchedService.name,
      active: existing?.active ?? matchedService.active,
      enabled: existing?.enabled ?? matchedService.enabled,
      serviceDescription:
        existing?.serviceDescription ?? matchedService.description ?? null,
    });
  }

  for (const [key, packageInstalled] of packagePresence.entries()) {
    if (!packageInstalled) {
      continue;
    }

    const existing = inspection.get(key);
    inspection.set(key, {
      installed: existing?.installed === true || packageInstalled,
      version: existing?.version ?? null,
      serviceName: existing?.serviceName ?? null,
      active: existing?.active ?? null,
      enabled: existing?.enabled ?? null,
      serviceDescription: existing?.serviceDescription ?? null,
    });
  }

  for (const [key, supplemental] of supplementalDetections.entries()) {
    if (!supplemental.installed) {
      continue;
    }

    const existing = inspection.get(key);
    inspection.set(key, {
      installed: true,
      version: existing?.version ?? supplemental.version ?? null,
      serviceName: existing?.serviceName ?? null,
      active: existing?.active ?? null,
      enabled: existing?.enabled ?? null,
      serviceDescription: existing?.serviceDescription ?? null,
    });
  }

  const canManage =
    Boolean(platform.packageManager) &&
    (server.username === "root" || platform.sudoNonInteractive);

  const components = (
    Object.entries(webStackComponentDefinitions) as Array<
      [WebStackComponentKey, WebStackComponentDefinition]
    >
  ).map(([key, definition]) => {
    const detected = inspection.get(key);
    const installed = detected?.installed ?? false;
    const availableActions = !canManage
      ? []
      : installed
        ? (["upgrade", "reinstall", "remove"] as WebStackAction[])
        : (["install"] as WebStackAction[]);

    const notes: string[] = [];
    if (!canManage) {
      notes.push(
        "Package changes require root access or non-interactive sudo on this server.",
      );
    }
    if (installed && detected?.serviceName && detected.active !== "active") {
      notes.push(
        `${definition.label} is installed but its systemd service is not active.`,
      );
    }
    if (installed && key === "php" && !detected?.serviceName) {
      notes.push("PHP CLI was found, but no PHP-FPM service was detected yet.");
    }
    if (!installed) {
      notes.push(
        `Install ${definition.label} to support ${definition.recommendedFor.join(", ")}.`,
      );
    }

    return {
      key,
      label: definition.label,
      category: definition.category,
      description: detected?.serviceDescription || definition.description,
      installed,
      version: detected?.version ?? null,
      serviceName: detected?.serviceName ?? null,
      active: detected?.active ?? null,
      enabled: detected?.enabled ?? null,
      availableActions,
      recommendedFor: definition.recommendedFor,
      notes,
    } satisfies WebStackComponentStatus;
  });

  await Promise.all(
    components
      .filter(
        (component) =>
          component.category === "web-server" &&
          component.installed &&
          component.serviceName &&
          component.active !== "active",
      )
      .map(async (component) => {
        const diagnostic = await collectWebServerServiceDiagnostics(server, {
          serviceName: component.serviceName!,
          label: component.label,
        }).catch(() => null);

        if (diagnostic) {
          component.notes.push(diagnostic);
        }
      }),
  );

  const activePrimaryWebServer = components.find(
    (component) =>
      component.category === "web-server" &&
      component.installed &&
      component.active === "active",
  );
  const installedPrimaryWebServer = components.find(
    (component) => component.category === "web-server" && component.installed,
  );
  const primaryWebServer = activePrimaryWebServer?.label ?? null;
  const phpInstalled = components.some(
    (component) => component.key === "php" && component.installed,
  );
  const nodeInstalled = components.some(
    (component) => component.key === "nodejs" && component.installed,
  );
  const pm2Installed = components.some(
    (component) => component.key === "pm2" && component.installed,
  );
  const relationalDatabaseInstalled = components.some(
    (component) =>
      (component.key === "mysql" || component.key === "postgresql") &&
      component.installed,
  );
  const cacheInstalled = components.some(
    (component) => component.key === "redis" && component.installed,
  );
  const certbotInstalled = components.some(
    (component) => component.key === "certbot" && component.installed,
  );
  const composerInstalled = components.some(
    (component) => component.key === "composer" && component.installed,
  );

  const support = {
    staticSites: Boolean(primaryWebServer),
    phpApps: Boolean(primaryWebServer) && phpInstalled,
    javascriptApps: Boolean(primaryWebServer) && nodeInstalled,
    sslAutomation: Boolean(primaryWebServer) && certbotInstalled,
    processManager: pm2Installed,
    relationalDatabase: relationalDatabaseInstalled,
    cache: cacheInstalled,
  };

  const notes: string[] = [];
  if (!support.staticSites) {
    notes.push(
      "Install Nginx, Apache, or Caddy to serve websites directly from this host.",
    );
  }
  if (!primaryWebServer && installedPrimaryWebServer) {
    notes.push(
      `${installedPrimaryWebServer.label} is installed on the host, but it is not active yet. This usually means the service failed to start, is disabled, or another process/container is already using ports 80/443.`,
    );
  }
  if (!phpInstalled) {
    notes.push(
      "PHP is still missing for Laravel, WordPress, or native PHP deployments.",
    );
  }
  if (phpInstalled && !composerInstalled) {
    notes.push(
      "Composer is recommended for Laravel and modern PHP dependency management.",
    );
  }
  if (!nodeInstalled) {
    notes.push(
      "Node.js is still missing for Next.js, Nuxt, and frontend build pipelines.",
    );
  }
  if (!pm2Installed) {
    notes.push(
      "PM2 is not installed yet, so long-running Node.js processes and workers are not managed on the host.",
    );
  }
  if (!relationalDatabaseInstalled) {
    notes.push(
      "No relational database service is installed yet. Add MariaDB/MySQL or PostgreSQL if the workload needs SQL storage.",
    );
  }
  if (!cacheInstalled) {
    notes.push(
      "Redis is not installed yet, so caching, sessions, and queue backends are not ready on this host.",
    );
  }
  if (!certbotInstalled) {
    notes.push(
      "Certbot is not installed yet, so HTTPS automation is not ready.",
    );
  }
  if (!canManage) {
    notes.push(
      `Package manager ${getWebStackPackageManagerLabel(platform.packageManager)} is present, but the current SSH user cannot manage packages without root/non-interactive sudo.`,
    );
  }

  let summary = "The host can be prepared for future websites.";
  if (support.phpApps && support.javascriptApps) {
    summary = `${primaryWebServer} is ready for both PHP applications and JavaScript app hosting.`;
  } else if (support.phpApps) {
    summary = `${primaryWebServer} is ready for PHP applications such as Laravel or native PHP sites.`;
  } else if (support.javascriptApps) {
    summary = `${primaryWebServer} is ready to front JavaScript applications such as Next.js or other Node.js apps.`;
  } else if (support.staticSites) {
    summary = `${primaryWebServer} is installed, but additional runtimes are still needed for PHP or JavaScript frameworks.`;
  } else if (installedPrimaryWebServer) {
    summary = `${installedPrimaryWebServer.label} is installed on the host, but the service is not active yet.`;
  }

  return {
    ready: support.staticSites && (support.phpApps || support.javascriptApps),
    summary,
    notes,
    packageManager: platform.packageManager,
    canManage,
    primaryWebServer,
    support,
    components,
  };
}

export async function manageWebStackComponent(
  server: Server,
  component: WebStackComponentKey,
  action: WebStackAction,
): Promise<ServerWebCapability> {
  const platform = await detectServerPlatform(server);
  const definition = webStackComponentDefinitions[component];

  if (!platform.packageManager) {
    throw new Error(
      `Web stack package changes are not supported on ${platform.distro ?? server.name}: no supported package manager found`,
    );
  }

  if (!platform.sudoNonInteractive && server.username !== "root") {
    throw new Error(
      `Web stack package changes require non-interactive sudo access on server ${server.name}`,
    );
  }

  const packageCommand = resolveWebStackPackageCommand(
    platform,
    component,
    action,
    definition,
  );

  const preRemoveCommand =
    action === "remove"
      ? buildWebStackPreRemoveCommand(component, definition)
      : null;

  try {
    if (preRemoveCommand) {
      await exec(
        server,
        privilegedCommand(
          server,
          `bash -lc ${escapeShellArg(preRemoveCommand)}`,
        ),
      ).catch(() => null);
    }

    await execStrict(
      server,
      privilegedCommand(server, `bash -lc ${escapeShellArg(packageCommand)}`),
    );
  } catch (error) {
    if (
      component === "nginx" &&
      platform.packageManager === "apt-get" &&
      action !== "remove"
    ) {
      const diagnostics = await collectNginxInstallDiagnostics(server).catch(
        () => null,
      );
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        diagnostics
          ? `${diagnostics} Original package error: ${message}`
          : message,
      );
    }

    throw error;
  }

  if (action !== "remove") {
    if (component === "certbot") {
      await ensureCertbotInstalled(server);
    }

    if (component === "nginx") {
      await execStrict(
        server,
        privilegedCommand(
          server,
          `bash -lc ${escapeShellArg(buildNginxDefaultServerBootstrapScript())}`,
        ),
      );
    }

    const enableServiceCommand = buildEnableDetectedServiceCommand(
      definition.serviceCandidates,
    );
    if (enableServiceCommand) {
      try {
        await execStrict(
          server,
          privilegedCommand(
            server,
            `bash -lc ${escapeShellArg(enableServiceCommand)}`,
          ),
        );
      } catch (error) {
        if (definition.category === "web-server") {
          const diagnostic = await collectWebServerServiceDiagnostics(server, {
            serviceName: definition.serviceCandidates[0] ?? component,
            label: definition.label,
          }).catch(() => null);
          const message =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            diagnostic
              ? `${diagnostic} Original service error: ${message}`
              : message,
          );
        }

        throw error;
      }
    }
  }

  const capability = await inspectWebServerCapability(server, platform);

  if (
    action === "remove" &&
    capability.components.some(
      (entry) => entry.key === component && entry.installed,
    )
  ) {
    throw new Error(
      `${definition.label} is still detected after removal. The host may still keep versioned packages or service binaries installed.`,
    );
  }

  return capability;
}
