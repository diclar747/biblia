// controllers/listController.js
const { pool } = require('../db/database');

const listController = {
  // Obtener todas las listas personalizadas del usuario
  async getLists(req, res) {
    const userId = req.user.id;

    try {
      const [lists] = await pool.query(
        `SELECT l.id, l.name, l.description, l.created_at, COUNT(lv.verse_id) as verse_count
         FROM lists l
         LEFT JOIN list_verses lv ON l.id = lv.list_id
         WHERE l.user_id = ?
         GROUP BY l.id
         ORDER BY l.created_at DESC`,
        [userId]
      );
      res.json(lists);
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
      // Verificar pertenencia de la lista
      const [lists] = await pool.query('SELECT id, name, description, created_at FROM lists WHERE id = ? AND user_id = ?', [id, userId]);
      if (lists.length === 0) {
        return res.status(404).json({ error: 'Lista no encontrada o no pertenece al usuario.' });
      }

      const list = lists[0];

      // Obtener versículos de la lista
      const [verses] = await pool.query(
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
         WHERE lv.list_id = ?
         ORDER BY b.book_order, c.number, v.number`,
        [id]
      );

      list.verses = verses;
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
      const [result] = await pool.query(
        'INSERT INTO lists (user_id, name, description) VALUES (?, ?, ?)',
        [userId, name.trim(), description || '']
      );

      res.status(201).json({
        message: 'Lista creada con éxito.',
        listId: result.insertId,
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
      const [result] = await pool.query(
        'UPDATE lists SET name = ?, description = ? WHERE id = ? AND user_id = ?',
        [name.trim(), description || '', id, userId]
      );

      if (result.affectedRows === 0) {
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
      const [result] = await pool.query('DELETE FROM lists WHERE id = ? AND user_id = ?', [id, userId]);
      if (result.affectedRows === 0) {
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
    const { id } = req.params; // list_id
    const { verse_id } = req.body;

    if (!verse_id) {
      return res.status(400).json({ error: 'ID de versículo requerido.' });
    }

    try {
      // Verificar pertenencia de la lista
      const [lists] = await pool.query('SELECT id FROM lists WHERE id = ? AND user_id = ?', [id, userId]);
      if (lists.length === 0) {
        return res.status(404).json({ error: 'Lista no encontrada o no pertenece al usuario.' });
      }

      // Insertar versículo
      await pool.query('INSERT IGNORE INTO list_verses (list_id, verse_id) VALUES (?, ?)', [id, verse_id]);
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
      // Verificar pertenencia de la lista
      const [lists] = await pool.query('SELECT id FROM lists WHERE id = ? AND user_id = ?', [id, userId]);
      if (lists.length === 0) {
        return res.status(404).json({ error: 'Lista no encontrada o no pertenece al usuario.' });
      }

      // Eliminar versículo de la lista
      const [result] = await pool.query('DELETE FROM list_verses WHERE list_id = ? AND verse_id = ?', [id, verseId]);
      if (result.affectedRows === 0) {
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
