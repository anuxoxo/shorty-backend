const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_secret_key";
// Access token expiration time (1 hour)
const ACCESS_TOKEN_EXPIRY = "1h";
// Refresh token expiration time (7 days)
const REFRESH_TOKEN_EXPIRY = "7d";
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

// Generate Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

// Google login route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google Authentication Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.FRONTEND_URL + "/login",
  }),
  (req, res) => {
    try {
      // On successful login, redirect to the frontend
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error("Error during Google callback:", error);
      res.status(500).json({ error: "Google authentication failed." });
    }
  }
);

// Local login route
// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Check user credentials and authenticate (using passport or your own logic)
  const user = await User.findOne({ email }); // Assuming User model is set up

  if (!user || !bcrypt.compare(password, user.password)) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  // Generate access and refresh tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token in HttpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  // Send access token in response (or as a cookie)
  res.json({ message: "Login successful", accessToken });
});

router.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing." });
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid refresh token." });
    }

    // Generate a new access token
    const newAccessToken = generateAccessToken(decoded.userId);

    res.json({ accessToken: newAccessToken });
  });
});

// Register route (email/password)
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists." });
    }

    // Create new user
    const user = new User({
      email,
      password: await bcrypt.hash(password, 10),
    });

    await user.save();

    res.json({ message: "User registration successful" });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ error: "User registration failed." });
  }
});

// Protected route example
router.get("/protected", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: "Access granted", user: req.user });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

// Catch-all error handling for unhandled routes
router.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

module.exports = router;
