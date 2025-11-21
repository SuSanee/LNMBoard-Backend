import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  venue: {
    type: String,
    required: true,
    trim: true,
  },
  time: {
    type: String,
    required: true,
    trim: true,
  },
  eventType: {
    type: String,
    enum: ["past", "current", "upcoming"],
    required: true,
  },
  image: {
    type: String, // Store Cloudinary URL
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  comments: [
    {
      text: {
        type: String,
        required: true,
        trim: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Update timestamp on save
eventSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Add indexes for better query performance
eventSchema.index({ eventDate: 1 }); // For sorting by date
eventSchema.index({ createdBy: 1 }); // For filtering by creator
eventSchema.index({ eventType: 1 }); // For filtering by event type (past/current/upcoming)

const Event = mongoose.model("Event", eventSchema);

export default Event;
