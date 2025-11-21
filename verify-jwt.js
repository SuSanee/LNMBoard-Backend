import dotenv from "dotenv";

dotenv.config();

console.log("\n=== JWT SECRET VERIFICATION ===\n");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.log("❌ JWT_SECRET is NOT defined in .env");
  console.log("   Please add JWT_SECRET to your .env file");
} else {
  console.log("✅ JWT_SECRET is defined");
  console.log("   Length:", JWT_SECRET.length, "characters");
  console.log("   First 20 chars:", JWT_SECRET.substring(0, 20) + "...");
  console.log(
    "   Last 20 chars:",
    "..." + JWT_SECRET.substring(JWT_SECRET.length - 20)
  );
}

console.log("\n=== OTHER ENV VARIABLES ===\n");
console.log("PORT:", process.env.PORT || "Not set");
console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Set" : "❌ Not set");
console.log(
  "CLOUDINARY_CLOUD_NAME:",
  process.env.CLOUDINARY_CLOUD_NAME || "❌ Not set"
);
console.log(
  "CLOUDINARY_API_KEY:",
  process.env.CLOUDINARY_API_KEY || "❌ Not set"
);
console.log(
  "CLOUDINARY_API_SECRET:",
  process.env.CLOUDINARY_API_SECRET ? "✅ Set" : "❌ Not set"
);

console.log("\n");
