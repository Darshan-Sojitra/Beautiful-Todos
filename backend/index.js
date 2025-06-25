// Load environment variables
if (process.env.NODE_ENV === 'production') {
    require('dotenv').config({ path: '.env.production' });
    console.log('Loading production environment variables');
} else {
    require('dotenv').config();
    console.log('Loading development environment variables');
}

const express = require('express');
const { createTodo, updateTodo } = require('./types');
const { todo, User } = require('./db');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const session = require('express-session');
const { passport, isAuthenticated, verifyToken, JWT_SECRET } = require('./auth');
const jwt = require('jsonwebtoken');

app.use(cors({
    origin: process.env.FRONTEND_URL, // Your frontend URL
    credentials: true
}));

app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'todo-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login-failed' }),
    (req, res) => {
        try {
            console.log("OAuth callback triggered. User authenticated:", req.user?.id);

            // Create JWT token for the frontend
            const token = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: '7d' });

            // Log redirect URL (for debugging)
            const redirectUrl = `${process.env.FRONTEND_URL}/todos?token=${token}`;
            console.log("Redirecting to:", redirectUrl);

            // Redirect to frontend todos page with token
            res.redirect(redirectUrl);
        } catch (error) {
            console.error("Error in OAuth callback:", error);
            res.redirect(`${process.env.FRONTEND_URL}/?error=Authentication_Failed`);
        }
    }
);

app.get('/auth/user', verifyToken, async (req, res) => {
    try {
        // Find user by ID
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return user info without sensitive data
        const { _id, displayName, email, picture } = user;
        res.json({ user: { id: _id, displayName, email, picture } });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/auth/logout', (req, res) => {
    req.logout(function (err) {
        if (err) {
            return res.status(500).json({ message: 'Error during logout', error: err.message });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Debug route to test server is responding
app.get('/healthcheck', (req, res) => {
    res.json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'development',
        frontendUrl: process.env.FRONTEND_URL || 'Not set'
    });
});

// Debug route to check OAuth configuration
app.get('/auth/config', (req, res) => {
    res.json({
        clientID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'Not set',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
        frontendURL: process.env.FRONTEND_URL || 'http://localhost:5173'
    });
});

// Create a new todo (protected)
app.post('/todo', verifyToken, async (req, res) => {
    const payLoad = req.body;
    const parsedpayLoad = createTodo.safeParse(payLoad);
    if (!parsedpayLoad.success) {
        res.status(411).json({
            messge: "Invalid input"
        });
        return;
    }

    // Create the todo and capture the created document
    const newTodo = await todo.create({
        title: payLoad.title,
        description: payLoad.description,
        completed: false,
        userId: req.userId // Associate with the logged-in user
    });

    console.log("Todo Created");

    // Return the created todo with its ID
    res.json({
        message: "Todo created",
        _id: newTodo._id,
        todo: newTodo
    });
})

// Get all todos for the current user (protected)
app.get('/todos', verifyToken, async (req, res) => {
    const todos = await todo.find({ userId: req.userId });
    res.json({ todos });
})

// Update a todo's completed status (protected)
app.patch('/todos/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;

        if (completed === undefined) {
            return res.status(400).json({
                message: "Completed status is required"
            });
        }

        // Find the todo and check if it belongs to the current user
        const todoItem = await todo.findById(id);
        if (!todoItem) {
            return res.status(404).json({ message: "Todo not found" });
        }

        // Verify ownership
        if (todoItem.userId.toString() !== req.userId) {
            return res.status(403).json({ message: "Not authorized to update this todo" });
        }

        const updatedTodo = await todo.findByIdAndUpdate(
            id,
            { completed },
            { new: true } // Return the updated document
        );

        res.json(updatedTodo);
    } catch (error) {
        console.error("Error updating todo:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
});

// Update a todo with PUT (protected, legacy endpoint)
app.put('/completed', verifyToken, async (req, res) => {
    const payLoad = req.body;
    const parsedpayLoad = updateTodo.safeParse(payLoad);
    if (!parsedpayLoad.success) {
        res.status(411).json({
            messge: "Invalid input"
        });
        return;
    }

    try {
        // Find the todo and check if it belongs to the current user
        const todoItem = await todo.findById(req.body.id);
        if (!todoItem) {
            return res.status(404).json({ message: "Todo not found" });
        }

        // Verify ownership
        if (todoItem.userId.toString() !== req.userId) {
            return res.status(403).json({ message: "Not authorized to update this todo" });
        }

        await todo.updateOne({
            _id: req.body.id
        }, {
            completed: true
        });

        res.json({
            msg: "Mark as completed"
        });
    } catch (error) {
        console.error("Error updating todo:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
})

// Add a new endpoint for deleting todos (protected)
app.delete('/todos/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Find the todo and check if it belongs to the current user
        const todoItem = await todo.findById(id);
        if (!todoItem) {
            return res.status(404).json({ message: "Todo not found" });
        }

        // Verify ownership
        if (todoItem.userId.toString() !== req.userId) {
            return res.status(403).json({ message: "Not authorized to delete this todo" });
        }

        const deletedTodo = await todo.findByIdAndDelete(id);

        res.json({
            message: "Todo deleted successfully",
            id
        });
    } catch (error) {
        console.error("Error deleting todo:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
})

app.listen(port, () => {
    console.log(`lostining to port ${port}`);
})