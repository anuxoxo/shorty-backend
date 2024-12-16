const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback", // Make sure this URL is registered in Google Console
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Ensure email is available from Google profile
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (!email) {
          return done(new Error("Google login did not return an email"));
        }

        // Look for an existing user by Google ID or email
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // If no user with the Google ID, check if a user with the email exists
          user = await User.findOne({ email });
        }

        if (!user) {
          // If user doesn't exist, create a new user with Google profile details
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            googlePhotoUrl: profile.photos ? profile.photos[0].value : null,
            email: email,
          });
          await user.save();
        }

        return done(null, user); // Successful login or creation
      } catch (err) {
        return done(err); // Handle any errors during the process
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id); // Store user id in session
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id); // Use async/await to find the user by ID
    done(null, user); // User found, passing user to the request
  } catch (err) {
    done(err); // Handle errors during deserialization
  }
});

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // The username is email
    },
    async (email, password, done) => {
      try {
        // Look for user by email
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Incorrect email." });
        }

        // Compare password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user); // Successful login
      } catch (error) {
        return done(error); // Handle errors during authentication
      }
    }
  )
);

module.exports = passport;
