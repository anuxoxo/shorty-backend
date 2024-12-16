const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

const expiresIn = "1d";

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
    // Generate a JWT token upon successful Google authentication
    const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, {
      expiresIn,
    });

    // Redirect to the frontend with the token in the query parameters
    res.redirect(`${process.env.FRONTEND_URL}/google/callback?token=${token}`);
  }
);

// Local login route
router.post("/login", passport.authenticate("local"), (req, res) => {
  const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, {
    expiresIn,
  });
  res.json({ token });
});

// Register route (email/password)
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = new User({
      email,
      password: await bcrypt.hash(password, 10),
    });
    await user.save();
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn,
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "User registration failed." });
  }
});

module.exports = router;
