const express = require("express");
const passport = require("passport");
const {
  shortenUrl,
  getOriginalUrl,
  manageUrls,
  deleteUrl,
  getStatistics,
  getTopUrls,
} = require("../controllers/urlController");

const router = express.Router();

// Authentication middleware
const authenticate = passport.authenticate("jwt", { session: false });

// Shorten URL
router.post("/shorten", authenticate, shortenUrl);

// Redirect to original URL
router.get("/:shortUrl", getOriginalUrl);

// Manage user's URLs
router.get("/manage", authenticate, manageUrls);

// Delete URL
router.delete("/:shortUrl", authenticate, deleteUrl);

// Get URL statistics (click count)
router.get("/statistics", authenticate, getStatistics);

// Get Top URLs based on click count
router.get("/top", authenticate, getTopUrls);

module.exports = router;
