import {
  DomainConfigMode as ApiDomainConfigMode,
  DomainProxy,
} from "@/lib/api";

export type AddDomainFormState = {
  name: string;
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT";
  value: string;
  serverId: string;
  targetContainerId: string;
  targetPort: number | "";
  proxy: DomainProxy;
  proxyConfigMode: ApiDomainConfigMode;
  isPrimary: boolean;
  sslEnabled: boolean;
  autoRenew: boolean;
};

export type DomainConfigMode = "MANUAL" | "CONTAINER";

export type DomainTab = "domains" | "ssl";

export type SslStatusKey =
  | "valid"
  | "expiring"
  | "expired"
  | "pending"
  | "none";

export type PortOption = {
  value: number;
  label: string;
};
