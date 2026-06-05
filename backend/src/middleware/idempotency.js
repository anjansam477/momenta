'use strict';

const asyncHandler = require('express-async-handler');
const { checkIdempotency } = require('../utils/redis-cache');

exports.idempotencyCheck = asyncHandler(async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return next(); // header absent = skip check
  const isDuplicate = await checkIdempotency(key);
  if (isDuplicate) {
    return res.status(409).json({ message: 'Duplicate request — this action was already processed.' });
  }
  next();
});
