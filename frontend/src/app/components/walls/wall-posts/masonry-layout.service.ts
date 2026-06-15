import { Injectable } from '@angular/core';
import { Post } from '../../../models/post.model';

/**
 * Pure masonry-layout math for the wall feed: estimates a post's rendered height
 * and balances posts across N columns by pushing each into the shortest one.
 * No DOM mutation, no change detection — extracted from WallPostsComponent so the
 * column-balancing can be reasoned about and unit-tested in isolation.
 */
@Injectable({ providedIn: 'root' })
export class MasonryLayoutService {
  readonly columnCount = 3;

  /** Rough pixel height of a post, used only to balance columns (not for layout). */
  estimatePostHeight(post: Post): number {
    const baseHeight = 100;
    const contentLengthHeight = post.content ? post.content.length * 0.5 : 0;
    const imageHeight = 300;

    let contentImagesHeight = 0;
    if (post.content) {
      const div = document.createElement('div');
      div.innerHTML = post.content;
      contentImagesHeight = div.querySelectorAll('img').length * imageHeight;
    }

    const resolvedMediaUrl = post.media?.url || post.mediaUrl;
    const mediaHeight = (resolvedMediaUrl && resolvedMediaUrl !== '#' && resolvedMediaUrl !== '') ? imageHeight : 0;

    return baseHeight + contentLengthHeight + contentImagesHeight + mediaHeight;
  }

  getColumnHeight(column: Post[]): number {
    return column.reduce((total, post) => total + (post.estimatedHeight || 0), 0);
  }

  getShortestColumn(columns: Post[][]): Post[] {
    return columns.reduce(
      (shortest, column) => (this.getColumnHeight(column) < this.getColumnHeight(shortest) ? column : shortest),
      columns[0]
    );
  }
}
