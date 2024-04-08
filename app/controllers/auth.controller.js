const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Preuser = require("../models/preuser.model");
const Role = db.role;

const accountSid = '12121212TESTETST'; // Your Account SID from www.twilio.com/console
const authToken = '9898988TESTTESTTEST'; // Your Auth Token from www.twilio.com/console
const twilio = require('twilio');
const client = new twilio(accountSid, authToken);

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

exports.signup = (req, res) => {
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 8)
  });

  user.save((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    res.send({ message: "User was registered successfully!" });
  });
};

exports.signin = (req, res) => {
    User.findOne({ 
        username: req.body.username
    })
    .populate("roles", "-__v")
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }

      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }

      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!"
        });
      }

      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: '365d' // expires in 365 days
      });

      var authorities = [];

      for (let i = 0; i < user.roles.length; i++) {
        authorities.push("ROLE_" + user.roles[i].name.toUpperCase());
      }
      res.status(200).send({
        id: user._id,
        username: user.username,
        email: user.email,
        roles: authorities,
        accessToken: token
      });
    });
};


async function twilioSendMessage(phonenumber, otp){
  // Send opt
  client.messages
  .create({
    body: "One time passcode is "+otp,
    messagingServiceSid: 'MG476362f985214993ab12b471f39a184b',
    to: phonenumber
  })
  .then(message => console.log('message_sid',message.sid))
  .done();
}

// User Login Register (Send OTP on Mobile number)
exports.sendOtp = async (req, res) => {
  try {
    var otp = generateOtp(4);
    let phonenumber  = req.body.country_code+''+req.body.phone_number;
    existing_user = await User.findOne({ phone_number: phonenumber });
    existing_preuser = await Preuser.findOne({ phone_number: phonenumber });
    if (existing_user) {
      let updateUser = await User.findOneAndUpdate({ phone_number: phonenumber }, { otp:otp }, {new:true});
      if(updateUser){
        // var twilio_responce  = await twilioSendMessage(phonenumber, otp);
        // console.log('twilio_responce',twilio_responce)
        // Send opt
        client.messages
        .create({
          body: "One time passcode is "+otp,
          messagingServiceSid: 'MG476362f985214993ab12b471f39a184b',
          to: phonenumber
        })
        .then(message => console.log(message.sid))
        .done();
        return res.send({ success: true, first_time_login : false, message: "One time passcode send on your mobile number.!"}); 
      }
    } else if (existing_preuser) {
      let updateUser = await Preuser.findOneAndUpdate({ phone_number: phonenumber }, { otp:otp }, {new:true});
      if(updateUser){
        // Send opt
        client.messages
        .create({
          body: "One time passcode is "+otp,
          messagingServiceSid: 'MG476362f985214993ab12b471f39a184b',
          to: phonenumber
        })
        .then(message => console.log(message.sid))
        .done();
        return res.send({ success: true, first_time_login : true, message: "One time passcode send on your mobile number.!"}); 
      }
    }
    else{
      // Save user into db
      let pre_user = new Preuser({
        phone_number: phonenumber,
        otp: otp,
        username: 'user_'+randomUserName(5)
      });
      pre_user.save((err, pre_user) => {
        if (err) {
          res.status(500).send({ success: false, message: err });
          return;
        }
        // Send opt
        client.messages
        .create({
          body: "One time passcode is "+otp,
          messagingServiceSid: 'MG476362f985214993ab12b471f39a184b',
          to: phonenumber
        })
        .then(message => console.log(message.sid))
        .done();
        res.send({ success: true, first_time_login : true, message: "One time passcode send on your mobile number.!" });
      });
    }
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};

//Create Randome User name
function randomUserName(length) {
  let result = '';
  const characters = '0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

// ReSend OTP on Mobile number
exports.reSendOtp = async (req, res) => {
  try{
    var otp = generateOtp(4);
    let phonenumber  = req.body.country_code+''+req.body.phone_number;
    existing_user = await Preuser.findOne({ phone_number: phonenumber });
    if (existing_user) {
      let updateUser = await Preuser.findOneAndUpdate({ phone_number: phonenumber }, { otp:otp }, {new:true});
      if(updateUser){
        // Send opt
        client.messages
        .create({
          body: "One time passcode is "+otp,
          messagingServiceSid: 'MG476362f985214993ab12b471f39a184b',
          to: phonenumber
        })
        .then(message => console.log(message.sid))
        .done();
        return res.send({ success: true, message: "One time passcode send on your mobile number.!" }); 
      }
    }
    else{
      var user = await User.findOne({ phone_number: phonenumber });
      if(user){
        let updateUser = await User.findOneAndUpdate({ phone_number: phonenumber }, { otp:otp }, {new:true});
        if(updateUser){
          // Send opt
          client.messages
          .create({
            body: "One time passcode is "+otp,
            messagingServiceSid: 'MG476362f985214993ab12b471f39a184b',
            to: phonenumber
          })
          .then(message => console.log(message.sid))
          .done();
          return res.send({ success: true, message: "One time passcode send on your mobile number.!" }); 
        }
      }
      res.status(400).send({ success: false, message: "Failed! Phone Number is not register!" });
      return;
    }
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};

// generate OTP
function generateOtp(length) {
  var result           = '';
  var characters       = '0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

exports.verifyOtp = async (req, res) => {
  try{
    var otp = req.body.otp;
    var phonenumber = req.body.country_code+''+req.body.phone_number;
    // Dummy account code
    var dummy_acc = ['+919888880001','+919888880002','+919888880003','+919888880004','+919888880005','+919888880006','+919888880007','+919888880008','+919888880009','+919888880010','+919888880011','+919888880012','+919888880013','+919888880014','+919888880015'];
    var checkIfExit = dummy_acc.includes(phonenumber);;
    if(checkIfExit ==  true){
      //console.log("hello ",phonenumber);
      var user = await User.findOne({ otp: otp, phone_number: phonenumber });
      if (user) {
        // Generate jwt token
        var token = jwt.sign({ id: user.id }, config.secret, {
          expiresIn: '365d' // expires in 365 days
        });

        // update otp
        //let otp = req.body.otp;
        let updateUser = await User.findOneAndUpdate({ _id:user.id }, { otp:otp }, {new:true});
        return res.status(200).send({
          success: true,
          id: user._id,
          accessToken: token
        });
      }
    }
    // End Dummy account code

    existing_user = await Preuser.findOne({ otp: otp, phone_number: phonenumber });
    if (existing_user) {
      // Move to user table
      let movetouser = new User({
        phone_number: existing_user.phone_number,
        otp: '',
        username: existing_user.username
      });
      movetouser.save( async (err, movetouser) => {
        if (err) {
          res.status(500).send({ success: false, message: err });
          return;
        }
        // Delete from PreUser table
        let dduser = await Preuser.findOneAndRemove({ _id:existing_user._id });

        // Generate jwt token
        var token = jwt.sign({ id: movetouser.id }, config.secret, {
          expiresIn: '365d' // expires in 365 days
        });

        res.status(200).send({
          success: true,
          id: movetouser._id,
          accessToken: token
        });
      });
    }
    // Check if user already verify
    user = await User.findOne({ otp: otp, phone_number: phonenumber });
    if (user) {
      // Generate jwt token
      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: '365d' // expires in 365 days
      });

      // update otp
      let otp = '';
      let updateUser = await User.findOneAndUpdate({ _id:user.id }, { otp:otp }, {new:true});

      res.status(200).send({
        success: true,
        id: user._id,
        accessToken: token
      });
    }
    if(!existing_user && !user){
      res.status(500).send({ success: false, message: 'Failed! Phone Number or OTP not found!' });
    }
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};


// Dummy Account
exports.createDummyAcoount = async (req, res) => {
  try {
    var otp = '9598';
    let phonenumber  = req.body.country_code+''+req.body.phone_number;
    // Save user into db
    let pre_user = new User({
      phone_number: phonenumber,
      otp: otp,
      username: 'user_'+randomUserName(5)
    });
    pre_user.save((err, pre_user) => {
      if (err) {
        res.status(500).send({ success: false, message: err });
        return;
      }
      res.send({ success: true, first_time_login : true, message: "One time passcode send on your mobile number.!" });
    });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};