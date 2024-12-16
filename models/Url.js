const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalUrl: { type: String, required: true },
    shortUrl: { type: String, required: true },
    clickCount: { type: Number, default: 0 },
    expiryDate: { type: Date, default: null }, // Date when the URL expires
  },
  { timestamps: true }
);

module.exports = mongoose.model("Url", urlSchema);
