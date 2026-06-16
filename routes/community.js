const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

// Posts públicos (lectura opcionalmente autenticada)
router.get('/posts', optionalAuthenticateToken, communityController.getPosts);
router.post('/posts', authenticateToken, communityController.createPost);
router.delete('/posts/:id', authenticateToken, communityController.deletePost);

// Comentarios
router.get('/posts/:postId/comments', optionalAuthenticateToken, communityController.getComments);
router.post('/posts/:postId/comments', authenticateToken, communityController.createComment);

// Reacciones a posts
router.post('/posts/:postId/reactions', authenticateToken, communityController.reactToPost);
router.delete('/posts/:postId/reactions', authenticateToken, communityController.removePostReaction);

// Reacciones a comentarios
router.post('/comments/:commentId/reactions', authenticateToken, communityController.reactToComment);
router.delete('/comments/:commentId/reactions', authenticateToken, communityController.removeCommentReaction);

module.exports = router;
