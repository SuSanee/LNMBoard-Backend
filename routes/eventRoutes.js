import express from "express";
import jwt from "jsonwebtoken";
import Event from "../models/Event.js";
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

// Helper function to update event types based on current date
const updateEventTypes = async () => {
  try {
    const allEvents = await Event.find();
    
    for (const event of allEvents) {
      const correctType = determineEventType(event.eventDate);
      if (event.eventType !== correctType) {
        event.eventType = correctType;
        await event.save();
      }
    }
  } catch (error) {
    console.error("Error updating event types:", error);
  }
};

// Helper function to delete events older than 3 days from past
const deleteOldEvents = async () => {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    await Event.deleteMany({
      eventDate: { $lt: threeDaysAgo },
    });
  } catch (error) {
    console.error("Error deleting old events:", error);
  }
};

// Run cleanup and update on server start and periodically
const runDailyTasks = async () => {
  await updateEventTypes();
  await deleteOldEvents();
};

runDailyTasks(); // Run on startup
setInterval(runDailyTasks, 24 * 60 * 60 * 1000); // Run once per day

// 1. GET /api/events - Get all events (public)
router.get("/", async (req, res) => {
  try {
    // Update event types and delete old events before fetching
    await updateEventTypes();
    await deleteOldEvents();

    const events = await Event.find()
      .populate("createdBy", "name email")
      .sort({ eventDate: 1 });

    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. GET /api/events/my-events - Get logged-in admin's events
router.get("/my-events", verifyAdmin, async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.adminId })
      .sort({ eventDate: -1 });

    res.json(events);
  } catch (error) {
    console.error("Error fetching admin events:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Helper function to determine event type based on date
const determineEventType = (eventDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDateObj = new Date(eventDate);
  eventDateObj.setHours(0, 0, 0, 0);
  
  if (eventDateObj < today) {
    return "past";
  } else if (eventDateObj.getTime() === today.getTime()) {
    return "current";
  } else {
    return "upcoming";
  }
};

// 3. POST /api/events - Create new event
router.post("/", verifyAdmin, async (req, res) => {
  try {
    const { title, description, eventDate, venue, time, image } = req.body;

    // Validate input
    if (!title || !description || !eventDate || !venue || !time) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate that event date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(eventDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return res.status(400).json({ message: "Cannot create events for past dates" });
    }

    // Auto-determine event type based on date
    const eventType = determineEventType(eventDate);

    // Create new event
    const newEvent = new Event({
      title,
      description,
      eventDate: new Date(eventDate),
      venue,
      time,
      eventType,
      image: image || null, // Optional image field
      createdBy: req.adminId,
    });

    await newEvent.save();

    const populatedEvent = await Event.findById(newEvent._id)
      .populate("createdBy", "name email");

    res.status(201).json({
      message: "Event created successfully",
      event: populatedEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 4. PUT /api/events/:id - Update event
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, eventDate, venue, time, image } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if admin is the creator (or super-admin can edit any)
    if (req.adminRole !== "super-admin" && event.createdBy.toString() !== req.adminId) {
      return res.status(403).json({ message: "You can only edit your own events" });
    }

    // Validate that event date is not in the past (if updating date)
    if (eventDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(eventDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        return res.status(400).json({ message: "Cannot set event date to past dates" });
      }
    }

    // Update event
    event.title = title || event.title;
    event.description = description || event.description;
    
    if (eventDate) {
      event.eventDate = new Date(eventDate);
      // Auto-update event type based on new date
      event.eventType = determineEventType(eventDate);
    }

    // Update venue and time if provided
    if (venue !== undefined) {
      event.venue = venue;
    }
    if (time !== undefined) {
      event.time = time;
    }

    // Update image if provided (allow null to remove image)
    if (image !== undefined) {
      event.image = image;
    }

    await event.save();

    const updatedEvent = await Event.findById(id)
      .populate("createdBy", "name email");

    res.json({
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 5. DELETE /api/events/:id - Delete event
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if admin is the creator (or super-admin can delete any)
    if (req.adminRole !== "super-admin" && event.createdBy.toString() !== req.adminId) {
      return res.status(403).json({ message: "You can only delete your own events" });
    }

    await Event.findByIdAndDelete(id);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 6. POST /api/events/:id/comment - Add comment to event (public, no auth required)
router.post("/:id/comment", async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if within 3 days before or 3 days after event date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(event.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    const threeDaysBefore = new Date(eventDate);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

    const threeDaysAfter = new Date(eventDate);
    threeDaysAfter.setDate(threeDaysAfter.getDate() + 3);

    if (today < threeDaysBefore || today > threeDaysAfter) {
      return res.status(400).json({
        message: "Comments can only be added 3 days before or 3 days after the event",
      });
    }

    // Push comment atomically to avoid full document validation issues
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $push: { comments: { text: text.trim(), createdAt: new Date() } } },
      { new: true }
    );

    return res.json({ message: "Comment added successfully", event: updatedEvent });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid event id" });
    }
    console.error("Error adding comment:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;

