const db = require('../config/db');
const { v7: uuidv7 } = require('uuid');

class User {
    static async findByEmail(email) {
        const [rows] = await db.query('SELECT * FROM `users` WHERE email = ?', [email]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT id, email, name, avatar_url, created_at FROM `users` WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(user) {
        const { email, password, name, avatar_url } = user;
        const id = uuidv7();
        await db.query(
            'INSERT INTO `users` (id, email, password, name, avatar_url) VALUES (?, ?, ?, ?, ?)',
            [id, email, password, name, avatar_url]
        );
        return id;
    }

    static async findByIdWithPassword(id) {
        const [rows] = await db.query('SELECT * FROM `users` WHERE id = ?', [id]);
        return rows[0];
    }

    static async update(id, updates) {
        const { name, avatar_url, password } = updates;
        let fields = [];
        let values = [];

        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(avatar_url); }
        if (password !== undefined) { fields.push('password = ?'); values.push(password); }

        if (fields.length === 0) return;

        values.push(id);
        const sql = `UPDATE \`users\` SET ${fields.join(', ')} WHERE id = ?`;
        await db.execute(sql, values);
    }

    static async delete(id) {
        await db.execute('DELETE FROM `users` WHERE id = ?', [id]);
    }
}

module.exports = User;
