const express = require("express");
const passport = require("passport");
const { verifyAccessToken } = require("../config/jwt");
const { register, localLogin, refreshToken, logout, getUserDetails, googleLoginCallback } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", localLogin);
router.post("/refresh-token", refreshToken);
router.get("/logout", logout);

router.get("/user-details", verifyAccessToken, getUserDetails);

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
  googleLoginCallback
);

module.exports = router;
