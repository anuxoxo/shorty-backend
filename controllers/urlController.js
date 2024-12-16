const shortid = require("shortid");
const { body, validationResult } = require("express-validator");
const Url = require("../models/Url");

const shortenUrl = async (req, res) => {
  await body("originalUrl")
    .isURL()
    .withMessage("Invalid URL format")
    .normalizeURL()
    .run(req);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { originalUrl } = req.body;
  const userId = req.user.id;

  const existingUrl = await Url.findOne({ originalUrl, userId });
  if (existingUrl) {
    return res.status(400).json({ error: "URL already shortened." });
  }

  const shortUrl = shortid.generate();
  const newUrl = new Url({
    userId,
    originalUrl,
    shortUrl,
  });

  await newUrl.save();
  res.json({ shortUrl, originalUrl });
};

const getOriginalUrl = async (req, res) => {
  const { shortUrl } = req.params;
  const url = await Url.findOne({ shortUrl });

  if (!url) {
    return res.status(404).json({ error: "URL not found." });
  }

  // Increment the click count
  url.clickCount += 1;
  await url.save();

  res.redirect(url.originalUrl);
};

const manageUrls = async (req, res) => {
  const userId = req.user.id;
  const urls = await Url.find({ userId });
  res.json(urls);
};

const deleteUrl = async (req, res) => {
  const { shortUrl } = req.params;
  const userId = req.user.id;

  const url = await Url.findOneAndDelete({ shortUrl, userId });

  if (!url) {
    return res.status(404).json({ error: "URL not found." });
  }

  res.json({ message: "URL deleted successfully." });
};

const getStatistics = async (req, res) => {
  const userId = req.user.id;
  const urls = await Url.find({ userId });

  const statistics = urls.map((url) => ({
    originalUrl: url.originalUrl,
    shortUrl: url.shortUrl,
    clickCount: url.clickCount,
  }));

  res.json({ statistics });
};

// New function to get Top URLs based on click count
const getTopUrls = async (req, res) => {
  // Retrieve the top 10 URLs ordered by click count in descending order
  const topUrls = await Url.find().sort({ clickCount: -1 }).limit(10);

  if (!topUrls.length) {
    return res.status(404).json({ message: "No top URLs found." });
  }

  const topUrlsData = topUrls.map((url) => ({
    originalUrl: url.originalUrl,
    shortUrl: url.shortUrl,
    clickCount: url.clickCount,
  }));

  res.json({ topUrls: topUrlsData });
};

module.exports = {
  shortenUrl,
  getOriginalUrl,
  manageUrls,
  deleteUrl,
  getStatistics,
  getTopUrls,
};
