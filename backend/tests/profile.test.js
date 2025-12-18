const request = require('supertest');
const app = require('../server');
const db = require('../config/db');

// 使用一個隨機的 Email 避免重複註冊導致測試失敗
const testUser = {
    email: `profile_test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Profile Tester'
};

let authToken = '';
const newPassword = 'newpassword456';

describe('User Profile Integration Test', () => {

    afterAll(async () => {
        // 清理測試資料 (如果帳號刪除失敗，這裡可以做備用清理)
        // await db.execute('DELETE FROM users WHERE email = ?', [testUser.email]);
        await db.end();
    });

    // 1. 先註冊並登入取得 Token
    it('should register and login', async () => {
        // Register
        await request(app).post('/api/auth/register').send(testUser);

        // Login
        const res = await request(app).post('/api/auth/login').send({
            email: testUser.email,
            password: testUser.password
        });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        authToken = res.body.token;
    });

    // 2. 測試更新個人資料 (名稱)
    it('should update user profile name', async () => {
        const res = await request(app)
            .put('/api/auth/update-profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Name',
                dicebear_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toEqual('Updated Name');
        expect(res.body.avatar_url).toContain('dicebear');
    });

    // 3. 測試修改密碼
    it('should change password', async () => {
        const res = await request(app)
            .put('/api/auth/change-password')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                oldPassword: testUser.password,
                newPassword: newPassword
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toContain('Password updated');
    });

    // 4. 驗證舊密碼失效 (無法登入)
    it('should fail login with old password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toEqual(401);
    });

    // 5. 驗證新密碼可用
    it('should login with new password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: newPassword
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        // Refresh token usage if needed, but we can reuse authToken if it hasn't expired (it won't in seconds)
    });

    // 6. 測試刪除帳號 (密碼錯誤)
    it('should fail to delete account with wrong password', async () => {
        const res = await request(app)
            .delete('/api/auth/delete-account')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ password: 'wrongpassword' });

        expect(res.statusCode).toEqual(401);
    });

    // 7. 測試刪除帳號 (密碼正確)
    it('should delete account successfully', async () => {
        const res = await request(app)
            .delete('/api/auth/delete-account')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ password: newPassword });

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toContain('Account deleted');
    });

    // 8. 驗證帳號已消失
    it('should confirm account is gone', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: newPassword
            });

        expect(res.statusCode).toEqual(401); // Or 404 depending on implementation, usually 401 for login failure
    });
});
