const express = require("express");
const router = express.Router();
const loginController = require("../controllers/admin/loginController");
const upload = require("../middlewares/multerConfig"); // Adjust the path as needed
const userController = require("../controllers/admin/userController");
const paymentController = require("../controllers/admin/paymentController");
const adminapiController = require("../controllers/admin/adminapiController");
const adminapibasicController = require("../controllers/admin/adminapibasicController");
// Define the POST /login route
router.post("/login", loginController.login);

router.post("/getallusers", userController.getallusers);
router.post("/deleteusers", userController.deleteusers);
router.post("/editprofile", userController.editprofile);
router.post("/getallmedia", userController.getallmedia);
router.post("/deletemedia", userController.deletemedia);
router.post("/getallgroups", userController.getallgroups);
router.post("/deletegroup", userController.deletegroup);
router.post("/getallforum", userController.getallforum);
router.post("/deleteforum", userController.deleteforum);
router.post("/getallmessaging", userController.getallmessaging);
router.post("/deletemessage", userController.deletemessage);
router.post("/getallpayment", paymentController.getallpayment);
router.post("/gettotalgroups", adminapiController.gettotalgroups);
router.post("/gettotalevents", adminapiController.gettotalevents);
router.post("/gettotalforum", adminapiController.gettotalforum);
router.post("/gettotalspeeddate", adminapiController.gettotalspeeddate);
router.post("/getallusersreport", adminapiController.getallusersreport);
router.post("/getuserdetail", adminapiController.getuserdetail);
router.post("/updateProfile", adminapiController.updateProfile);
router.post("/getallmediaComments", adminapiController.getallmediaComments);
router.post("/getallmediaLikes", adminapiController.getallmediaLikes);
router.post("/getallgroupsComments", adminapiController.getallgroupsComments);
router.post("/getallgroupLikes", adminapiController.getallgroupLikes);
router.post("/paymentrefund", paymentController.paymentrefund);
router.post("/getuserdetailAll", adminapiController.getuserdetailAll);
router.post("/gettotalSaleRevenue", adminapiController.gettotalSaleRevenue);
router.post("/getrecentSale", adminapiController.getrecentSale);
router.post("/getrecentMessage", adminapiController.getrecentMessage);
router.post("/getLatestUsers", adminapiController.getLatestUsers);
router.post("/getinvoieData", adminapiController.getinvoieData);
router.post("/getUserMultipleLogin", adminapiController.getUserMultipleLogin);
router.post(
  "/privacyinformationSave",
  adminapiController.privacyinformationSave
);
router.post("/getprivacydetail", adminapiController.getprivacydetail);
//adminapibasicController
router.post("/getuserfriendlist", adminapibasicController.getuserfriendlist);
router.post("/getusereventlist", adminapibasicController.getusereventlist);
router.post("/getusergrouplist", adminapibasicController.getusergrouplist);
router.post("/getusereventJoin", adminapibasicController.getusereventJoin);
router.post(
  "/getusereventinterested",
  adminapibasicController.getusereventinterested
);
router.post("/getusereventInvite", adminapibasicController.getusereventInvite);
router.post(
  "/getusergroupinterested",
  adminapibasicController.getusergroupinterested
);
router.post("/getusergroupinvite", adminapibasicController.getusergroupinvite);
router.post("/getuserjoinGroup", adminapibasicController.getuserjoinGroup);
router.post("/getgroupPostData", adminapibasicController.getgroupPostData);
router.post("/getgroupData", adminapibasicController.getgroupData);
router.post("/deletegrouppost", adminapibasicController.deletegrouppost);
router.post(
  "/deletegrouppostComment",
  adminapibasicController.deletegrouppostComment
);
router.post(
  "/deletegrouppostLike",
  adminapibasicController.deletegrouppostLike
);
router.post(
  "/getallgroupinteresteduser",
  adminapibasicController.getallgroupinteresteduser
);
router.post("/deletemediacomment", adminapibasicController.deletemediacomment);
router.post(
  "/getallforumComments",
  adminapibasicController.getallforumComments
);
router.post("/deleteforumComment", adminapibasicController.deleteforumComment);
router.post(
  "/gettotalSaleRevenueYearly",
  adminapibasicController.gettotalSaleRevenueYearly
);
router.post(
  "/adminEditevent",
  upload.single("image"),
  adminapibasicController.adminEditevent
);
router.post(
  "/adminEditgroup",
  upload.single("image"),
  adminapibasicController.adminEditgroup
);
router.post("/getusertotalgroups", adminapibasicController.getusertotalgroups);
router.post("/getusertotalevents", adminapibasicController.getusertotalevents);
router.post("/getusertotalforum", adminapibasicController.getusertotalforum);
router.post(
  "/getusertotalspeeddate",
  adminapibasicController.getusertotalspeeddate
);
module.exports = router;
