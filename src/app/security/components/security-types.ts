export interface RuleFormState {
  rule: string;
  action: "allow" | "deny";
  from: string;
}

export interface SecuritySummaryData {
  totalServers: number;
  secured: number;
  totalRules: number;
  bannedIps: number;
  fail2banActive: number;
}

export interface SecurityOperationalNoteData {
  distroLabel: string;
  packageManagerLabel: string;
  sudoLabel: string;
  supported: boolean;
}