import { Wall } from '../shared/models';

/**
 * Returns true if the given email belongs to the wall owner or a maintainer.
 * Used consistently across all dashboard components.
 */
export function isWallCreatorOrMaintainer(wall: Wall, userEmail: string): boolean {
  const isOwner = wall.ownerEmail === userEmail;
  const isMaintainer = wall.maintainerEmails?.includes(userEmail) ?? false;
  return isOwner || isMaintainer;
}
