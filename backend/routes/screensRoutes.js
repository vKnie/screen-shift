const express = require('express');
const router = express.Router();
const screensController = require('../controllers/screensController');

router.get('/', screensController.getScreens);
router.get('/:id', screensController.getScreenById);
router.post('/', screensController.addScreen);
router.delete('/:id', screensController.deleteScreen);
router.patch('/:id', screensController.updateScreen);

module.exports = router;
