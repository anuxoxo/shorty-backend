const shortid = require("shortid");
const { body, validationResult } = require("express-validator");
const Url = require("../models/Url");

const shortenUrl = async (req, res) => {
  try {
    // Validate request body
    await body("originalUrl")
      .isURL({ require_protocol: true }) // Ensure HTTP/HTTPS is present
      .withMessage("Please provide a valid URL (with http/https).")
      .trim()
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { originalUrl } = req.body;
    console.log("shorten: ", req.user);
    const userId = req.user.id;

    // Normalize URL (e.g., remove trailing slashes)
    const normalizedUrl = new URL(originalUrl).href;

    // Check if URL already exists for the user
    const existingUrl = await Url.findOne({
      originalUrl: normalizedUrl,
      userId,
    });
    if (existingUrl) {
      return res.status(200).json(existingUrl);
    }

    // Generate a unique short URL
    let shortUrl;
    do {
      shortUrl = shortid.generate();
    } while (await Url.findOne({ shortUrl })); // Ensure uniqueness (rare, but possible)

    // Save new URL to the database
    const newUrl = new Url({
      userId,
      originalUrl: normalizedUrl,
      shortUrl,
    });

    await newUrl.save();

    // Respond with the shortened URL
    res.status(201).json({
      message: "URL successfully shortened!",
      data: {
        shortUrl,
        originalUrl: normalizedUrl,
      },
    });
  } catch (error) {
    console.error("Error in shortenUrl:", error);

    // Generic error response
    res
      .status(500)
      .json({ error: "An internal error occurred. Please try again later." });
  }
};

const getOriginalUrl = async (req, res) => {
  const { shortUrl } = req.params;
  console.log("shortUrl:", shortUrl);

  try {
    // Find the URL document by shortUrl
    const url = await Url.findOne({ shortUrl });

    // If the URL is not found in the database
    if (!url) {
      return res.send("URL not found.");
    }

    // Increment the click count
    url.clickCount += 1;
    await url.save();

    // Redirect to the original URL
    res.redirect(url.originalUrl);
  } catch (error) {
    console.error("Error in getOriginalUrl:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

const manageUrls = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    // Query the database to find all URLs associated with the user
    const userUrls = await Url.find({ userId: req.user.id }).lean();

    // Handle case where no URLs are found
    if (!userUrls.length) {
      return res.status(200).json({ message: "No URLs found", urls: [] });
    }

    // Return the user's URLs
    res.status(200).json(userUrls);
  } catch (error) {
    console.error("Error in manageUrls:", error.message, error.stack);
    res.status(500).json({ error: "Internal Server Error" });
  }
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

const editUrl = async (req, res) => {
  const { shortUrl } = req.params;
  const { originalUrl } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if the shortUrl exists
    const url = await Url.findOne({ shortUrl, userId: req.user });
    if (!url) {
      return res.status(404).json({ error: "URL not found." });
    }

    // Normalize the new URL
    const normalizedUrl = new URL(originalUrl).href;

    // Check if the new URL is different
    if (url.originalUrl === normalizedUrl) {
      return res
        .status(400)
        .json({ error: "New URL is the same as the original one." });
    }

    // Update the URL
    url.originalUrl = normalizedUrl;
    await url.save();

    res.status(200).json({
      message: "URL updated successfully!",
      data: {
        shortUrl,
        originalUrl: normalizedUrl,
      },
    });
  } catch (error) {
    console.error("Error in editUrl:", error);
    res
      .status(500)
      .json({ error: "An internal error occurred while updating the URL." });
  }
};

module.exports = {
  shortenUrl,
  getOriginalUrl,
  manageUrls,
  deleteUrl,
  editUrl,
};
