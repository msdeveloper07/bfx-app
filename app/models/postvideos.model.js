const mongoose = require("mongoose");

const Postvideo = mongoose.model(
  "Postvideo",
  new mongoose.Schema({
    video_index: String,
    video_id: String,
    thumbnail_id: String,
    post_id: {type: mongoose.Types.ObjectId, ref: "Post"},
    created_by: String
  })
);
module.exports = Postvideo;
