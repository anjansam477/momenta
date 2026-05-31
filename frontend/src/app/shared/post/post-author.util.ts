import {
  POST_AUTHOR_NAME_MAX_LENGTH,
  POST_AUTHOR_NAME_MIN_LENGTH,
  POST_EMPTY_LAST_NAME,
  POST_FALLBACK_AUTHOR,
} from './post.constants';

export interface NormalizePostAuthorInput {
  isAuthenticated: boolean;
  formFirstName?: string | null;
  formLastName?: string | null;
  storedName?: string | null;
  email?: string | null;
}

export interface PostAuthorName {
  firstName: string;
  lastName: string;
}

const cleanName = (value?: string | null): string => (value ?? '').trim().replace(/\s+/g, ' ');

const clipName = (value: string): string => value.slice(0, POST_AUTHOR_NAME_MAX_LENGTH);

const nameFromEmail = (email?: string | null): string => {
  const localPart = email?.split('@')[0] ?? '';
  return cleanName(localPart.replace(/[^a-zA-Z0-9 ]/g, ' '));
};

export function normalizePostAuthor(input: NormalizePostAuthorInput): PostAuthorName {
  let firstName = cleanName(input.formFirstName);
  let lastName = cleanName(input.formLastName);

  if (!input.isAuthenticated) {
    return {
      firstName: clipName(firstName),
      lastName: clipName(lastName || POST_EMPTY_LAST_NAME),
    };
  }

  const nameParts = cleanName(input.storedName).split(/\s+/).filter(Boolean);

  if (firstName.length < POST_AUTHOR_NAME_MIN_LENGTH && nameParts.length > 1) {
    firstName = `${nameParts[0]} ${nameParts[1]}`.trim();
    lastName = nameParts.slice(2).join(' ') || lastName;
  }

  if (firstName.length < POST_AUTHOR_NAME_MIN_LENGTH && nameParts.length === 1) {
    firstName = nameParts[0];
  }

  if (firstName.length < POST_AUTHOR_NAME_MIN_LENGTH) {
    firstName = nameFromEmail(input.email);
  }

  if (firstName.length < POST_AUTHOR_NAME_MIN_LENGTH) {
    firstName = POST_FALLBACK_AUTHOR;
  }

  return {
    firstName: clipName(firstName),
    lastName: clipName(lastName || POST_EMPTY_LAST_NAME),
  };
}

export function getPostAuthorDisplayName(firstName?: string | null, lastName?: string | null): string {
  const cleanedFirstName = cleanName(firstName);
  const cleanedLastName = cleanName(lastName);

  if (!cleanedLastName || cleanedLastName.toUpperCase() === POST_EMPTY_LAST_NAME) {
    return cleanedFirstName;
  }

  return `${cleanedFirstName} ${cleanedLastName}`.trim();
}
