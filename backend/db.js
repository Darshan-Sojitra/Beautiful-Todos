const mongoose = require('mongoose');

// Connect to MongoDB using connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// User schema with Google OAuth info
const userSchema = mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    picture: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Updated todo schema with user reference
const todoSchema = mongoose.Schema({
    title: String,
    description: String,
    completed: Boolean,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);
const todo = mongoose.model('todo', todoSchema);

module.exports = {
    User,
    todo
}