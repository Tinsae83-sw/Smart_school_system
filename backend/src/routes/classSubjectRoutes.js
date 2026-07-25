const express = require('express');
const router = express.Router();
const classSubjectController = require('../controllers/classSubjectController');

router.get('/', classSubjectController.getAllClassSubjects);
router.post('/', classSubjectController.assignTeacherToClassSubject);

module.exports = router;
