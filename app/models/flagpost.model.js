const mongoose = require("mongoose");

const Flagpost = mongoose.model(
  "Flagpost",
  new mongoose.Schema({
    reason: String,
    post_id: String,
    created_by: String,
    created_at: {type: Date, default: Date.now}
  })
);
module.exports = Flagpost;
