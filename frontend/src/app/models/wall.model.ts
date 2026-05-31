import { WallStatus, SaveType } from '../shared/models';

/**
 * Wall class model
 * Updated to match new backend schema (status, theme object, SaveType enum)
 */
export class Wall {
    constructor(
        public _id: string,
        public type: string,
        public title: string,
        public description: string,
        public ownerEmail: string,
        public starred: boolean,
        public saved: boolean,
        public saveType: SaveType | string,
        public maintainerEmails: string[] | undefined,
        public postAccess: { emails: string[], domains: string[] },
        public viewAccess: { emails: string[], domains: string[] },
        public openDate: Date,
        public closeDate: Date,
        /** @deprecated use status === 'archived' */
        public isArchived: boolean,
        /** @deprecated use theme.bgImg */
        public bgImg: string,
        /** @deprecated use status === 'active' */
        public isOpen: boolean,
        public createdAt: Date,
        public updatedAt: Date,
        /** @deprecated use theme.animationId */
        public animationId: string,
        /** @deprecated use theme.audio */
        public audio: string,
        public posts: { nonArchivedCount: number, nonArchivedNonReportedCount: number },
        public interactions: number,
        public receivers: string[],
        public isNew: boolean,
        // New schema fields
        public status?: WallStatus,
        public theme?: { bgImg: string, animationId: string, audio: string },
        public anyoneCanView?: boolean,
        public anyoneCanPost?: boolean,
    ) {}
}
