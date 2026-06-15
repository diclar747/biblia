// db/create_game_tables.js
const { pool } = require('./database');

async function main() {
  try {
    console.log('⏳ Creando tablas para el sistema de juegos...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_game_stats (
        user_id INT PRIMARY KEY,
        xp INT DEFAULT 0,
        level INT DEFAULT 1,
        crowns INT DEFAULT 0,
        streak INT DEFAULT 0,
        last_played TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id INT,
        achievement_key VARCHAR(50),
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, achievement_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tablas creadas correctamente en la base de datos.');
  } catch (error) {
    console.error('❌ Error al crear tablas:', error.message);
  } finally {
    process.exit(0);
  }
}

main();
