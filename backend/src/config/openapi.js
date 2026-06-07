// Hand-authored OpenAPI 3.0 description of the Momenta HTTP API.
// Served by swagger-ui-express at /api/docs (and raw JSON at /api/docs.json).
// Keep this in sync when routes change — it is the single source of API truth.

const SERVICE_BASE_URL = process.env.SERVICE_BASE_URL || '';

// Reusable response refs to keep paths terse.
const r = {
  ok: { description: 'Success' },
  created: { description: 'Created' },
  badRequest: { description: 'Validation error', content: jsonError() },
  unauthorized: { description: 'Missing or invalid token', content: jsonError() },
  forbidden: { description: 'Not allowed for this wall/role', content: jsonError() },
  notFound: { description: 'Resource not found', content: jsonError() },
  tooMany: { description: 'Rate limit exceeded', content: jsonError() },
};

function jsonError() {
  return { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };
}

// Standard auth'd response set.
const authed = {
  200: r.ok,
  400: r.badRequest,
  401: r.unauthorized,
  403: r.forbidden,
  404: r.notFound,
};

const secured = [{ bearerAuth: [] }];

function pathParam(name, desc) {
  return { name, in: 'path', required: true, schema: { type: 'string' }, description: desc };
}

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Momenta API',
    version: '1.0.0',
    description:
      'Collaborative moment-wall application API. Walls hold posts; access is ' +
      'governed by roles (owner/maintainer/poster/viewer/recipient) and per-wall ' +
      'view/post access lists. Most endpoints require a Bearer JWT.',
  },
  servers: [
    { url: SERVICE_BASE_URL || 'http://localhost:8071', description: 'API server' },
  ],
  tags: [
    { name: 'Users', description: 'Accounts, auth, profile' },
    { name: 'Walls', description: 'Moment walls + membership' },
    { name: 'Posts', description: 'Posts, reactions, moderation' },
    { name: 'Mail', description: 'Scheduled + contact email' },
    { name: 'Giphy', description: 'GIF / sticker search proxy' },
    { name: 'Events', description: 'Organisation events' },
    { name: 'Uploads', description: 'Media upload + retrieval' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Invalid request' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstname: { type: 'string' },
          lastname: { type: 'string' },
          status: { type: 'string', enum: ['pending_verification', 'active', 'suspended'] },
          profilePictureUrl: { type: 'string', nullable: true },
        },
      },
      Wall: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          slug: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          ownerEmail: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['active', 'locked', 'archived'] },
          anyoneCanView: { type: 'boolean' },
          anyoneCanPost: { type: 'boolean' },
        },
      },
      Post: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          wallId: { type: 'string' },
          authorEmail: { type: 'string', format: 'email' },
          content: { type: 'string' },
          status: { type: 'string', enum: ['active', 'pending_approval', 'rejected', 'deleted'] },
          pinned: { type: 'boolean' },
          media: {
            type: 'object',
            nullable: true,
            properties: {
              url: { type: 'string', nullable: true },
              type: { type: 'string', nullable: true },
              thumbnailUrl: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  },
  paths: {
    // ---- Users ----
    '/api/users/account/create': {
      post: { tags: ['Users'], summary: 'Register a new account', responses: { 201: r.created, 400: r.badRequest, 429: r.tooMany } },
    },
    '/api/users/account/login': {
      post: { tags: ['Users'], summary: 'Log in, returns JWT', responses: { 200: r.ok, 400: r.badRequest, 401: r.unauthorized, 429: r.tooMany } },
    },
    '/api/users/account/logout': {
      post: { tags: ['Users'], summary: 'Log out (blacklist token)', security: secured, responses: { 200: r.ok, 401: r.unauthorized } },
    },
    '/api/users/account/password/reset': {
      post: { tags: ['Users'], summary: 'Request a password reset email', responses: { 200: r.ok, 400: r.badRequest, 429: r.tooMany } },
    },
    '/api/users/account/password/update': {
      put: { tags: ['Users'], summary: 'Update password with reset token', responses: { 200: r.ok, 400: r.badRequest } },
    },
    '/api/users/account/verify': {
      get: { tags: ['Users'], summary: 'Verify email via token', parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: r.ok, 400: r.badRequest } },
      post: { tags: ['Users'], summary: 'Generate a new verification token', responses: { 200: r.ok, 400: r.badRequest, 429: r.tooMany } },
    },
    '/api/users': {
      get: { tags: ['Users'], summary: 'List users', responses: { 200: r.ok } },
    },
    '/api/users/search/names': {
      get: { tags: ['Users'], summary: 'Search user names', security: secured, parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: authed },
    },
    '/api/users/name': {
      get: { tags: ['Users'], summary: 'Resolve names for emails', security: secured, responses: authed },
    },
    '/api/users/{email}': {
      get: { tags: ['Users'], summary: 'Get a user by email', parameters: [pathParam('email')], responses: { 200: r.ok, 404: r.notFound } },
    },
    '/api/users/{id}': {
      delete: { tags: ['Users'], summary: 'Delete a user', security: secured, parameters: [pathParam('id')], responses: authed },
    },
    '/api/users/{userId}': {
      put: { tags: ['Users'], summary: 'Update a user', security: secured, parameters: [pathParam('userId')], responses: authed },
    },
    '/api/users/profile/{userId}': {
      get: { tags: ['Users'], summary: 'Remove profile picture', security: secured, parameters: [pathParam('userId')], responses: authed },
    },
    '/api/users/profile/picture/{userId}': {
      put: { tags: ['Users'], summary: 'Upload profile picture (multipart)', parameters: [pathParam('userId')], requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { profilePicture: { type: 'string', format: 'binary' } } } } } }, responses: { 200: r.ok, 400: r.badRequest } },
    },

    // ---- Walls ----
    '/api/walls': {
      get: { tags: ['Walls'], summary: 'List walls for the caller', security: secured, responses: authed },
      post: { tags: ['Walls'], summary: 'Create a wall', security: secured, responses: { 201: r.created, 400: r.badRequest, 401: r.unauthorized } },
    },
    '/api/walls/recents/{emailId}': {
      get: { tags: ['Walls'], summary: 'Recently viewed walls', security: secured, parameters: [pathParam('emailId')], responses: authed },
    },
    '/api/walls/view-receiver-wall/{token}': {
      get: { tags: ['Walls'], summary: 'View a wall via receiver token (public)', parameters: [pathParam('token')], responses: { 200: r.ok, 401: r.unauthorized, 404: r.notFound } },
    },
    '/api/walls/{wallId}': {
      get: { tags: ['Walls'], summary: 'Get a wall', security: secured, parameters: [pathParam('wallId')], responses: authed },
      put: { tags: ['Walls'], summary: 'Update wall settings', security: secured, parameters: [pathParam('wallId')], responses: authed },
      delete: { tags: ['Walls'], summary: 'Archive (soft-delete) a wall', security: secured, parameters: [pathParam('wallId')], responses: authed },
    },
    '/api/walls/{wallId}/invite-link': {
      post: { tags: ['Walls'], summary: 'Generate an invite link', security: secured, parameters: [pathParam('wallId')], responses: authed },
    },
    '/api/walls/{wallId}/accept-invite': {
      post: { tags: ['Walls'], summary: 'Accept an invite (public, token in body)', parameters: [pathParam('wallId')], responses: { 200: r.ok, 400: r.badRequest } },
    },
    '/api/walls/{wallId}/analytics': {
      get: { tags: ['Walls'], summary: 'Wall analytics', security: secured, parameters: [pathParam('wallId')], responses: authed },
    },
    '/api/walls/save/{wallId}/{emailId}': {
      post: { tags: ['Walls'], summary: 'Save/favourite a wall', security: secured, parameters: [pathParam('wallId'), pathParam('emailId')], responses: authed },
      delete: { tags: ['Walls'], summary: 'Unsave a wall', security: secured, parameters: [pathParam('wallId'), pathParam('emailId')], responses: authed },
    },

    // ---- Posts (mounted under /api/walls) ----
    '/api/walls/{wallId}/posts': {
      get: { tags: ['Posts'], summary: 'List active posts (paginated)', security: secured, parameters: [pathParam('wallId'), { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } }], responses: authed },
      post: { tags: ['Posts'], summary: 'Create a post (multipart, optional media)', security: secured, parameters: [pathParam('wallId')], requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { content: { type: 'string' }, file: { type: 'string', format: 'binary' } } } } } }, responses: { 201: r.created, 400: r.badRequest, 401: r.unauthorized, 403: r.forbidden, 429: r.tooMany } },
    },
    '/api/walls/{wallId}/posts/pending': {
      get: { tags: ['Posts'], summary: 'List posts awaiting approval', security: secured, parameters: [pathParam('wallId')], responses: authed },
    },
    '/api/walls/{wallId}/posts/mail': {
      get: { tags: ['Posts'], summary: 'Posts authored by the caller (for mail)', security: secured, parameters: [pathParam('wallId')], responses: authed },
    },
    '/api/walls/{wallId}/posts/{postId}': {
      get: { tags: ['Posts'], summary: 'Get a post', security: secured, parameters: [pathParam('wallId'), pathParam('postId')], responses: authed },
      put: { tags: ['Posts'], summary: 'Edit a post', security: secured, parameters: [pathParam('wallId'), pathParam('postId')], responses: authed },
      delete: { tags: ['Posts'], summary: 'Delete a post', security: secured, parameters: [pathParam('wallId'), pathParam('postId')], responses: authed },
    },
    '/api/walls/{wallId}/posts/{postId}/approve': {
      put: { tags: ['Posts'], summary: 'Approve a pending post', security: secured, parameters: [pathParam('wallId'), pathParam('postId')], responses: authed },
    },
    '/api/walls/{wallId}/posts/{postId}/reject': {
      put: { tags: ['Posts'], summary: 'Reject a pending post', security: secured, parameters: [pathParam('wallId'), pathParam('postId')], responses: authed },
    },
    '/api/walls/{wallId}/posts/{postId}/pin': {
      put: { tags: ['Posts'], summary: 'Pin/unpin a post', security: secured, parameters: [pathParam('wallId'), pathParam('postId')], responses: authed },
    },
    '/api/walls/{wallId}/posts/{postId}/report': {
      put: { tags: ['Posts'], summary: 'Report a post', security: secured, parameters: [pathParam('wallId'), pathParam('postId')], responses: authed },
    },
    '/api/walls/{wallId}/posts/{postId}/unreport': {
      put: { tags: ['Posts'], summary: 'Dismiss a report', security: secured, parameters: [pathParam('wallId'), pathParam('postId')], responses: authed },
    },
    '/api/walls/{wallId}/posts/{postId}/react/{reactionType}': {
      post: { tags: ['Posts'], summary: 'Add a reaction', security: secured, parameters: [pathParam('wallId'), pathParam('postId'), pathParam('reactionType', 'heart|clap|laugh|wow|sad|celebrate')], responses: { 200: r.ok, 401: r.unauthorized, 403: r.forbidden, 429: r.tooMany } },
      delete: { tags: ['Posts'], summary: 'Remove a reaction', security: secured, parameters: [pathParam('wallId'), pathParam('postId'), pathParam('reactionType')], responses: authed },
    },

    // ---- Mail ----
    '/api/mail/send-mail': {
      post: { tags: ['Mail'], summary: 'Schedule a delivery email', security: secured, responses: authed },
    },
    '/api/mail/scheduled/{wallId}': {
      get: { tags: ['Mail'], summary: 'List scheduled emails for a wall', security: secured, parameters: [pathParam('wallId')], responses: authed },
    },
    '/api/mail/send-contact-email': {
      post: { tags: ['Mail'], summary: 'Send a contact-us email (public)', responses: { 200: r.ok, 400: r.badRequest } },
    },
    '/api/mail/remove/{wallId}/{recipient}': {
      delete: { tags: ['Mail'], summary: 'Remove a scheduled recipient', security: secured, parameters: [pathParam('wallId'), pathParam('recipient')], responses: authed },
    },
    '/api/mail/cancel/{wallId}': {
      delete: { tags: ['Mail'], summary: 'Cancel a scheduled mail job', security: secured, parameters: [pathParam('wallId')], responses: authed },
    },

    // ---- Giphy ----
    '/api/giphy/gifs/trending': { get: { tags: ['Giphy'], summary: 'Trending GIFs', responses: { 200: r.ok } } },
    '/api/giphy/gifs/search': { get: { tags: ['Giphy'], summary: 'Search GIFs', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'offset', in: 'query', schema: { type: 'integer' } }], responses: { 200: r.ok } } },
    '/api/giphy/stickers/trending': { get: { tags: ['Giphy'], summary: 'Trending stickers', responses: { 200: r.ok } } },
    '/api/giphy/stickers/search': { get: { tags: ['Giphy'], summary: 'Search stickers', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'offset', in: 'query', schema: { type: 'integer' } }], responses: { 200: r.ok } } },
    '/api/giphy/trending/searches': { get: { tags: ['Giphy'], summary: 'Trending search terms', responses: { 200: r.ok } } },
    '/api/giphy/gifs/autocomplete': { get: { tags: ['Giphy'], summary: 'Autocomplete tags', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { 200: r.ok } } },
    '/api/giphy/tags/related/{term}': { get: { tags: ['Giphy'], summary: 'Related tags', parameters: [pathParam('term')], responses: { 200: r.ok } } },
    '/api/giphy/analytics/action': { post: { tags: ['Giphy'], summary: 'Track a GIF analytics action', responses: { 200: r.ok } } },

    // ---- Events ----
    '/api/events/{emailId}': {
      get: { tags: ['Events'], summary: 'Events for an organisation', security: secured, parameters: [pathParam('emailId')], responses: authed },
    },

    // ---- Uploads ----
    '/api/uploads/media': {
      post: { tags: ['Uploads'], summary: 'Upload post media (multipart)', requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, wallId: { type: 'string' }, postId: { type: 'string' } } } } } }, responses: { 200: r.ok, 400: r.badRequest } },
    },
    '/api/uploads/retrieve-file': {
      get: { tags: ['Uploads'], summary: 'Retrieve a media file', parameters: [{ name: 'mediaUrl', in: 'query', required: true, schema: { type: 'string' } }], responses: { 200: r.ok, 404: r.notFound } },
    },
  },
};

module.exports = { openapiSpec };
