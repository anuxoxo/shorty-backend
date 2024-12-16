const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

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
router.post("/login", passport.authenticate("local"), (req, res) => {
  try {
    // On successful login, return a success message
    res.json({ message: "Login successful", user: req.user });
  } catch (error) {
    console.error("Error during local login:", error);
    res.status(500).json({ error: "Login failed." });
  }
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
