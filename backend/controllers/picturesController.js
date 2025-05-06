const fs = require('fs');
const path = require('path');
const { readDataFromFile, writeDataToFile } = require('../utils/fileUtils');

const picturesDataFilePath = path.join(__dirname, '..', 'data', 'pictures.json');
const screensDataFilePath = path.join(__dirname, '..', 'data', 'screens.json');
const groupsDataFilePath = path.join(__dirname, '..', 'data', 'groups.json');

exports.getPictures = (req, res) => {
  try {
    const data = readDataFromFile(picturesDataFilePath);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.getPictureById = (req, res) => {
  const { id } = req.params;
  try {
    const data = readDataFromFile(picturesDataFilePath);
    const picture = data.find(p => p.id === id);
    if (!picture) {
      return res.status(404).json({ message: 'Picture not found' });
    }
    res.status(200).json(picture);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.uploadPicture = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { delay, startDate, endDate, backgroundColor, groups } = req.body;
    const id = new Date().toISOString();
    
    const imageData = {
      id,
      imagePath: `/uploads/${req.file.filename}`,
      delay,
      startDate,
      endDate,
      backgroundColor,
    };
    
    const currentData = readDataFromFile(picturesDataFilePath);
    currentData.push(imageData);
    writeDataToFile(picturesDataFilePath, currentData);
    
    if (groups) {
      const groupIds = JSON.parse(groups);
      const groupsData = readDataFromFile(groupsDataFilePath);
      
      groupIds.forEach(groupId => {
        const groupIndex = groupsData.findIndex(g => g.id === groupId);
        if (groupIndex !== -1) {
          if (!groupsData[groupIndex].pictures) {
            groupsData[groupIndex].pictures = [];
          }
          groupsData[groupIndex].pictures.push(id);
        }
      });
      
      writeDataToFile(groupsDataFilePath, groupsData);
    }
    
    res.status(200).json({ 
      message: 'File uploaded successfully', 
      data: imageData 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.deletePicture = (req, res) => {
  const { id } = req.params;
  
  try {
    let picturesData = readDataFromFile(picturesDataFilePath);
    const pictureToDelete = picturesData.find(picture => picture.id === id);
    
    if (!pictureToDelete) {
      return res.status(404).json({ message: 'Picture not found' });
    }
    
    const groupsData = readDataFromFile(groupsDataFilePath);
    const groupsUpdated = [];
    
    groupsData.forEach(group => {
      if (group.pictures && group.pictures.includes(id)) {
        groupsUpdated.push(group.id);
        group.pictures = group.pictures.filter(picId => picId !== id);
      }
    });
    
    writeDataToFile(groupsDataFilePath, groupsData);
    
    const screensData = readDataFromFile(screensDataFilePath);
    const screensUpdated = [];
    
    screensData.forEach(screen => {
      if (screen.lsimg && screen.lsimg.includes(id)) {
        screensUpdated.push(screen.id);
        screen.lsimg = screen.lsimg.filter(picId => picId !== id);
      }
    });
    
    writeDataToFile(screensDataFilePath, screensData);
    
    const filePath = path.join(__dirname, '..', pictureToDelete.imagePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    picturesData = picturesData.filter(picture => picture.id !== id);
    writeDataToFile(picturesDataFilePath, picturesData);
    
    res.status(200).json({
      message: 'Picture deleted successfully',
      updatedGroups: groupsUpdated,
      updatedScreens: screensUpdated
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updatePicture = (req, res) => {
  const { id } = req.params;
  const { delay, startDate, endDate, backgroundColor, groups } = req.body;
  
  try {
    let picturesData = readDataFromFile(picturesDataFilePath);
    const pictureIndex = picturesData.findIndex(picture => picture.id === id);
    
    if (pictureIndex === -1) {
      return res.status(404).json({ message: 'Picture not found' });
    }
    
    const currentPicture = picturesData[pictureIndex];
    const updatedPicture = {
      ...currentPicture,
      delay: delay || currentPicture.delay,
      startDate: startDate || currentPicture.startDate,
      endDate: endDate || currentPicture.endDate,
      backgroundColor: backgroundColor || currentPicture.backgroundColor
    };
    
    if (req.file) {
      const oldFilePath = path.join(__dirname, '..', currentPicture.imagePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      updatedPicture.imagePath = `/uploads/${req.file.filename}`;
    }
    
    picturesData[pictureIndex] = updatedPicture;
    writeDataToFile(picturesDataFilePath, picturesData);
    
    if (groups) {
      const groupIds = JSON.parse(groups);
      const groupsData = readDataFromFile(groupsDataFilePath);
      
      groupsData.forEach(group => {
        if (group.pictures) {
          group.pictures = group.pictures.filter(picId => picId !== id);
        }
      });
      
      groupIds.forEach(groupId => {
        const groupIndex = groupsData.findIndex(g => g.id === groupId);
        if (groupIndex !== -1) {
          if (!groupsData[groupIndex].pictures) {
            groupsData[groupIndex].pictures = [];
          }
          groupsData[groupIndex].pictures.push(id);
        }
      });
      
      writeDataToFile(groupsDataFilePath, groupsData);
    }
    
    res.status(200).json({
      message: 'Picture updated successfully',
      data: updatedPicture
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};