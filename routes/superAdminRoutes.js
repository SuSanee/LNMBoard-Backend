import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const router = express.Router();

// JWT Secret (should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Middleware to verify super admin
const verifySuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin || admin.role !== "super-admin") {
      return res.status(403).json({ message: "Access denied. Super admin only." });
    }

    req.adminId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// 1. POST /api/super-admin/login - Admin & Super Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find admin (both super-admin and admin roles)
    const admin = await Admin.findOne({ 
      email, 
      role: { $in: ["super-admin", "admin"] } 
    });
    
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. GET /api/super-admin/admin-requests - Get pending admin requests
router.get("/admin-requests", verifySuperAdmin, async (req, res) => {
  try {
    const pendingAdmins = await Admin.find({ role: "pending" }).select("-password");
    res.json(pendingAdmins);
  } catch (error) {
    console.error("Error fetching admin requests:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 3. POST /api/super-admin/approve/:id - Approve an admin
router.post("/approve/:id", verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role !== "pending") {
      return res.status(400).json({ message: "Admin is already approved or is a super admin" });
    }

    admin.role = "admin";
    await admin.save();

    res.json({ message: "Admin approved successfully", admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (error) {
    console.error("Error approving admin:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 4. GET /api/super-admin/admins - Get all approved admins
router.get("/admins", verifySuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find({ role: "admin" }).select("-password");
    res.json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 5. DELETE /api/super-admin/admin/:id - Delete an admin
router.delete("/admin/:id", verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role === "super-admin") {
      return res.status(400).json({ message: "Cannot delete a super admin" });
    }

    await Admin.findByIdAndDelete(id);
    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 6. POST /api/super-admin/create-admin - Create a new admin
router.post("/create-admin", verifySuperAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: "admin", // Directly create as admin
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 7. POST /api/super-admin/reject/:id - Reject a pending admin request
router.post("/reject/:id", verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be rejected" });
    }

    await Admin.findByIdAndDelete(id);
    res.json({ message: "Admin request rejected successfully" });
  } catch (error) {
    console.error("Error rejecting admin:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 8. POST /api/super-admin/register - Admin registration (public route)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin with pending status
    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      role: "pending", // Default role is pending
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Registration request submitted successfully. Please wait for super admin approval.",
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;


