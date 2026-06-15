// controllers/tagController.js
const { pool } = require('../db/database');

const tagController = {
  // Obtener todas las etiquetas globales
  async getTags(req, res) {
    try {
      const result = await pool.query('SELECT id, name FROM tags ORDER BY name');
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener las etiquetas.' });
    }
  },

  // Añadir una etiqueta a un versículo
  async addTagToVerse(req, res) {
    const { verse_id, tag_name } = req.body;

    if (!verse_id || !tag_name || tag_name.trim() === '') {
      return res.status(400).json({ error: 'ID de versículo y nombre de etiqueta requeridos.' });
    }

    const tagNameClean = tag_name.trim();

    try {
      await pool.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [tagNameClean]);
      
      const tagsResult = await pool.query('SELECT id FROM tags WHERE name = $1', [tagNameClean]);
      const tagId = tagsResult.rows[0].id;

      await pool.query('INSERT INTO verse_tags (verse_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [verse_id, tagId]);

      res.status(201).json({ 
        message: 'Etiqueta asignada con éxito al versículo.',
        tag: { id: tagId, name: tagNameClean }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al asignar la etiqueta.' });
    }
  },

  // Eliminar una etiqueta de un versículo
  async removeTagFromVerse(req, res) {
    const { verseId, tagId } = req.params;

    try {
      const result = await pool.query('DELETE FROM verse_tags WHERE verse_id = $1 AND tag_id = $2', [verseId, tagId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Asociación de etiqueta no encontrada.' });
      }
      res.json({ message: 'Etiqueta removida del versículo.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al remover la etiqueta.' });
    }
  },

  // Obtener las etiquetas de un versículo
  async getVerseTags(req, res) {
    const { verseId } = req.params;

    try {
      const result = await pool.query(
        `SELECT t.id, t.name 
         FROM tags t 
         JOIN verse_tags vt ON t.id = vt.tag_id 
         WHERE vt.verse_id = $1`,
        [verseId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener etiquetas del versículo.' });
    }
  }
};

module.exports = tagController;
