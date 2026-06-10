import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger, query, stagger } from '@angular/animations';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { UserService } from '../../../services/userservice/user.service';
import { UserCacheService } from '../../../services/userservice/user-cache.service';
import { AuthService } from '../../../services/authservice/auth.service';
import { UserDetails } from '../../../shared/models';
import { getInitials, convertBufferToBase64 } from '../../../utils/user.util';

export type AccessRole = 'viewer' | 'poster' | 'maintainer' | 'recipient';

/** A person added to the list — email is the identity, name/picture are decorative. */
interface PersonChip {
  email: string;
  name: string;
  picture: string;
}

interface RoleConfig {
  showOrgs: boolean;
  noun: string;
  nounPlural: string;
  capability: string;
  emptyHint: string;
  placeholder: string;
}

/** A user-search result with the resolved avatar already attached. */
type Suggestion = UserDetails & { picture: string };

/**
 * Unified access editor. One component for every "add people / organizations"
 * surface in the app — viewers, posters, maintainers and recipients. People are
 * added by email (with live user autocomplete + avatars); organizations are added
 * by domain (e.g. acme.com). Both support paste, inline validation, and removal.
 *
 * Communicates with parent forms via simple @Input arrays + change events, so it
 * drops straight into the existing settings / schedule reactive forms.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-access-editor',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './access-editor.component.html',
  styleUrl: './access-editor.component.css',
  animations: [
    trigger('pop', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-4px) scale(0.98)' }),
        animate('160ms cubic-bezier(0.34,1.56,0.64,1)', style({ opacity: 1, transform: 'none' })),
      ]),
      transition(':leave', [
        animate('120ms ease', style({ opacity: 0, transform: 'translateX(8px)' })),
      ]),
    ]),
    trigger('drop', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-6px)' }),
        animate('140ms ease-out', style({ opacity: 1, transform: 'none' })),
      ]),
      transition(':leave', [animate('100ms ease', style({ opacity: 0 }))]),
    ]),
    trigger('list', [
      transition(':enter', [
        query('.ae-chip', [
          style({ opacity: 0, transform: 'translateY(4px)' }),
          stagger(35, animate('180ms ease-out', style({ opacity: 1, transform: 'none' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class AccessEditorComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);

  @Input() role: AccessRole = 'viewer';
  @Input() emails: string[] = [];
  @Input() domains: string[] = [];
  @Input() excludeEmails: string[] = [];
  @Input() excludeDomains: string[] = [];
  @Input() disabled = false;

  @Output() emailsChange = new EventEmitter<string[]>();
  @Output() domainsChange = new EventEmitter<string[]>();

  config!: RoleConfig;
  activeTab: 'people' | 'orgs' = 'people';

  people: PersonChip[] = [];
  orgs: string[] = [];

  input = '';
  error = '';

  suggestions: Suggestion[] = [];
  showDrop = false;
  activeIdx = -1;

  private readonly self = (this.auth.getEmail() || '').toLowerCase();
  private readonly search$ = new Subject<string>();

  private readonly emailRe = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  private readonly domainRe = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly genericDomains = new Set([
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'rediffmail.com',
    'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'live.com', 'msn.com',
  ]);

  private readonly ROLE: Record<AccessRole, RoleConfig> = {
    viewer: {
      showOrgs: true, noun: 'Viewer', nounPlural: 'Viewers', capability: 'view and react',
      emptyHint: 'Add people by email so they can view and react to this moment.',
      placeholder: 'Search a name or type an email',
    },
    poster: {
      showOrgs: true, noun: 'Poster', nounPlural: 'Posters', capability: 'post, edit and react',
      emptyHint: 'Add people by email so they can post, edit and react.',
      placeholder: 'Search a name or type an email',
    },
    maintainer: {
      showOrgs: false, noun: 'Maintainer', nounPlural: 'Maintainers', capability: 'manage settings and this moment',
      emptyHint: 'Add trusted people who can change settings and manage this moment.',
      placeholder: 'Search a name or type an email',
    },
    recipient: {
      showOrgs: false, noun: 'Recipient', nounPlural: 'Recipients', capability: 'receive this moment',
      emptyHint: 'Add the people this moment should be delivered to.',
      placeholder: 'Enter an email address',
    },
  };

  constructor(
    private readonly userService: UserService,
    private readonly userCache: UserCacheService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.config = this.ROLE[this.role];
    if (!this.config.showOrgs) this.activeTab = 'people';

    this.people = (this.emails || []).map((e) => this.makeChip(e));
    this.people.forEach((c) => this.hydrate(c));
    this.orgs = [...(this.domains || [])];

    this.search$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((q) => (q.trim() ? this.userService.searchNames(q.trim()).pipe(catchError(() => of([]))) : of([]))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.suggestions = (results || [])
          .map((u) => ({ ...u, email: (u.email || '').toLowerCase(), picture: this.pic(u) }))
          .filter((u) => !!u.email && u.email !== this.self && !this.hasEmail(u.email) && !this.excludeEmails.includes(u.email))
          .slice(0, 6);
        this.showDrop = this.suggestions.length > 0;
        this.activeIdx = -1;
        this.cdr.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Resync when the parent pushes a new set (e.g. an email was moved to another
    // role). Only rebuild when the content actually differs, to avoid clobbering.
    if (changes['emails'] && this.config) {
      const incoming = (this.emails || []).map((e) => e.toLowerCase());
      const current = this.people.map((c) => c.email);
      if (incoming.length !== current.length || incoming.some((e) => !current.includes(e))) {
        this.people = (this.emails || []).map((e) => {
          const existing = this.people.find((c) => c.email === e.toLowerCase());
          return existing ?? this.makeChip(e);
        });
        this.people.forEach((c) => { if (!c.name && !c.picture) this.hydrate(c); });
      }
    }
    if (changes['domains'] && this.config) {
      this.orgs = [...(this.domains || [])];
    }
  }

  // ── Tab switching ─────────────────────────────────────────────
  setTab(tab: 'people' | 'orgs'): void {
    if (this.disabled || this.activeTab === tab) return;
    this.activeTab = tab;
    this.input = '';
    this.error = '';
    this.showDrop = false;
    this.suggestions = [];
  }

  get count(): number {
    return this.activeTab === 'people' ? this.people.length : this.orgs.length;
  }

  get currentNoun(): string {
    if (this.activeTab === 'orgs') return this.count === 1 ? 'Organization' : 'Organizations';
    return this.count === 1 ? this.config.noun : this.config.nounPlural;
  }

  // ── Input handling ────────────────────────────────────────────
  onInput(): void {
    this.error = '';
    if (this.activeTab === 'people') {
      this.search$.next(this.input);
      if (!this.input.trim()) { this.showDrop = false; this.suggestions = []; }
    }
  }

  onKeydown(e: KeyboardEvent): void {
    if (this.showDrop && this.suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIdx = (this.activeIdx + 1) % this.suggestions.length; return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIdx = (this.activeIdx - 1 + this.suggestions.length) % this.suggestions.length; return; }
      if (e.key === 'Escape') { this.showDrop = false; this.activeIdx = -1; return; }
      if (e.key === 'Enter' && this.activeIdx >= 0) { e.preventDefault(); this.pick(this.suggestions[this.activeIdx]); return; }
    }
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.commit(); }
  }

  onBlur(): void {
    // Delay so a suggestion click registers before the dropdown closes.
    setTimeout(() => { this.showDrop = false; this.cdr.markForCheck(); }, 150);
  }

  pick(u: Suggestion): void {
    const email = (u.email || '').toLowerCase();
    if (!email) return;
    this.addPerson(email, u.fullName || u.name || '', u.picture || this.pic(u));
    this.input = '';
    this.showDrop = false;
    this.suggestions = [];
    this.activeIdx = -1;
  }

  commit(): void {
    const raw = this.input.trim();
    if (!raw) return;
    this.activeTab === 'people' ? this.addEmails(raw) : this.addOrgs(raw);
  }

  // ── People ────────────────────────────────────────────────────
  private addEmails(raw: string): void {
    const tokens = raw.split(/[,\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const leftover: string[] = [];
    let added = false;
    for (const token of tokens) {
      if (!this.emailRe.test(token)) { leftover.push(token); this.error = `"${token}" isn't a valid email.`; continue; }
      if (token === this.self) { this.error = "That's your own account."; continue; }
      if (this.excludeEmails.includes(token)) { this.error = 'They already have a higher level of access.'; continue; }
      if (this.hasEmail(token)) { this.error = 'Already added.'; continue; }
      this.addPerson(token, '', '');
      added = true;
    }
    this.input = leftover.join(' ');
    if (added && !leftover.length) this.error = '';
  }

  private addPerson(email: string, name: string, picture: string): void {
    if (this.hasEmail(email)) return;
    const chip = this.makeChip(email, name, picture);
    this.people = [...this.people, chip];
    if (!name && !picture) this.hydrate(chip);
    this.emailsChange.emit(this.people.map((c) => c.email));
  }

  removePerson(chip: PersonChip): void {
    this.people = this.people.filter((c) => c.email !== chip.email);
    this.emailsChange.emit(this.people.map((c) => c.email));
  }

  // ── Organizations ─────────────────────────────────────────────
  private addOrgs(raw: string): void {
    const tokens = raw.split(/[,\s]+/)
      .map((t) => t.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean);
    const leftover: string[] = [];
    let added = false;
    for (const token of tokens) {
      if (!this.domainRe.test(token)) { leftover.push(token); this.error = `"${token}" isn't a valid domain.`; continue; }
      if (this.genericDomains.has(token)) { this.error = `${token} is a public domain — add people individually instead.`; continue; }
      if (this.excludeDomains.includes(token)) { this.error = 'They already have a higher level of access.'; continue; }
      if (this.orgs.includes(token)) { this.error = 'Already added.'; continue; }
      this.orgs = [...this.orgs, token];
      added = true;
    }
    this.input = leftover.join(' ');
    if (added && !leftover.length) this.error = '';
    if (added) this.domainsChange.emit([...this.orgs]);
  }

  removeOrg(domain: string): void {
    this.orgs = this.orgs.filter((d) => d !== domain);
    this.domainsChange.emit([...this.orgs]);
  }

  clearAll(): void {
    if (this.activeTab === 'people') {
      this.people = [];
      this.emailsChange.emit([]);
    } else {
      this.orgs = [];
      this.domainsChange.emit([]);
    }
    this.error = '';
  }

  // ── Helpers ───────────────────────────────────────────────────
  initials(chip: PersonChip): string {
    return getInitials({ fullName: chip.name, email: chip.email });
  }

  trackEmail = (_: number, c: PersonChip) => c.email;
  trackDomain = (_: number, d: string) => d;
  trackSug = (_: number, u: Suggestion) => u.email;

  private hasEmail(email: string): boolean {
    return this.people.some((c) => c.email === email);
  }

  private makeChip(email: string, name = '', picture = ''): PersonChip {
    return { email: email.toLowerCase(), name, picture };
  }

  private hydrate(chip: PersonChip): void {
    this.userCache.getUser(chip.email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((u) => {
      if (u) {
        chip.name = u.fullName || u.name || chip.name;
        chip.picture = this.pic(u) || chip.picture;
        this.cdr.markForCheck();
      }
    });
  }

  private pic(u: unknown): string {
    const user = u as { profilePicture?: unknown; profilePictureUrl?: string };
    if (user?.profilePicture && typeof user.profilePicture === 'object') {
      return convertBufferToBase64(user.profilePicture as { contentType: string; data: number[] });
    }
    if (typeof user?.profilePicture === 'string') return user.profilePicture;
    return user?.profilePictureUrl || '';
  }
}
