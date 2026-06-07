import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * UI-level shared state: transient context/message strings, sidebar open state,
 * and preview mode. Split out of the former SharedDataService god-object.
 */
@Injectable({ providedIn: 'root' })
export class UiStore {
  readonly context = signal<string>('');
  readonly message = signal<string>('');
  readonly isOpen = signal<boolean>(false);

  private readonly isPreview = new BehaviorSubject<boolean>(false);

  setContext(context: string): void {
    this.context.set(context);
  }

  setMessage(message: string): void {
    this.message.set(message);
  }

  toggle(): void {
    this.isOpen.set(!this.isOpen());
  }

  setIsPreview(preview: boolean): void {
    this.isPreview.next(preview);
  }

  getIsPreview() {
    return this.isPreview.asObservable();
  }
}
