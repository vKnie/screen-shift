const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 9999;

app.use(cors());

const uploadFolder = path.join(__dirname, 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const picturesDataFilePath = path.join(__dirname, 'data', 'pictures.json');
const screensDataFilePath = path.join(__dirname, 'data', 'screens.json');

const readDataFromFile = (filePath) => {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    return []; 
  }
};

const writeDataToFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to file:', error);
  }
};

app.get('/pictures', (req, res) => {
  try {
    const data = readDataFromFile(picturesDataFilePath);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

app.get('/pictures/:id', (req, res) => {
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
});


app.post('/upload', upload.single('image'), (req, res) => {
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
});

app.delete('/pictures/:id', (req, res) => {
  const { id } = req.params;

  try {
    // Lire les données des images
    let picturesData = readDataFromFile(picturesDataFilePath);
    const pictureToDelete = picturesData.find(picture => picture.id === id);

    if (!pictureToDelete) {
      return res.status(404).json({ message: 'Picture not found' });
    }

    // Vérifier si l'image est utilisée dans un écran
    const screensData = readDataFromFile(screensDataFilePath);
    const screensUsingPicture = screensData.filter(screen => 
      screen.lsimg && screen.lsimg.includes(id)
    );

    if (screensUsingPicture.length > 0) {
      // Si l'image est utilisée, la supprimer de tous les écrans qui l'utilisent
      for (const screen of screensData) {
        if (screen.lsimg && screen.lsimg.includes(id)) {
          screen.lsimg = screen.lsimg.filter(imgId => imgId !== id);
        }
      }
      
      // Mettre à jour le fichier des écrans
      writeDataToFile(screensDataFilePath, screensData);
    }

    // Supprimer le fichier physique
    const filePath = path.join(__dirname, pictureToDelete.imagePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer l'image des données
    picturesData = picturesData.filter(picture => picture.id !== id);
    writeDataToFile(picturesDataFilePath, picturesData);

    res.status(200).json({ 
      message: 'Picture deleted successfully', 
      updatedScreens: screensUsingPicture.length > 0 ? 
        screensUsingPicture.map(s => s.id) : []
    });
  } catch (error) {
    console.error('Error deleting picture:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Routes pour les écrans
app.get('/screens', (req, res) => {
  try {
    const data = readDataFromFile(screensDataFilePath);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

app.post('/screens', (req, res) => {
  try {
    const { name, group, status, lsimg = [] } = req.body;
    const id = new Date().toISOString();

    const screenData = {
      id,
      name,
      group,
      status,
      lsimg,
    };

    const currentData = readDataFromFile(screensDataFilePath);
    currentData.push(screenData);
    writeDataToFile(screensDataFilePath, currentData);

    res.status(200).json({ message: 'Screen added successfully', data: screenData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

app.delete('/screens/:id', (req, res) => {
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
});

app.patch('/screens/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    let currentData = readDataFromFile(screensDataFilePath);
    const screenIndex = currentData.findIndex(screen => screen.id === id);

    if (screenIndex === -1) {
      return res.status(404).json({ message: 'Screen not found' });
    }

    // Mettre à jour l'écran avec les nouvelles données
    currentData[screenIndex] = {
      ...currentData[screenIndex],
      ...updates
    };

    writeDataToFile(screensDataFilePath, currentData);

    res.status(200).json({ message: 'Screen updated successfully', data: currentData[screenIndex] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

app.get('/screens/:id', (req, res) => {
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
});


// Servir les fichiers statiques (images)
app.use('/uploads', express.static(uploadFolder));

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
