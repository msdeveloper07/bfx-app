const mongoose = require("mongoose");

const Commentlike = mongoose.model(
  "Commentlike",
  new mongoose.Schema({
    comment_id: String,
    post_id: String,
    likedby: String
  })
);
module.exports = Commentlike;
