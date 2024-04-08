const mongoose = require("mongoose");

const Goal = mongoose.model(
  "Goal",
  new mongoose.Schema({
    name: String,
    created_by: String
  })
);
module.exports = Goal;
