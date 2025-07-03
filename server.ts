import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

interface DirectMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
}

// Create HTTP server with a basic response so Render can detect an open port
const httpServer = createServer((req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://server-hub-optimised-ten.vercel.app");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Send response for other requests
  res.writeHead(200);
  res.end("Socket.io server is up and running!");
});

const io = new Server(httpServer, {
  cors: {
    origin: "https://server-hub-optimised-ten.vercel.app",
    methods: ["GET", "POST"],
    credentials: true, // Ensure credentials are allowed
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  // Extract handshake query parameters properly
  const userId = socket.handshake.query.userId as string || null;
  const serverId = socket.handshake.query.serverId as string || null;

  if (userId) {
    socket.join(`user:${userId}`);
  }

  if (serverId) {
    socket.join(`server:${serverId}`);
  }

  socket.on("directMessage", (message: DirectMessage) => {
    if (message.receiverId) {
      io.to(`user:${message.receiverId}`).emit("directMessage", message);
    }
  });

  socket.on("join-channel", (channelId: string) => {
    if (channelId) {
      socket.join(`channel:${channelId}`);
      console.log(`User ${userId} joined channel ${channelId}`);
    }
  });

  socket.on("leave-channel", (channelId: string) => {
    if (channelId) {
      socket.leave(`channel:${channelId}`);
      console.log(`User ${userId} left channel ${channelId}`);
    }
  });

  socket.on("typing-start", (data: { channelId: string; user: { id: string; name: string } }) => {
    if (data.channelId && data.user.id) {
      socket.to(`channel:${data.channelId}`).emit("user-typing", {
        userId: data.user.id,
        username: data.user.name,
      });
    }
  });

  socket.on("typing-stop", (data: { channelId: string; userId: string }) => {
    if (data.channelId && data.userId) {
      socket.to(`channel:${data.channelId}`).emit("user-stopped-typing", {
        userId: data.userId,
      });
    }
  });

  socket.on("send-message", (data: { 
    channelId: string; 
    content: string;
    user: { id: string; name: string; image: string | null };
    messageId: string;
  }) => {
    if (data.channelId && data.messageId && data.user.id) {
      const message = {
        id: data.messageId,
        content: data.content,
        channelId: data.channelId,
        userId: data.user.id,
        user: data.user,
        createdAt: new Date().toISOString(),
      };
    
      io.to(`channel:${data.channelId}`).emit("new-message", message);
      console.log(`Broadcasting message to channel ${data.channelId}`);
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      console.log(`User ${userId} disconnected`);
    }
  });
});

// Use PORT from environment, required by Render
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});