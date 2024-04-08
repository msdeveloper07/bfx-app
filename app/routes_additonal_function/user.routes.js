const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x_access_token, Origin, Content-Type, Accept"
    );
    next();
  });
  // Add Device Token
  app.post("/api/user/add-device-token", [authJwt.verifyToken], controller.addDeviceToken);
  // Get User Meta Like Tags, Difficulty, Location etc
  app.get("/api/user/get-user-meta", controller.getUserMeta);
  // Get User data for both user eg loggedin and loggedout
  app.get("/api/user/get-user", controller.getUser);
  // Get User data for both user eg loggedin and loggedout
  app.post("/api/user/user-update", [authJwt.verifyToken], controller.updateUser);
  // Update user notification
  app.post("/api/user/update-notification", [authJwt.verifyToken], controller.updateNotification);
};

