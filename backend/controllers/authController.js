const UserService = require('../services/userService');

const handleServiceError = (res, error) => {
    console.error('Auth Service Error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: error.message || 'Server Error' });
};

const registerUser = async (req, res) => {
    try {
        const result = await UserService.registerUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const loginUser = async (req, res) => {
    try {
        const result = await UserService.loginUser(req.body.email, req.body.password);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const getMe = async (req, res) => {
    try {
        // Actually fetch fresh profile instead of relying purely on token payload
        const user = await UserService.getProfile(req.user.id);
        res.json(user);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const updateProfile = async (req, res) => {
    try {
        const result = await UserService.updateProfile(req.user.id, req.body, req.file);
        res.json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

const changePassword = async (req, res) => {
    try {
        await UserService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

const deleteAccount = async (req, res) => {
    try {
        await UserService.deleteAccount(req.user.id, req.body.password);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

module.exports = { registerUser, loginUser, getMe, updateProfile, changePassword, deleteAccount };
