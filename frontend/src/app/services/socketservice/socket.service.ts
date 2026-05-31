import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../../services/authservice/auth.service';
import { SERVICE_BASE_URL } from '../../environment-config';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | undefined;
  private readonly socketUrl = SERVICE_BASE_URL;
  private readonly socketPath = this.buildSocketPath();
  isSocketListenerInitialized = false;

  constructor(private authService: AuthService) {}

  setupSocketConnection(): void {
    const token = this.authService.getToken();
    if (!token || this.socket?.connected) {
      return;
    }

    if (!this.socket) {
      this.socket = io(this.socketUrl, {
        auth: { token },
        path: this.socketPath,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 600,
      });

      this.socket.on('disconnect', () => {
        this.isSocketListenerInitialized = false;
      });
    } else {
      this.socket.auth = { token };
      this.socket.connect();
    }
  }

  closeSocketConnection(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
      this.isSocketListenerInitialized = false;
    }
  }

  onHandler(event: string, callback: (data: any) => void): void {
    this.setupSocketConnection();
    this.socket?.off(event);
    this.socket?.on(event, callback);
  }

  emitHandler(event: string, data?: any, callback?: (response: any) => void): void {
    this.setupSocketConnection();
    this.socket?.emit(event, data, callback);
  }

  private buildSocketPath(): string {
    try {
      const url = new URL(this.socketUrl);
      const pathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
      return `${pathname || ''}/socket.io`;
    } catch {
      return '/socket.io';
    }
  }
}
