import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { differenceInMonths, differenceInYears, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { SocketService } from '../socketservice/socket.service';
import { UserService } from '../userservice/user.service';
import { PostService } from '../postservice/post.service';

export interface MomentNotification {
  _id: string;
  wallId: string;
  wallName?: string;
  postId?: string;
  emails: string[];
  timestamp: string;
  status: 'unread' | 'read' | 'archived';
  type: string;
  metadata?: Record<string, any>;
  notificationIds: string[];
  userDetails: Array<{ userName: string; profilePicture: string }>;
  postCreator?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private notificationsSubject = new BehaviorSubject<MomentNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private socketService: SocketService,
    private userService: UserService,
    private postService: PostService
  ) {}

  initializeSocketListener(): void {
    if (this.socketService.isSocketListenerInitialized) {
      this.socketService.emitHandler('refreshNotifications');
      return;
    }

    this.socketService.setupSocketConnection();
    this.socketService.isSocketListenerInitialized = true;

    this.socketService.onHandler('initialNotifications', (notifications: MomentNotification[]) => {
      this.hydrateNotifications(notifications || []);
    });

    this.socketService.onHandler('newNotification', (notification: any) => {
      this.addNotification(notification);
    });

    this.socketService.emitHandler('refreshNotifications');
  }

  updateNotificationStatus(notification: MomentNotification, state: 'read' | 'unread' | 'archived'): void {
    this.socketService.emitHandler('updateNotification', { notification, state }, (response) => {
      if (!response?.ok) {
        return;
      }

      if (state === 'archived') {
        this.notificationsSubject.next(
          this.notificationsSubject.getValue().filter((item) => item._id !== notification._id)
        );
        return;
      }

      const updated = this.notificationsSubject.getValue().map((item) =>
        item._id === notification._id ? { ...item, status: state } : item
      );
      this.notificationsSubject.next(updated);
    });
  }

  getTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();

    const diffMinutes = differenceInMinutes(now, date);
    const diffHours = differenceInHours(now, date);
    const diffDays = differenceInDays(now, date);
    const diffMonths = differenceInMonths(now, date);
    const diffYears = differenceInYears(now, date);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffMonths < 1) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    } else if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    }

    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  }

  addNotification(notification: any): void {
    const groupId = this.groupId(notification);
    const currentNotifications = [...this.notificationsSubject.getValue()];
    const existingGroup = currentNotifications.find((group) => group._id === groupId);

    if (existingGroup) {
      existingGroup.notificationIds.push(...(notification.notificationIds || [notification._id]));
      existingGroup.timestamp = notification.timestamp;
      existingGroup.status = notification.status;

      if (!existingGroup.emails.includes(notification.email)) {
        existingGroup.emails.push(notification.email);
        this.fetchUsersDetails(notification.email).subscribe((userDetail) => {
          existingGroup.userDetails.push({ ...userDetail });
          this.notificationsSubject.next([...currentNotifications]);
        });
      }
    } else {
      const notificationData: MomentNotification = {
        _id: groupId,
        wallId: notification.wallId,
        wallName: notification.wallName,
        postId: notification.postId,
        emails: [notification.email],
        timestamp: notification.timestamp,
        status: notification.status || 'unread',
        type: notification.type,
        metadata: notification.metadata || {},
        notificationIds: notification.notificationIds || [notification._id],
        userDetails: [],
      };

      this.fetchUsersDetails(notification.email).subscribe((userDetail) => {
        notificationData.userDetails.push({ ...userDetail });
        this.notificationsSubject.next([...this.notificationsSubject.getValue()]);
      });

      if (notification.type === 'postreported' || notification.type === 'postUnreported') {
        this.loadPostCreator(notificationData);
      }

      currentNotifications.unshift(notificationData);
    }

    this.notificationsSubject.next(currentNotifications);
  }

  fetchUsersDetails(email: string): Observable<{ userName: string; profilePicture: string }> {
    return this.userService.fetchUserNamesByEmail(email).pipe(
      map((userDetails: any) => ({
        userName: userDetails?.fullName || email,
        profilePicture: userDetails?.profilePicture || ''
      })),
      catchError(() => of({
        userName: email,
        profilePicture: ''
      }))
    );
  }

  private hydrateNotifications(notifications: MomentNotification[]): void {
    const hydrated: MomentNotification[] = notifications.map((notification) => ({
      ...notification,
      type: notification.type || this.extractNotificationDetails(notification._id)?.type || 'notification',
      userDetails: [] as Array<{ userName: string; profilePicture: string }>,
    }));

    this.notificationsSubject.next(hydrated);

    hydrated.forEach((notification) => {
      notification.emails.slice(0, 2).forEach((email) => {
        this.fetchUsersDetails(email).subscribe((userDetail) => {
          notification.userDetails.push({ ...userDetail });
          this.notificationsSubject.next([...this.notificationsSubject.getValue()]);
        });
      });

      if (notification.type === 'postreported' || notification.type === 'postUnreported') {
        this.loadPostCreator(notification);
      }
    });
  }

  private loadPostCreator(notification: MomentNotification): void {
    if (!notification.wallId || !notification.postId) {
      return;
    }

    this.postService.getPost(notification.wallId, notification.postId).subscribe((post) => {
      notification.postCreator = post.email;
      this.notificationsSubject.next([...this.notificationsSubject.getValue()]);
    });
  }

  private groupId(notification: any): string {
    const status = notification.status || 'unread';
    switch (notification.type) {
      case 'reactionAdded':
        return `${status}-${notification.type}-${notification.wallId}-${notification.postId}`;
      case 'postAdded':
      case 'accessGranted':
      case 'momentUpdated':
      case 'momentLocked':
      case 'momentUnlocked':
      case 'momentArchived':
        return `${status}-${notification.type}-${notification.wallId}`;
      default:
        return `${status}-${notification.type}-${notification._id}`;
    }
  }

  private extractNotificationDetails(id: string): { status: string; type: string; wallId: string; postId?: string } | null {
    if (!id) {
      return null;
    }

    const parts = id.split('-');
    return {
      status: parts[0],
      type: parts[1],
      wallId: parts[2],
      postId: parts.length > 3 ? parts[3] : undefined,
    };
  }
}
