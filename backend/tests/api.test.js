const request = require('supertest');
const app = require('../server');

describe('API Smoke Tests', () => {
    // 1. Basic Health Check
    it('GET / should return 200 and welcome message', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        // The exact message in server.js is 'Restaurant Gacha API is running...'
        expect(res.text).toContain('Restaurant Gacha API is running');
    });

    // 2. Security Check (Unauthenticated Access)
    it('GET /api/groups should be protected (return 401/403) without token', async () => {
        const res = await request(app).get('/api/groups');
        // We accept 401 (Unauthorized) or 403 (Forbidden)
        expect([401, 403]).toContain(res.statusCode);
    });
});
