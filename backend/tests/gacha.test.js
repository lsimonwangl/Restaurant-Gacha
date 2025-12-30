const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

const testUser = {
    email: `gacha_test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Gacha Master'
};

let authToken = '';
let groupId = '';
let dishId = '';

describe('Gacha API Tests', () => {

    afterAll(async () => {
        await db.end();
    });

    beforeAll(async () => {
        // 1. Auth
        await request(app).post('/api/auth/register').send(testUser);
        const loginRes = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });
        authToken = loginRes.body.token;

        // 2. Create Group
        const groupRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: 'Gacha Group', slug: `gacha-${Date.now()}` });
        groupId = groupRes.body.id;

        // 3. Create Dish
        const dishRes = await request(app)
            .post('/api/dishes')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: 'Gacha Dish', rarity: 'rare' });
        dishId = dishRes.body.id;

        // 4. Add Dish to Group
        await request(app)
            .post('/api/groups/add-dish')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupId: groupId, dishId: dishId });
    });

    // 1. Draw Gacha (With Group 1)
    it('should draw a dish from group', async () => {
        const res = await request(app)
            .post('/api/gacha/draw')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupId: groupId });

        expect(res.statusCode).toEqual(200);
        expect(res.body.dish).toHaveProperty('id');
        expect(res.body.dish).toHaveProperty('name');
    });

    // 2. Draw Gacha (With Group) - Note: depends on logic if group has dishes
    it('should draw a dish from specific group', async () => {
        const res = await request(app)
            .post('/api/gacha/draw')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupId: groupId });

        expect(res.statusCode).toEqual(200);
        expect(res.body.dish.name).toEqual('Gacha Dish'); // Only one dish in group
    });

    // 3. Get Draw History
    it('should get draw history', async () => {
        const res = await request(app)
            .get('/api/gacha/history')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBeGreaterThanOrEqual(2); // At least 2 draws
    });

    // 4. Get Stats
    it('should get user stats', async () => {
        const res = await request(app)
            .get('/api/gacha/stats')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.totalDraws).toBeGreaterThanOrEqual(2);
    });
});
