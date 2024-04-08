const mongoose = require("mongoose");

const Preuser = mongoose.model(
  "Preuser",
  new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    phone_number: String,
    otp: String,
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role"
      }
    ]
  })
);
module.exports = Preuser;
