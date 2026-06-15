// controllers/noteController.js
const { pool } = require('../db/database');

// Genera placeholders ($1,$2,...$N) para bulk insert
function generatePlaceholders(rowCount, colCount, startAt = 1) {
  const rows = [];
  let index = startAt;
  for (let r = 0; r < rowCount; r++) {
    const cols = [];
    for (let c = 0; c < colCount; c++) {
      cols.push(`$${index++}`);
    }
    rows.push(`(${cols.join(', ')})`);
  }
  return { placeholders: rows.join(', '), nextIndex: index };
}

const noteController = {
  // Obtener todas las notas del usuario
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
        WHERE n.user_id = $1
      `;
      const queryParams = [userId];

      if (q && q.trim() !== '') {
        sql += ' AND (n.title ILIKE $2 OR n.content ILIKE $3)';
        queryParams.push(`%${q.trim()}%`, `%${q.trim()}%`);
      }

      sql += ' ORDER BY n.updated_at DESC';

      const notesResult = await pool.query(sql, queryParams);
      const notes = notesResult.rows;

      for (let note of notes) {
        const versesResult = await pool.query(
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
           WHERE nv.note_id = $1`,
          [note.id]
        );
        note.verses = versesResult.rows;
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const noteResult = await client.query(
        'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING id',
        [userId, title, content]
      );
      const noteId = noteResult.rows[0].id;

      if (verse_ids && Array.isArray(verse_ids) && verse_ids.length > 0) {
        const values = verse_ids.flatMap(verseId => [noteId, verseId]);
        const { placeholders } = generatePlaceholders(verse_ids.length, 2);
        await client.query(
          `INSERT INTO note_verses (note_id, verse_id) VALUES ${placeholders}`,
          values
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Nota creada con éxito.', noteId });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      res.status(500).json({ error: 'Error al crear la nota.' });
    } finally {
      client.release();
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingResult = await client.query('SELECT 1 FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
      if (existingResult.rows.length === 0) {
        client.release();
        return res.status(404).json({ error: 'Nota no encontrada o no pertenece al usuario.' });
      }

      await client.query(
        'UPDATE notes SET title = $1, content = $2 WHERE id = $3',
        [title, content, id]
      );

      await client.query('DELETE FROM note_verses WHERE note_id = $1', [id]);

      if (verse_ids && Array.isArray(verse_ids) && verse_ids.length > 0) {
        const values = verse_ids.flatMap(verseId => [id, verseId]);
        const { placeholders } = generatePlaceholders(verse_ids.length, 2);
        await client.query(
          `INSERT INTO note_verses (note_id, verse_id) VALUES ${placeholders}`,
          values
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Nota actualizada con éxito.' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar la nota.' });
    } finally {
      client.release();
    }
  },

  // Eliminar una nota
  async deleteNote(req, res) {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const result = await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [id, userId]);
      if (result.rowCount === 0) {
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
