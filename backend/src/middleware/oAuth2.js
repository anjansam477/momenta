const passport = require('passport');
const express = require('express');
const o2router = express.Router();
const User = require("../models/users");
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const { generateToken } = require('./auth');
const dotenv = require("dotenv");
const { UI_BASE_URL, SERVICE_BASE_URL, DOMAIN } = require("../../environment-config");
const { canAccess } = require('./access-limiter');
const {
    cookieSameSite,
    cookieSecure,
    defaultOAuthPassword,
    googleClientId,
    googleClientSecret,
} = require("../config/security-config");


dotenv.config();

passport.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: googleClientId,
    clientSecret: googleClientSecret,
    callbackURL: `${SERVICE_BASE_URL}/api/oauth-redirect`,
    passReqToCallback: true // Pass req object to callback for user-specific logic
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        // Logic to handle Google profile data, create/find user, and generate JWT
        let user = await User.findOne({ email: profile.email });
        if (!user) {
            // Create new user — Google has verified the email so set status active immediately
            user = await new User({
                firstname: profile.name.givenName,
                lastname: profile.name.familyName,
                email: profile.email,
                password: defaultOAuthPassword,
                status: "active",
                profilePictureUrl: profile.picture,
            }).save();
        } else if (user.status === "pending_verification") {
            // Existing user who registered but hasn't verified — Google verifies their email
            user.status = "active";
            await user.save();
        } else if (user.status === "suspended") {
            return done(null, false, { message: "Account suspended" });
        }

        const token = generateToken(user.email);
        done(null, { user, token });
    } catch (error) {
        console.log(error);
        done(error);
    }
}));

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});

// first time sign up
// o2router.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
o2router.get('/api/auth/google', (req, res, next) => {
    let redirectUrl;
    if (req.query.redirectUrl){
        redirectUrl = req.query.redirectUrl;
        req.session.redirectUrl = redirectUrl;
    }

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: redirectUrl
    })(req, res, next);
});

// login after once sign up
o2router.get('/api/oauth-redirect',
    passport.authenticate('google'),
    async (req, res) => {
        const frontendURL = `${UI_BASE_URL}${req.query.state || '/home'}`;
        req.session.redirectUrl = null;
        const userEmail = req.user.user.email;
        const isAccessAllowed = await canAccess(userEmail);
        const cookieOptions = {
            path: '/',
            domain: DOMAIN,
            secure: cookieSecure,
            sameSite: cookieSameSite,
        };

        if (isAccessAllowed) {
            const userName = `${req.user.user.firstname} ${req.user.user.lastname}`;
            res.cookie('email', String(userEmail), cookieOptions);
            res.cookie('authToken', req.user.token, cookieOptions);
            res.cookie('name', userName, cookieOptions);
            return res.redirect(frontendURL);
        } else {
            return res.redirect(`${UI_BASE_URL}/blocked`);
        }
    }
);

module.exports = { passport, o2router };
