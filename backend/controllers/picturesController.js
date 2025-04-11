const fs = require('fs');
const path = require('path');
const { readDataFromFile, writeDataToFile } = require('../utils/fileUtils');

const picturesDataFilePath = path.join(__dirname, '..', 'data', 'pictures.json');
const screensDataFilePath = path.join(__dirname, '..', 'data', 'screens.json');

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
    const { delay, startDate, endDate, backgroundColor } = req.body;
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
    res.status(200).json({ message: 'File uploaded successfully', data: imageData });
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
    const screensData = readDataFromFile(screensDataFilePath);
    const screensUsingPicture = screensData.filter(screen =>
      screen.lsimg && screen.lsimg.includes(id)
    );
    if (screensUsingPicture.length > 0) {
      for (const screen of screensData) {
        if (screen.lsimg && screen.lsimg.includes(id)) {
          screen.lsimg = screen.lsimg.filter(imgId => imgId !== id);
        }
      }
      writeDataToFile(screensDataFilePath, screensData);
    }
    const filePath = path.join(__dirname, '..', pictureToDelete.imagePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    picturesData = picturesData.filter(picture => picture.id !== id);
    writeDataToFile(picturesDataFilePath, picturesData);
    res.status(200).json({
      message: 'Picture deleted successfully',
      updatedScreens: screensUsingPicture.length > 0 ?
        screensUsingPicture.map(s => s.id) : []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updatePicture = (req, res) => {
  const { id } = req.params;
  const { delay, startDate, endDate, backgroundColor } = req.body;
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
    res.status(200).json({
      message: 'Picture updated successfully',
      data: updatedPicture
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
