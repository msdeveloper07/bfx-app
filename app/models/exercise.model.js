const mongoose = require("mongoose");

const Exercise = mongoose.model(
  "Exercise",
  new mongoose.Schema({
    set:String,
    reps: Number,
    weight: Number,
    weight_type: String,
    post_id: String,
    created_by: String,
    isbest: {
      type: String,
      default: false
    },
    created_at: {type: Date, default: Date.now}
  })
);
module.exports = Exercise;
