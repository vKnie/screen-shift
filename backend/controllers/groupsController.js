const path = require('path');
const { readDataFromFile, writeDataToFile } = require('../utils/fileUtils');

const groupsDataFilePath = path.join(__dirname, '..', 'data', 'groups.json');
const picturesDataFilePath = path.join(__dirname, '..', 'data', 'pictures.json');

exports.getGroups = (req, res) => {
  try {
    const data = readDataFromFile(groupsDataFilePath);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.getGroupById = (req, res) => {
  const { id } = req.params;
  try {
    const data = readDataFromFile(groupsDataFilePath);
    const group = data.find(g => g.id === id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.createGroup = (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Group name is required' });
  }
  
  try {
    const groups = readDataFromFile(groupsDataFilePath);
    const id = new Date().toISOString();
    
    const newGroup = {
      id,
      name,
      pictures: []
    };
    
    groups.push(newGroup);
    writeDataToFile(groupsDataFilePath, groups);
    
    res.status(201).json({ message: 'Group created successfully', data: newGroup });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.updateGroup = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  try {
    const groups = readDataFromFile(groupsDataFilePath);
    const groupIndex = groups.findIndex(g => g.id === id);
    
    if (groupIndex === -1) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const updatedGroup = {
      ...groups[groupIndex],
      name: name || groups[groupIndex].name
    };
    
    groups[groupIndex] = updatedGroup;
    writeDataToFile(groupsDataFilePath, groups);
    
    res.status(200).json({ message: 'Group updated successfully', data: updatedGroup });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.deleteGroup = (req, res) => {
  const { id } = req.params;
  
  try {
    let groups = readDataFromFile(groupsDataFilePath);
    const groupToDelete = groups.find(g => g.id === id);
    
    if (!groupToDelete) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    groups = groups.filter(g => g.id !== id);
    writeDataToFile(groupsDataFilePath, groups);
    
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.addPictureToGroup = (req, res) => {
  const { groupId, pictureId } = req.params;
  
  try {
    const groups = readDataFromFile(groupsDataFilePath);
    const groupIndex = groups.findIndex(g => g.id === groupId);
    
    if (groupIndex === -1) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const pictures = readDataFromFile(picturesDataFilePath);
    const pictureExists = pictures.some(p => p.id === pictureId);
    
    if (!pictureExists) {
      return res.status(404).json({ message: 'Picture not found' });
    }
    
    if (!groups[groupIndex].pictures.includes(pictureId)) {
      groups[groupIndex].pictures.push(pictureId);
      writeDataToFile(groupsDataFilePath, groups);
    }
    
    res.status(200).json({ 
      message: 'Picture added to group successfully',
      data: groups[groupIndex]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.removePictureFromGroup = (req, res) => {
  const { groupId, pictureId } = req.params;
  
  try {
    const groups = readDataFromFile(groupsDataFilePath);
    const groupIndex = groups.findIndex(g => g.id === groupId);
    
    if (groupIndex === -1) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    groups[groupIndex].pictures = groups[groupIndex].pictures.filter(id => id !== pictureId);
    writeDataToFile(groupsDataFilePath, groups);
    
    res.status(200).json({ 
      message: 'Picture removed from group successfully',
      data: groups[groupIndex]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.getPicturesByGroups = (req, res) => {
  try {
    const groups = readDataFromFile(groupsDataFilePath);
    const pictures = readDataFromFile(picturesDataFilePath);
    
    const picturesByGroups = {};
    
    groups.forEach(group => {
      const groupPictures = pictures.filter(picture => 
        group.pictures.includes(picture.id)
      );
      
      picturesByGroups[group.name] = groupPictures;
    });
    
    res.status(200).json(picturesByGroups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.getGroupPictures = (req, res) => {
  const { id } = req.params;
  
  try {
    const groups = readDataFromFile(groupsDataFilePath);
    const group = groups.find(g => g.id === id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    const pictures = readDataFromFile(picturesDataFilePath);
    const groupPictures = pictures.filter(picture => 
      group.pictures.includes(picture.id)
    );
    
    res.status(200).json({
      group: group.name,
      pictures: groupPictures
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};