import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccessEditorComponent } from './access-editor.component';
import { UserService } from '../../../services/userservice/user.service';
import { UserCacheService } from '../../../services/userservice/user-cache.service';
import { AuthService } from '../../../services/authservice/auth.service';

describe('AccessEditorComponent', () => {
  let fixture: ComponentFixture<AccessEditorComponent>;
  let component: AccessEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessEditorComponent],
      providers: [
        { provide: UserService, useValue: { searchNames: () => of([]) } },
        { provide: UserCacheService, useValue: { getUser: () => of(null) } },
        { provide: AuthService, useValue: { getEmail: () => 'me@owner.com' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessEditorComponent);
    component = fixture.componentInstance;
  });

  function init(role: 'viewer' | 'poster' | 'maintainer' | 'recipient' = 'viewer') {
    component.role = role;
    fixture.detectChanges(); // runs ngOnInit
  }

  it('viewer/poster expose the Orgs tab; maintainer/recipient do not', () => {
    init('viewer');
    expect(component.config.showOrgs).toBeTrue();
    const m = TestBed.createComponent(AccessEditorComponent).componentInstance;
    m.role = 'maintainer';
    (m as unknown as { ngOnInit: () => void }).ngOnInit();
    expect(m.config.showOrgs).toBeFalse();
  });

  it('adds a valid email and emits the new list', () => {
    init('viewer');
    const spy = spyOn(component.emailsChange, 'emit');
    component.input = 'alice@acme.com';
    component.commit();
    expect(component.people.map((c) => c.email)).toEqual(['alice@acme.com']);
    expect(spy).toHaveBeenCalledWith(['alice@acme.com']);
    expect(component.error).toBe('');
  });

  it('rejects an invalid email, shows an error, emits nothing', () => {
    init('viewer');
    const spy = spyOn(component.emailsChange, 'emit');
    component.input = 'not-an-email';
    component.commit();
    expect(component.people.length).toBe(0);
    expect(component.error).toContain('valid email');
    expect(spy).not.toHaveBeenCalled();
  });

  it('blocks the current user from adding themselves', () => {
    init('viewer');
    component.input = 'me@owner.com';
    component.commit();
    expect(component.people.length).toBe(0);
    expect(component.error).toContain('own account');
  });

  it('blocks excluded emails (already higher access)', () => {
    component.role = 'viewer';
    component.excludeEmails = ['boss@acme.com'];
    fixture.detectChanges();
    component.input = 'boss@acme.com';
    component.commit();
    expect(component.people.length).toBe(0);
    expect(component.error).toContain('higher level of access');
  });

  it('de-duplicates emails', () => {
    init('viewer');
    component.input = 'alice@acme.com';
    component.commit();
    component.input = 'alice@acme.com';
    component.commit();
    expect(component.people.length).toBe(1);
  });

  it('removes a person and emits', () => {
    init('viewer');
    component.input = 'alice@acme.com';
    component.commit();
    const spy = spyOn(component.emailsChange, 'emit');
    component.removePerson(component.people[0]);
    expect(component.people.length).toBe(0);
    expect(spy).toHaveBeenCalledWith([]);
  });

  it('adds a valid org domain (strips leading @) and emits', () => {
    init('viewer');
    component.setTab('orgs');
    const spy = spyOn(component.domainsChange, 'emit');
    component.input = '@acme.com';
    component.commit();
    expect(component.orgs).toEqual(['acme.com']);
    expect(spy).toHaveBeenCalledWith(['acme.com']);
  });

  it('rejects generic public domains for orgs', () => {
    init('viewer');
    component.setTab('orgs');
    component.input = 'gmail.com';
    component.commit();
    expect(component.orgs.length).toBe(0);
    expect(component.error).toContain('public domain');
  });

  it('clears the active list', () => {
    init('viewer');
    component.input = 'a@x.com, b@y.com';
    component.commit();
    expect(component.people.length).toBe(2);
    component.clearAll();
    expect(component.people.length).toBe(0);
  });
});
