const { authJwt } = require("../middlewares");
const controller = require("../controllers/post.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x_access_token, Origin, Content-Type, Accept"
    );
    next();
  });
  // Create Post
  app.post("/api/post/create-post", [authJwt.verifyToken], controller.createPost);
  // Update Post
  app.post("/api/post/update-post", [authJwt.verifyToken], controller.updatePost);
  // Get My posts (LoggedIn User)
  app.get("/api/post/get-myposts", controller.getMyPosts);
  // Delete Post
  app.post("/api/post/delete-post", [authJwt.verifyToken], controller.deletePost);
  // Like Post
  app.post("/api/post/like-post", [authJwt.verifyToken], controller.likePost);
  // Unlike Post
  app.post("/api/post/unlike-post", [authJwt.verifyToken], controller.unlikePost);
  // Get Users who liked POST 
  app.get("/api/post/post-liked-by", controller.postLikedBy);
  // Get Single Post Data
  app.get("/api/post/single-post", controller.getSinglePost);
  // Add comment on post
  app.post("/api/post/add-comment", [authJwt.verifyToken], controller.addComment);
  // Like/Unlike Comment
  app.post("/api/post/like-unlike-comment", [authJwt.verifyToken], controller.likeComment);
  // Comment Listing with pagination
  app.get("/api/post/comment-listing", controller.commentListing);
  // Flag post
  app.post("/api/post/flag-post", [authJwt.verifyToken], controller.flagPostByUser);
  // Post Listing home screen (Guest mode)
  app.get("/api/post/home-post-listing", controller.postListingHome);
  // Create Folder (Bookmark)
  app.post("/api/post/create-folder", [authJwt.verifyToken], controller.createFolder);
  // Save Post To Folder (Bookmark)
  app.post("/api/post/save-post-to-folder", [authJwt.verifyToken], controller.saveBookmarkPost);
  // Folder Listing (Bookmark)
  app.get("/api/post/folder-listing", [authJwt.verifyToken], controller.folderListing);
  // Post inside Folder (Bookmark)
  app.get("/api/post/folder-post-listing", [authJwt.verifyToken], controller.folderPostListing);
  // Delete Folder (Bookmark)
  app.post("/api/post/delete-folder", [authJwt.verifyToken], controller.deleteFolder);
  // Delete Post from Folder (Bookmark)
  app.post("/api/post/delete-post-bookmark", [authJwt.verifyToken], controller.deleteFolderPost);
  // Re-arrange folder posts
  app.post("/api/post/folder-post-rearrange", [authJwt.verifyToken], controller.folderPostRearrange);
  // Log Exercise Saved
  app.post("/api/post/log-exercise-save", [authJwt.verifyToken], controller.logExerciseSaved);
  // Last Pulldowns
  app.get("/api/post/get-pulldowns", [authJwt.verifyToken], controller.getPulldowns);
  // Get Program List
  app.get("/api/post/programs", controller.getPrograms);
  // Search Based on Tags, Difficulty, Locations, Query
  app.get("/api/post/search", controller.search);
  // Search Based on Tags, Difficulty, Locations, Query (Main Search)
  app.get("/api/post/main-search", controller.mainSearch);
  // Create Goal
  app.post("/api/post/create-goal", [authJwt.verifyToken], controller.createGoal);
  // Create Goal
  app.post("/api/post/create-equipment", [authJwt.verifyToken], controller.createEquipment);
};