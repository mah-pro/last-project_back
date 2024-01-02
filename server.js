require("dotenv").config();

const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE, {
useUnifiedTopology: true,
useNewUrlParser: true,
});

mongoose.connection.on("error", (err) => {
console.log("Mongoose Connection ERROR: " + err.message);
});

mongoose.connection.once("open", () => {
console.log("MongoDB Connected!");
});

// Bring in the models
require("./models/User");
require("./models/Chatroom");
require("./models/Message");

const app = require("./app");

const server = app.listen(8000, () => {
console.log("Server listening on port 8000");
});

const io = require("socket.io")(server, {
allowEIO3: true,
cors: {
origin: true,
methods: ["GET", "POST"],
credentials: true,
},
});

const jwt = require("jwt-then");

const Message = mongoose.model("Message");
const User = mongoose.model("User");

io.use(async (socket, next) => {
try {
const token = socket.handshake.query.token;
const payload = await jwt.verify(token, process.env.SECRET);
socket.userId = payload.id;
next();
} catch (err) {
console.error("Socket authentication error:", err.message);
next(new Error("Authentication error"));
}
});

io.on("connection", (socket) => {
console.log("Connected: " + socket.userId);

socket.on("disconnect", async () => {
console.log("Disconnected: " + socket.userId);
try {
    await User.findByIdAndUpdate(socket.userId, { status: "offline" });
    io.emit("userStatusChanged", { userId: socket.userId, status: "offline" });
} catch (error) {
    console.error("Error updating user status on disconnect:", error);
}
});

socket.on("setOnlineStatus", async (status) => {
try {
    await User.findByIdAndUpdate(socket.userId, { status });
    io.emit("userStatusChanged", { userId: socket.userId, status });
} catch (error) {
    console.error("Error setting online status:", error);
}
});

socket.on("getPreviousMessages", async ({ chatroomId }) => {
try {
    const previousMessages = await Message.find({ chatroom: chatroomId })
    .sort({ createdAt: 1 })
    .limit(100);

    socket.emit("previousMessages", previousMessages);
} catch (error) {
    console.error("Error getting previous messages:", error);
}
});

socket.on("joinRoom", async ({ chatroomId }) => {
try {
    socket.join(chatroomId);
    console.log("A user joined chatroom: " + chatroomId);

    
    await User.findByIdAndUpdate(socket.userId, { chatroomId, status: "online" });

    // Récupérez la liste des utilisateurs dans le chatroom
    const usersInRoom = await User.find({ chatroomId });

    // Émettez la liste des utilisateurs à tous les clients dans le chatroom
    io.to(chatroomId).emit("usersInRoom", usersInRoom.map((user) => user.name));
} catch (error) {
    console.error("Error handling joinRoom event:", error);
}
});

socket.on("leaveRoom", async ({ chatroomId }) => {
try {
    socket.leave(chatroomId);
    console.log("A user left chatroom: " + chatroomId);

    // Mettez à jour le champ chatroomId dans le modèle User
    await User.findByIdAndUpdate(socket.userId, { chatroomId: null, status: "offline" });

    // Attendez la mise à jour avant de récupérer la liste mise à jour des utilisateurs dans le chatroom
    await new Promise(resolve => setTimeout(resolve, 100)); // Add a delay to ensure the database is updated

    const usersInRoom = await User.find({ chatroomId });

    // Émettez la liste mise à jour des utilisateurs à tous les clients dans le chatroom
    io.to(chatroomId).emit("usersInRoom", usersInRoom.map((user) => user.name));
} catch (error) {
    console.error("Error handling leaveRoom event:", error);
}
});


socket.on("chatroomMessage", async ({ chatroomId, message }) => {
if (message.trim().length > 0) {
    try {
    const user = await User.findOne({ _id: socket.userId });
    const newMessage = new Message({
        chatroom: chatroomId,
        user: socket.userId,
        message,
    });

    await newMessage.save();

    // Emit the new message to all clients in the chatroom
    io.to(chatroomId).emit("newMessage", {
        message,
        name: user.name,
        userId: socket.userId,
    });
    } catch (error) {
    console.error("Error saving message:", error);
    }
}
});
});
