const mongoose = require("mongoose");

const Comment = mongoose.model(
  "Comment",
  new mongoose.Schema({
    title: String,
    post_id: {type: mongoose.Types.ObjectId, ref: "Post"},
    parent_comment_id: String,
    created_by: String,
    likes: String,
    created_at: {type: Date, default: Date.now},
    likedbyme: String,
    child_comment: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment"
    }],
    user_data: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  })
);
module.exports = Comment;
