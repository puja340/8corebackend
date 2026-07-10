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
    genset5: null, genset6: null, genset7: null, genset8: null,
  };

  private kwBuffers: { [key: number]: number[] } = { 1: [], 2: [], /* ... */ 8: [] };
  private lastSaveTime = Date.now();

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
        try {
          const msg = JSON.parse(message.toString());

          // === MANUAL TOGGLE ===
          if (msg.type === 'set_genset_status') {
            // ... (your existing toggle logic - unchanged)
            await this.gensetService.updateStatus({ gensetKey: msg.genset, status: msg.status });

            this.server.clients.forEach((c) => {
              if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(msg));
            });

            client.send(JSON.stringify({ type: "toggle_ack", ...msg, success: true }));
            return;
          }

          // === INDIVIDUAL GENSET UPDATE (New dhruv.py format) ===
          let updated = false;

          for (let i = 1; i <= 8; i++) {
            const key = `genset${i}`;
            if (msg[key]) {
              this.currentGensetData[key] = msg[key];
              updated = true;

              // Buffer KW for DB saving
              const kw = Number(msg[key].kw || msg[key].power || 0);
              if (!this.kwBuffers[i]) this.kwBuffers[i] = [];
              this.kwBuffers[i].push(kw);
            }
          }

          if (updated) {
            const now = Date.now();

            // Save to DB every 60s (same logic)
            if (now - this.lastSaveTime >= 60000) {
              for (let i = 1; i <= 8; i++) {
                const buffer = this.kwBuffers[i];
                if (buffer?.length > 0) {
                  const randomKw = buffer[Math.floor(Math.random() * buffer.length)];
                  await this.gensetService.saveKwReading(i, randomKw);
                  buffer.length = 0;
                }
              }
              this.lastSaveTime = now;
            }

            // Broadcast full current state
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