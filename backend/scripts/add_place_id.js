const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restaurant_gacha'
};

async function addPlaceIdColumn() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ 已連接到資料庫');

        // 檢查 place_id 欄位是否已存在
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'dishes' AND COLUMN_NAME = 'place_id'
        `, [dbConfig.database]);

        if (columns.length > 0) {
            console.log('⚠️  place_id 欄位已存在，跳過');
        } else {
            await connection.query(`
                ALTER TABLE dishes 
                ADD COLUMN place_id VARCHAR(255) NULL AFTER lng
            `);
            console.log('✅ 已新增 place_id 欄位到 dishes 表');
        }

        console.log('✅ 遷移完成！');
    } catch (error) {
        console.error('❌ 遷移失敗:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

addPlaceIdColumn();
