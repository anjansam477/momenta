export type WallStatus = 'active' | 'locked' | 'archived';
export type SaveType = 'saved' | 'favourite';
export type ReactionType = 'heart' | 'like' | 'laugh' | 'wow' | 'sad' | 'celebrate';
export type MediaType = 'image' | 'gif' | 'video' | 'sticker';
export type PostStatus = 'active' | 'pending_approval' | 'rejected' | 'deleted';

export interface WallTheme {
  bgImg: string;
  animationId: string;
  audio: string;
}

export interface PostConfig {
  allowText: boolean;
  allowImage: boolean;
  allowGif: boolean;
  allowVideo: boolean;
  allowSticker: boolean;
  requireApproval: boolean;
}

export interface Wall {
  _id: string;
  slug: string;
  title: string;
  description: string;
  ownerEmail: string;
  type: string;
  status: WallStatus;
  openDate?: string;
  closeDate?: string;
  theme: WallTheme;
  anyoneCanView: boolean;
  anyoneCanPost: boolean;
  postConfig: PostConfig;
  posts?: { nonArchivedCount: number; nonArchivedNonReportedCount: number };
  interactions?: number;
  isNew?: boolean;
  saveType?: SaveType;
  createdAt: string;
  updatedAt: string;
}

export interface PostMedia {
  url: string | null;
  type: MediaType | null;
  thumbnailUrl: string | null;
}

export interface Post {
  _id: string;
  wallId: string;
  authorEmail: string;
  authorName: { first: string; last: string };
  content: string;
  media?: PostMedia;
  status: PostStatus;
  pinned: boolean;
  isEdited: boolean;
  editedAt?: string;
  reactions: Record<ReactionType, string[]>;
  openReportCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  status: 'pending_verification' | 'active' | 'suspended';
  profilePictureUrl: string | null;
  bio: string;
  lastLoginAt?: string;
}
