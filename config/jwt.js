const jwt = require("jsonwebtoken");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_secret_key";

// Token Expiry Times
const ACCESS_TOKEN_EXPIRY = "3d";
const REFRESH_TOKEN_EXPIRY = "7d";

const ACCESS_TOKEN_NAME = "shorty-url-shortener-accessToken";
const REFRESH_TOKEN_NAME = "shorty-url-shortener-refreshToken";

// Utility Functions
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

// Middleware to verify access token
const verifyAccessToken = (req, res, next) => {
  const token = req.cookies?.[ACCESS_TOKEN_NAME];

  // Check if token exists
  if (!token) {
    return res.status(401).json({ error: "Access token is missing." });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid access token." });
    }

    // Attach decoded user to the request object
    req.user = decoded.user;
    next();
  });
};

const setCookies = (res, tokenName = "token", token = "", hours = 0) => {
  if (!res || typeof res.cookie !== "function") {
    throw new Error(
      "Invalid response object. Ensure 'res' is a valid response object."
    );
  }
  if (!tokenName || !token) {
    throw new Error("Token name and token value are required.");
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    ...(hours > 0 && { maxAge: hours * 60 * 60 * 1000 }), // Conditionally add `maxAge`
  };

  res.cookie(tokenName, token, cookieOptions);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  setCookies,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  ACCESS_TOKEN_NAME,
  REFRESH_TOKEN_NAME,
};
