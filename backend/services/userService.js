const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { uploadToS3 } = require('../middleware/uploadMiddleware');
const UserStatsService = require('./userStatsService');

class UserService {
    static _generateToken(id) {
        return jwt.sign({ id }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });
    }

    static async registerUser(userData) {
        const { name, email, password } = userData;
        const userExists = await User.findByEmail(email);

        if (userExists) {
            throw { statusCode: 400, message: 'User already exists' };
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userId = await User.create({
            name,
            email,
            password: hashedPassword,
            avatar_url: ''
        });

        if (!userId) {
            throw { statusCode: 400, message: 'Invalid user data' };
        }

        return {
            _id: userId,
            name,
            email,
            avatar_url: '',
            token: this._generateToken(userId)
        };
    }

    static async loginUser(email, password) {
        const user = await User.findByEmail(email);

        if (user && (await bcrypt.compare(password, user.password))) {
            // Track stats (login days, streak)
            // Fire and forget (don't block login if stats fail, or maybe block? user might want robust streak. let's await.)
            try {
                await UserStatsService.updateActivity(user.id);
            } catch (err) {
                console.error('Failed to update user stats on login:', err);
            }

            return {
                _id: user.id,
                name: user.name,
                email: user.email,
                avatar_url: user.avatar_url,
                token: this._generateToken(user.id)
            };
        } else {
            throw { statusCode: 401, message: 'Invalid email or password' };
        }
    }

    static async getProfile(userId) {
        // We use findById from model (which selects safe fields)
        const user = await User.findById(userId);
        if (!user) throw { statusCode: 404, message: 'User not found' };
        return user;
    }

    static async updateProfile(userId, { name, dicebear_url }, file) {
        const currentUser = await User.findById(userId);
        if (!currentUser) throw { statusCode: 404, message: 'User not found' };

        let avatar_url = currentUser.avatar_url;

        if (file) {
            avatar_url = await uploadToS3(file, 'avatars');
        } else if (dicebear_url) {
            avatar_url = dicebear_url;
        }

        await User.update(userId, { name: name || currentUser.name, avatar_url });

        const updatedUser = await User.findById(userId);

        return {
            _id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar_url: updatedUser.avatar_url,
            token: this._generateToken(userId)
        };
    }

    static async changePassword(userId, oldPassword, newPassword) {
        // Need password for check
        const user = await User.findByIdWithPassword(userId);
        if (!user) throw { statusCode: 404, message: 'User not found' };

        if (!(await bcrypt.compare(oldPassword, user.password))) {
            throw { statusCode: 401, message: 'Invalid old password' };
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.update(userId, { password: hashedPassword });
    }

    static async deleteAccount(userId, password) {
        const user = await User.findByIdWithPassword(userId);
        if (!user) throw { statusCode: 404, message: 'User not found' };

        if (!(await bcrypt.compare(password, user.password))) {
            throw { statusCode: 401, message: 'Invalid password' };
        }

        await User.delete(userId);
    }
}

module.exports = UserService;
