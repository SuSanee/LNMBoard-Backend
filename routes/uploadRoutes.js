import express from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import cloudinary from "../utils/cloudinary.js";
import upload from "../utils/multer.js";

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    console.log("=== UPLOAD AUTH DEBUG ===");
    console.log(
      "Authorization header:",
      req.headers.authorization?.substring(0, 50) + "..."
    );

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log("❌ No token provided");
      return res.status(401).json({ message: "No token provided" });
    }

    console.log(
      "Token received (first 20 chars):",
      token.substring(0, 20) + "..."
    );
    console.log("JWT_SECRET being used:", JWT_SECRET.substring(0, 20) + "...");

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Token decoded successfully, user ID:", decoded.id);

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      console.log("❌ Admin not found for ID:", decoded.id);
      return res.status(401).json({ message: "Admin not found" });
    }

    console.log("✅ Admin found:", admin.email, "Role:", admin.role);

    if (admin.role !== "super-admin" && admin.role !== "admin") {
      console.log("❌ Access denied, role:", admin.role);
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    console.log("✅ Auth successful, proceeding to upload");
    req.adminId = decoded.id;
    req.adminRole = admin.role;
    next();
  } catch (error) {
    console.error("❌ Upload auth error:", error.name, "-", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    return res.status(401).json({ message: "Authentication failed" });
  }
};

// Upload image to Cloudinary
// Note: verifyAdmin must come BEFORE upload.single() to check auth first
router.post("/image", verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    console.log("Upload endpoint reached, admin:", req.adminId);

    if (!req.file) {
      console.log("No file in request");
      return res.status(400).json({ message: "No image file provided" });
    }

    console.log(
      "File received:",
      req.file.originalname,
      req.file.size,
      "bytes"
    );

    // Upload to Cloudinary using buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "lnm-events",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("Cloudinary upload success:", result.public_id);
            resolve(result);
          }
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({
      message: "Image uploaded successfully",
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: "Failed to upload image" });
  }
});

// Delete image from Cloudinary
router.delete("/image", verifyAdmin, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    await cloudinary.uploader.destroy(publicId);

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
});

export default router;
