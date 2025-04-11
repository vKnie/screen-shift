const express = require('express');
const router = express.Router();
const picturesController = require('../controllers/picturesController');
const upload = require('../middlewares/uploadMiddleware');

router.get('/', picturesController.getPictures);
router.get('/:id', picturesController.getPictureById);
router.post('/upload', upload.single('image'), picturesController.uploadPicture);
router.delete('/:id', picturesController.deletePicture);
router.put('/:id', upload.single('image'), picturesController.updatePicture);

module.exports = router;
