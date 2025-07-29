import { app } from "./app.js";
import { Server } from "socket.io";
import http from "http";

import dotenv from "dotenv"

import connectDB from "./db/index.js";

dotenv.config({
    path:'.env'
})
const port = process.env.PORT || 2000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

export const userSocketMap = new Map();

export const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: frontendUrl,
    }
})

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
  
    socket.on('register', (userId) => {
      userSocketMap.set(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });
  
    socket.on('disconnect', () => {
      for (let [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

connectDB().then(()=>{
    server.listen(port,()=>{
    console.log(`server is running on port ${port}`);
    
})
}).catch((err)=>{
    console.log(`error in listening`,err);
    
})
