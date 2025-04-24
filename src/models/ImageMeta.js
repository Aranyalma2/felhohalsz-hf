const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema({
  x_min: Number,
  y_min: Number,
  x_max: Number,
  y_max: Number,
  confidence: Number
}, { _id: false });

const imageMetaSchema = new mongoose.Schema({
  description: { type: String, required: true },
  peopleDetected: { type: Number, default: 0 },
  detections: [detectionSchema],
  imageUrl: { type: String, required: true }
}, { _id: false }); // No separate _id for metadata

module.exports = imageMetaSchema;
