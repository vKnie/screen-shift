const path = require('path');
const { readDataFromFile, writeDataToFile } = require('../utils/fileUtils');

const screensDataFilePath = path.join(__dirname, '..', 'data', 'screens.json');

exports.getScreens = (req, res) => {
  try {
    const data = readDataFromFile(screensDataFilePath);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.getScreenById = (req, res) => {
  const { id } = req.params;
  try {
    const data = readDataFromFile(screensDataFilePath);
    const screen = data.find(screen => screen.id === id);
    if (!screen) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    res.status(200).json(screen);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.addScreen = (req, res) => {
  try {
    const { name, group, status, lsimg = [] } = req.body;
    const id = new Date().toISOString();
    const screenData = { id, name, group, status, lsimg };
    const currentData = readDataFromFile(screensDataFilePath);
    currentData.push(screenData);
    writeDataToFile(screensDataFilePath, currentData);
    res.status(200).json({ message: 'Screen added successfully', data: screenData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.deleteScreen = (req, res) => {
  const { id } = req.params;
  try {
    let currentData = readDataFromFile(screensDataFilePath);
    const screenToDelete = currentData.find(screen => screen.id === id);
    if (!screenToDelete) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    currentData = currentData.filter(screen => screen.id !== id);
    writeDataToFile(screensDataFilePath, currentData);
    res.status(200).json({ message: 'Screen deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

exports.updateScreen = (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    let currentData = readDataFromFile(screensDataFilePath);
    const screenIndex = currentData.findIndex(screen => screen.id === id);
    if (screenIndex === -1) {
      return res.status(404).json({ message: 'Screen not found' });
    }
    currentData[screenIndex] = { ...currentData[screenIndex], ...updates };
    writeDataToFile(screensDataFilePath, currentData);
    res.status(200).json({ message: 'Screen updated successfully', data: currentData[screenIndex] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
