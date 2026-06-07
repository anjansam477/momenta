import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { WallStore } from './wall-store.service';
import { Wall, BackgroundTheme } from '../../shared/models';

describe('WallStore', () => {
  let store: WallStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(WallStore);
  });

  it('setWallDetails / getWallDetails round-trips the wall', async () => {
    const wall = { _id: 'w1', title: 'Birthday' } as Wall;
    store.setWallDetails(wall);
    await expectAsync(firstValueFrom(store.getWallDetails())).toBeResolvedTo(wall);
  });

  it('updateWallDetailsPartially merges into the current wall', async () => {
    store.setWallDetails({ _id: 'w1', title: 'Old' } as Wall);
    store.updateWallDetailsPartially({ title: 'New' });
    const wall = await firstValueFrom(store.getWallDetails());
    expect(wall?.title).toBe('New');
    expect(wall?._id).toBe('w1');
  });

  it('updateWallDetailsPartially is a no-op when there is no current wall', async () => {
    store.updateWallDetailsPartially({ title: 'New' });
    await expectAsync(firstValueFrom(store.getWallDetails())).toBeResolvedTo(null);
  });

  it('setThemes updates the themes signal', () => {
    const themes = [{ id: 't1' } as unknown as BackgroundTheme];
    store.setThemes(themes);
    expect(store.themes()).toEqual(themes);
  });

  it('setStylePreview then clearStylePreview', async () => {
    store.setStylePreview({ bgColor: '#fff' });
    await expectAsync(firstValueFrom(store.stylePreview$)).toBeResolvedTo({ bgColor: '#fff' });
    store.clearStylePreview();
    await expectAsync(firstValueFrom(store.stylePreview$)).toBeResolvedTo(null);
  });

  it('setSendEmail emits the flag', async () => {
    store.setSendEmail(true);
    await expectAsync(firstValueFrom(store.getSendMail())).toBeResolvedTo(true);
  });
});
