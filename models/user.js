const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  _id: { type: String, required: true }, // Supabase UUID
  email: { type: String, required: true, unique: true },
  name: { type: String },
  avatarUrl: { type: String },
});

module.exports = mongoose.model("User", userSchema);
