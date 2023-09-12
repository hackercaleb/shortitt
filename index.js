const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { customAlphabet } = require("nanoid");
dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`Server started, listening at port ${PORT}`)
);

mongoose
  .connect("mongodb://127.0.0.1:27017/shortit", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error(`Failed to connect to MongoDB: ${err}`));

app.use(express.json());

const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  6 // Change the length as needed
);

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

app.post("/api/v1/shorten", async (req, res) => {
  try {
    const { url, customName } = req.body;

    // Validate URL
    const validUrlPattern =
      /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\S*)$/;
    if (!url.match(validUrlPattern)) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Check if the URL already exists in the database
    const existingURL = await ShortenedURL.findOne({ originalUrl: url });

    if (existingURL) {
      return res.status(200).json({
        message: "Short URL already exists",
        data: {
          shortUrl: existingURL.shortUrl,
        },
      });
    }

    // Generate a short URL or use a custom name
    let shortUrl = customName || nanoid(); // Use nanoid here

    // If customName is provided and it already exists, return an error
    if (customName) {
      const customNameExists = await ShortenedURL.findOne({ customName });
      if (customNameExists) {
        return res.status(400).json({ error: "Custom name already exists" });
      }
    }

    // Replace spaces in custom name with dashes
    shortUrl = shortUrl.replace(/\s+/g, "-");

    // Create a new ShortenedURL document
    const newURL = new ShortenedURL({
      customName: customName || null,
      shortUrl,
      originalUrl: url,
    });

    // Save the new URL to the database
    await newURL.save();

    return res.status(201).json({
      message: "URL shortened successfully",
      data: {
        shortUrl: `https://shortit/${shortUrl}`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Helper function to generate a random short URL
function generateRandomShortUrl(length = 5) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let shortUrl = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    shortUrl += characters.charAt(randomIndex);
  }
  return shortUrl;
}

const ShortenedURL = mongoose.model("ShortenedURL", shortenedURLSchema);
/*
const testShortenedUrl = new ShortenedURL({
  customName: "lol am good",
  originalUrl: "https://www.chess.com/events/2023-fide-chess-world-cup/games",
  shortUrl: shortUrl,
});*/

// Get all URLs
app.get("/api/v1/urls", async (req, res) => {
  try {
    // Query the database to get all URLs
    const urls = await ShortenedURL.find(
      {},
      "-_id customName shortUrl originalUrl createdAt"
    );

    // If there are no URLs in the database, return an empty array
    if (!urls || urls.length === 0) {
      return res.status(200).json([]);
    }

    // Return the list of URLs
    return res.status(200).json(urls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ...

// ...

// Get a single URL by ID
app.get("/api/v1/urls/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Query the database to find the URL by ID
    const url = await ShortenedURL.findOne(
      { _id: id },
      "-_id customName shortUrl originalUrl createdAt"
    );

    // If the URL with the given ID is not found, return an error
    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    // Return the URL
    return res.status(200).json(url);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ...

// server.js

// ...

// Update a single URL by ID
app.put("/api/v1/urls/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { customName, originalUrl } = req.body;

    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Query the database to find the URL by ID
    const url = await ShortenedURL.findOne({ _id: id });

    // If the URL with the given ID is not found, return an error
    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    // Update the customName if provided
    if (customName) {
      // Check if the custom name is at least 5 characters long
      if (customName.length < 5) {
        return res
          .status(400)
          .json({ error: "Custom name must be at least 5 characters long" });
      }

      // Replace spaces in custom name with dashes
      const formattedCustomName = customName.replace(/\s+/g, "-");

      // Check if the custom name already exists
      const customNameExists = await ShortenedURL.findOne({
        customName: formattedCustomName,
      });
      if (customNameExists && customNameExists._id.toString() !== id) {
        return res.status(400).json({ error: "Custom name already exists" });
      }

      url.customName = formattedCustomName;
      url.shortUrl = `https://shortit/${formattedCustomName}`;
    }

    // Update the originalUrl if provided
    if (originalUrl) {
      // Validate the new URL
      const validUrlPattern =
        /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(\S*)$/;
      if (!originalUrl.match(validUrlPattern)) {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      url.originalUrl = originalUrl;
    }

    // Save the updated URL to the database
    await url.save();

    return res.status(200).json({
      message: "URL updated successfully",
      data: {
        id: url._id,
        customName: url.customName,
        shortUrl: url.shortUrl,
        originalUrl: url.originalUrl,
        createdAt: url.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ...

// server.js

// ...

// Delete a single URL by ID
app.delete("/api/v1/urls/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Query the database to find the URL by ID
    const url = await ShortenedURL.findOne({ _id: id });

    // If the URL with the given ID is not found, return an error
    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    // Remove the URL document from the database
    await url.remove();

    return res.status(200).json({
      message: "URL deleted successfully",
      data: {
        id: url._id,
        customName: url.customName,
        shortUrl: url.shortUrl,
        originalUrl: url.originalUrl,
        createdAt: url.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ...
