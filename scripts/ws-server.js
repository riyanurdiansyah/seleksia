const { WebSocketServer } = require("ws");

const port = process.env.PUSHER_PORT ? parseInt(process.env.PUSHER_PORT) : 6001;
const wss = new WebSocketServer({ port });

// Store candidateId -> candidateState mapping
const states = new Map();
// Store socket -> candidateId mapping to track disconnects
const socketCandidates = new Map();

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send initial states to newly connected clients (e.g. admin)
  ws.send(JSON.stringify({ type: "initial-states", payload: Array.from(states.values()) }));

  ws.on("message", (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === "candidate-state") {
        const payload = parsed.payload;
        payload.isOnline = true;
        states.set(payload.candidateId, payload);
        socketCandidates.set(ws, payload.candidateId);

        // Broadcast state update to everyone except sender (especially admin)
        broadcast({ type: "state-update", payload }, ws);
      } else if (parsed.type === "candidate-snapshot") {
        // Fast-channel: relay snapshot frame directly without storing
        socketCandidates.set(ws, parsed.payload.candidateId);
        broadcast({ type: "snapshot-frame", payload: parsed.payload }, ws);
      }
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    const candidateId = socketCandidates.get(ws);
    if (candidateId) {
      const state = states.get(candidateId);
      if (state) {
        state.isOnline = false;
        // Broadcast offline status
        broadcast({ type: "state-offline", payload: { candidateId } });
      }
      socketCandidates.delete(ws);
    }
  });
});

function broadcast(data, excludeWs) {
  const messageStr = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client !== excludeWs) { // WebSocket.OPEN + skip sender
      client.send(messageStr);
    }
  });
}

console.log(`WebSocket Server running on ws://localhost:${port}`);
