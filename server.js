const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const winston = require("winston");
const helmet = require("helmet");
const compression = require("compression");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const urlRoutes = require("./routes/url");
const rateLimit = require("express-rate-limit");

dotenv.config();
require("./config/passport"); // Import the passport configuration

const app = express();
app.use(express.json());
app.use(morgan("combined")); // Log all HTTP requests
app.use(helmet()); // This will automatically set security-related HTTP headers
app.use(compression()); // Compress all responses

const limiter = rateLimit({
  windowMs: 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 10 requests per windowMs
  message: "Too many requests, please try again later.",
});
app.use(limiter); // Apply rate limiting globally

const corsOptions = {
  origin: ["https://your-frontend-domain.com", "http://localhost:3000"], // allow specific domains
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
};
app.use(cors(corsOptions));

// Set up express-session middleware
app.use(
  session({
    secret: process.env.JWT_SECRET, // Choose a secret for your session
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

//  create custom logger for errors

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
  ],
});

// Log uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: err.message || "Internal Server Error",
    },
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Use routes
app.use("/auth", authRoutes);
app.use("/url", urlRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
