const express = require("express");
const {
  shortenUrl,
  getOriginalUrl,
  manageUrls,
  deleteUrl,
} = require("../controllers/urlController");
const authenticate = require("../middlewares/auth");

const router = express.Router();

router.get("/manage", authenticate, manageUrls);

// Shorten URL
router.post("/shorten", authenticate, shortenUrl);

// Redirect to original URL
router.get("/:shortUrl", getOriginalUrl);

// Delete URL
router.delete("/:shortUrl", authenticate, deleteUrl);

module.exports = router;
