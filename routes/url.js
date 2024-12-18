const express = require("express");
const {
  shortenUrl,
  getOriginalUrl,
  manageUrls,
  deleteUrl,
  editUrl,
} = require("../controllers/urlController");
const { verifyAccessToken } = require("../config/jwt");

const router = express.Router();

// View all
router.get("/manage", verifyAccessToken, manageUrls);

// Shorten URL
router.post("/shorten", verifyAccessToken, shortenUrl);

// Delete URL
router.delete("/:shortUrl", verifyAccessToken, deleteUrl);

// Edit URL route
router.put("/:shortUrl/edit", verifyAccessToken, editUrl);

// Redirect to original URL
router.get("/:shortUrl", getOriginalUrl);

module.exports = router;
