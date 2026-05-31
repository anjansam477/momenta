import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/authservice/auth.service';
import {
  MomentNotification,
  NotificationsService,
} from '../../../services/notificationservice/notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: MomentNotification[] = [];
  email: string | null = '';
  private subscription?: Subscription;

  constructor(
    private notificationsService: NotificationsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.email = this.authService.getEmail();
    this.notificationsService.initializeSocketListener();
    this.subscription = this.notificationsService.notifications$.subscribe((notifications) => {
      this.notifications = notifications;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  getTimeAgo(dateString: string): string {
    return this.notificationsService.getTimeAgo(dateString);
  }

  markAsArchive(notification: MomentNotification): void {
    this.notificationsService.updateNotificationStatus(notification, 'archived');
  }

  markAsRead(notification: MomentNotification): void {
    if (notification.status !== 'read') {
      this.notificationsService.updateNotificationStatus(notification, 'read');
    }
  }

  markAllAsRead(): void {
    this.notifications
      .filter((notification) => this.isNotificationUnread(notification))
      .forEach((notification) => this.markAsRead(notification));
  }

  markAllAsArchive(): void {
    this.notifications.forEach((notification) => this.markAsArchive(notification));
  }

  openNotification(notification: MomentNotification): void {
    if (!notification) {
      return;
    }

    if (this.isNotificationUnread(notification)) {
      this.markAsRead(notification);
    }

    this.router.navigateByUrl(`moment/${notification.wallId}`);
  }

  unreadNotificationCount(): number {
    return this.notifications.filter((notification) => this.isNotificationUnread(notification)).length;
  }

  isNotificationUnread(notification: MomentNotification): boolean {
    return notification.status === 'unread';
  }

  getInitials(user: any): string {
    const source = user?.userName || user?.fullName || user?.name || user?.email || '?';
    const words = source.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }

  generateMessage(notification: MomentNotification): string {
    const actor = this.actorLabel(notification);
    const wallName = notification.wallName || 'this moment';

    switch (notification.type) {
      case 'postAdded':
        return `${actor} added a post to ${wallName}`;
      case 'reactionAdded':
        return `${actor} reacted to your post in ${wallName}`;
      case 'postreported':
        return notification.postCreator === this.email
          ? `${actor} reported your post in ${wallName}`
          : `${actor} reported a post in ${wallName}`;
      case 'postUnreported':
        return notification.postCreator === this.email
          ? `${actor} restored your post in ${wallName}`
          : `${actor} restored a post in ${wallName}`;
      case 'deletePost':
        return `${actor} deleted your post in ${wallName}`;
      case 'accessGranted':
        return `${actor} gave you access to ${wallName}`;
      case 'momentUpdated':
        return `${actor} updated ${wallName}`;
      case 'momentLocked':
        return `${actor} locked ${wallName}`;
      case 'momentUnlocked':
        return `${actor} reopened ${wallName}`;
      case 'momentArchived':
        return `${actor} archived ${wallName}`;
      default:
        return `${actor} sent you a notification`;
    }
  }

  notificationIcon(notification: MomentNotification): string {
    switch (notification.type) {
      case 'postAdded':
        return 'bi-chat-square-heart';
      case 'reactionAdded':
        return 'bi-emoji-smile';
      case 'postreported':
        return 'bi-flag';
      case 'postUnreported':
        return 'bi-shield-check';
      case 'deletePost':
        return 'bi-trash3';
      case 'accessGranted':
        return 'bi-person-check';
      case 'momentLocked':
        return 'bi-lock';
      case 'momentUnlocked':
        return 'bi-unlock';
      case 'momentArchived':
        return 'bi-archive';
      default:
        return 'bi-bell';
    }
  }

  private actorLabel(notification: MomentNotification): string {
    const emailCount = notification.emails.length;
    const first = notification.userDetails[0]?.userName || notification.emails[0] || 'Someone';
    const second = notification.userDetails[1]?.userName || notification.emails[1];

    if (emailCount === 1) {
      return first;
    }
    if (emailCount === 2) {
      return `${first} and ${second}`;
    }
    return `${first} and ${emailCount - 1} others`;
  }
}
