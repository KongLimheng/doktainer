import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeTerminalSocketTicket,
  issueTerminalSocketTicket,
} from "../../src/server/services/terminal-ticket.service";

test("terminal websocket tickets are single-use and bound to server and session", () => {
  const wrongServerTicket = issueTerminalSocketTicket({
    userId: "user-1",
    organizationId: "org-1",
    serverId: "server-1",
    sessionId: "session-1",
  });

  assert.equal(
    consumeTerminalSocketTicket({
      ticketId: wrongServerTicket.id,
      serverId: "server-2",
      sessionId: "session-1",
    }),
    null,
  );

  const ticket = issueTerminalSocketTicket({
    userId: "user-1",
    organizationId: "org-1",
    serverId: "server-1",
    sessionId: "session-1",
  });

  const consumed = consumeTerminalSocketTicket({
    ticketId: ticket.id,
    serverId: "server-1",
    sessionId: "session-1",
  });

  assert.ok(consumed);
  assert.equal(consumed?.userId, "user-1");
  assert.equal(consumed?.organizationId, "org-1");
  assert.equal(
    consumeTerminalSocketTicket({
      ticketId: ticket.id,
      serverId: "server-1",
      sessionId: "session-1",
    }),
    null,
  );
});
