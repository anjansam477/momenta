import { POST_EMPTY_LAST_NAME } from './post.constants';
import { getPostAuthorDisplayName, normalizePostAuthor } from './post-author.util';

describe('post-author util', () => {
  it('stores missing last names as NA for single-name authors', () => {
    const author = normalizePostAuthor({
      isAuthenticated: false,
      formFirstName: 'Aman',
      formLastName: '',
    });

    expect(author).toEqual({ firstName: 'Aman', lastName: POST_EMPTY_LAST_NAME });
  });

  it('does not show NA in author display names', () => {
    expect(getPostAuthorDisplayName('Aman', POST_EMPTY_LAST_NAME)).toBe('Aman');
    expect(getPostAuthorDisplayName('Aman', 'Sampath')).toBe('Aman Sampath');
  });

  it('uses email fallback when an authenticated profile name is too short', () => {
    const author = normalizePostAuthor({
      isAuthenticated: true,
      formFirstName: 'V',
      storedName: 'V',
      email: 'v-anian@example.com',
    });

    expect(author.firstName).toBe('v anian');
    expect(author.lastName).toBe(POST_EMPTY_LAST_NAME);
  });
});
