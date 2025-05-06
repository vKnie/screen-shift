const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groupsController');

router.get('/', groupsController.getGroups);
router.get('/:id', groupsController.getGroupById);
router.post('/', groupsController.createGroup);
router.put('/:id', groupsController.updateGroup);
router.delete('/:id', groupsController.deleteGroup);

router.get('/pictures/all', groupsController.getPicturesByGroups);
router.get('/:id/pictures', groupsController.getGroupPictures);
router.post('/:groupId/pictures/:pictureId', groupsController.addPictureToGroup);
router.delete('/:groupId/pictures/:pictureId', groupsController.removePictureFromGroup);

module.exports = router;