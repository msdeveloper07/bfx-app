const { verifySignUp } = require("../middlewares");
const controller = require("../controllers/auth.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x_access_token, Origin, Content-Type, Accept"
    );
    next();
  });

    app.post(
        "/api/auth/signup",
        [
        verifySignUp.checkDuplicateUsernameOrEmail,
        verifySignUp.checkRolesExisted
        ],
        controller.signup
    );
    app.post("/api/auth/signin", controller.signin);

    // User Login Register (Send OTP on Mobile number)
    app.post("/api/auth/send-otp",controller.sendOtp);
    // ReSend OTP on Mobile number
    app.post("/api/auth/resend-otp",controller.reSendOtp);
    // Verify OTP
    app.post("/api/auth/verify-otp", controller.verifyOtp);
};