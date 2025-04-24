const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const FormData = require('form-data');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Subscriber model
const Subscriber = require('./models/Subscriber');

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

// Nodemailer config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
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
    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename: fileName,
      contentType: req.file.mimetype
    });
    form.append('min_confidence', '0.4');

    const response = await axios.post(process.env.DEEPSTACK_URL, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    const detections = (response.data.predictions || [])
      .filter(pred => pred.label === 'person')
      .map(pred => ({
        x_min: pred.x_min,
        y_min: pred.y_min,
        x_max: pred.x_max,
        y_max: pred.y_max,
        confidence: pred.confidence
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
    uploadStream.on('finish', async () => {
      // Notify subscribers via email
      try {
        const activeSubscribers = await Subscriber.find({ isActive: true });

        for (const sub of activeSubscribers) {
          await transporter.sendMail({
            from: process.env.FROM_EMAIL,
            to: sub.email,
            subject: 'New photo uploaded',
            html: `
              <p>A new photo has been uploaded.</p>
              <p><strong>Description:</strong> ${description || 'No description'}</p>
              <p><strong>People detected:</strong> ${peopleDetected}</p>
              <p>View image: <a href="${process.env.BASE_URL || ('http://localhost:' + process.env.BACKEND_PORT)}/images/${uploadStream.id}">Open photo</a></p>
            `
          });
        }
      } catch (emailErr) {
        console.error('Error sending emails:', emailErr);
      }

      res.redirect('/');
    });

  } catch (error) {
    console.error('DeepStack error:', error.message);
    res.status(500).send('Error processing image');
  }
});

// Delete all images
app.delete('/images', async (req, res) => {
  try {
    // List all files in the bucket
    const filesCursor = bucket.find();
    const files = await filesCursor.toArray();

    if (files.length === 0) {
      return res.status(404).json({ message: 'No image found to delete.' });
    }

    // Delete each file by _id
    await Promise.all(files.map(file => bucket.delete(file._id)));

   res.redirect('/');
  } catch (err) {
    console.error('Error deleting images:', err);
    res.status(500).json({ error: 'Failed to delete images.' });
  }
});

// Image streaming
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

// Subscribe form
app.get('/subscribe', (req, res) => {
  res.render('subscribe');
});

// Subscribe 
app.post('/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send('Email is required.');

  try {
    let subscriber = await Subscriber.findOne({ email });
    if (subscriber) {
      if (!subscriber.isActive) {
        subscriber.isActive = true;
        subscriber.subscribedAt = new Date();
        await subscriber.save();
      }
    } else {
      subscriber = new Subscriber({ email });
      await subscriber.save();
    }
    res.send('Subscribed successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to subscribe.');
  }
});

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


app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
