const mongoose = require("mongoose");

const Postlike = mongoose.model(
  "Postlike",
  new mongoose.Schema({
    post_id: String,
    likedby: String
  })
);
module.exports = Postlike;
