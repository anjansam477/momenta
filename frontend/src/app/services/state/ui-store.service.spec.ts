import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { UiStore } from './ui-store.service';

describe('UiStore', () => {
  let store: UiStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(UiStore);
  });

  it('starts with empty context/message and closed state', () => {
    expect(store.context()).toBe('');
    expect(store.message()).toBe('');
    expect(store.isOpen()).toBe(false);
  });

  it('setContext / setMessage update their signals', () => {
    store.setContext('view');
    store.setMessage('hello');
    expect(store.context()).toBe('view');
    expect(store.message()).toBe('hello');
  });

  it('toggle flips isOpen back and forth', () => {
    expect(store.isOpen()).toBe(false);
    store.toggle();
    expect(store.isOpen()).toBe(true);
    store.toggle();
    expect(store.isOpen()).toBe(false);
  });

  it('getIsPreview emits the latest value set via setIsPreview', async () => {
    store.setIsPreview(true);
    await expectAsync(firstValueFrom(store.getIsPreview())).toBeResolvedTo(true);
  });
});
