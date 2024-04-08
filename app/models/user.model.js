const mongoose = require("mongoose");

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: {
      type: String,
      default: ''
    },
    email: {},
    password: String,
    phone_number: String,
    otp: String,
    device_token: String,
    device_type: String,
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role"
      }
    ],
    // desgination: {
    //   type: String,
    //   default: ''
    // },
    weight: {
      type: String,
      default: ''
    },
    height: {
      type: String,
      default: ''
    },
    birthday: {
      type: String,
      default: ''
    },
    text_status: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: ''
    },
    lat: {
      type: String,
      default: ''
    },
    long: {
      type: String,
      default: ''
    },
    profile_img: {
      type: String,
      default: ''
    },
    facebook: {
      type: String,
      default: ''
    },
    instagram: {
      type: String,
      default: ''
    },
    twitter: {
      type: String,
      default: ''
    },
    tiktok: {
      type: String,
      default: ''
    },
    notification: {
      type: String,
      default: 'True'
    },
    gender: {
      type: String,
      default: ''
    },
    height: {
      type: String,
      default: ''
    },
    height_type: {
      type: String,
      default: ''
    },
    weight: {
      type: String,
      default: ''
    },
    weight_type: {
      type: String,
      default: ''
    },
    first_time_update: {
      type: String,
      default: 'true'
    }
  })
);
module.exports = User;
