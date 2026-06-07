import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { UserStore } from './user-store.service';
import { User } from '../../shared/models';

describe('UserStore', () => {
  let store: UserStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(UserStore);
  });

  it('setUserEmail updates the email signal', () => {
    store.setUserEmail('a@b.com');
    expect(store.userEmail()).toBe('a@b.com');
  });

  it('setUserData / getUserData round-trips the user', async () => {
    const user = { email: 'a@b.com', firstname: 'Ann' } as User;
    store.setUserData(user);
    await expectAsync(firstValueFrom(store.getUserData())).toBeResolvedTo(user);
  });

  it('updateUserName merges first/last name into existing details', async () => {
    store.setUserData({ email: 'a@b.com', firstname: 'Ann', lastname: 'Old' } as User);
    store.updateUserName({ lastname: 'New' });
    const data = await firstValueFrom(store.getUserData());
    expect(data?.firstname).toBe('Ann');
    expect(data?.lastname).toBe('New');
  });

  it('updateUserName also emits on userData$', async () => {
    store.updateUserName({ firstname: 'Bob', lastname: 'Lee' });
    await expectAsync(firstValueFrom(store.userData$)).toBeResolvedTo({ firstname: 'Bob', lastname: 'Lee' });
  });

  it('username cache stores and returns observables by email', () => {
    const obs = of('Ann Lee');
    store.setUserNameCache('a@b.com', obs);
    expect(store.getUserNameCache().get('a@b.com')).toBe(obs);
  });

  it('setUpdateUserProfile emits the blob', async () => {
    const blob = new Blob(['x']);
    store.setUpdateUserProfile(blob);
    await expectAsync(firstValueFrom(store.getUpdateUserProfile())).toBeResolvedTo(blob);
  });
});
