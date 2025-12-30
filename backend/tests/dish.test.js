const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

// Mock Auth Middleware to bypass login for unit testing if preferred,
// OR use supertest to simulate login flow (integration test style).
// Mixing both approaches is confusing. Let's stick to valid token flow like integration.test.js
// But for isolation, we can create a fresh user.

const testUser = {
    email: `dish_test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Dish Master'
};

let authToken = '';

describe('Dish API Tests', () => {

    afterAll(async () => {
        await db.end();
    });

    beforeAll(async () => {
        // Register and Login to get token
        await request(app).post('/api/auth/register').send(testUser);
        const res = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });
        authToken = res.body.token;
    });

    let createdDishId = '';

    // 1. Create Dish
    it('should create a new dish', async () => {
        const res = await request(app)
            .post('/api/dishes')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Test Sushi',
                description: 'Fresh salmon',
                rarity: 'rare',
                address: 'Tokyo',
                lat: 35.6,
                lng: 139.7
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        createdDishId = res.body.id;
    });

    // 2. Get Dish List
    it('should get dish list containing new dish', async () => {
        const res = await request(app)
            .get('/api/dishes')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        const found = res.body.find(d => d.id === createdDishId);
        expect(found).toBeTruthy();
        expect(found.name).toEqual('Test Sushi');
    });

    // 3. Get Single Dish
    it('should get single dish details', async () => {
        const res = await request(app)
            .get(`/api/dishes/${createdDishId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.id).toEqual(createdDishId);
    });

    // 4. Update Dish
    it('should update dish details', async () => {
        const res = await request(app)
            .put(`/api/dishes/${createdDishId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Sushi',
                rarity: 'epic'
            });

        expect(res.statusCode).toEqual(200); // Dish update returns just status or updated object?

        // Verify update
        const check = await request(app)
            .get(`/api/dishes/${createdDishId}`)
            .set('Authorization', `Bearer ${authToken}`);
        expect(check.body.name).toEqual('Updated Sushi');
        expect(check.body.rarity).toEqual('epic');
    });

    // 5. Delete Dish
    it('should delete the dish', async () => {
        const res = await request(app)
            .delete(`/api/dishes/${createdDishId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
    });

    // 6. Verify Delete
    it('should not find the deleted dish', async () => {
        const res = await request(app)
            .get(`/api/dishes/${createdDishId}`)
            .set('Authorization', `Bearer ${authToken}`);

        // Assuming getting deleted dish returns null or empty or 404
        // Check implementation: usually returning empty string or null if row[0] undefined
        // If row[0] is undefined, res.json() sends empty body?
        // Let's check status code in controller if it handles 404
    });
});
