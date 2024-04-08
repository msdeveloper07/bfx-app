const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Preuser = require("../models/preuser.model");
const Role = db.role;
const usermeta = require("../usermeta/usermeta.json");

// const accountSid = 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Your Account SID from www.twilio.com/console
// const authToken = 'your_auth_token'; // Your Auth Token from www.twilio.com/console

// const twilio = require('twilio');
// const client = new twilio(accountSid, authToken);

var jwt = require("jsonwebtoken");
const Equipment = require("../models/equipment.model");
const Goal = require("../models/goal.model");
const Post = require("../models/post.model");

// Add Device Token
exports.addDeviceToken = async (req, res) => {
  try{
    let token = req.headers.x_access_token;
    const decoded = jwt.verify(token, "bezkoder-secret-key");  
    let userId = decoded.id;
    let device_token = req.body.device_token;
    let device_type = req.body.device_type;
    // Fetch the user by id 
    var user = await User.findOne({ _id: userId });
    if(user){
      let updateUser = await User.findOneAndUpdate({ _id:userId}, { device_token:device_token, device_type:device_type }, {new:true});
      res.status(200).send({
        success: true,
        id: userId,
        data: updateUser
      });
    }
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};


// Get Usermeta
exports.getUserMeta = async (req, res) => {
  try{
    var equipments_arr = [];
    var goal_arr = [];
    // get equipments
    var equipments = await Equipment.find({ }).select({ name : 1});
    if(equipments){
      equipments.map( async (equip,equip_index)=>{
        var equipmentsarr = equip.name;
        equipments_arr.push(equipmentsarr);
      });
    }

    // get goals
    var goals = await Goal.find({ }).select({ name : 1});
    if(goals){
      goals.map( async (item,index)=>{
        var goalsarr = item.name;
        goal_arr.push(goalsarr);
      });
    }

    // Set equipments
    usermeta.map( async (item,index)=>{
      if(item.key == "Equipment"){
        usermeta[index]['key'] =  'Equipment';
        usermeta[index]['value'] =  equipments_arr;
      } 
      if(item.key == "Goal"){
        usermeta[index]['key'] =  'Goal';
        usermeta[index]['value'] =  goal_arr;
      }
    });
    res.status(200).send({
      success: true,
      data: usermeta
    });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};

// Get User data for both user eg loggedin and loggedout
exports.getUser = async (req, res) => {
  try{
    //let token = req.headers.x_access_token;
    let user_id = req.query.user_id;
    let user = '';
    let posts = '';
    let success = false;
    // if(token){
    //   const decoded = jwt.verify(token, "bezkoder-secret-key");  
    //   let userId = decoded.id;
    //   // Fetch the user by id 
    //   user = await User.findOne({ _id: userId });
    //   success = true;
    // }
    // else 
    if(user_id){
      // Fetch the user by id 
      user = await User.findOne({ _id: user_id });
      posts = await Post.find({ created_by: user_id});
      success = true;
    }
    
    res.status(200).send({
      success: success,
      data: user,
      post_data: posts
    });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};

// Update User profile
exports.updateUser = async (req, res) => {
  try{
      let token = req.headers.x_access_token;
      const decoded = jwt.verify(token, "bezkoder-secret-key");  
      let userId = decoded.id;
      // Fetch the user by id 
      let user = await User.findOne({ _id: userId });
      if(user){
        let upd_user = await User.findOneAndUpdate({ _id: userId }, 
          {
            username : req.body.username, 
            //desgination : req.body.desgination, 
            weight : req.body.weight, 
            height : req.body.height, 
            birthday : req.body.birthday, 
            location : req.body.location, 
            text_status : req.body.text_status,
            bio : req.body.bio,
            lat : req.body.lat,
            long : req.body.long,
            profile_img : req.body.profile_img,
            facebook : req.body.facebook,
            instagram : req.body.instagram,
            twitter : req.body.twitter,
            tiktok : req.body.tiktok
          },
          {new : true}
        );
        res.status(200).send({
          success: true,
          data: user
        });
      }else{
        res.status(200).send({
          success: false,
          data: 'User not found'
        });
      }
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};

// Update Notification
exports.updateNotification = async (req, res) => {
  try{
      let token = req.headers.x_access_token;
      const decoded = jwt.verify(token, "bezkoder-secret-key");  
      let userId = decoded.id;
      // Fetch the user by id 
      let user = await User.findOne({ _id: userId });
      if(user){
        let upd_user = await User.findOneAndUpdate({ _id: userId }, 
          {
            notification : req.body.notification
          },
          {new : true}
        );
        res.status(200).send({
          success: true
        });
      }else{
        res.status(200).send({
          success: false,
          data: 'User not found'
        });
      }
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};