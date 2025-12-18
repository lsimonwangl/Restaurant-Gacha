const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

// 使用一個隨機的 Email 避免重複註冊導致測試失敗
const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test Agent'
};

let authToken = '';
let createdGroupId = '';

describe('Full Integration Test (Auth + Groups)', () => {

    // 🧹 TearDown: 測試跑完後關閉 DB 連線，否則 Jest 會卡住
    afterAll(async () => {
        // Option: 可以在這裡清理測試資料 (DELETE FROM users WHERE email = ...)
        // 目前先簡單關閉連線
        await db.end();
    });

    // 1. 測試註冊
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('_id');
    });

    // 2. 測試登入並取得 Token
    it('should login and return a JWT token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        authToken = res.body.token; // Save token for next steps
    });

    // 3. 測試建立群組 (需要 Token)
    it('should create a group with valid token', async () => {
        const res = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`) // 帶上 Token
            .send({
                name: 'Integration Test Group',
                slug: `test-group-${Date.now()}`,
                description: 'Created by Jest',
                is_public: false
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        createdGroupId = res.body.id; // Save ID
    });

    // 4. 測試讀取群組列表
    it('should see the created group in list', async () => {
        const res = await request(app)
            .get('/api/groups')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        // Find our group in the list
        const found = res.body.find(g => g.id === createdGroupId);
        expect(found).toBeTruthy();
        expect(found.name).toBe('Integration Test Group');
    });

    // 5. 測試刪除群組
    it('should delete the group', async () => {
        const res = await request(app)
            .delete(`/api/groups/${createdGroupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
    });

    // 6. 驗證刪除後是否真的消失
    it('should verify group is gone', async () => {
        const res = await request(app)
            .get('/api/groups')
            .set('Authorization', `Bearer ${authToken}`);

        const found = res.body.find(g => g.id === createdGroupId);
        expect(found).toBeUndefined(); // Should not verify undefined
    });

});
