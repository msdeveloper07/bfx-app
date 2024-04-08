const mongoose = require("mongoose");

const Equipment = mongoose.model(
  "Equipment",
  new mongoose.Schema({
    name: String,
    created_by: String
  })
);
module.exports = Equipment;
