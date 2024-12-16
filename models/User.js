const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, unique: true },
    googlePhotoUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
