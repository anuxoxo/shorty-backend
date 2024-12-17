const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cookie = require("cookie");

const router = express.Router();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_secret_key";

// Token Expiry Times
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";

// Utility Functions
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

// Middleware to verify access token
const verifyAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ error: "Access token is missing." });

  jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid access token." });
    req.user = decoded.userId;
    next();
  });
};

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res.json({
      message: "Login successful",
      accessToken,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// Refresh Token Route
router.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token is missing." });
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token." });
    }

    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    // Rotate the refresh token
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res.json({ accessToken: newAccessToken });
  });
});

// user details
router.get("/user-details", verifyAccessToken, async (req, res) => {
  try {
    const userId = req.user;

    const user = await User.findById(userId).select("-password"); // Exclude password from the response

    // If no user found, send an error
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Send the user details as the response
    return res.json({
      user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/protected", verifyAccessToken, (req, res) => {
  res.json({ message: "You have access to this route", userId: req.user });
});

// Register Route
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    res.json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed." });
  }
});

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
  async (req, res) => {
    try {
      // On successful login, user information will be available in req.user
      const { googleId, email, displayName } = req.user; // These are typically available after successful Google OAuth

      // Check if the user already exists in the database using Google ID
      let user = await User.findOne({ googleId });

      if (!user) {
      }

      // Generate JWT tokens after user login or creation
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Optionally, store refresh token in a secure cookie or session
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Set secure cookies in production
        sameSite: "Strict",
      });

      // Redirect to frontend with access token or send it as part of response
      res.redirect(
        `${process.env.FRONTEND_URL}/google/callback?token=${accessToken}`
      );
    } catch (error) {
      console.error("Error during Google callback:", error);
      res.status(500).json({ error: "Google authentication failed." });
    }
  }
);

router.get("/logout", (req, res) => {
  // Get all cookies from the request
  const cookies = req.cookies;

  // Loop through all cookies and clear them
  for (let cookieName in cookies) {
    if (cookies.hasOwnProperty(cookieName)) {
      // Remove each cookie by setting the expiration to a time in the past
      res.cookie(cookieName, "", {
        maxAge: 0, // Expire immediately
        path: "/", // Set path to root to clear cookies in all routes
        httpOnly: true, // Secure cookie flag
        secure: process.env.NODE_ENV === "production", // Ensure it's only secure in production
      });
    }
  }

  return res.json({
    message: "Logout successful",
  });
});

module.exports = router;
