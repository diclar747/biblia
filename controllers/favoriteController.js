// controllers/favoriteController.js
const { pool } = require('../db/database');

const favoriteController = {
  // Agregar un versículo a favoritos
  async addFavorite(req, res) {
    const { verse_id } = req.body;
    const userId = req.user.id;

    if (!verse_id) {
      return res.status(400).json({ error: 'ID de versículo requerido.' });
    }

    try {
      const existingResult = await pool.query('SELECT 1 FROM favorites WHERE user_id = $1 AND verse_id = $2', [userId, verse_id]);
      if (existingResult.rows.length > 0) {
        return res.json({ message: 'El versículo ya está en tus favoritos.' });
      }

      await pool.query('INSERT INTO favorites (user_id, verse_id) VALUES ($1, $2)', [userId, verse_id]);
      res.status(201).json({ message: 'Versículo guardado en favoritos.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al agregar a favoritos.' });
    }
  },

  // Eliminar un versículo de favoritos
  async removeFavorite(req, res) {
    const { verseId } = req.params;
    const userId = req.user.id;

    try {
      const result = await pool.query('DELETE FROM favorites WHERE user_id = $1 AND verse_id = $2', [userId, verseId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'El versículo no estaba en favoritos.' });
      }
      res.json({ message: 'Versículo eliminado de favoritos.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar de favoritos.' });
    }
  },

  // Obtener todos los favoritos del usuario
  async getFavorites(req, res) {
    const userId = req.user.id;

    try {
      const result = await pool.query(
        `SELECT 
          f.verse_id, 
          v.number as verse_number, 
          v.text, 
          b.name as book_name, 
          b.id as book_id,
          c.number as chapter_number,
          vt.abbreviation as version
        FROM favorites f
        JOIN verses v ON f.verse_id = v.id
        JOIN chapters c ON v.chapter_id = c.id
        JOIN books b ON c.book_id = b.id
        JOIN versions vt ON v.version_id = vt.id
        WHERE f.user_id = $1
        ORDER BY b.book_order, c.number, v.number`,
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener favoritos.' });
    }
  }
};

module.exports = favoriteController;
