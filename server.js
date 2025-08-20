import { app } from "./app.js";
import { Server } from "socket.io";
import http from "http";

import dotenv from "dotenv";

import connectDB from "./db/index.js";

dotenv.config({
  path: ".env",
});
const port = process.env.PORT || 4000;
const corsOrigin = process.env.CORS_ORIGIN?.split(",");

export const userSocketMap = new Map();

export const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: corsOrigin,
  },
});

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    userSocketMap.set(userId, socket.id);
  });

  socket.on("disconnect", () => {
    for (let [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  });
});

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(`error in listening`, err);
  });
