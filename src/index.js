const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB
mongoose.connect(process.env.MONGO_URI);
const conn = mongoose.connection;

let bucket;
let gfsFiles;
conn.once('open', () => {
  bucket = new GridFSBucket(conn.db, { bucketName: 'images' });
  gfsFiles = conn.db.collection('images.files');
  console.log('MongoDB connected, GridFS ready');
});

// Multer storage config
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Main page with pagination
app.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const total = await gfsFiles.countDocuments({});
  const pages = Math.ceil(total / limit);

  const files = await gfsFiles.find({})
    .sort({ uploadDate: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  res.render('index', { files, page, pages });
});

// Upload form
app.get('/upload', (req, res) => {
  res.render('upload');
});

// Upload POST
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.send('No file uploaded.');

  const { description } = req.body;
  const fileName = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);

  try {
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: fileName,
      contentType: req.file.mimetype,
    });
    formData.append('min_confidence', '0.4');

    const response = await axios.post(process.env.DEEPSTACK_URL, formData, {
      headers: formData.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const detections = response.data.predictions
      .filter(pred => pred.label === 'person')
      .map(pred => ({
        x_min: pred.x_min,
        y_min: pred.y_min,
        x_max: pred.x_max,
        y_max: pred.y_max
      }));

    const peopleDetected = detections.length;

    const uploadStream = bucket.openUploadStream(fileName, {
      chunkSizeBytes: 1048576,
      metadata: {
        description,
        contentType: req.file.mimetype,
        peopleDetected,
        detections,
        imageUrl: '/images/' + fileName
      }
    });

    uploadStream.end(req.file.buffer);
    uploadStream.on('finish', () => res.redirect('/'));

  } catch (error) {
    console.error('DeepStack error:', error.message);
    res.status(500).send('Error processing image');
  }
});

// Image streaming (e.g., in app.js or another router)
app.get('/images/:id', async (req, res) => {
  console.log('Fetching image with ID:', req.params.id);
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'images'
    });

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const stream = bucket.openDownloadStream(fileId);
    stream.pipe(res);
  } catch (err) {
    res.status(404).send('Image not found');
  }
});


app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
