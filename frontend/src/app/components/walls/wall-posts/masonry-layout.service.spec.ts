import { MasonryLayoutService } from './masonry-layout.service';
import { Post } from '../../../models/post.model';

describe('MasonryLayoutService', () => {
  let svc: MasonryLayoutService;

  beforeEach(() => {
    svc = new MasonryLayoutService();
  });

  const post = (over: Partial<Post> = {}): Post => ({ _id: 'x', reactions: {}, ...over } as Post);

  it('estimates a taller height for a post that has media', () => {
    const plain = svc.estimatePostHeight(post({ content: 'hi' }));
    const withMedia = svc.estimatePostHeight(post({ content: 'hi', media: { url: '/m/a.jpg', type: 'image' } as Post['media'] }));
    expect(withMedia).toBeGreaterThan(plain);
  });

  it('ignores a placeholder ("#") media url when estimating', () => {
    const noMedia = svc.estimatePostHeight(post({ content: 'hi' }));
    const hashMedia = svc.estimatePostHeight(post({ content: 'hi', media: { url: '#', type: 'image' } as Post['media'] }));
    expect(hashMedia).toEqual(noMedia);
  });

  it('sums estimatedHeight across a column', () => {
    const col = [post({ estimatedHeight: 100 }), post({ estimatedHeight: 250 })];
    expect(svc.getColumnHeight(col)).toBe(350);
  });

  it('picks the shortest column by total estimated height', () => {
    const tall = [post({ estimatedHeight: 500 })];
    const short = [post({ estimatedHeight: 100 })];
    expect(svc.getShortestColumn([tall, short])).toBe(short);
  });

  it('returns the first column when all are empty', () => {
    const a: Post[] = [];
    const b: Post[] = [];
    expect(svc.getShortestColumn([a, b])).toBe(a);
  });
});
