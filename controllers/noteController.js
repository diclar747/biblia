// controllers/noteController.js
const { pool } = require('../db/database');

const noteController = {
  // Obtener todas las notas del usuario (con opción de búsqueda interna y versículos vinculados)
  async getNotes(req, res) {
    const userId = req.user.id;
    const { q } = req.query;

    try {
      let sql = `
        SELECT 
          n.id, 
          n.title, 
          n.content, 
          n.created_at, 
          n.updated_at
        FROM notes n
        WHERE n.user_id = ?
      `;
      const queryParams = [userId];

      if (q && q.trim() !== '') {
        sql += ' AND (n.title LIKE ? OR n.content LIKE ?)';
        queryParams.push(`%${q.trim()}%`, `%${q.trim()}%`);
      }

      sql += ' ORDER BY n.updated_at DESC';

      const [notes] = await pool.query(sql, queryParams);

      // Para cada nota, obtener sus versículos vinculados
      for (let note of notes) {
        const [verses] = await pool.query(
          `SELECT 
            v.id, 
            v.number as verse_number, 
            v.text, 
            b.name as book_name, 
            c.number as chapter_number,
            vt.abbreviation as version
           FROM note_verses nv
           JOIN verses v ON nv.verse_id = v.id
           JOIN chapters c ON v.chapter_id = c.id
           JOIN books b ON c.book_id = b.id
           JOIN versions vt ON v.version_id = vt.id
           WHERE nv.note_id = ?`,
          [note.id]
        );
        note.verses = verses;
      }

      res.json(notes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener las notas.' });
    }
  },

  // Crear una nueva nota
  async createNote(req, res) {
    const userId = req.user.id;
    const { title, content, verse_ids } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'El título y el contenido son obligatorios.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insertar nota
      const [noteResult] = await connection.query(
        'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
        [userId, title, content]
      );
      const noteId = noteResult.insertId;

      // 2. Asociar versículos si se proporcionaron
      if (verse_ids && Array.isArray(verse_ids) && verse_ids.length > 0) {
        const insertValues = verse_ids.map(verseId => [noteId, verseId]);
        await connection.query(
          'INSERT INTO note_verses (note_id, verse_id) VALUES ?',
          [insertValues]
        );
      }

      await connection.commit();
      res.status(201).json({ message: 'Nota creada con éxito.', noteId });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ error: 'Error al crear la nota.' });
    } finally {
      connection.release();
    }
  },

  // Actualizar una nota existente
  async updateNote(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, content, verse_ids } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'El título y el contenido son obligatorios.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verificar pertenencia de la nota
      const [existing] = await connection.query('SELECT 1 FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
      if (existing.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Nota no encontrada o no pertenece al usuario.' });
      }

      // 1. Actualizar nota
      await connection.query(
        'UPDATE notes SET title = ?, content = ? WHERE id = ?',
        [title, content, id]
      );

      // 2. Eliminar versículos vinculados antiguos
      await connection.query('DELETE FROM note_verses WHERE note_id = ?', [id]);

      // 3. Vincular nuevos versículos
      if (verse_ids && Array.isArray(verse_ids) && verse_ids.length > 0) {
        const insertValues = verse_ids.map(verseId => [id, verseId]);
        await connection.query(
          'INSERT INTO note_verses (note_id, verse_id) VALUES ?',
          [insertValues]
        );
      }

      await connection.commit();
      res.json({ message: 'Nota actualizada con éxito.' });
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar la nota.' });
    } finally {
      connection.release();
    }
  },

  // Eliminar una nota
  async deleteNote(req, res) {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const [result] = await pool.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Nota no encontrada o no pertenece al usuario.' });
      }
      res.json({ message: 'Nota eliminada con éxito.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar la nota.' });
    }
  }
};

module.exports = noteController;
