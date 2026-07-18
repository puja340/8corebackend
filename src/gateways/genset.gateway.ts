import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { ModuleRef } from '@nestjs/core';
import { GensetService } from '../genset/genset.service';
import { OnEvent } from '@nestjs/event-emitter';

interface ClientView {
  view: 'home' | 'generator_a' | 'generator_b' | 'generator_c' | 'generator_d' | 
        'generator_e' | 'generator_f' | 'generator_g' | 'generator_h' | null;
}

@WebSocketGateway({ path: '/', cors: { origin: '*' } })
export class GensetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private moduleRef: ModuleRef,
    private readonly gensetService: GensetService,
  ) {}

  private clientViews = new Map<WebSocket, ClientView>();

  // ←←← NEW: Maintain latest full state
  private currentGensetData: any = {
    genset1: null, genset2: null, genset3: null, genset4: null,
    genset5: null, genset6: null, genset7: null, genset8: null, capacitor: null, 
  };

private kwBuffers: { [key: number]: number[] } = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
private kvaBuffers: { [key: number]: number[] } = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
private voltageBuffers: { [key: number]: number[] } = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
private essActivePowerBuffer: number[] = [];
private essApparentPowerBuffer: number[] = [];

private lastSaveTime = Date.now();
  // private lastSaveTime = Date.now();

  handleConnection(client: WebSocket) {
    console.log('→ Client connected');
    client.send(JSON.stringify({ type: 'connected', message: 'WebSocket ready' }));

    const autoView = 'home';
    this.clientViews.set(client, { view: autoView });
  }

  handleDisconnect(client: WebSocket) {
    this.clientViews.delete(client);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: { view: ClientView['view'] }, @ConnectedSocket() client: WebSocket) {
    const viewInfo = this.clientViews.get(client);
    if (viewInfo) viewInfo.view = data.view;

    // Send current latest data immediately on subscribe
    if (Object.values(this.currentGensetData).some(v => v !== null)) {
      client.send(JSON.stringify(this.currentGensetData));
    }

    client.send(JSON.stringify({ type: 'subscribed', view: data.view }));
  }

  afterInit() {
    this.server.on('connection', (client: WebSocket) => {
      client.on('message', async (message: string | Buffer) => {
        // console.log("Received:", message.toString());
        try {
          const msg = JSON.parse(message.toString());
                  // console.log("Message Type:", msg.type);   // <-- Add here


          // === MANUAL TOGGLE ===
          if (msg.type === 'set_genset_status') {
              console.log("Toggle received from React:", msg);

            // ... (your existing toggle logic - unchanged)
        await this.gensetService.updateGensetAllStatus(msg.status);

            this.server.clients.forEach((c) => {
              if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(msg));
            });

            client.send(JSON.stringify({ type: "toggle_ack", ...msg, success: true }));
            return;
          }

          // === INDIVIDUAL GENSET UPDATE (New dhruv.py format) ===
      // === INDIVIDUAL GENSET UPDATE ===
let updated = false;

// Inside the message handler (afterInit → client.on('message'))
for (let i = 1; i <= 8; i++) {
  const key = `genset${i}`;
  if (msg[key]) {
    this.currentGensetData[key] = msg[key];
    updated = true;

    const gensetData = msg[key];

    // Buffer values
    const kw = Number(gensetData.kw || gensetData.power || 0);
    const kva = Number(gensetData.kva || 0);
    const voltage = Number(gensetData.voltage || 0);

    this.kwBuffers[i] = this.kwBuffers[i] || [];
    this.kvaBuffers[i] = this.kvaBuffers[i] || [];
    this.voltageBuffers[i] = this.voltageBuffers[i] || [];

    this.kwBuffers[i].push(kw);
    this.kvaBuffers[i].push(kva);
    this.voltageBuffers[i].push(voltage);
  }
}
// === CAPACITOR UPDATE ===
if (msg.capacitor) {
  this.currentGensetData.capacitor = msg.capacitor;
  updated = true;

  const activePower = Number(msg.capacitor.active_power);
  const apparentPower = Number(msg.capacitor.apparent_power);

  if (
    Number.isFinite(activePower) &&
    Number.isFinite(apparentPower)
  ) {
    this.essActivePowerBuffer.push(activePower);
    this.essApparentPowerBuffer.push(apparentPower);
  }
}

if (updated) {
  const now = Date.now();

  if (now - this.lastSaveTime >= 60000) {   // Every minute
    await this.saveAllBufferedReadings();
    this.lastSaveTime = now;
  }

  this.broadcastGensetData();
}

          // === FAULT ALERTS (unchanged) ===
          else if (msg.fault) {
            this.server.clients.forEach((c) => {
              if (c.readyState === WebSocket.OPEN) {
                c.send(JSON.stringify({ type: 'fault_alerts', alerts: msg.fault }));
              }
            });
          }
        } catch (e) {
          console.error('Invalid WS message:', e);
        }
      });
    });
  }

  

  private broadcastGensetData() {
    const fullData = this.currentGensetData;

  // console.log("Broadcasting:", fullData);
    this.server.clients.forEach((client) => {
      const info = this.clientViews.get(client);
      if (!info?.view || client.readyState !== WebSocket.OPEN) return;

      try {
        client.send(JSON.stringify(fullData));
      } catch (err) {
        console.error('Failed to send to client:', err);
      }
    });
  }


 private async saveAllBufferedReadings() {
  for (let i = 1; i <= 8; i++) {
    if (this.kwBuffers[i]?.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.kwBuffers[i].length);

      const randomKw = this.kwBuffers[i][randomIndex];
      const randomKva = this.kvaBuffers[i][randomIndex];
      const randomVoltage = this.voltageBuffers[i][randomIndex];

      await this.gensetService.saveReading(i, randomKw, randomKva, randomVoltage);

      // Clear all buffers
      this.kwBuffers[i] = [];
      this.kvaBuffers[i] = [];
      this.voltageBuffers[i] = [];
    }
  }

  if (
  this.essActivePowerBuffer.length > 0 &&
  this.essApparentPowerBuffer.length > 0
) {
  const randomIndex = Math.floor(
    Math.random() * this.essActivePowerBuffer.length
  );

  const activePower =
    this.essActivePowerBuffer[randomIndex];

  const apparentPower =
    this.essApparentPowerBuffer[randomIndex];

  await this.gensetService.saveEssReading(
    activePower,
    apparentPower,
  );

  this.essActivePowerBuffer = [];
  this.essApparentPowerBuffer = [];
}
}

  @OnEvent('toggle.genset')
  handleToggleEvent(payload: { genset: string; status: boolean }) {
      console.log(`[EVENT] Received toggle event: ${JSON.stringify(payload)}`);
  
      this.server.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'set_genset_status',
            genset: payload.genset,
            status: payload.status
          }));
        }
      });
    }
}