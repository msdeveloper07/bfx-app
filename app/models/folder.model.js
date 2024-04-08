const mongoose = require("mongoose");

const Folder = mongoose.model(
  "Folder",
  new mongoose.Schema({
    name: String,
    cover_image: String,
    created_by: String
  })
);
module.exports = Folder;
