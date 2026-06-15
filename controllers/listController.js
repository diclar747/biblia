// controllers/listController.js
const { pool } = require('../db/database');

const listController = {
  // Obtener todas las listas personalizadas del usuario
  async getLists(req, res) {
    const userId = req.user.id;

    try {
      const result = await pool.query(
        `SELECT l.id, l.name, l.description, l.created_at, COUNT(lv.verse_id) as verse_count
         FROM lists l
         LEFT JOIN list_verses lv ON l.id = lv.list_id
         WHERE l.user_id = $1
         GROUP BY l.id
         ORDER BY l.created_at DESC`,
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener las listas.' });
    }
  },

  // Obtener una lista específica con sus versículos
  async getListById(req, res) {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const listsResult = await pool.query('SELECT id, name, description, created_at FROM lists WHERE id = $1 AND user_id = $2', [id, userId]);
      if (listsResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lista no encontrada o no pertenece al usuario.' });
      }

      const list = listsResult.rows[0];

      const versesResult = await pool.query(
        `SELECT 
          lv.verse_id, 
          v.number as verse_number, 
          v.text, 
          b.name as book_name, 
          b.id as book_id,
          c.number as chapter_number,
          vt.abbreviation as version
         FROM list_verses lv
         JOIN verses v ON lv.verse_id = v.id
         JOIN chapters c ON v.chapter_id = c.id
         JOIN books b ON c.book_id = b.id
         JOIN versions vt ON v.version_id = vt.id
         WHERE lv.list_id = $1
         ORDER BY b.book_order, c.number, v.number`,
        [id]
      );

      list.verses = versesResult.rows;
      res.json(list);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener detalles de la lista.' });
    }
  },

  // Crear una nueva lista
  async createList(req, res) {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la lista es obligatorio.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO lists (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
        [userId, name.trim(), description || '']
      );

      res.status(201).json({
        message: 'Lista creada con éxito.',
        listId: result.rows[0].id,
        name: name.trim(),
        description: description || ''
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear la lista.' });
    }
  },

  // Actualizar una lista
  async updateList(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la lista es obligatorio.' });
    }

    try {
      const result = await pool.query(
        'UPDATE lists SET name = $1, description = $2 WHERE id = $3 AND user_id = $4',
        [name.trim(), description || '', id, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Lista no encontrada o no pertenece al usuario.' });
      }

      res.json({ message: 'Lista actualizada con éxito.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar la lista.' });
    }
  },

  // Eliminar una lista
  async deleteList(req, res) {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const result = await pool.query('DELETE FROM lists WHERE id = $1 AND user_id = $2', [id, userId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Lista no encontrada o no pertenece al usuario.' });
      }
      res.json({ message: 'Lista eliminada con éxito.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar la lista.' });
    }
  },

  // Añadir un versículo a la lista
  async addVerseToList(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const { verse_id } = req.body;

    if (!verse_id) {
      return res.status(400).json({ error: 'ID de versículo requerido.' });
    }

    try {
      const listsResult = await pool.query('SELECT id FROM lists WHERE id = $1 AND user_id = $2', [id, userId]);
      if (listsResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lista no encontrada o no pertenece al usuario.' });
      }

      await pool.query('INSERT INTO list_verses (list_id, verse_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, verse_id]);
      res.status(201).json({ message: 'Versículo agregado a la lista con éxito.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al agregar versículo a la lista.' });
    }
  },

  // Eliminar un versículo de la lista
  async removeVerseFromList(req, res) {
    const userId = req.user.id;
    const { id, verseId } = req.params;

    try {
      const listsResult = await pool.query('SELECT id FROM lists WHERE id = $1 AND user_id = $2', [id, userId]);
      if (listsResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lista no encontrada o no pertenece al usuario.' });
      }

      const result = await pool.query('DELETE FROM list_verses WHERE list_id = $1 AND verse_id = $2', [id, verseId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'El versículo no se encuentra en esta lista.' });
      }

      res.json({ message: 'Versículo eliminado de la lista.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar versículo de la lista.' });
    }
  }
};

module.exports = listController;
