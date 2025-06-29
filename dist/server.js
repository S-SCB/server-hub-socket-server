"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create HTTP server with a basic response so Render can detect an open port
const httpServer = (0, http_1.createServer)((req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "https://server-hub-optimised.vercel.app");
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
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "https://server-hub-optimised.vercel.app",
        methods: ["GET", "POST"],
        credentials: true, // Ensure credentials are allowed
    },
});
io.on("connection", (socket) => {
    console.log("A user connected");
    // Extract handshake query parameters properly
    const userId = socket.handshake.query.userId || null;
    const serverId = socket.handshake.query.serverId || null;
    if (userId) {
        socket.join(`user:${userId}`);
    }
    if (serverId) {
        socket.join(`server:${serverId}`);
    }
    socket.on("directMessage", (message) => {
        if (message.receiverId) {
            io.to(`user:${message.receiverId}`).emit("directMessage", message);
        }
    });
    socket.on("join-channel", (channelId) => {
        if (channelId) {
            socket.join(`channel:${channelId}`);
            console.log(`User ${userId} joined channel ${channelId}`);
        }
    });
    socket.on("leave-channel", (channelId) => {
        if (channelId) {
            socket.leave(`channel:${channelId}`);
            console.log(`User ${userId} left channel ${channelId}`);
        }
    });
    socket.on("typing-start", (data) => {
        if (data.channelId && data.user.id) {
            socket.to(`channel:${data.channelId}`).emit("user-typing", {
                userId: data.user.id,
                username: data.user.name,
            });
        }
    });
    socket.on("typing-stop", (data) => {
        if (data.channelId && data.userId) {
            socket.to(`channel:${data.channelId}`).emit("user-stopped-typing", {
                userId: data.userId,
            });
        }
    });
    socket.on("send-message", (data) => {
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
