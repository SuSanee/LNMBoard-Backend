import express from "express";
import jwt from "jsonwebtoken";
import Notice from "../models/Notice.js";
import Admin from "../models/Admin.js";

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Middleware to verify admin (both super-admin and admin)
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin || (admin.role !== "super-admin" && admin.role !== "admin")) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    req.adminId = decoded.id;
    req.adminRole = admin.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// 1. GET /api/notices - Get all notices (public)
router.get("/", async (req, res) => {
  try {
    const notices = await Notice.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 }); // Newest first

    res.json(notices);
  } catch (error) {
    console.error("Error fetching notices:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. GET /api/notices/my-notices - Get logged-in admin's notices
router.get("/my-notices", verifyAdmin, async (req, res) => {
  try {
    const notices = await Notice.find({ createdBy: req.adminId }).sort({
      createdAt: -1,
    });

    res.json(notices);
  } catch (error) {
    console.error("Error fetching admin notices:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 3. POST /api/notices - Create new notice
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { title, description, image } = req.body;

    // Validate input
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    // Create new notice
    const newNotice = new Notice({
      title,
      description,
      image: image || null,
      createdBy: req.adminId,
    });

    await newNotice.save();

    const populatedNotice = await Notice.findById(newNotice._id).populate(
      "createdBy",
      "name email"
    );

    res.status(201).json({
      message: "Notice created successfully",
      notice: populatedNotice,
    });
  } catch (error) {
    console.error("Error creating notice:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 4. PUT /api/notices/:id - Update notice
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image } = req.body;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    // Check if admin is the creator (or super-admin can edit any)
    if (
      req.adminRole !== "super-admin" &&
      notice.createdBy.toString() !== req.adminId
    ) {
      return res
        .status(403)
        .json({ message: "You can only edit your own notices" });
    }

    // Update notice
    notice.title = title || notice.title;
    notice.description = description || notice.description;

    // Update image if provided (allow null to remove image)
    if (image !== undefined) {
      notice.image = image;
    }

    await notice.save();

    const updatedNotice = await Notice.findById(id).populate(
      "createdBy",
      "name email"
    );

    res.json({
      message: "Notice updated successfully",
      notice: updatedNotice,
    });
  } catch (error) {
    console.error("Error updating notice:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 5. DELETE /api/notices/:id - Delete notice
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    // Check if admin is the creator (or super-admin can delete any)
    if (
      req.adminRole !== "super-admin" &&
      notice.createdBy.toString() !== req.adminId
    ) {
      return res
        .status(403)
        .json({ message: "You can only delete your own notices" });
    }

    await Notice.findByIdAndDelete(id);

    res.json({ message: "Notice deleted successfully" });
  } catch (error) {
    console.error("Error deleting notice:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
