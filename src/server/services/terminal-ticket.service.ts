import { randomUUID } from "crypto";

const TERMINAL_SOCKET_TICKET_TTL_MS = 60 * 1000;

export interface TerminalSocketTicket {
  id: string;
  userId?: string;
  organizationId?: string;
  serverId: string;
  sessionId?: string;
  createdAt: number;
  expiresAt: number;
}

const terminalSocketTickets = new Map<string, TerminalSocketTicket>();

function pruneExpiredTerminalSocketTickets(now = Date.now()) {
  for (const [ticketId, ticket] of terminalSocketTickets.entries()) {
    if (ticket.expiresAt <= now) {
      terminalSocketTickets.delete(ticketId);
    }
  }
}

export function issueTerminalSocketTicket(input: {
  userId?: string;
  organizationId?: string;
  serverId: string;
  sessionId?: string;
}): TerminalSocketTicket {
  const now = Date.now();
  pruneExpiredTerminalSocketTickets(now);

  const ticket: TerminalSocketTicket = {
    id: randomUUID(),
    userId: input.userId,
    organizationId: input.organizationId,
    serverId: input.serverId,
    sessionId: input.sessionId,
    createdAt: now,
    expiresAt: now + TERMINAL_SOCKET_TICKET_TTL_MS,
  };

  terminalSocketTickets.set(ticket.id, ticket);
  return ticket;
}

export function consumeTerminalSocketTicket(input: {
  ticketId?: string;
  serverId: string;
  sessionId?: string;
}): TerminalSocketTicket | null {
  const now = Date.now();
  pruneExpiredTerminalSocketTickets(now);

  if (!input.ticketId) {
    return null;
  }

  const ticket = terminalSocketTickets.get(input.ticketId);
  terminalSocketTickets.delete(input.ticketId);

  if (!ticket) {
    return null;
  }

  if (ticket.expiresAt <= now) {
    return null;
  }

  if (ticket.serverId !== input.serverId) {
    return null;
  }

  if ((ticket.sessionId ?? undefined) !== (input.sessionId ?? undefined)) {
    return null;
  }

  return ticket;
}