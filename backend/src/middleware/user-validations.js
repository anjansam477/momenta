const asyncHandler = require("express-async-handler");
const { check, validationResult } = require('express-validator');
const Response = require('../utils/error-handler');
const userRepository = require("../repositories/user-repository");
const User = require("../models/users");
const {UI_BASE_URL} = require("../../environment-config")

exports.validateUserSignup = [
    check('email').isEmail().withMessage('Invalid email format'),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    check('fname').notEmpty().withMessage('First name is required'),
    // check('lname').notEmpty().withMessage('Last name is required'),
  
    asyncHandler(async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new Error(errors.array());
        }
        
        const user = await userRepository.getUserByEmail(req.body.email);
        if (user) {
          throw new Error(Response.errorMessage.ALREADY_REGISTERED);
        }
        
        next();
      } catch (error) {
        return Response.respondError(res, error);
      }
    })
];
  
exports.validateUserLogin = [
    check('email').isEmail().withMessage('Invalid email format'),
    check('password').notEmpty().withMessage('Password is required'),
    asyncHandler(async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new Error(errors.array());
        }
        
        const user = await userRepository.getUserByEmail(req.body.email);
        if (!user) {
          throw new Error(Response.errorMessage.INVALID_CREDENTIALS);
        }
        req.user = user;
        next();
      } catch (error) {
        return Response.respondError(res, error);
      }
    })
];

exports.validateForgotPassword = [
  check('email').isEmail().withMessage('Invalid email format'),
  asyncHandler(async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new Error(errors.array());
      }

      const { email } = req.body;
      const user = await userRepository.getUserByEmail(email);
      if (!user) {
        throw new Error(Response.errorMessage.REGISTER_ERROR);
      }

      req.user = user;
      next();
    } catch (error) {
      return Response.respondError(res, error);
    }
  })
];

exports.validateUpdatePassword = [
  check('token').notEmpty().withMessage('Token is required'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        throw new Error(errors.array());
      }

      const { token } = req.body;
      const user = await User.findOne({ verificationToken: token });
      if (!user) {
        throw new Error(Response.errorMessage.SOMETHING_WENT_WRONG);
      }

      if (!user.active) {
        throw new Error(Response.errorMessage.NOT_VERIFIED);
      }

      req.user = user;
      next();
    } catch (error) {
      return Response.respondError(res, error);
    }
  }
];

exports.validateUserByEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await userRepository.getUserByEmail(email);
    if (!user) {
      throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, 'user'));
    }
    req.user = user;
    next();
  } catch (error) {
    return Response.respondError(res, error.message);
  }
});

exports.validateUserById = asyncHandler(async (req, res, next) => {
  const userId = req.params.id || req.params.userId;
  try {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, 'user'));
    }
    // Ownership: a user may only act on their own account. Every route using this
    // runs verifyToken first (so req.email is the caller). Prevents acting on
    // another user's id (update / delete / profile picture).
    if (req.email && user.email && user.email.toLowerCase() !== req.email.toLowerCase()) {
      const err = new Error(Response.generateMessage(Response.errorMessage.NO_ACCESS, 'user'));
      err.statusCode = Response.statusCodes?.Forbidden ?? 403;
      return Response.respondError(res, err);
    }
    req.user = user;
    next();
  } catch (error) {
    return Response.respondError(res, error.message);
  }
});

exports.validateUserToken = asyncHandler(async (req, res, next) => {
  const { token } = req.query;
  try {
    const user = await userRepository.getUserByVerificationToken(token);
    if (!user) {
      throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, 'user'));
    }
    req.user = user;
    next();
  } catch (error) {
    return res.redirect(`${UI_BASE_URL}/verification/unverified`);
  }
});

exports.checkUpdateData = asyncHandler(async (req, res, next) => {
  const updateData = req.body;
  try {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error(Response.generateMessage(Response.errorMessage.INVALID_REQUEST, 'update data'));
    }
    req.updateData = updateData;
    next();
  } catch (error) {
    return Response.respondError(res, error);
  }
});