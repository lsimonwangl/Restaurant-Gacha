const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

// Mock Auth Middleware for testing
jest.mock('../middleware/authMiddleware', () => ({
    protect: (req, res, next) => {
        req.user = { id: '00000000-0000-0000-0000-000000000001' }; // Mock user UUID
        next();
    }
}));

describe('Gacha Stats API', () => {
    afterAll(async () => {
        await db.end();
    });

    it('should return stats structure', async () => {
        const res = await request(app).get('/api/gacha/stats');
        console.log('Stats Response:', res.body);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('totalDraws');
        expect(res.body).toHaveProperty('mostFrequent');
    });
});
