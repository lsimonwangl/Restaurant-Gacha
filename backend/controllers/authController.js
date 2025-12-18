const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Import DB for direct updates/deletes if Model doesn't support
const { uploadToS3 } = require('../middleware/uploadMiddleware');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findByEmail(email);

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userId = await User.create({
            name,
            email,
            password: hashedPassword,
            avatar_url: '' // Default empty or placeholder
        });

        if (userId) {
            res.status(201).json({
                _id: userId,
                name,
                email,
                avatar_url: '',
                token: generateToken(userId),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Register Error:', error); // Debugging
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findByEmail(email);

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMe = async (req, res) => {
    const user = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        avatar_url: req.user.avatar_url,
    };
    res.status(200).json(user);
};

const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { name, dicebear_url } = req.body;
    let avatar_url = req.user.avatar_url;

    try {
        if (req.file) {
            // Upload to S3 'avatars' folder
            avatar_url = await uploadToS3(req.file, 'avatars');
        } else if (dicebear_url) {
            avatar_url = dicebear_url;
        }

        // Direct database update for simplicity, or add update method to User model
        await db.execute(
            'UPDATE users SET name = ?, avatar_url = ? WHERE id = ?',
            [name || req.user.name, avatar_url, userId]
        );

        // Fetch updated user to return
        const [updatedUser] = await db.execute('SELECT id, name, email, avatar_url FROM users WHERE id = ?', [userId]);

        res.json({
            _id: updatedUser[0].id,
            name: updatedUser[0].name,
            email: updatedUser[0].email,
            avatar_url: updatedUser[0].avatar_url,
            token: generateToken(userId), // Optional: issue new token if claims change
        });

    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
};

const changePassword = async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    try {
        // Get user with password
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const user = users[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check old password
        if (!(await bcrypt.compare(oldPassword, user.password))) {
            return res.status(401).json({ message: 'Invalid old password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Failed to change password' });
    }
};

const deleteAccount = async (req, res) => {
    const userId = req.user.id;
    const { password } = req.body;

    try {
        // Get user with password
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const user = users[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check password confirmation
        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Delete user (cascade will handle related data)
        await db.execute('DELETE FROM users WHERE id = ?', [userId]);

        res.json({ message: 'Account deleted successfully' });

    } catch (error) {
        console.error('Delete Account Error:', error);
        res.status(500).json({ message: 'Failed to delete account' });
    }
};

module.exports = { registerUser, loginUser, getMe, updateProfile, changePassword, deleteAccount };
