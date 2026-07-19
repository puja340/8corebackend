import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, WebSocket } from 'ws';

@WebSocketGateway({
  path: '/genset-performance',
  cors: {
    origin: '*',
  },
})
export class GensetPerformanceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: WebSocket) {
    console.log('Genset performance client connected');

    client.send(
      JSON.stringify({
        type: 'connected',
        message: 'Genset performance WebSocket connected',
      }),
    );
  }

  handleDisconnect() {
    console.log('Genset performance client disconnected');
  }

  afterInit() {
    this.server.on('connection', (client: WebSocket) => {
      client.on('message', (message: string | Buffer) => {
        try {
          const parsedMessage = JSON.parse(message.toString());

          if (!parsedMessage.gensetall) {
            return;
          }

          const kw = Number(parsedMessage.gensetall.kw);
          const voltage = Number(parsedMessage.gensetall.voltage);
          const frequency = Number(parsedMessage.gensetall.freq);

          if (
            !Number.isFinite(kw) ||
            !Number.isFinite(voltage) ||
            !Number.isFinite(frequency)
          ) {
            console.log('Invalid gensetall data received');
            return;
          }

          const response = {
            type: 'genset_performance',
            gensetall: {
              kw,
              voltage,
              frequency,
            },
            timestamp: Date.now(),
          };

          this.server.clients.forEach((connectedClient) => {
            if (connectedClient.readyState === WebSocket.OPEN) {
              connectedClient.send(JSON.stringify(response));
            }
          });
        } catch (error) {
          console.error(
            'Invalid genset performance WebSocket message:',
            error,
          );
        }
      });
    });
  }
}