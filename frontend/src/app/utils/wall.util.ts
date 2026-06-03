/**
 * Returns true when the given user is the wall owner or a maintainer.
 * wallCreatorMails should contain [ownerEmail, ...maintainerEmails].
 */
export function isWallCreator(userEmail: string | null | undefined, wallCreatorMails: string[]): boolean {
  if (!userEmail || !Array.isArray(wallCreatorMails)) return false;
  return wallCreatorMails.includes(userEmail);
}
