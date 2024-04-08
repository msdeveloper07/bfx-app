const config = require("../config/auth.config");
const Post = require("../models/post.model");
const Postvideo = require("../models/postvideos.model");
var jwt = require("jsonwebtoken");
const Postlike = require("../models/postlike.model");
const Comment = require("../models/comment.model");
const Commentlike = require("../models/Commentlike.model");
const User = require("../models/user.model");
const Flagpost = require("../models/flagpost.model");
const Folder = require("../models/folder.model");
const Folderpost = require("../models/folderpost.model");
const Exercise = require("../models/exercise.model");
const Goal = require("../models/goal.model");
const Equipment = require("../models/equipment.model");

var FCM = require('fcm-node');
const Preuser = require("../models/preuser.model");
var serverKey = 'ADDDDDDDDDDDDDDDDDDDDDDDDDDDTESTETS'; //put your server key here
var fcm = new FCM(serverKey);

// Create post
exports.createPost = async (req, res) => {
  try{
    let videos  = req.body.videos;
    let token = req.headers.x_access_token;
    const decoded = jwt.verify(token, "bezkoder-secret-key");  
    let userId = decoded.id;
    //tag
    let tag = req.body.tag;
    let tag_arr = [];
    if(tag){
        tag_arr = (new Function("return " + tag+ ";")());
    }
    if(tag_arr.length>0){
        tag_arr = tag_arr.map(v => v.toLowerCase());
    }
    
    //equipment
    let equipment = req.body.equipment;
    let equipment_arr = [];
    if(equipment){
        equipment_arr = (new Function("return " + equipment+ ";")());
    }
    if(equipment_arr.length>0){
        equipment_arr = equipment_arr.map(v => v.toLowerCase());
    }
    //goal
    let goal = req.body.goal;
    let goal_arr = [];
    if(goal){
        goal_arr = (new Function("return " + goal+ ";")());
    }
    if(goal_arr.length>0){
        goal_arr = goal_arr.map(v => v.toLowerCase());
    }
    //difficuilty
    let difficuilty = req.body.difficuilty;
    let difficuilty_arr = [];
    if(difficuilty){
        difficuilty_arr = (new Function("return " + difficuilty+ ";")());
    }
    if(difficuilty_arr.length>0){
        difficuilty_arr = difficuilty_arr.map(v => v.toLowerCase());
    }
    //location
    let location = req.body.location;
    let location_arr = [];
    if(location){
        location_arr = (new Function("return " + location+ ";")());
    }
    if(location_arr.length>0){
        location_arr = location_arr.map(v => v.toLowerCase());
    }
    
    // Save user into db
    let post = new Post({
        title: req.body.title,
        tag: tag_arr,
        equipment: equipment_arr,
        goal: goal_arr,
        difficuilty: difficuilty_arr,
        location: location_arr,
        description: req.body.description,
        audience: req.body.audience,
        tag_friend: req.body.tag_friend,
        created_by: userId,
        likes: 0,
        comment_count:0,
        likedbyme: 'false'
    });
    var post_result = {};
    post.save( async (err, post) => {
        if (err) {
            res.status(500).send({ success: false, message: err });
            return;
        }
        await Post.updateOne(
            { _id: post._id },
            {
              $push: { user: userId },
            }
        );
        let video_arr = [];
        // Add post video
        videos = (new Function("return [" + videos+ "];")());
        if(videos.length>0){
           var new_index = 0;
            videos.map((item,index)=>{
                let post_video = new Postvideo({
                    video_index: item.index,
                    video_id: item.video_id,
                    thumbnail_id: item.thumbnail_id,
                    post_id: post._id,
                    created_by: userId
                });
                post_video.save( async (err, post_video) => {
                    if (err) {
                        res.status(500).send({ success: false, message: err });
                        return;
                    }

                    await Post.updateOne(
                        { _id: post._id },
                        {
                          $push: { video: post_video._id },
                        }
                    );

                    let new_obj = post_video;
                    video_arr.push(new_obj);
                    new_index++;
                    if(videos.length==new_index) {
                        post_result.post = post;
                        post_result.video = video_arr;
                        res.status(200).send({
                            success: true,
                            data: post_result
                        });
                    }
                });
            });
        }
    });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
};

// Send Push Notification When post created
async function sendPushNoticiations(device_token, post_id, mess_, type, title){
    if(device_token){
        var message = {
            to: device_token, 
            notification: {
                title: title, 
                body: mess_
            }
        };
        fcm.send(message, function(err, response){
            if (err) {
                console.log("Something has gone wrong!", err);
            } else {
                console.log("Successfully sent with response: ", response);
                var data_arr = [];
                const responce = {'title':title, 'body':mess_, 'post_id':post_id, 'type':type};
                data_arr.push(responce);
                return data_arr;
            }
        });
    }
}


// Get Single Post Data using post ID
exports.getSinglePost = async (req, res) => {
    try{
      let post_id = req.query.post_id;
      if(post_id){
        let posts = await Post.find({ _id: post_id }).populate("video").populate("comment").populate("user").sort({_id : -1});
            res.status(200).send({
                success: true,
                data: posts
            });
        }
        else{
            return res.status(200).send({
                success: false,
                data: "Post id missing"
            });
        }
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
};

// Get My posts (LoggedIn User)
exports.getMyPosts = async (req, res) => {
    try{
      const page_size = req.query.page_size ? parseInt(req.query.page_size) : 0;
      const page = req.query.page ? parseInt(req.query.page) : 0;
      let token = '';
      if(req.headers.x_access_token != ""){
        token = req.headers.x_access_token;
      }
      let user_id = req.query.user_id;
      let user = '';
      if(user_id){
        let total_post = await Post.find({ created_by: user_id });
        let posts = await Post.find({ created_by: user_id }).populate("video").populate("comment").populate("user").sort({_id : -1}).limit(page_size).skip(page_size * page);
        if(posts){
            await Promise.all(posts.map( async (element) => {
                if(element._id){
                    let postLike = await Postlike.findOne({ post_id: element._id, likedby: user_id });
                    if(postLike){
                        element.likedbyme = true;
                    }else{
                        element.likedbyme = false;
                    }
                    return element;
                }
            }))
            res.status(200).send({
                success: true,
                data: posts,
                total_records: total_post.length
            });
        }else{
            res.status(200).send({
                success: true,
                data: []
            });
        }
    }
    else if(token){
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let total_post = await Post.find({ created_by: userId });
        let posts = await Post.find({ created_by: userId }).populate("video").populate("comment").populate("user").sort({_id : -1}).limit(page_size).skip(page_size * page);
        if(posts){
            await Promise.all(posts.map( async (element) => {
                if(element._id){
                    let postLike = await Postlike.findOne({ post_id: element._id, likedby: userId });
                    if(postLike){
                        element.likedbyme = true;
                    }else{
                        element.likedbyme = false;
                    }
                    return element;
                }
            }))
            res.status(200).send({
                success: true,
                data: posts,
                total_records: total_post.length
            });
        }else{
            res.status(200).send({
                success: true,
                data: []
            });
        }
    }else{
        return res.status(200).send({
            success: false,
            data: "Something went wrong please try again!"
        });
    }
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
};

// Update POST API 
exports.updatePost = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let post_id = req.body.post_id;
        let title = req.body.title;
        // let tag = req.body.tag;
        // let equipment = req.body.equipment;
        // let goal = req.body.goal;
        // let difficuilty = req.body.difficuilty;
        // let location = req.body.location;
        let description = req.body.description;
        let audience = req.body.audience;
        let tag_friend = req.body.tag_friend;

        //tag
        let tag = req.body.tag;
        let tag_arr = [];
        if(tag){
            tag_arr = (new Function("return " + tag+ ";")());
        }
        if(tag_arr.length>0){
            tag_arr = tag_arr.map(v => v.toLowerCase());
        }
        //equipment
        let equipment = req.body.equipment;
        let equipment_arr = [];
        if(equipment){
            equipment_arr = (new Function("return " + equipment+ ";")());
        }
        if(equipment_arr.length>0){
            equipment_arr = equipment_arr.map(v => v.toLowerCase());
        }
        //goal
        let goal = req.body.goal;
        let goal_arr = [];
        if(goal){
            goal_arr = (new Function("return " + goal+ ";")());
        }
        if(goal_arr.length>0){
            goal_arr = goal_arr.map(v => v.toLowerCase());
        }
        //difficuilty
        let difficuilty = req.body.difficuilty;
        let difficuilty_arr = [];
        if(difficuilty){
            difficuilty_arr = (new Function("return " + difficuilty+ ";")());
        }
        if(difficuilty_arr.length>0){
            difficuilty_arr = difficuilty_arr.map(v => v.toLowerCase());
        }
        //difficuilty
        let location = req.body.location;
        let location_arr = [];
        if(location){
            location_arr = (new Function("return " + location+ ";")());
        }
        if(location_arr.length>0){
            location_arr = location_arr.map(v => v.toLowerCase());
        }
        if(post_id && title){
            let ifExitPost = await Post.findOne({ _id: post_id });
            if (ifExitPost) {
            let updatepost = await Post.findOneAndUpdate({ _id: post_id }, 
                {   title:title ,
                    tag:tag_arr,
                    equipment:equipment_arr ,
                    goal:goal_arr , 
                    difficuilty:difficuilty_arr , 
                    location:location_arr , 
                    description:description , 
                    audience:audience , 
                    tag_friend:tag_friend },
                {new:true});
                if(updatepost){
                    res.status(200).send({
                        success: true,
                        data: updatepost
                    }); 
                }
            }
        }else{
            res.status(200).send({
                success: false,
                data: "Something went wrong please try again!"
            });
        } 
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Delete POST 
exports.deletePost = async (req, res) => {
    try{
        let post_id = req.body.post_id;
        let post = await Post.findOneAndRemove({ _id: post_id });
        if(post){
            let postvideo = await Postvideo.deleteMany({ post_id: post_id });
            res.status(200).send({
                success: true,
                data: postvideo
            }); 
        }else{
            res.status(200).send({
                success: false,
                message: 'Something went wrong please try again!'
            });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};

// Like POST 
exports.likePost = async (req, res) => {
    try{
        let post_id = req.body.post_id;
        let like = req.body.like;
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let post = await Post.findOne({ _id: post_id });
        if(post && like == 'true'){
            let ifexit = await Postlike.findOne({ post_id: post_id, likedby: userId });
            if(ifexit){ 
                // Exiting user not like same post again
                res.send({ success: false, message: 'You already liked this post' });
            }else{
                // Save data into db
                let postlike = new Postlike({
                    post_id: post_id,
                    likedby: userId
                });
                postlike.save( async (err, postlike) => {
                    if (err) {
                        res.status(500).send({ success: false, message: err });
                        return;
                    }
                    let post_like_ = post.likes;
                    post_like_ ++;
                    await Post.updateOne(
                        { _id: post_id },
                        {
                            likes: post_like_
                        }
                    );
                    
                    // Post Owner (Send Notification)
                    let user = await User.findOne({ _id:post.created_by });
                    let device_token = user.device_token;
                    // Post Liked by
                    let loggedInUser = await User.findOne({ _id:userId });
                    var username = '';
                    if(loggedInUser.username){
                        username = loggedInUser.username;
                    }
                    var dataarr = [];
                    if(userId == post.created_by){
                        //
                    }else{
                        var mess_ = 'Your post liked by '+username;
                        var type = 'like';
                        var title_ = 'Post Like';
                        //var pushnotification = sendPushNoticiations(device_token, post_id, mess_, type, title);
                        var message = {
                            to: device_token, 
                            notification: {
                                title: title_, 
                                body: mess_,
                                type: type,
                                post_id: post_id
                            }
                        };
                        fcm.send(message, function(err, response){
                            if (err) {
                                console.log("Something has gone wrong!", err);
                            } else {
                                console.log("Successfully sent with response: ", response);  
                            }
                        });
                    }
                    const responce = { 'title':title_, 'body':mess_, 'post_id':post_id, 'type':type};
                    dataarr.push(responce);
                    res.send({ success: true, data: post, pushnotification: dataarr });
                });
            }
        }else{
            res.status(200).send({
                success: false,
                message: 'Something went wrong please try again!'
            });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};

// Unlike Post
exports.unlikePost = async (req, res) => {
    try{
        let post_id = req.body.post_id;
        let unlike = req.body.unlike;
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let post = await Post.findOne({ _id: post_id });
        if(post && unlike == 'true'){
            let ifexit = await Postlike.findOne({ post_id: post_id, likedby: userId });
            if(ifexit){
                // Delete data from postlike
                let dpost = await Postlike.findOneAndRemove({ post_id:post._id, likedby: userId });
                let post_like_ = post.likes;
                if(post_like_ > 0){
                    post_like_ --;
                    await Post.updateOne(
                        { _id: post_id },
                        {
                        likes: post_like_
                        }
                    );
                }
                return res.send({ success: true, data: post });
            }else{
                return res.status(200).send({
                    success: false,
                    message: 'Something went wrong please try again!'
                });
            }
        }else{
            return res.status(200).send({
                success: false,
                message: 'Something went wrong please try again!'
            });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};

// Get Users who liked POST 
exports.postLikedBy = async (req, res) => {
    try{
        let post_id = req.query.post_id;
        let posts = await Postlike.find({ post_id: post_id }).select({likedby : 1 , _id : 0});
        if(posts){
            let userIds = [];
            posts.map((item,index)=>{
                userIds.push(item.likedby);
            });
            let udata = await User.find({ _id: {$in : userIds} }).select({_id : 1, username : 1 , profile_image : 1, location : 1});
            res.status(200).send({
                success: true,
                data: udata
            });
        }else{
            res.status(200).send({
                success: false,
                data: ''
            });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};

// Add comment on post
exports.addComment = async (req, res) => {
    try{
        let post_id = req.body.post_id;
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let prnt_cmnt = req.body.parent_comment_id;
        if(prnt_cmnt){
            prnt_cmnt = prnt_cmnt;
        }else{
            prnt_cmnt = 0;
        }
        // Save comment into db
        let comment = new Comment({
            title: req.body.comment,
            post_id: post_id,
            parent_comment_id: prnt_cmnt,
            created_by: userId,
            likes: 0,
            likedbyme: 'false'
        });
        comment.save( async (err, comment) => {
            if (err) {
                res.status(500).send({ success: false, message: err });
                return;
            }
            await Post.updateOne(
                { _id: post_id },
                {
                $push: { comment: comment._id },
                }
            );
            // Update Comment tbale for parent and child relation
            if(comment.parent_comment_id != 0){
                await Comment.updateOne(
                    { _id: comment.parent_comment_id },
                    {
                      $push: { child_comment: comment._id },
                    }
                );
            }
            // update comment tbale for user relation
            await Comment.updateOne(
                { _id: comment._id },
                {
                  $push: { user_data: userId },
                }
            );
            // Update Post table for comment count
            let post = await Post.findOne({_id: post_id});
            if(comment.parent_comment_id == 0){
                if(post){
                    let comment_like_ = post.comment_count ? post.comment_count : 0;
                    comment_like_ ++;
                    // Update Post Like count in post table
                    await Post.updateOne(
                        { _id: post_id },
                        {
                            comment_count: comment_like_
                        }
                    );
                }
            }

            // Push Notifications
            // Post Owner
            let user = await User.findOne({ _id:post.created_by });
            let device_token = user.device_token;
            console.log('device_token',device_token)
            // Commendted By
            let loggedInUser = await User.findOne({ _id:userId });
            //device_token = 'ecF9r1IgrknQskZzAOjANf:APA91bFrlrOnqywBigQnn6jY7VeJhjra_uNvQ5O_DadJRRWevudThIWoVLDeC6SoydSAlJExHKWPqrqvzMTZ7xyCf1tHk4Gstit5HScQSgH1tlN2B71B-mCaFF1-x7AxQeLX9ZcE2U99';
            var username = '';
            if(loggedInUser.username){
                username = loggedInUser.username;
            }
            var dataarr = [];
            if(userId == post.created_by){
                //
            }else{
                var mess_ = username +' comment on your post.';
                var type = 'comment';
                var title_ = 'Comment on post';
                //var pushnotification = sendPushNoticiations(device_token, post_id, mess_, type, title);
                var message = {
                    to: device_token, 
                    notification: {
                        title: title_, 
                        body: mess_,
                        type: type,
                        post_id: post_id
                    }
                };
                fcm.send(message, function(err, response){
                    if (err) {
                        console.log("Something has gone wrong!", err);
                    } else {
                        console.log("Successfully sent with response: ", response);  
                    }
                });
            }
            const responce = { 'title':title_, 'body':mess_, 'post_id':post_id, 'type':type};
            dataarr.push(responce);

            res.status(200).send({
                success: true,
                data: comment,
                pushnotification: dataarr
            });
        });
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Comment Like 
exports.likeComment = async (req, res) => {
    try{
        let post_id = req.body.post_id;
        let comment_id = req.body.comment_id;
        let like = req.body.like;
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let post = await Post.findOne({ _id: post_id });
        let comment = await Comment.findOne({ _id: comment_id });
        // Like Comment
        if(post && comment && like == 'true'){
            let ifexit = await Commentlike.findOne({ post_id: post_id, comment_id: comment_id });
            if(ifexit){
                // Exiting user not like same post again
                res.send({ success: false, message: 'You already liked this comment' });
            }else{
                // Save data into db
                let commentlike = new Commentlike({
                    comment_id : comment_id,
                    post_id: post_id,
                    likedby: userId
                });
                commentlike.save( async (err, commentlike) => {
                    if (err) {
                        res.status(500).send({ success: false, message: err });
                        return;
                    }
                    let comment_like_ = comment.likes;
                    comment_like_ ++;
                    // Update Comment Like count
                    await Comment.updateOne(
                        { _id: comment_id },
                        {
                        likes: comment_like_
                        }
                    );
                    res.send({ success: true, data: comment_id });
                });
            }
        }
        // Unlike Comment
        else if(post && comment && like == 'false'){
            let ifexit = await Commentlike.findOne({ post_id: post_id, comment_id: comment_id });
            if(ifexit){
                // Delete data from commentlike
                let dcomment = await Commentlike.findOneAndRemove({ post_id: post_id, comment_id: comment_id });
                let comment_like_ = comment.likes;
                if(comment_like_ > 0){
                    comment_like_ --;
                    await Comment.updateOne(
                        { _id: comment_id },
                        {
                            likes: comment_like_
                        }
                    );
                }
                return res.send({ success: true, data: comment_id });
            }else{
                return res.status(200).send({
                    success: false,
                    message: 'You already unlike this comment'
                });
            }
        }
        else{
            res.status(200).send({
                success: false,
                message: 'Something went wrong please try again!'
            });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Comment Listing
exports.commentListing = async (req, res) => {
    try{
      let token = req.headers.x_access_token;
      let post_id = req.query.post_id;
      const page_size = req.query.page_size ? parseInt(req.query.page_size) : 0;
      const page = req.query.page ? parseInt(req.query.page) : 0;
      let post = await Post.findOne({ _id: post_id });
      if(post){
        let total_comment = await Comment.find({ _id : post.comment, parent_comment_id : { $eq: 0 }});
        let cmnt = await Comment.find({ _id : post.comment, parent_comment_id : { $eq: 0 } }).populate("user_data", '_id username profile_img').populate({path: 'child_comment',populate: { path: 'user_data', select: '_id username profile_img' }}).limit(page_size).skip(page_size * page).lean();
        //let arrdata = [] ;
        if(token){
            const decoded = jwt.verify(token, "bezkoder-secret-key");  
            let userId = decoded.id;
            await Promise.all(cmnt.map( async (element) => {
                if(element._id){
                    let commlike = await Commentlike.findOne({ comment_id : element._id, post_id :element.post_id, likedby: userId });
                    if(commlike){
                        element.likedbyme = true;
                        //arrdata.push(element)
                    }else{
                        element.likedbyme = false;
                        //arrdata.push(element)
                    }
                    return element;
                }
            })
            )
        }
        else{
            cmnt = await Comment.find({ _id : post.comment, parent_comment_id : { $eq: 0 } }).populate("user_data", '_id username profile_img').populate({path: 'child_comment',populate: { path: 'user_data', select: '_id username profile_img' }}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
        }
        res.status(200).send({
            success: true,
            data: cmnt,
            total_records: total_comment.length
        });
      }else{
        res.status(500).send({ success: false, message: "The post doesnot exist!"});
      }
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
};

// Flag Post 
exports.flagPostByUser = async (req, res) => {
    try{
        let post_id = req.body.post_id;
        let reason = req.body.reason;
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let post = await Post.findOne({ _id: post_id });
        if(post){
            let if_flaged = await Flagpost.findOne({ post_id: post_id, created_by:userId });
            if(if_flaged){
                // Already Flag by user
                res.status(200).send({
                    success: false,
                    message: 'You already flag this post!'
                });
            }else{
                let fpost = new Flagpost({
                    reason : reason,
                    post_id: post_id,
                    created_by: userId
                });
                fpost.save( async (err, fpost) => {
                    if (err) {
                        res.status(500).send({ success: false, message: err });
                        return;
                    }
                    res.send({ success: true, data: fpost });
                });
            }
        }else{
            res.status(200).send({
                success: false,
                message: 'Something went wrong please try again!'
            });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Post Listing home screen (Guest mode)
exports.postListingHome = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        const page_size = req.query.page_size ? parseInt(req.query.page_size) : 0;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        var postdata = [];
        var dd = {};
        let get_post_lenth = await Post.find({ audience: 'public' }).populate("user").populate("video");
        let post = '';
        if(token){
            post = await Post.find({ audience: 'public' }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            const decoded = jwt.verify(token, "bezkoder-secret-key");  
            let userId = decoded.id;
            await Promise.all(post.map( async (element) => {
                if(element._id){
                    let postLike = await Postlike.findOne({ post_id: element._id, likedby: userId });
                    // console.log('postLike',postLike)
                    if(postLike != null){
                        element.likedbyme = true;
                    }else{
                        element.likedbyme = false;
                    }
                    return element;
                }
            }))
        }else{
            post = await Post.find({ audience: 'public' }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
        }
        if(post){
            res.send({ success: true, data: post, total_records: get_post_lenth.length });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Create Folder (Bookmark)
exports.createFolder = async (req, res) => {
    try{
        let folder_name = req.body.name.toLowerCase();
        let cover_image = req.body.cover_image;
        // Verify user
        if(req.headers.x_access_token){
            let token = req.headers.x_access_token;
            const decoded = jwt.verify(token, "bezkoder-secret-key");  
            var userId = decoded.id;
            var folder = await createFolderCommon(userId, folder_name, cover_image);
            res.status(200).send({ success: true, data: folder }); 
        }else if(req.query.user_id != ""){
            // Guest user aleady register
            var userId = req.query.user_id;
            var folder = await createFolderCommon(userId, folder_name, cover_image);
            res.status(200).send({ success: true, data: folder }); 
        } else {
            // Guest user did not register
            var userId = '';
            // Save user into db
            let pre_user = new Preuser({
                phone_number: "",
                otp: "",
                username: 'user_'+randomUserName(5)
            });
            pre_user.save(async (err, pre_user) => {
                if (err) {
                res.status(500).send({ success: false, message: err });
                    return;
                }
                var userId = pre_user._id;

                let folder = await createFolderCommon(userId, folder_name, cover_image);
                
                res.status(200).send({ success: true, data: folder }); 
            });
        }
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
};

async function createFolderCommon(userId, folder_name, cover_image){
    if(userId != "" && userId != "undefined"){
        let checkIFExit = await Folder.find({name : folder_name, created_by : userId});
        if(checkIFExit.length > 0){
            return res.status(500).send({ success: false, message: 'Folder name already exists.' });
        }
        // Create folder into db
        let folder = new Folder({
            name: folder_name,
            cover_image: cover_image,
            created_by: userId
        });
        // var post_result = {};
        folder.save( async (err, folder) => {
            if (err) {
                return err;
            }
            return folder;   
        });
        return folder;   
    }
}

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

// Save Post To Folder (Bookmark)
exports.saveBookmarkPost = async (req, res) => {
    try{
        // Verify user
        if(req.headers.x_access_token){
            let token = req.headers.x_access_token;
            const decoded = jwt.verify(token, "bezkoder-secret-key");  
            var userId = decoded.id;
        }
        if(req.query.user_id){
            // Guest user aleady register
            var userId = req.query.user_id;
        }
        // console.log('userId',userId)
        let post_id = req.body.post_id;
        let folder_id = req.body.folder_id;
        let index_value = 1;
        let lastInserted = await Folderpost.find({ created_by : userId, folder_id:folder_id }).sort({_id:-1});
        if(lastInserted.length>0){
            if(lastInserted[0].index_value){
                index_value = (lastInserted[0].index_value + 1);
            }
        }
        let checkFolder = await Folder.find({ _id: folder_id });
        if(checkFolder){
            let post = await Post.find({ _id: post_id });
            if(post){
                let checkIfexists = await Folderpost.find({ post_id: post_id, folder_id: folder_id, created_by:userId });
                if(checkIfexists.length > 0){
                    return res.status(500).send({ success: false, message: 'Post inside folder already exists.' });   
                }
                // Save data into folder
                let f_post = new Folderpost({
                    post_id: req.body.post_id,
                    folder_id: folder_id,
                    created_by: userId,
                    index_value: index_value
                });
                f_post.save( async (err, f_post) => {
                    if (err) {
                        res.status(500).send({ success: false, message: err });
                        return;
                    }
                return res.status(200).send({ success: true, data: f_post });    
                });
            }else{
                return res.status(500).send({ success: false, message: 'Post doesnot exist!' });
            }
        }else{
            res.status(500).send({ success: false, message: 'Folder doesnot exist!' });
        }
    } catch (err) {
        return res.status(500).send({ success: false, message: err.message });
    }
};

// Re-arrange folder posts
exports.folderPostRearrange = async (req, res) => {
    try{
      let token = req.headers.x_access_token;
      const decoded = jwt.verify(token, "bezkoder-secret-key");  
      let userId = decoded.id;
      let post_id = req.body.post_id;
      let folder_id = req.body.folder_id;
      let new_index = req.body.new_index;
      let current_index = req.body.current_index;
      let checkFolder = await Folder.find({ _id: folder_id });
      let post_data = req.body.post_data;
      post_data = (new Function("return [" + post_data + "];")());
      if(checkFolder){
        await Promise.all(
            post_data.map( async (item,index)=>{
                var p_id = item.post_id;
                var i_val = item.index_value;
                let updatepost = await Folderpost.findOneAndUpdate({ post_id: p_id, folder_id:folder_id }, 
                    {index_value: i_val},
                    {new:true});
            })
        );
        return res.status(200).send({
            success: true,
            message: 'Data successfully updated.'
        }); 
      }else{
        res.status(500).send({ success: false, message: 'Folder doesnot exist!' });
      }
    } catch (err) {
        return res.status(500).send({ success: false, message: err.message });
    }
};


// Folder Listing (Bookmark Folder)
exports.folderListing = async (req, res) => {
    try{
        if(req.headers.x_access_token){
            let token = req.headers.x_access_token;
            const decoded = jwt.verify(token, "bezkoder-secret-key");  
            var userId = decoded.id;
        }
        if(req.query.user_id){
            // Guest user aleady register
            var userId = req.query.user_id;
        }
        const postdata = [];
        if(userId){
            let folders = await Folder.find({ created_by: userId}).sort({_id : -1});
            await Promise.all(folders.map( async (item,index)=>{
                if(item._id){
                    const f_post = await Folderpost.find({ folder_id:item._id});
                    var exercise_count = 0;
                    if(f_post){
                        exercise_count = f_post.length;
                    }
                }
                const responce = {_id : item._id, name: item.name, exercise: exercise_count+' Exercise', cover_image: item.cover_image};
                postdata.push(responce);
            }) );
            
            if(folders.length > 0){
                for (let index = 0; index < postdata.length; index++) {
                    if(postdata[index].cover_image == "" && postdata[index].cover_image != "undefined"){
                        let folder_posts = await Folderpost.find({ folder_id: postdata[index]._id});
                        if(folder_posts){
                            var ids = [];
                            var ind_postId = [];
                            await Promise.all(folder_posts.map( async (itemmm,innn)=>{
                                var post_ids = itemmm.post_id;
                                ids.push(post_ids);
                            })
                            );
                            
                            // get Posts from Ids
                            const posts = await Post.find({ '_id': { $in: ids } }).populate("user").populate("video");
                            await Promise.all(posts.map( async (element, ind) => {
                                if(element._id){
                                    // THUMBNAIL FROM THE FIRST VIDEO FROm THE FOLDER. 
                                    if(element.video.length > 0){
                                        var url = "";
                                        await Promise.all(folder_posts.map( async (v_item,v_index)=>{
                                            if(postdata[index].cover_image == "" && v_item.index_value == 1){
                                                const indexVid = await Post.findOne({ '_id': v_item.post_id }).populate("video");
                                                if(indexVid){
                                                    url = indexVid.video[0].thumbnail_id;
                                                    postdata[index].cover_image = url;
                                                }
                                            }
                                        }));
                                    }
                                }
                            }));
                        }
                    }
                }
            }
            res.status(200).send({ success: true, data: postdata });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};

// Post inside Folder (Bookmark)
exports.folderPostListing = async (req, res) => {
    try{
        // let token = req.headers.x_access_token;
        // const decoded = jwt.verify(token, "bezkoder-secret-key");  
        // let userId = decoded.id;
        if(req.headers.x_access_token){
            let token = req.headers.x_access_token;
            const decoded = jwt.verify(token, "bezkoder-secret-key");  
            var userId = decoded.id;
        }
        if(req.query.user_id){
            // Guest user aleady register
            var userId = req.query.user_id;
        }
        const postdata = [];
        const folder_id = req.query.folder_id;
        if(userId && folder_id){
            let folder = await Folder.find({ _id: folder_id, created_by:userId });
            if(folder.length>0){
                let folder_posts = await Folderpost.find({ folder_id: folder_id}).select({ post_id: 1, index_value:1 });
                if(folder_posts){
                    var ids = [];
                    await Promise.all(folder_posts.map( async (item,index)=>{
                        var post_ids = item.post_id;
                        ids.push(post_ids);
                    })
                    );
                    // get Posts from Ids
                    const posts = await Post.find({ '_id': { $in: ids } }).populate("user").populate("video");
                    await Promise.all(posts.map( async (element, ind) => {
                        if(element._id){
                            let postLike = await Postlike.findOne({ post_id: element._id, likedby: userId });
                            if(postLike){
                                element.likedbyme = true;
                            }else{
                                element.likedbyme = false;
                            }
                            for (let i = 0; i < folder_posts.length; i++) {
                                if(element._id == folder_posts[i].post_id){
                                    element.index_value = folder_posts[i].index_value;
                                }
                            }
                            // THUMBNAIL FROM THE FIRST VIDEO FROm THE FOLDER. 
                            // if(element.video.length > 0){
                            //     var vdo = element.video;
                            //     vdo.map( async (ele, inx) => {
                            //         if(folder[0].cover_image == ""){
                            //             if(ele.video_index == 0){
                            //                 folder[0].cover_image = ele.thumbnail_id;
                            //             }
                            //         }
                            //     });
                            // }
                            return element;
                        }
                    }));
                    const responce = {'folder_data' : folder, folder_posts: posts};
                    return res.status(200).send({ success: true, data: responce });
                }else{
                    return res.status(200).send({ success: false, data: 'Folder does not exist.' });
                }   
            }else{
                return res.status(200).send({ success: false, data: 'Folder does not exist.' });
            }  
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Delete Folder (Bookmark Folder)
exports.deleteFolder = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let folder_id = req.body.folder_id;
        if(userId){
            let foldersExit = await Folder.findOne({ _id: folder_id, created_by: userId});
            if(foldersExit){
                // Delete Data from folder table
                let folders = await Folder.findOneAndRemove({ _id: folder_id, created_by: userId});
                // Delete data from Folderpost table
                let folderpost = await Folderpost.deleteMany({ folder_id: folder_id, created_by: userId});
                res.status(200).send({
                    success: true
                }); 
            }else{
                res.status(200).send({
                    success: false,
                    message: 'Something went wrong please try again!'
                });
            }
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Delete Post from Folder (Bookmark)
exports.deleteFolderPost = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let folder_id = req.body.folder_id;
        let post_id = req.body.post_id;
        if(userId && post_id && folder_id){
            let ifPostExit = await Folderpost.findOne({ folder_id: folder_id, post_id: post_id});
            if(ifPostExit){
                // Delete data from Folderpost table
                let folderpost = await Folderpost.findOneAndRemove({ _id: ifPostExit._id});
                res.status(200).send({
                    success: true
                }); 
            }else{
                res.status(200).send({
                    success: false,
                    message: 'Something went wrong please try again!'
                });
            }
        }else{
            res.status(200).send({
                success: false,
                message: 'Something went wrong please try again!'
            });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Log Exercise Saved
exports.logExerciseSaved = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let post_id = req.body.post_id;
        let exercises_data = req.body.exercises_data;
        var exe_arr = [];
        if(userId && post_id){
            let ifPostExit = await Post.findOne({ _id: post_id});
            if(ifPostExit){
                // Save Exerice into db
                exercises_data = (new Function("return [" + exercises_data+ "];")());
                if(exercises_data.length>0){
                    var new_index = 0;
                    exercises_data.map( async (item,index)=>{
                        let weight_data = item.weight;
                        let split_weight = weight_data.split(" ");
                        let weight = split_weight[0] ? split_weight[0] : 0;
                        let weight_type = split_weight[1] ? split_weight[1] : 'lbs';
                        let exe = new Exercise({
                            set: item.set,
                            reps: item.reps,
                            weight: weight,
                            weight_type: weight_type,
                            post_id: req.body.post_id,
                            created_by: userId
                        });
                        exe.save( async (err, exe) => {
                            if (err) {
                                res.status(500).send({ success: false, message: err });
                                return;
                            }
                            new_index++;
                            exe_arr.push(exe);
                            if(exercises_data.length==new_index) {
                                res.status(200).send({ success: true, data: exe_arr });  
                            }
                        });
                    }); 
                }
            }else{
                res.status(200).send({
                    success: false,
                    message: 'Something went wrong please try again!'
                });
            }
        }else{
            res.status(200).send({
                success: false,
                message: 'Something went wrong please try again!'
            });
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Getting Last Pulldowns
exports.getPulldowns = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let post_id = req.query.post_id;
        if(userId){
            let ifPostExit = await Post.findOne({ _id: post_id});
            if(ifPostExit){
                //IF MORE THAN ONE SET HAS BOTH THE SAME "HIGEST WEIGHT" AND NUMBER OF REPS, THEN THE MOST RECENT DATE OF COMPLETION SHALL BE HIGHLIGHTED.
                // Get Max Reps
                var max_reps = await Exercise.find({post_id: post_id, created_by: userId}).sort({_id:-1}).limit(4);
                var reps_count = [];
                max_reps.map( async (element, indec) => {
                    var duplicate = element.reps;
                    var dupli_weight = element.weight;
                    var count = 0;
                    max_reps.map( async (ele, inx) => {
                        if(duplicate == ele.reps && dupli_weight == ele.weight){
                            count++;
                        }
                    });
                    reps_count.push(count);
                });
                var maxrep_weight = Math.max.apply(null, reps_count);
                // Grt Max Weight
                var max_weight = await Exercise.find({post_id: post_id, created_by: userId}).sort({_id:-1}).limit(4);
                var maxweight = [];
                var maxreps = [];
                max_weight.map( async (element, indec) => {
                    maxweight.push(element.weight);
                    maxreps.push(element.reps);
                });
                var weightmax = Math.max.apply(null, maxweight);
                var repsmax = Math.max.apply(null, maxreps);
                var exercise = [];
                // if(maxrep_weight>1){
                    // console.log('post_id',post_id)
                    // console.log('userId',userId)
                    exercise = await Exercise.find({ post_id: post_id, created_by: userId}).sort({_id : -1}).limit(4);
                    if(exercise.length>0){
                        var bestLbs = 0;
                        var bestReps = 0;
                        var bestIndex = 0
                        // await Promise.all(exercise.map( async (element, indec) => {
                        //     if(element._id){
                        //         if(element.weight == weightmax){
                        //             // element.isbest = true;
                        //             bestIndex = indec;
                        //         }
                        //         // else{
                        //             element.isbest = false;
                        //         // }
                        //         return element;
                        //     }
                        // }));

                        // for i in 0..<lbs.count {
                        //     if(bestLbs < Int(lbs[i]) ?? 0 || ((bestLbs == Int(lbs[i]) ?? 0) && (Int(reps[i]) ?? 0) > bestReps)) {
                        //       bestReps = Int(reps[i]) ?? 0
                        //       bestLbs = Int(lbs[i]) ?? 0
                        //     }
                        // }

                        for (let i = 0; i < exercise.length; i++) {
                            // console.log(exercise[i].weight)
                            var exc = exercise[i].weight;
                            var reps = exercise[i].reps;
                            if((bestLbs < exc) || (bestLbs == exc) && (reps > bestReps)) {
                                bestReps = reps;
                                bestLbs = exc;
                                bestIndex = i;
                            }
                        }
                        exercise[bestIndex].isbest = true;
                    }
                // }
                //IF MORE THAN ONE SET HAS SAME "HIGH WEIGHT". THEN THE SET WITH THE MOST REPS IS THE BEST SET.
                // else if(maxrep>1) {
                // else{
                //     console.log('sdsdsd')
                //     var exercise = await Exercise.find({ post_id: post_id, created_by: userId}).sort({_id : -1}).limit(4);
                //     await Promise.all(exercise.map( async (element, indec) => {
                //         if(element._id){
                //             if(element.reps == repsmax){
                //                 element.isbest = true;
                //             }else{
                //                 element.isbest = false;
                //             }
                //             return element;
                //         }
                //     }));
                // }

                res.status(200).send({
                    success: true,
                    data : exercise
                }); 
            }else{
                res.status(200).send({
                    success: false,
                    message: 'Something went wrong please try again!'
                });
            }
        }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Get Program List
exports.getPrograms = async (req, res) => {
    try{
        
        // let user_id = req.query.user_id;
        // if(user_id == "" && req.headers.x_access_token == ""){
        //     res.status(200).send({
        //         success: false,
        //         message: 'Something went wrong please try again!'
        //     });
        // }

        const collections = [{_id:'96510ef2aa43fw6wed52d', 'name':'Core Strenght', 'day':'Day 1', 'time_duration':'12 minutes', 'collection_image':'https://www.wellandgood.com/wp-content/uploads/2020/05/Stocksy-Kristen-Curette-Daemaine-Hines-functional-core-exercises.jpg'},
        {_id:'75til510ef2aa43fw6wed0', 'name':'Outer Abs', 'day':'Day 2', 'time_duration':'10 minutes', 'collection_image':'https://www.muscleandfitness.com/wp-content/uploads/2019/07/1109-ryan-terry-side-plank-lean-muscular-abs-core.jpg'},{_id:'15847359356822f2b69dff9d2', 'name':'Skip', 'day':'Day 3', 'time_duration':'20 minutes', 'collection_image':'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=871&q=80'},{_id:'75til510ef2aa43fw6wed0', 'name':'Jumping Jacks', 'day':'Day 4', 'time_duration':'15 minutes', 'collection_image':'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80'},{_id:'1055121f2fa2afe616wed0aqqv4', 'name':'Barbell', 'day':'Day 5', 'time_duration':'15 minutes', 'collection_image':'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80'},{_id:'75til510ef2aa43fw15834541', 'name':'Dumb-Bell', 'day':'Day 6', 'time_duration':'15 minutes', 'collection_image':'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80'}];

        const program_arr = [
            {_id : '63bbaa510ef2aa43d3b674e1', name: 'Ultimate Abs', price: '4.99', 'program':'One Week Program', 'cover_img':'https://images.unsplash.com/photo-1671726203463-f262325f1b02?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80', 'user_image':'https://cdn.pixabay.com/photo/2018/08/26/23/55/woman-3633737__480.jpg', 'username':'Maribelle Dev', 'designation':'Personal Trainer', 'description':'Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries', 'comment_count':'25', 'collections':collections},
            {_id : '63bb92f31beadf13f2820a46', name: 'Add 20 lbs. to your bench', price: '4.99', 'program':'One Week Program', 'cover_img':'https://images.unsplash.com/photo-1599058917212-d750089bc07e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=869&q=80' , 'user_image':'https://cdn.pixabay.com/photo/2018/08/26/23/55/woman-3633737__480.jpg', 'username':'Maribelle Dev', 'designation':'Personal Trainer', 'description':'Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries', 'comment_count':'25', 'collections':collections}];
        

        // if(user_id){
        //     user_id = user_id;
        // }else{
        //     let token = req.headers.x_access_token;
        //     const decoded = jwt.verify(token, "bezkoder-secret-key");  
        //     let userId = decoded.id;
        // }
        
        // if(userId){
            res.status(200).send({
                success: true,
                data : program_arr
            });
        // }
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};


// Search Based on Tags, difficuilty, Locations, Query 
exports.search = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        // Static Data for Programs
        
        const collections = [{_id:'96510ef2aa43fw6wed52d', 'name':'Core Strenght', 'day':'Day 1', 'time_duration':'12 minutes', 'collection_image':'https://www.wellandgood.com/wp-content/uploads/2020/05/Stocksy-Kristen-Curette-Daemaine-Hines-functional-core-exercises.jpg'},
        {_id:'75til510ef2aa43fw6wed0', 'name':'Outer Abs', 'day':'Day 2', 'time_duration':'10 minutes', 'collection_image':'https://www.muscleandfitness.com/wp-content/uploads/2019/07/1109-ryan-terry-side-plank-lean-muscular-abs-core.jpg'},{_id:'15847359356822f2b69dff9d2', 'name':'Skip', 'day':'Day 3', 'time_duration':'20 minutes', 'collection_image':'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=871&q=80'},{_id:'75til510ef2aa43fw6wed0', 'name':'Jumping Jacks', 'day':'Day 4', 'time_duration':'15 minutes', 'collection_image':'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80'},{_id:'1055121f2fa2afe616wed0aqqv4', 'name':'Barbell', 'day':'Day 5', 'time_duration':'15 minutes', 'collection_image':'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80'},{_id:'75til510ef2aa43fw15834541', 'name':'Dumb-Bell', 'day':'Day 6', 'time_duration':'15 minutes', 'collection_image':'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80'}];

        const program_arr = [
            {_id : '63bbaa510ef2aa43d3b674e1', name: 'Ultimate Abs', price: '4.99', 'program':'One Week Program', 'cover_img':'https://images.unsplash.com/photo-1671726203463-f262325f1b02?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80', 'user_image':'https://cdn.pixabay.com/photo/2018/08/26/23/55/woman-3633737__480.jpg', 'user_image':'https://cdn.pixabay.com/photo/2018/08/26/23/55/woman-3633737__480.jpg', 'username':'Maribelle Dev', 'designation':'Personal Trainer', 'description':'Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries', 'comment_count':'25', 'collections':collections},
            {_id : '63bb92f31beadf13f2820a46', name: 'Add 20 lbs. to your bench', price: '4.99', 'program':'One Week Program', 'cover_img':'https://images.unsplash.com/photo-1599058917212-d750089bc07e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=869&q=80' , 'user_image':'https://cdn.pixabay.com/photo/2018/08/26/23/55/woman-3633737__480.jpg' , 'user_image':'https://cdn.pixabay.com/photo/2018/08/26/23/55/woman-3633737__480.jpg', 'username':'Maribelle Dev', 'designation':'Personal Trainer', 'description':'Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries', 'comment_count':'25', 'collections':collections}
        ];
        // Searching
        var stringList = req.query.keyword;
        var _tag = req.query.tag;
        var _goal = req.query.goal;
        var _equipment = req.query.equipment;
        var _difficuilty = req.query.difficuilty;
        var _location = req.query.location;
        const page_size = req.query.page_size ? parseInt(req.query.page_size) : 0;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        let posts = '';
        var users = [];
        // Getting Peak Performer
        if(stringList){
            users = await User.find({username: {$regex: stringList, $options: 'i'} }).select({_id : 1, username : 1, profile_img : 1}).sort({_id : -1});
        }
        
        let tag = req.query.tag;
        let tag_arr = [];
        if(tag){
            tag_arr = (new Function("return " + tag+ ";")());
        }
        if(tag_arr.length>0){
            tag_arr = tag_arr.map(v => v.toLowerCase());
        }
        //goal
        let goal = req.query.goal;
        let goal_arr = [];
        if(goal){
            goal_arr = (new Function("return " + goal+ ";")());
        }
        if(goal_arr.length>0){
            goal_arr = goal_arr.map(v => v.toLowerCase());
        }
        //equipment
        let equipment = req.query.equipment;
        let equipment_arr = [];
        if(equipment){
            equipment_arr = (new Function("return " + equipment+ ";")());
        }
        if(equipment_arr.length>0){
            equipment_arr = equipment_arr.map(v => v.toLowerCase());
        }
        //difficuilty
        let difficuilty = req.query.difficuilty;
        let difficuilty_arr = [];
        if(difficuilty){
            difficuilty_arr = (new Function("return " + difficuilty+ ";")());
        }
        if(difficuilty_arr.length>0){
            difficuilty_arr = difficuilty_arr.map(v => v.toLowerCase());
        }
        //location
        let location = req.query.location;
        let location_arr = [];
        if(location){
            location_arr = (new Function("return " + location+ ";")());
        }
        if(location_arr.length>0){
            location_arr = location_arr.map(v => v.toLowerCase());
        }

        
        if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('1111111');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('222222');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('333333');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('444444');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
            if(token){
            posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                $and: [
                    {tag: {$in: tag_arr}},
                    {equipment: {$in: equipment_arr}},
                    {goal: {$in: goal_arr}},
                    {location: {$in: location_arr}},
                ]
            }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);;
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);;
            }
            console.log('5555555');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);;
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);;
            }
            
            console.log('6666666');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [,
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [,
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('7777777');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('8888888');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('999999');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('10101010');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('12121212');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('13131313');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {goal: {$in: goal_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {goal: {$in: goal_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('14141414');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {goal: {$in: goal_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {goal: {$in: goal_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('151515');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('16161616');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('16161616');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('17171717');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('18181818');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('19191919');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('20202020');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('212121');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {goal: {$in: goal_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {goal: {$in: goal_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('21212121');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('222222');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('23232323');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('2424242424');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {equipment: {$in: equipment_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('252525');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {goal: {$in: goal_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {goal: {$in: goal_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('262626');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('272727');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {difficuilty: {$in: difficuilty_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('282828');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        if(stringList && tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length == 0){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' } }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' } }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
            console.log('292929');
            var result = posts;
            // Pass Data
            const searchData = [
                {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
            ];
            // Return data
            return res.status(200).send({
                success: true,
                data : searchData
            }); 
        }
        console.log('000000');
        users = await User.find({}).select({_id : 1, username : 1, profile_img : 1}).sort({_id : -1});
        if(token){
            posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' }
                // $and: [
                //     {tag: {$in: tag_arr}},
                //     {equipment: {$in: equipment_arr}},
                //     {goal: {$in: goal_arr}},
                //     {difficuilty: {$in: difficuilty_arr}},
                //     {location: {$in: location_arr}},
                // ]
            }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
        }else{
            posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' }
                // $and: [
                //     {tag: {$in: tag_arr}},
                //     {equipment: {$in: equipment_arr}},
                //     {goal: {$in: goal_arr}},
                //     {difficuilty: {$in: difficuilty_arr}},
                //     {location: {$in: location_arr}},
                // ]
            }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
        }
        var result = posts;
        // Pass Data
        const searchData = [
            {'peak_performers':users},{'program_arr':program_arr},{'posts':result}
        ];
        // Return data
        return res.status(200).send({
            success: true,
            data : searchData
        }); 
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};

// Search Based on Tags, Difficulty, Locations, Query (Main Search)
exports.mainSearch = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        
        // Searching
        var stringList = req.query.keyword;
        var _tag = req.query.tag;
        var _goal = req.query.goal;
        var _equipment = req.query.equipment;
        var _difficuilty = req.query.difficuilty;
        var _location = req.query.location;
        const page_size = req.query.page_size ? parseInt(req.query.page_size) : 0;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        let posts = '';


        let tag = req.query.tag;
        let tag_arr = [];
        if(tag){
            tag_arr = (new Function("return " + tag+ ";")());
        }
        if(tag_arr.length>0){
            tag_arr = tag_arr.map(v => v.toLowerCase());
        }
        //goal
        let goal = req.query.goal;
        let goal_arr = [];
        if(goal){
            goal_arr = (new Function("return " + goal+ ";")());
        }
        if(goal_arr.length>0){
            goal_arr = goal_arr.map(v => v.toLowerCase());
        }
        //equipment
        let equipment = req.query.equipment;
        let equipment_arr = [];
        if(equipment){
            equipment_arr = (new Function("return " + equipment+ ";")());
        }
        if(equipment_arr.length>0){
            equipment_arr = equipment_arr.map(v => v.toLowerCase());
        }
        //difficuilty
        let difficuilty = req.query.difficuilty;
        let difficuilty_arr = [];
        if(difficuilty){
            difficuilty_arr = (new Function("return " + difficuilty+ ";")());
        }
        if(difficuilty_arr.length>0){
            difficuilty_arr = difficuilty_arr.map(v => v.toLowerCase());
        }
        //location
        let location = req.query.location;
        let location_arr = [];
        if(location){
            location_arr = (new Function("return " + location+ ";")());
        }
        if(location_arr.length>0){
            location_arr = location_arr.map(v => v.toLowerCase());
        }

        if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length>0 ){
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {difficuilty: {$in: difficuilty_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
                console.log('1111111');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                }); 
            }
            if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('222222');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('333333');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                }); 
            }
            if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('444444');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                }); 
            }
            if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
                if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                    $and: [
                        {tag: {$in: tag_arr}},
                        {equipment: {$in: equipment_arr}},
                        {goal: {$in: goal_arr}},
                        {location: {$in: location_arr}},
                    ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);;
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);;
                }
                console.log('5555555');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);;
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);;
                }
                
                console.log('6666666');
               // Return data
               return res.status(200).send({
                    success: true,
                    data : posts
                }); 
            }
            if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [,
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [,
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('7777777');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('8888888');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                }); 
            }
            if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('999999');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                }); 
            }
            if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('10101010');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('12121212');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('13131313');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {goal: {$in: goal_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {goal: {$in: goal_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('14141414');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {goal: {$in: goal_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {goal: {$in: goal_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('151515');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('16161616');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('16161616');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('17171717');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('18181818');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('19191919');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                }); 
            }
            if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('20202020');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {difficuilty: {$in: difficuilty_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('212121');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {goal: {$in: goal_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {goal: {$in: goal_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('21212121');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                            {equipment: {$in: equipment_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('222222');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length>0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {location: {$in: location_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('23232323');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                            {goal: {$in: goal_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('2424242424');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length>0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {equipment: {$in: equipment_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('252525');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length>0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {goal: {$in: goal_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {goal: {$in: goal_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('262626');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(tag_arr.length>0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {tag: {$in: tag_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('272727');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                }); 
            }
            if(tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length>0 && location_arr.length == 0 ){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' },
                        $and: [
                            {difficuilty: {$in: difficuilty_arr}},
                        ]
                    }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('282828');
                // Return data
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            if(stringList && tag_arr.length == 0 && equipment_arr.length == 0 && goal_arr.length == 0 && difficuilty_arr.length == 0 && location_arr.length == 0){
                if(token){
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' } }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
                }else{
                    posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' } }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
                }
                console.log('292929');
                return res.status(200).send({
                    success: true,
                    data : posts
                });
            }
            console.log('000000');
    
            if(token){
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' }
                    // $and: [
                    //     {tag: {$in: tag_arr}},
                    //     {equipment: {$in: equipment_arr}},
                    //     {goal: {$in: goal_arr}},
                    //     {difficuilty: {$in: difficuilty_arr}},
                    //     {location: {$in: location_arr}},
                    // ]
                }).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
            }else{
                posts = await Post.find({ title: { $regex: '.*' + stringList + '.*',$options:'i' }
                    // $and: [
                    //     {tag: {$in: tag_arr}},
                    //     {equipment: {$in: equipment_arr}},
                    //     {goal: {$in: goal_arr}},
                    //     {difficuilty: {$in: difficuilty_arr}},
                    //     {location: {$in: location_arr}},
                    // ]
                }).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
            }
        
        // Return data
        return res.status(200).send({
            success: true,
            data : posts
        }); 

        // let filter = {};
        // if(stringList){
        //     filter = { ...filter , title: { $regex: '.*' + stringList + '.*' } };
        // } 
        // if(_difficuilty){
        //     filter = { ...filter , difficuilty : _difficuilty};
        // } 
        // if(_location){
        //     filter = { ...filter , location : _location};
        // }
        // if(token){
        //     posts = await Post.find( filter ).populate("user").populate("video").sort({_id : -1}).limit(page_size).skip(page_size * page);
        // }else{
        //    posts = await Post.find( filter).populate("user").populate("video").sort({_id : -1}).select({ likedbyme : 0 }).limit(page_size).skip(page_size * page);
        // }
        // // Filter Comma Seprate 
        // let search = [];
        // let data = posts.map((item)=> {
        //     if(item.tag){
        //         if(item.tag.indexOf(_tag) > -1 && item.equipment.indexOf(_equipment) > -1 && item.goal.indexOf(_goal) > -1){
        //             search.push(item);
        //         }
        //     }
        // });

        // //If comma separated value search
        // if(search.length > 0){
        //     var result = search;
        // }else{
        //     // If normal value search
        //     var result = posts;
        // }
        
        // // Return data
        // return res.status(200).send({
        //     success: true,
        //     data : result
        // }); 
    } catch (err) {
        res.status(500).send({ success: false, message: err.message });
    }
};



// Create Goal
exports.createGoal = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let goal_name = req.body.name.toLowerCase();
        let checkIFExit = await Goal.find({name : goal_name});

        if(checkIFExit.length > 0){
            return res.status(500).send({ success: false, message: 'Goal name already exists.' });
        }
        // Create Goal into db
        let goal = new Goal({
            name: goal_name,
            created_by: userId
        });
        goal.save( async (err, goal) => {
            if (err) {
                res.status(500).send({ success: false, message: err });
                return;
            }
        res.status(200).send({ success: true, data: goal });    
    });  
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
};

// Create Equipment
exports.createEquipment = async (req, res) => {
    try{
        let token = req.headers.x_access_token;
        const decoded = jwt.verify(token, "bezkoder-secret-key");  
        let userId = decoded.id;
        let equipment_name = req.body.name.toLowerCase();
        let checkIFExit = await Equipment.find({name : equipment_name});
        if(checkIFExit.length > 0){
            return res.status(500).send({ success: false, message: 'Equipment name already exists.' });
        }
        // Create Equipment into db
        let equipment = new Equipment({
            name: equipment_name,
            created_by: userId
        });
        equipment.save( async (err, equipment) => {
            if (err) {
                res.status(500).send({ success: false, message: err });
                return;
            }
        res.status(200).send({ success: true, data: equipment });    
    });  
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
};