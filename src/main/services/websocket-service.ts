import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

export interface WebSocketEventMessage {
  type: string;
  data: any;
  timestamp: number;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private port: number;
  private clients: Set<WebSocket> = new Set();

  constructor(port = 5174) {
    this.port = port;
  }

  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('listening', () => {
          console.log(`[WebSocketService] Event server listening on ws://localhost:${this.port}`);
          resolve(this.port);
        });

        this.wss.on('connection', (ws: WebSocket) => {
          this.clients.add(ws);

          ws.on('close', () => {
            this.clients.delete(ws);
          });

          ws.on('error', (err) => {
            console.error('[WebSocketService] Client socket error:', err);
            this.clients.delete(ws);
          });

          // Send welcome heartbeat
          ws.send(
            JSON.stringify({
              type: 'system:connected',
              data: { status: 'connected', time: Date.now() },
              timestamp: Date.now(),
            })
          );
        });

        this.wss.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            if (this.port >= 5180) {
              const maxErr = new Error(`[WebSocketService] Ports 5174-5180 are all occupied. Aborting port scan.`);
              console.error(maxErr.message);
              return reject(maxErr);
            }
            console.warn(`[WebSocketService] Port ${this.port} in use, trying next port...`);
            this.port += 1;
            try {
              this.wss?.close();
            } catch {}
            this.start().then(resolve).catch(reject);
          } else {
            console.error('[WebSocketService] Server error:', err);
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public broadcast(type: string, data: any): void {
    if (!this.wss) return;

    const message: WebSocketEventMessage = {
      type,
      data,
      timestamp: Date.now(),
    };

    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public getPort(): number {
    return this.port;
  }

  public stop(): void {
    if (this.wss) {
      for (const client of this.clients) {
        try {
          client.terminate();
        } catch {}
      }
      try {
        this.wss.close();
      } catch {}
      this.wss = null;
    }
    this.clients.clear();
  }
}
