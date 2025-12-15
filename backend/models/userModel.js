const db = require('../config/db');

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
        const [result] = await db.query(
            'INSERT INTO `users` (email, password, name, avatar_url) VALUES (?, ?, ?, ?)',
            [email, password, name, avatar_url]
        );
        return result.insertId;
    }
}

module.exports = User;
