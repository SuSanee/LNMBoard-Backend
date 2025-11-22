import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration object with validation
const config = {
  // Server Configuration
  port: process.env.PORT || 5000,
  
  // Database Configuration
  mongoUri: process.env.MONGO_URI,
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-this",
  
  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

// Validation function
const validateConfig = () => {
  const errors = [];
  
  if (!config.mongoUri) {
    errors.push("MONGO_URI is required");
  }
  
  if (!config.jwtSecret || config.jwtSecret === "your-secret-key-change-this") {
    console.warn("⚠️  WARNING: JWT_SECRET not set in .env or using default. This is insecure for production!");
  }
  
  if (!config.cloudinary.cloudName) {
    errors.push("CLOUDINARY_CLOUD_NAME is required");
  }
  
  if (!config.cloudinary.apiKey) {
    errors.push("CLOUDINARY_API_KEY is required");
  }
  
  if (!config.cloudinary.apiSecret) {
    errors.push("CLOUDINARY_API_SECRET is required");
  }
  
  if (errors.length > 0) {
    console.error("\n❌ Configuration Errors:");
    errors.forEach((error) => console.error(`   - ${error}`));
    console.error("\nPlease check your .env file.\n");
  } else {
    console.log("✅ Configuration loaded successfully");
    console.log(`   Port: ${config.port}`);
    console.log(`   MongoDB: ${config.mongoUri ? "✅ Connected" : "❌ Not set"}`);
    console.log(`   JWT Secret: ${config.jwtSecret.substring(0, 20)}...`);
    console.log(`   Cloudinary: ${config.cloudinary.cloudName ? "✅ Configured" : "❌ Not set"}`);
  }
  
  return errors.length === 0;
};

// Validate on module load
validateConfig();

// Export configuration
export default config;

// Named exports for convenience
export const { port, mongoUri, jwtSecret, cloudinary } = config;

