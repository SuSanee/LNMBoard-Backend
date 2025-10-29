// Quick test script to verify login works
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

const testLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected\n");

    const testEmail = "superadmin@lnmiit.ac.in";
    const testPassword = "admin123";
    
    const admin = await Admin.findOne({ email: testEmail, role: "super-admin" });
    
    if (!admin) {
      console.log("Super admin NOT FOUND in database!");
      process.exit(1);
    }

    const isPasswordValid = await bcrypt.compare(testPassword, admin.password);
    
    if (isPasswordValid) {
      console.log("Password is CORRECT!");
    } else {
      console.log("Password is INCORRECT!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

testLogin();



