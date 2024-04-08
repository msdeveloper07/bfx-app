const mongoose = require("mongoose");

const Post = mongoose.model(
  "Post",
  new mongoose.Schema({
    title: String,
    tag: [],
    equipment: [],
    goal: [],
    difficuilty: [],
    location: [],
    description: String,
    audience: String,
    tag_friend: String,
    created_by: String,
    likes: String,
    comment_count: {
      type: String,
      default: 0
    },
    video: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Postvideo"
    }],
    comment: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment"
    }],
    user: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    goals: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal"
    }],
    index_value: {
      type: Number,
      default: 0
    },
    likedbyme: String
  })
);
module.exports = Post;
