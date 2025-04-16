// routes/groupsRoutes.js
const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groupsController');

// Routes pour les groupes
router.get('/', groupsController.getGroups);
router.get('/:id', groupsController.getGroupById);
router.post('/', groupsController.createGroup);
router.put('/:id', groupsController.updateGroup);
router.delete('/:id', groupsController.deleteGroup);

// Routes pour les images des groupes
router.get('/pictures/all', groupsController.getPicturesByGroups);
router.get('/:id/pictures', groupsController.getGroupPictures);
router.post('/:groupId/pictures/:pictureId', groupsController.addPictureToGroup);
router.delete('/:groupId/pictures/:pictureId', groupsController.removePictureFromGroup);

module.exports = router;