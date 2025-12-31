const { body, validationResult } = require('express-validator');

// Helper to check validation results
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation Error',
            errors: errors.array()
        });
    }
    next();
};

const dishValidationRules = [
    // Name is required
    body('name')
        .notEmpty().withMessage('Name is required')
        .trim()
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

    // Rarity must be one of the allowed values
    body('rarity')
        .isIn(['common', 'rare', 'epic', 'legend']).withMessage('Rarity must be common, rare, epic, or legend'),

    // Description is optional but must be string if present
    body('description')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
];

const groupValidationRules = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .trim()
        .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),

    body('is_public')
        .optional()
        .isBoolean().withMessage('is_public must be a boolean')
];

module.exports = {
    validateRequest,
    dishValidationRules,
    groupValidationRules
};
