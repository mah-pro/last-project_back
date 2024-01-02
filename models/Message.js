const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
chatroom: {
type: mongoose.Schema.Types.ObjectId,
required: "Chatroom is required!",
ref: "Chatroom",
},
user: {
type: mongoose.Schema.Types.ObjectId,
required: "Chatroom is required!",
ref: "User",
},
message: {
type: String,
required: "Message is required!",
},
createdAt: {
    type: Date,
    default: Date.now,
},
status: {
    type: String,
    default: "offline",
},
});

module.exports = mongoose.model("Message", messageSchema);