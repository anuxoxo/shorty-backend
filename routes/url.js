const express = require("express");
const {
  shortenUrl,
  getOriginalUrl,
  manageUrls,
  deleteUrl,
  editUrl,
} = require("../controllers/urlController");
const authenticate = require("../middlewares/auth");
const { body } = require("express-validator");

const router = express.Router();

router.get("/manage", authenticate, manageUrls);

// Shorten URL
router.post("/shorten", authenticate, shortenUrl);

// Redirect to original URL
router.get("/:shortUrl", getOriginalUrl);

// Delete URL
router.delete("/:shortUrl", authenticate, deleteUrl);

// Edit URL route
router.put(
  "/:shortUrl/edit",
  body("originalUrl")
    .isURL({ require_protocol: true })
    .withMessage("Please provide a valid URL (with http/https)."),
  editUrl
);

module.exports = router;
