const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Créer l'application Express
const app = express();
const port = 9999;

// Middleware CORS pour autoriser les appels API du frontend
app.use(cors());

// Créer un répertoire public pour stocker les images
const uploadFolder = path.join(__dirname, 'uploads');

// Configurer multer pour enregistrer les images dans le dossier 'uploads'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);  // Destination des fichiers
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); // Nom du fichier
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

// Middleware pour parser le corps de la requête
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Chemin du fichier JSON où les données des images seront sauvegardées
const picturesDataFilePath = path.join(__dirname, 'data', 'pictures.json');
const screensDataFilePath = path.join(__dirname, 'data', 'screens.json');

// Fonction pour lire les données existantes dans le fichier JSON
const readDataFromFile = (filePath) => {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    return [];  // Si le fichier n'existe pas ou est vide, retourner un tableau vide
  }
};

// Fonction pour écrire les données dans le fichier JSON
const writeDataToFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to file:', error);
  }
};

// Routes pour les images
app.get('/pictures', (req, res) => {
  try {
    const data = readDataFromFile(picturesDataFilePath);
    res.status(200).json(data);
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
    let currentData = readDataFromFile(picturesDataFilePath);
    const pictureToDelete = currentData.find(picture => picture.id === id);

    if (!pictureToDelete) {
      return res.status(404).json({ message: 'Picture not found' });
    }

    const filePath = path.join(uploadFolder, pictureToDelete.imagePath.split('/').pop());
    fs.unlinkSync(filePath);

    currentData = currentData.filter(picture => picture.id !== id);
    writeDataToFile(picturesDataFilePath, currentData);

    res.status(200).json({ message: 'Picture deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
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
    const { name, group, status, lsimg = [] } = req.body;  // Ajout du paramètre lsimg avec valeur par défaut []
    const id = new Date().toISOString();

    const screenData = {
      id,
      name,
      group,
      status,
      lsimg,  // Ajout de la propriété lsimg
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

// Servir les fichiers statiques (images)
app.use('/uploads', express.static(uploadFolder));

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
