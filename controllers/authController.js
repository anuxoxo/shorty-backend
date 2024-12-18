const {
  generateAccessToken,
  generateRefreshToken,
  setCookies,
  REFRESH_TOKEN_NAME,
  ACCESS_TOKEN_NAME,
  JWT_REFRESH_SECRET,
} = require("../config/jwt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const localLogin = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Compare passwords
    const isPasswordValid = bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set cookies (HTTP-only, Secure, SameSite)
    setCookies(res, REFRESH_TOKEN_NAME, refreshToken);
    setCookies(res, ACCESS_TOKEN_NAME, accessToken, 72);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Login failed. Please try again." });
  }
};

const refreshToken = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res
      .status(401)
      .json({ succcess: false, message: "Refresh token is missing." });
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }

    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    setCookies(res, ACCESS_TOKEN_NAME, newAccessToken, 72);
    setCookies(res, REFRESH_TOKEN_NAME, newRefreshToken);

    return res.status(200).json({ succes: true, message: "Token Refreshed!" });
  });
};

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, name, password: hashedPassword });
    await user.save();

    res.json({ success: true, message: "User registered successfully." });
  } catch (error) {
    console.error("Registration error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Registration failed." });
  }
};

const googleLoginCallback = async (req, res) => {
  try {
    // On successful login, user information will be available in req.user
    const { email } = req.user;

    // Check if the user already exists in the database using email
    let user = await User.findOne({ email });
    
    // Generate JWT tokens after user login or creation
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setCookies(res, ACCESS_TOKEN_NAME, accessToken, 72);
    setCookies(res, REFRESH_TOKEN_NAME, refreshToken);

    // Redirect to frontend with access token or send it as part of response
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("Error during Google callback:", error);
    res
      .status(500)
      .json({ success: false, message: "Google authentication failed." });
  }
};

const logout = (req, res) => {
  const cookies = req.cookies;

  // Loop through all cookies and clear them
  for (let cookieName in cookies) {
    if (cookies.hasOwnProperty(cookieName)) {
      // Remove each cookie by setting the expiration to a time in the past
      res.cookie(cookieName, "", {
        maxAge: 0, // Expire immediately
        path: "/", // Set path to root to clear cookies in all routes
        httpOnly: true, // Secure cookie flag
        secure: process.env.NODE_ENV === "production", // Ensure it's only secure in production
      });
    }
  }

  return res.json({
    success: true,
    message: "Logout successful",
  });
};

const getUserDetails = async (req, res) => {
  try {
    const userId = req.user;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "User data found",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

module.exports = {
  localLogin,
  refreshToken,
  register,
  googleLoginCallback,
  logout,
  getUserDetails,
};
