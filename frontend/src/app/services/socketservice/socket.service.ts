import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../../services/authservice/auth.service';
import { SERVICE_BASE_URL } from '../../environment-config';

export type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | undefined;
  private readonly socketUrl = SERVICE_BASE_URL;
  private readonly socketPath = this.buildSocketPath();
  isSocketListenerInitialized = false;

  // Live connection status — UI can subscribe to show a "reconnecting" banner.
  private statusSubject = new BehaviorSubject<SocketStatus>('disconnected');
  readonly connectionStatus$: Observable<SocketStatus> = this.statusSubject.asObservable();

  constructor(private authService: AuthService) {}

  get connectionStatus(): SocketStatus {
    return this.statusSubject.value;
  }

  setupSocketConnection(): void {
    const token = this.authService.getToken();
    if (!token || this.socket?.connected) {
      return;
    }

    if (!this.socket) {
      this.statusSubject.next('connecting');
      this.socket = io(this.socketUrl, {
        auth: { token },
        path: this.socketPath,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 600,
      });

      this.socket.on('connect', () => this.statusSubject.next('connected'));
      this.socket.on('disconnect', () => {
        this.isSocketListenerInitialized = false;
        this.statusSubject.next('disconnected');
      });

      // Manager-level reconnection lifecycle (drives the "reconnecting" indicator)
      this.socket.io.on('reconnect_attempt', () => this.statusSubject.next('reconnecting'));
      this.socket.io.on('reconnect', () => this.statusSubject.next('connected'));
      this.socket.io.on('reconnect_failed', () => this.statusSubject.next('disconnected'));
    } else {
      this.socket.auth = { token };
      this.statusSubject.next('connecting');
      this.socket.connect();
    }
  }

  closeSocketConnection(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
      this.isSocketListenerInitialized = false;
      this.statusSubject.next('disconnected');
    }
  }

  onHandler<T = unknown>(event: string, callback: (data: T) => void): void {
    this.setupSocketConnection();
    this.socket?.off(event);
    this.socket?.on(event, callback as (data: unknown) => void);
  }

  emitHandler(event: string, data?: unknown, callback?: (response: unknown) => void): void {
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
