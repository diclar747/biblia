const { pool } = require('../db/database');

const studyController = {
  // Obtener lista de estudios temáticos
  async getStudies(req, res) {
    try {
      const result = await pool.query(
        'SELECT id, topic, slug, summary FROM studies ORDER BY topic'
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los estudios.' });
    }
  },

  // Obtener un estudio temático por slug, incluyendo sus versículos
  async getStudyBySlug(req, res) {
    const { slug } = req.params;
    try {
      const studyResult = await pool.query(
        'SELECT id, topic, slug, summary, content FROM studies WHERE slug = $1',
        [slug]
      );
      if (studyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Estudio no encontrado.' });
      }

      const study = studyResult.rows[0];
      const versesResult = await pool.query(
        `SELECT v.id, v.number, v.text, b.name as book_name, c.number as chapter_number
         FROM study_verses sv
         JOIN verses v ON sv.verse_id = v.id
         JOIN chapters c ON v.chapter_id = c.id
         JOIN books b ON c.book_id = b.id
         WHERE sv.study_id = $1
         ORDER BY b.book_order, c.number, v.number`,
        [study.id]
      );
      study.verses = versesResult.rows;

      res.json(study);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el estudio.' });
    }
  },

  // Obtener estudio/historia de un libro por book_id
  async getBookStudy(req, res) {
    const { bookId } = req.params;
    try {
      const result = await pool.query(
        `SELECT bs.*, b.name as book_name, b.abbreviation
         FROM book_studies bs
         JOIN books b ON bs.book_id = b.id
         WHERE bs.book_id = $1`,
        [bookId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Estudio del libro no encontrado.' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el estudio del libro.' });
    }
  },

  // Listar eventos históricos ordenados cronológicamente
  async getEvents(req, res) {
    try {
      const result = await pool.query(
        `SELECT e.*, b.name as book_name
         FROM events e
         JOIN books b ON e.book_id = b.id
         ORDER BY e.timeline_order, e.id`
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los eventos.' });
    }
  },

  // Obtener un evento por slug
  async getEventBySlug(req, res) {
    const { slug } = req.params;
    try {
      const result = await pool.query(
        `SELECT e.*, b.name as book_name
         FROM events e
         JOIN books b ON e.book_id = b.id
         WHERE e.slug = $1`,
        [slug]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Evento no encontrado.' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el evento.' });
    }
  }
};

module.exports = studyController;
