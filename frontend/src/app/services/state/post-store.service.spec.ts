import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PostStore } from './post-store.service';
import { Post } from '../../models/post.model';

describe('PostStore', () => {
  let store: PostStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(PostStore);
  });

  it('defaults: no post, flags false, empty search', async () => {
    await expectAsync(firstValueFrom(store.getPost())).toBeResolvedTo(null);
    await expectAsync(firstValueFrom(store.getPostAvailable())).toBeResolvedTo(false);
    await expectAsync(firstValueFrom(store.getMyPost())).toBeResolvedTo(false);
    await expectAsync(firstValueFrom(store.getPostSearchQuery())).toBeResolvedTo('');
  });

  it('setPostAvailable / setMyPost flip the flags', async () => {
    store.setPostAvailable(true);
    store.setMyPost(true);
    await expectAsync(firstValueFrom(store.getPostAvailable())).toBeResolvedTo(true);
    await expectAsync(firstValueFrom(store.getMyPost())).toBeResolvedTo(true);
  });

  it('setPost emits the post', async () => {
    const post = { _id: 'p1', content: 'hi' } as Post;
    store.setPost(post);
    await expectAsync(firstValueFrom(store.getPost())).toBeResolvedTo(post);
  });

  it('setPostSearchQuery emits the query', async () => {
    store.setPostSearchQuery('cake');
    await expectAsync(firstValueFrom(store.getPostSearchQuery())).toBeResolvedTo('cake');
  });
});
