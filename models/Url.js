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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Url", urlSchema);
