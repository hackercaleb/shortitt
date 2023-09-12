const mongoose = require("mongoose");

const shortenedURLSchema = new mongoose.Schema({
  customName: {
    type: String,
    unique: true,
    sparse: true,
  },
  shortUrl: {
    type: String,
    required: true,
    unique: true,
  },
  originalUrl: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ShortenedURL", shortenedURLSchema);
