import { ReactionType, PostStatus } from '../shared/models';

/**
 * Post model — supports both old and new backend schema fields.
 * Deprecated fields kept as string (not optional) to avoid template type errors.
 * New schema fields are primary; deprecated ones default to '' at runtime.
 */
export class Post {
  constructor(
    public _id: string,
    public content: string,
    public wallId: string,
    public authorEmail: string,
    public authorName: { first: string; last: string },
    public reactions: { [key: string]: string[] },
    public createdAt: Date,
    public status: PostStatus,
    public pinned: boolean,
    public isEdited: boolean,
    // Deprecated compat fields — typed as string so templates work without ?? guards
    /** @deprecated use authorEmail */ public email = '',
    /** @deprecated use authorName.first */ public firstName = '',
    /** @deprecated use authorName.last */ public lastName = '',
    /** @deprecated use media.url */ public mediaUrl = '',
    /** @deprecated use media.type */ public mediaType = '',
    /** @deprecated use status */ public isArchived = false,
    /** @deprecated use openReportCount */ public reportedBy?: string[],
    // New schema fields
    public media?: { url: string | null; type: string | null; thumbnailUrl: string | null },
    public openReportCount?: number,
    public updatedAt?: Date,
    public editedAt?: Date,
    public profilePicture?: string | { contentType: string; data: number[] },
    public estimatedHeight?: number,
    public hasImageAndText?: boolean,
  ) {}
}
