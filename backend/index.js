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

// Chemin du fichier JSON où les données seront sauvegardées
const dataFilePath = path.join(__dirname, 'data', 'pictures.json');

// Fonction pour lire les données existantes dans le fichier JSON
const readDataFromFile = () => {
  try {
    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    return [];  // Si le fichier n'existe pas ou est vide, retourner un tableau vide
  }
};

// Fonction pour écrire les données dans le fichier JSON
const writeDataToFile = (data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to file:', error);
  }
};

// Route pour récupérer les données des images (GET)
app.get('/pictures', (req, res) => {
  try {
    const data = readDataFromFile();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Route pour enregistrer les données
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    // Vérifier si l'image est reçue
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extraire les autres données du formulaire
    const { delay, startDate, endDate, backgroundColor } = req.body;

    // Générer un ID unique basé sur la date et l'heure
    const id = new Date().toISOString(); // Utiliser un timestamp ISO comme ID unique
    console.log("Generated ID:", id); // Log pour vérifier l'ID généré

    // Sauvegarder les informations dans un objet
    const imageData = {
      id, // Ajouter l'ID unique
      imagePath: `/uploads/${req.file.filename}`,
      delay,
      startDate,
      endDate,
      backgroundColor,
    };

    // Lire les données existantes dans le fichier JSON
    const currentData = readDataFromFile();

    // Ajouter les nouvelles données à la liste existante
    currentData.push(imageData);

    // Sauvegarder les nouvelles données dans le fichier JSON
    writeDataToFile(currentData);

    // Répondre avec les données enregistrées
    res.status(200).json({ message: 'File uploaded successfully', data: imageData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Route pour supprimer une image
app.delete('/pictures/:id', (req, res) => {
  const { id } = req.params;

  try {
    // Lire les données existantes dans le fichier JSON
    let currentData = readDataFromFile();

    // Trouver l'image à supprimer
    const pictureToDelete = currentData.find(picture => picture.id === id);

    if (!pictureToDelete) {
      return res.status(404).json({ message: 'Picture not found' });
    }

    // Supprimer le fichier image du dossier uploads
    const filePath = path.join(uploadFolder, pictureToDelete.imagePath.split('/').pop());
    fs.unlinkSync(filePath); // Supprimer le fichier

    // Filtrer les données pour supprimer l'image avec l'ID correspondant
    currentData = currentData.filter(picture => picture.id !== id);

    // Sauvegarder les nouvelles données dans le fichier JSON
    writeDataToFile(currentData);

    res.status(200).json({ message: 'Picture deleted successfully' });
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
