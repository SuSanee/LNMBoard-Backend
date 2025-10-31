import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import testRoutes from "./routes/testRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";


dotenv.config();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/api/test", testRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/account", accountRoutes);

// 🔹 MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("DB Error:", err));

// 🔹 Routes Placeholder
app.get("/", (req, res) => res.send("LNM Board API Running..."));

// 🔹 Socket.IO Connection
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);
  socket.on("disconnect", () => console.log("🔴 User Disconnected:", socket.id));
});

// 🔹 Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


