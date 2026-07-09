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

@WebSocketGateway({
  path: '/',
  cors: { origin: '*' },
})
export class GensetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private moduleRef: ModuleRef,
    private readonly gensetService: GensetService,
  ) {}

  // Store what each client wants to see
  private clientViews = new Map<WebSocket, ClientView>();

  // KW Buffers for all 8 gensets
  private kwBuffers: { [gensetId: number]: number[] } = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
  };

  private lastSaveTime = Date.now();

  handleConnection(client: WebSocket) {
    console.log('→ Client connected');

    client.send(JSON.stringify({ type: 'connected', message: 'WebSocket ready' }));

    // Auto-subscribe to home view
    const autoView = 'home';
    this.clientViews.set(client, { view: autoView });
    console.log(`🔧 Auto-subscribed new client to view: ${autoView}`);
  }

  handleDisconnect(client: WebSocket) {
    console.log('← Client disconnected');
    this.clientViews.delete(client);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { view: ClientView['view'] },
    @ConnectedSocket() client: WebSocket,
  ) {
    console.log(`Client subscribed to view: ${data.view}`);
    const viewInfo = this.clientViews.get(client);
    if (viewInfo) {
      viewInfo.view = data.view;
    }

    client.send(JSON.stringify({ type: 'subscribed', view: data.view }));
  }

  afterInit() {
    this.server.on('connection', (client: WebSocket) => {
      client.on('message', async (message: string | Buffer) => {
        try {
          const msg = JSON.parse(message.toString());

          // === MANUAL TOGGLE FROM FRONTEND ===
          if (msg.type === 'set_genset_status') {
            // Save to Database
            try {
              await this.gensetService.updateStatus({
                gensetKey: msg.genset,
                status: msg.status,
              });
            } catch (dbErr) {
              console.error(`❌ Failed to save status in DB:`, dbErr);
            }

            // Forward to Python (hardware control)
            this.server.clients.forEach((c) => {
              if (c.readyState === WebSocket.OPEN) {
                c.send(JSON.stringify(msg));
              }
            });

            // ACK back to frontend
            client.send(JSON.stringify({
              type: "toggle_ack",
              genset: msg.genset,
              status: msg.status,
              success: true
            }));
          }

          // === FULL DATA FROM PYTHON (8 Gensets) ===
          else if (msg.genset1 && msg.genset3) {   // Checking genset1 & genset3 is enough to confirm full payload
            const now = Date.now();

            // Buffer KW readings for all 8 gensets
            for (let i = 1; i <= 8; i++) {
              const genset = msg[`genset${i}`];
              if (genset) {
                const kw = Number(genset.kw || genset.power || 0);
                if (!this.kwBuffers[i]) this.kwBuffers[i] = [];
                this.kwBuffers[i].push(kw);
              }
            }

            // Save random KW every 60 seconds
            if (now - this.lastSaveTime >= 60000) {
              for (let i = 1; i <= 8; i++) {
                const buffer = this.kwBuffers[i];
                if (buffer?.length > 0) {
                  const randomIndex = Math.floor(Math.random() * buffer.length);
                  const randomKw = buffer[randomIndex];

                  await this.gensetService.saveKwReading(i, randomKw);
                  buffer.length = 0; // clear buffer
                }
              }
              this.lastSaveTime = now;
            }

            this.broadcastGensetData(msg);
          }

          // === FAULT ALERTS ===
          else if (msg.fault) {
            this.server.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'fault_alerts',
                  alerts: msg.fault
                }));
              }
            });
          }
        } catch (e) {
          console.log('Invalid message:', e);
        }
      });
    });
  }

  broadcastGensetData(fullData: any) {
    this.server.clients.forEach((client) => {
      const info = this.clientViews.get(client);
      if (!info?.view) return;

      try {
        client.send(JSON.stringify(fullData)); // Send full data (filtering now done in frontend)
      } catch (err) {
        console.log('Failed to send to client:', err);
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