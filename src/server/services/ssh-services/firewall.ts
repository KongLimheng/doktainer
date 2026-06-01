import { Server } from "@prisma/client";

import { exec, execStrict } from "./commands";
import { privilegedCommand } from "./internal/privilege";

export interface FirewallRule {
  number: number;
  rule: string;
  action: string;
  direction: string;
  from: string;
  description: string;
}

export async function getFirewallStatus(
  server: Server,
): Promise<{ enabled: boolean; rules: FirewallRule[] }> {
  const status = await exec(
    server,
    `${privilegedCommand(server, "ufw status numbered")} 2>/dev/null || echo "inactive"`,
  );
  const output = status.stdout;
  const enabled =
    !output.includes("inactive") && !output.includes("Status: inactive");

  const rules: FirewallRule[] = [];
  const lines = output.split("\n");
  for (const line of lines) {
    const match = line.match(/^\[\s*(\d+)\]\s+(.+)$/);
    if (match) {
      const columns = match[2]
        .split(/\s{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (columns.length < 3) {
        continue;
      }

      const actionParts = columns[1].split(/\s+/).filter(Boolean);
      rules.push({
        number: Number(match[1]),
        rule: columns[0],
        action: (actionParts[0] || "").toUpperCase(),
        direction: (actionParts[1] || "").toUpperCase(),
        from: columns.slice(2).join(" "),
        description: "",
      });
    }
  }
  return { enabled, rules };
}

export async function enableFirewall(server: Server): Promise<void> {
  await execStrict(server, privilegedCommand(server, "ufw --force enable"));
}

export async function disableFirewall(server: Server): Promise<void> {
  await execStrict(server, privilegedCommand(server, "ufw --force disable"));
}

export async function addFirewallRule(
  server: Server,
  rule: string,
  action: "allow" | "deny",
  from?: string,
): Promise<void> {
  const fromPart = from && from !== "Anywhere" ? `from ${from} ` : "";
  await execStrict(
    server,
    privilegedCommand(server, `ufw ${action} ${fromPart}${rule}`),
  );
}

export async function deleteFirewallRule(
  server: Server,
  ruleNum: number,
): Promise<void> {
  await execStrict(
    server,
    privilegedCommand(server, `ufw --force delete ${ruleNum}`),
  );
}
