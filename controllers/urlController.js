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
      return res.status(400).json({
        success: false,
        message: "Error occurred",
        errors: errors.array(),
      });
    }

    const { originalUrl } = req.body;
    const userId = req.userId;

    // Normalize URL (e.g., remove trailing slashes)
    const normalizedUrl = new URL(originalUrl).href;

    // Check if URL already exists for the user
    const existingUrl = await Url.findOne({
      originalUrl: normalizedUrl,
      userId,
    });
    if (existingUrl) {
      return res.status(200).json({
        success: true,
        message: "URL already exists",
        data: existingUrl,
      });
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
      success: true,
      message: "URL successfully shortened!",
      data: {
        shortUrl,
        originalUrl: normalizedUrl,
      },
    });
  } catch (error) {
    console.error("Error in shortenUrl:", error);

    res.status(500).json({
      success: false,
      message: "An internal error occurred. Please try again later.",
    });
  }
};

const getOriginalUrl = async (req, res) => {
  const { shortUrl } = req.params;

  try {
    const url = await Url.findOne({ shortUrl });

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
    res.status(500).json({ success: true, message: "Internal server error." });
  }
};

const manageUrls = async (req, res) => {
  try {
    // Check if user is authenticated
    const userId = req.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });
    }

    // Query the database to find all URLs associated with the user
    const userUrls = await Url.find({ userId }).lean();

    // Return the user's URLs
    res.status(200).json({
      success: true,
      message: "Urls were found",
      data: userUrls,
    });
  } catch (error) {
    console.error("Error in manageUrls:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const deleteUrl = async (req, res) => {
  const { shortUrl } = req.params;
  const userId = req.userId;

  const url = await Url.findOneAndDelete({ shortUrl, userId });

  if (!url) {
    return res.status(404).json({ success: false, message: "URL not found." });
  }

  res.json({ success: true, message: "URL deleted successfully." });
};

const editUrl = async (req, res) => {
  const { shortUrl } = req.params;
  const { originalUrl } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Some error occurred!",
        errors: errors.array(),
      });
    }

    // Check if the shortUrl exists
    const url = await Url.findOne({ shortUrl, userId: req.userId });
    if (!url) {
      return res
        .status(404)
        .json({ success: false, message: "URL not found." });
    }

    // Normalize the new URL
    const normalizedUrl = new URL(originalUrl).href;

    // Check if the new URL is different
    if (url.originalUrl === normalizedUrl) {
      return res.status(400).json({
        success: false,
        message: "New URL is the same as the original one.",
      });
    }

    // Update the URL
    url.originalUrl = normalizedUrl;
    await url.save();

    res.status(200).json({
      success: true,
      message: "URL updated successfully!",
      data: {
        shortUrl,
        originalUrl: normalizedUrl,
      },
    });
  } catch (error) {
    console.error("Error in editUrl:", error);
    res.status(500).json({
      success: false,
      message: "An internal error occurred while updating the URL.",
    });
  }
};

module.exports = {
  shortenUrl,
  getOriginalUrl,
  manageUrls,
  deleteUrl,
  editUrl,
};
