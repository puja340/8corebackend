// server.js
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('→ New genset client connected');

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });

  // Optional: send welcome or test message
  ws.send(JSON.stringify({ type: 'welcome', message: 'Genset WebSocket connected' }));
});

server.listen(3000, () => {
  console.log('HTTP + WebSocket server running → ws://localhost:3000');
});

// Optional: simple http route to test
app.get('/', (req, res) => {
  res.send('Hello World! (this is HTTP – use ws:// for WebSocket)');
});