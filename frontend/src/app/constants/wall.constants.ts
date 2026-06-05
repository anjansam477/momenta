/** Wall status values */
export const WALL_STATUS = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  ARCHIVED: 'archived',
} as const;

export type WallStatus = (typeof WALL_STATUS)[keyof typeof WALL_STATUS];

/** Wall save/star types */
export const SAVE_TYPE = {
  FAVOURITE: 'favourite',
  SAVED: 'saved',
} as const;

export type SaveType = (typeof SAVE_TYPE)[keyof typeof SAVE_TYPE];

/** Post status values */
export const POST_STATUS = {
  ACTIVE: 'active',
  PENDING_APPROVAL: 'pending_approval',
  REJECTED: 'rejected',
  DELETED: 'deleted',
} as const;

export type PostStatusConst = (typeof POST_STATUS)[keyof typeof POST_STATUS];

/** Access component types used by add-user / add-domain */
export const ACCESS_COMPONENT = {
  MAINTAINER: 'maintainer',
  VIEW_BY_EMAIL: 'viewByEmail',
  POST_BY_EMAIL: 'postByEmail',
  VIEW_BY_DOMAIN: 'viewByDomain',
  POST_BY_DOMAIN: 'postByDomain',
  SCHEDULE_DELIVERY: 'schedule-delivery',
} as const;
