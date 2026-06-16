const { pool } = require('../db/database');

const ALLOWED_REACTIONS = ['❤️', '👍', '👎', '🙏', '😂', '😢', '😮', '🔥', '👏', '🕊️', '😍', '🤔', '🎉', '✨', '🌟', '💪', '🙌', '🤗', '✝️'];

const communityController = {
  // Listar posts ordenados por fecha descendente, con conteo de reacciones y comentarios
  async getPosts(req, res) {
    try {
      const postsResult = await pool.query(
        `SELECT 
          p.id, p.content, p.created_at, p.updated_at,
          u.id as user_id, u.name as user_name, u.profile_image
         FROM posts p
         JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC
         LIMIT 50`
      );

      const posts = postsResult.rows;
      for (const post of posts) {
        // Conteo de reacciones agrupadas
        const reactionsResult = await pool.query(
          `SELECT reaction, COUNT(*) as count
           FROM post_reactions
           WHERE post_id = $1
           GROUP BY reaction
           ORDER BY count DESC`,
          [post.id]
        );
        post.reactions = reactionsResult.rows;

        // Reacción del usuario actual (si está logueado)
        post.user_reaction = null;
        if (req.user) {
          const userReaction = await pool.query(
            'SELECT reaction FROM post_reactions WHERE post_id = $1 AND user_id = $2',
            [post.id, req.user.id]
          );
          if (userReaction.rows.length > 0) {
            post.user_reaction = userReaction.rows[0].reaction;
          }
        }

        // Conteo de comentarios
        const commentsCount = await pool.query(
          'SELECT COUNT(*) as count FROM post_comments WHERE post_id = $1',
          [post.id]
        );
        post.comments_count = parseInt(commentsCount.rows[0].count);
      }

      res.json(posts);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los posts.' });
    }
  },

  // Crear un nuevo post
  async createPost(req, res) {
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'El contenido del post es obligatorio.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING id, content, created_at',
        [userId, content.trim()]
      );
      res.status(201).json({ message: 'Post creado.', post: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear el post.' });
    }
  },

  // Eliminar un post (solo el autor)
  async deletePost(req, res) {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const result = await pool.query(
        'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );
      if (result.rowCount === 0) {
        return res.status(403).json({ error: 'No tenés permiso para eliminar este post.' });
      }
      res.json({ message: 'Post eliminado.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar el post.' });
    }
  },

  // Obtener comentarios de un post (incluyendo respuestas anidadas)
  async getComments(req, res) {
    const { postId } = req.params;

    try {
      const commentsResult = await pool.query(
        `SELECT 
          pc.id, pc.content, pc.created_at, pc.parent_comment_id,
          u.id as user_id, u.name as user_name, u.profile_image
         FROM post_comments pc
         JOIN users u ON pc.user_id = u.id
         WHERE pc.post_id = $1 AND pc.parent_comment_id IS NULL
         ORDER BY pc.created_at ASC`,
        [postId]
      );

      const comments = commentsResult.rows;
      for (const comment of comments) {
        // Respuestas
        const repliesResult = await pool.query(
          `SELECT 
            pc.id, pc.content, pc.created_at,
            u.id as user_id, u.name as user_name, u.profile_image
           FROM post_comments pc
           JOIN users u ON pc.user_id = u.id
           WHERE pc.parent_comment_id = $1
           ORDER BY pc.created_at ASC`,
          [comment.id]
        );
        comment.replies = repliesResult.rows;

        // Reacciones del comentario
        const reactionsResult = await pool.query(
          `SELECT reaction, COUNT(*) as count
           FROM comment_reactions
           WHERE comment_id = $1
           GROUP BY reaction
           ORDER BY count DESC`,
          [comment.id]
        );
        comment.reactions = reactionsResult.rows;

        comment.user_reaction = null;
        if (req.user) {
          const userReaction = await pool.query(
            'SELECT reaction FROM comment_reactions WHERE comment_id = $1 AND user_id = $2',
            [comment.id, req.user.id]
          );
          if (userReaction.rows.length > 0) {
            comment.user_reaction = userReaction.rows[0].reaction;
          }
        }
      }

      res.json(comments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los comentarios.' });
    }
  },

  // Crear comentario o respuesta
  async createComment(req, res) {
    const userId = req.user.id;
    const { postId } = req.params;
    const { content, parent_comment_id } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO post_comments (post_id, user_id, parent_comment_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id, content, created_at`,
        [postId, userId, parent_comment_id || null, content.trim()]
      );
      res.status(201).json({ message: 'Comentario creado.', comment: result.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear el comentario.' });
    }
  },

  // Agregar o cambiar reacción a un post
  async reactToPost(req, res) {
    const userId = req.user.id;
    const { postId } = req.params;
    const { reaction } = req.body;

    if (!ALLOWED_REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: 'Reacción no permitida.' });
    }

    try {
      await pool.query(
        `INSERT INTO post_reactions (post_id, user_id, reaction)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction`,
        [postId, userId, reaction]
      );
      res.json({ message: 'Reacción guardada.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al guardar la reacción.' });
    }
  },

  // Quitar reacción de un post
  async removePostReaction(req, res) {
    const userId = req.user.id;
    const { postId } = req.params;

    try {
      await pool.query(
        'DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      res.json({ message: 'Reacción eliminada.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar la reacción.' });
    }
  },

  // Agregar o cambiar reacción a un comentario
  async reactToComment(req, res) {
    const userId = req.user.id;
    const { commentId } = req.params;
    const { reaction } = req.body;

    if (!ALLOWED_REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: 'Reacción no permitida.' });
    }

    try {
      await pool.query(
        `INSERT INTO comment_reactions (comment_id, user_id, reaction)
         VALUES ($1, $2, $3)
         ON CONFLICT (comment_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction`,
        [commentId, userId, reaction]
      );
      res.json({ message: 'Reacción guardada.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al guardar la reacción.' });
    }
  },

  // Quitar reacción de un comentario
  async removeCommentReaction(req, res) {
    const userId = req.user.id;
    const { commentId } = req.params;

    try {
      await pool.query(
        'DELETE FROM comment_reactions WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );
      res.json({ message: 'Reacción eliminada.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar la reacción.' });
    }
  }
};

module.exports = communityController;
