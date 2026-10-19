const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');

router.get('/', classController.getClasses);
router.post('/auto-generate', classController.autoGenerateClasses);
router.get('/:id/roster', classController.getClassRoster);
router.post('/', classController.createClass);
router.put('/:id', classController.updateClass);
router.delete('/:id', classController.deleteClass);

module.exports = router;
