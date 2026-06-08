export interface WallAnalyticsDay {
  date: string;
  views: number;
  postCount: number;
  reactionCount: number;
}

export interface WallAnalyticsTotals {
  totalViews: number;
  totalPosts: number;
  totalReactions: number;
}

export type WallStatus = 'active' | 'locked' | 'archived';
export type SaveType = 'saved' | 'favourite';
export type ReactionType = 'heart' | 'like' | 'laugh' | 'wow' | 'sad' | 'celebrate';
export type MediaType = 'image' | 'gif' | 'video' | 'sticker';
export type PostStatus = 'active' | 'pending_approval' | 'rejected' | 'deleted';

export interface WallTheme {
  bgImg: string;
  animationId: string;
  audio: string;
  bgColor?: string;     // hex color for solid background (overrides bgImg when set)
  fontFamily?: string;  // CSS font-family name
  textColor?: string;   // hex color for post text
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
  slug?: string;
  title: string;
  description: string;
  ownerEmail: string;
  type: string;
  status?: WallStatus;
  openDate?: string | Date | null;
  closeDate?: string | Date | null;
  theme?: WallTheme;
  anyoneCanView?: boolean;
  anyoneCanPost?: boolean;
  postConfig?: Partial<PostConfig>;
  posts: { nonArchivedCount: number; nonArchivedNonReportedCount: number };
  interactions: number;
  isNew: boolean;
  saveType: SaveType | string;
  createdAt: string;
  updatedAt: string;
  // Legacy fields (still present in API responses)
  isOpen: boolean;
  isArchived: boolean;
  bgImg: string;
  audio: string;
  animationId: string;
  maintainerEmails: string[];
  postAccess: { emails: string[]; domains: string[] };
  viewAccess: { emails: string[]; domains: string[] };
  receivers: string[];
  starred: boolean;
  saved: boolean;
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
  theme?: 'light' | 'dark';
  // Legacy / computed fields
  active?: boolean;
  createdAt?: string;
  name?: string;
}

export interface LoginResponse {
  token?: string;
  name?: string;
  email?: string;
  _id?: string;
}

export interface MediaUploadResponse {
  uploadedPath: string;
  type?: string;
  thumbnailUrl?: string;
}

export interface UserDetails {
  _id?: string;
  email?: string;
  fullName?: string;
  userName?: string;
  name?: string;
  profilePicture?: string | null;
  profilePictureUrl?: string | null;
  buffer?: { type: string; data: number[] };
}

export interface BackgroundTheme {
  name: string;
  images: string[];
}

export interface EventItem {
  Email: string;
  Name: string;
  Date?: string;
  eventType: string;
}

export interface AccessControl {
  emails?: string[];
  domains?: string[];
}

export interface GiphyRendition { url: string; width?: string; height?: string; }

export interface GiphyGif {
  id: string;
  title?: string;
  alt_text?: string;
  analytics_response_payload?: string;
  images: {
    original:           GiphyRendition;
    fixed_height?:      GiphyRendition;
    fixed_height_still?: GiphyRendition;
    fixed_height_small?: GiphyRendition;
    downsized?:          GiphyRendition;
  };
}

export interface StickerItem {
  id: string;
  name: string;
  file?: string;
  url?: string;
  images?: { original: { url: string } };
}
