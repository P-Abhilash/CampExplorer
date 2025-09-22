const { string, number } = require("joi");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new Schema({
  body: String,
  rating: Number,
  author: {
    type: String, // Supabase UUID
    ref: "User",
  },
});

module.exports = mongoose.model("Review", reviewSchema);
