import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "../models/Admin.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // Super admin details
    const superAdminData = {
      name: "Super Admin",
      email: "superadmin@lnmiit.ac.in",
      password: "admin123", // Change this password!
      role: "super-admin",
    };

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ email: superAdminData.email });
    if (existingAdmin) {
      console.log("Super admin already exists with email:", superAdminData.email);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(superAdminData.password, 10);

    // Create super admin
    const superAdmin = new Admin({
      name: superAdminData.name,
      email: superAdminData.email,
      password: hashedPassword,
      role: "super-admin",
    });

    await superAdmin.save();

    console.log("Super Admin created successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
};

createSuperAdmin();



