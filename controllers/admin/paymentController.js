const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../db");
const moment = require("moment-timezone");
const Stripe = require("stripe");
const stripe = Stripe(
  "sk_test_51ODoJFAQYHZn8ah9WDYZSBSjs4pRWQshcZfYhaSBJNQnVzi6kbDisu9wIqlrdbmcTOmmG95HHujZ1PvEYLp6ORhe00K0D8eLz5"
); // Replace with your actual secret key

require("dotenv").config();

exports.getallpayment = (req, res) => {
  var user_id = req.body.user_id;
  // Query the database to get the user by email
  db.query(
    `SELECT u.id,u.profile_image,u.username,u.email, m.* 
     FROM users u 
     JOIN allmembership m ON u.id = m.user_id 
     WHERE refund IS NULL And user_id =? ORDER BY m.id DESC`,
    [user_id],
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }
      res.status(200).json({ result: results });
    }
  );
};
exports.getallpaymentrefund = (req, res) => {
  // Query the database to get the user by email
  var user_id = req.body.user_id;
  db.query(
    `SELECT u.id,u.profile_image,u.username,u.email, m.* 
     FROM users u 
     JOIN allmembership m ON u.id = m.user_id 
     where m.refund ='Succeeded'  And user_id =? ORDER BY m.id DESC`,
    [user_id],
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }
      res.status(200).json({ result: results });
    }
  );
};
exports.paymentrefund = async (req, res) => {
  const { paymentIntentId } = req.body; // Extract the payment intent ID from the request body

  try {
    // Refund the payment using the Stripe API
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId, // The ID of the payment intent to refund
    });
    updatemembership(paymentIntentId);
    // Respond with the refund result
    res.status(200).json({
      success: true,
      result: refund,
    });
  } catch (error) {
    // Handle any errors that occur during the refund process
    //console.error("Refund Error:", error);
    res.status(200).json({
      success: false,
      message: "Error processing the refund",
      error: error.message,
    });
  }
};
function updatemembership(paymentIntentId) {
  // First update the membership table
  db.query(
    "UPDATE membership SET refund = 'Succeeded' WHERE payment_id = ?",
    [paymentIntentId],
    (updateErr, result) => {
      if (updateErr) {
        console.error("Error updating membership table:", updateErr);
        return;
      }
      var date = moment
        .tz(new Date(), "Europe/Oslo")
        .format("YYYY-MM-DD HH:mm:ss");
      // After the first update is successful, update the allmembership table
      db.query(
        "UPDATE allmembership SET refund = 'Succeeded',refund_date=? WHERE payment_id = ?",
        [date, paymentIntentId],
        (updateErr, result) => {
          if (updateErr) {
            console.error("Error updating allmembership table:", updateErr);
            return;
          }

          console.log("Both tables updated successfully");
        }
      );
    }
  );
}
