const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');

router.get('/', studyController.getStudies);
router.get('/events', studyController.getEvents);
router.get('/events/:slug', studyController.getEventBySlug);
router.get('/book/:bookId', studyController.getBookStudy);
router.get('/:slug', studyController.getStudyBySlug);

module.exports = router;
