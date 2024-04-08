const mongoose = require("mongoose");

const Folderpost = mongoose.model(
  "Folderpost",
  new mongoose.Schema({
    folder_id: String,
    post_id: String,
    index_value: Number,
    created_by: String
  })
);
module.exports = Folderpost;
