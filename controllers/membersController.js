const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const moment = require("moment-timezone");
const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const nodemailer = require("nodemailer");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const Stripe = require("stripe");
const stripe = new Stripe(
  "sk_test_51ODoJFAQYHZn8ah9WDYZSBSjs4pRWQshcZfYhaSBJNQnVzi6kbDisu9wIqlrdbmcTOmmG95HHujZ1PvEYLp6ORhe00K0D8eLz5"
);

app.use((req, res, next) => {
  req.wss = wss;
  next();
});

// Broadcast function to send messages to all connected clients
const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};
//console.log(wss);
// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New client connected");
  ws.send(JSON.stringify({ message: "Welcome to the WebSocket server!" }));

  ws.on("message", (message) => {
    // Handle incoming messages and broadcast them
    console.log(`Received message: ${message}`);
    broadcast(message);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
exports.getAllMembers = async (req, res) => {
  var user_id = req.body.user_id;
  try {
    // Ensure the email is provided

    // Query the database to get the user's profile details
    db.query(
      `SELECT 
        u.*, 
        CASE 
            WHEN fr.status = 'Yes' THEN true 
            ELSE false 
        END AS is_friend,
        fr.status AS friend_status
    FROM 
        users u
    LEFT JOIN 
        friendRequest_accept fr 
        ON (u.id = fr.sent_to AND fr.user_id = ?) 
        OR (u.id = fr.user_id AND fr.sent_to = ?)
    ;
`,
      [user_id, user_id],
      (err, row) => {
        console.log(row);
        return res.status(200).json({ results: row });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.getcheckfriendss = async (req, res) => {
  var user_id = req.body.user_id;
  var to_id = req.body.to_id;
  try {
    // Query the database to check if the users are friends
    db.query(
      `SELECT 
        u.*, 
        CASE 
            WHEN fr.status = 'Yes' THEN true 
            ELSE false 
        END AS is_friend,
        fr.status AS friend_status
    FROM 
        users u
    LEFT JOIN 
        friendRequest_accept fr 
        ON (u.id = fr.sent_to AND fr.user_id = ?) 
        OR (u.id = fr.user_id AND fr.sent_to = ?)
    WHERE 
        (u.id = ? OR u.id = ?);`,
      [user_id, to_id, user_id, user_id], // Parameters to check both users
      (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error executing query", error: err });
        }

        // Return the results
        return res.status(200).json({ results: results });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
// exports.getAllMembers = async (req, res) => {
//   var user_id = req.body.user_id;
//   try {
//     // Ensure the email is provided

//     // Query the database to get the user's profile details
//     db.query(
//       `SELECT
//         u.*,
//         CASE
//             WHEN fr.status = 'Yes' THEN true
//             ELSE false
//         END AS is_friend
//         FROM
//             users u
//         LEFT JOIN
//             friendRequest_accept fr
//         ON
//             (u.id = fr.sent_to AND fr.user_id = ?) OR
//             (u.id = fr.user_id AND fr.sent_to = ?) where u.id != ? And fr.status = 'Yes';`,
//       [user_id, user_id, user_id],
//       (err, results) => {
//         return res.status(200).json({ results: results });
//       }
//     );
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// };

exports.getUserDetailMember = async (req, res) => {
  var id = req.body.id;
  var user_id = req.body.user_id;
  var to_id = req.body.to_id;
  try {
    // Ensure the email is provided

    // Query the database to get the user's profile details
    db.query(
      `SELECT 
        users.*, 
        userphotoprivate.user_id, 
        userphotoprivate.to_id, 
        userphotoprivate.status As uStatus
    FROM 
        users 
    LEFT JOIN 
        userphotoprivate ON userphotoprivate.to_id = users.id 
        AND userphotoprivate.user_id = ?
    WHERE 
        users.id = ?
        AND (userphotoprivate.status = 'Yes' OR userphotoprivate.status IS NULL OR userphotoprivate.status = 'No')
        AND (userphotoprivate.to_id = ? OR userphotoprivate.to_id IS NULL)
    ORDER BY 
        users.id DESC;`,
      [user_id, id, to_id],
      (err, row) => {
        return res.status(200).json({ row: row });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getEvent_s = async (req, res) => {
  const { user_id } = req.body;
  console.log(req.body);
  console.log("ch");
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      "SELECT * FROM events WHERE user_id = ? And makeImagePrivate = ? ORDER BY id DESC",
      [user_id, "0"],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Events retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getAllfriend_s = async (req, res) => {
  var user_id = req.body.user_id;
  //console.log(user_id);
  try {
    // Ensure the email is provided
    if (!user_id) {
      return res.status(400).json({ message: "User id  is required" });
    }

    // Query the database to get the user's profile details
    db.query(
      `SELECT 
          u.*, 
          fr.status 
      FROM 
          users u 
      JOIN 
          friendRequest_accept fr 
      ON 
          (u.id = fr.sent_to AND fr.user_id = ?) OR 
          (u.id = fr.user_id AND fr.sent_to = ?) 
      WHERE 
          fr.status = ?;
`,
      [user_id, user_id, "Yes"],
      (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        res.status(200).json({
          message: "All friend",
          results: results, // Return the first event object
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getCheck_friend = async (req, res) => {
  console.log(req.body);
  const { id, user_id } = req.body;

  try {
    // Ensure user_id and id are provided
    if (!user_id || !id) {
      return res
        .status(400)
        .json({ message: "Both user_id and id are required" });
    }

    // Query to check if the user is a friend or not
    const query = `
      SELECT 
      u.*, 
      fr.status 
      FROM 
          users u 
      JOIN 
          friendRequest_accept fr 
      ON 
          (u.id = fr.sent_to AND fr.user_id = ?) 
          OR (u.id = fr.user_id AND fr.sent_to = ?) 
      WHERE  (fr.user_id = ? OR fr.sent_to = ?) 
          AND u.id != ?;
;
    `;

    db.query(
      query,
      [user_id, id, user_id, id, user_id], // Added correct number of parameters
      (err, row) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        if (row.length === 0) {
          return res
            .status(200)
            .json({ message: "No friends found", results: row });
        }

        res.status(200).json({
          message: "Friendship status retrieved successfully",
          results: row, // Return the friend rows
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getCheck_friendUser = async (req, res) => {
  console.log(req.body);
  const { id, user_id } = req.body;

  try {
    // Ensure user_id and id are provided
    if (!user_id || !id) {
      return res
        .status(400)
        .json({ message: "Both user_id and id are required" });
    }

    // Query to check if the user is a friend or not
    const query = `
      SELECT 
      u.*, 
      fr.status 
      FROM 
          users u 
      JOIN 
          friendRequest_accept fr 
      ON 
          (u.id = fr.sent_to AND fr.user_id = ?) 
          OR (u.id = fr.user_id AND fr.sent_to = ?) 
      WHERE  (fr.user_id = ? OR fr.sent_to = ?) 
          AND u.id != ? And fr.status='Yes';
;
    `;

    db.query(
      query,
      [user_id, user_id, id, id, user_id], // Added correct number of parameters
      (err, row) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        if (row.length === 0) {
          return res
            .status(200)
            .json({ message: "No friends found", results: row });
        }

        res.status(200).json({
          message: "Friendship status retrieved successfully",
          results: row, // Return the friend rows
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
async function sendEmailFor_FriendRequestNotification(too, name, callback) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "amourette.no@gmail.com",
      pass: "ozox fcff dftd mguf",
    },
  });

  const mailOptions = {
    from: "amourette.no@gmail.com",
    to: too, // Recipient (Atul's email)
    subject: `${name} sent you a friend request on Amourette!`, // Personalized subject
    text: `Hello,\n\n${name} has sent you a friend request on Amourette.\n\nLogin now to accept or decline the request.\n\nBest regards,\nAmourette Team`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

exports.sendFriendRequest = async (req, res) => {
  const { user_id, sent_id } = req.body;
  const wss = req.wss; // Get the WebSocket server instance from the request
  try {
    // Ensure user_id and sent_to are provided
    if (!user_id || !sent_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and sent_id are required" });
    }
    var date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    // Insert friend request into the database
    const querycheck = `
SELECT * FROM friendrequest_accept WHERE (user_id = ? AND sent_to = ?) OR (user_id = ? AND sent_to = ?);`;
    db.query(
      querycheck,
      [user_id, sent_id, sent_id, user_id],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }
        if (results.length > 0) {
          res.status(200).json({
            message: "Friend request already sent,Please check friend list",
          });
        } else {
          const query = `
          INSERT INTO friendRequest_accept (user_id, sent_to, status,date) 
          VALUES (?, ?, ?,?);
        `;

          db.query(query, [user_id, sent_id, "No", date], (err, result) => {
            if (err) {
              return res.status(500).json({
                message: "Database insertion error",
                error: err,
              });
            }
            const broadcastMessage = JSON.stringify({
              event: "sendfriendRequest",
              user_id: sent_id,
            });
            //console.log(wss);
            if (wss) {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  // console.log(client.to_id);

                  client.send(broadcastMessage);
                }
              });
            }
            const queryy = `SELECT 
                    MAX(CASE WHEN id = ? THEN email END) AS user1_email,
                    MAX(CASE WHEN id = ? THEN email END) AS user2_email,
                    MAX(CASE WHEN id = ? THEN username END) AS user1_username,
                    MAX(CASE WHEN id = ? THEN username END) AS user2_username,
                    MAX(CASE WHEN id = ? THEN notification_friend_request END) AS user1_notification_friend_request,
                    MAX(CASE WHEN id = ? THEN notification_friend_request END) AS user2_notification_friend_request
                FROM users`;
            db.query(
              queryy,
              [sent_id, user_id, sent_id, user_id, sent_id, user_id],
              (err, row) => {
                if (err) {
                  return res.status(500).json({
                    message: "Database query error",
                    error: err,
                  });
                }
                var name = row[0].user1_username;
                var sentto_name = row[0].user2_username;
                var email = row[0].user2_email;
                var check1 = row[0].user1_notification_friend_request;

                if (check1 === "Yes") {
                  sendEmailFor_FriendRequestNotification(
                    email,
                    sentto_name,
                    (info) => {
                      res.send(info);
                    }
                  );
                }
                var mesg = " sent " + name + " friend request";

                logActivity(user_id, mesg);
              }
            );
            const query = `
                        SELECT 
                            * from users where id =?;`;
            db.query(query, [user_id], (err, row) => {
              if (err) {
                return res.status(500).json({
                  message: "Database query error",
                  error: err,
                });
              }
              var name = row[0].username;
              var mesg = name + " sent you a friend request";

              db.query(
                "INSERT INTO notification (user_id, message, date) VALUES (?, ?, ?)",
                [sent_id, mesg, date],
                (err, result) => {
                  if (err) {
                    console.error(
                      "Database insertion error for user_id:",
                      user_id,
                      err
                    );
                  } else {
                  }
                }
              );
            });

            res.status(200).json({
              message: "Friend request sent successfully",
            });
          });
        }
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getuserChatmessage = async (req, res) => {
  const { user_id, to_id } = req.body;
  console.log(req.body);
  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !to_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and to_id are required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
      SELECT 
        cm.*,
        cm.read, 
        u1.profile_image AS user1_profile, 
        u2.profile_image AS user2_profile,
        u1.id AS user1_id,
        u2.id AS user2_id,
        u1.makeImagePrivate AS user1_makeImagePrivate,  
        u2.makeImagePrivate AS user2_makeImagePrivate
            
            
      FROM 
        chatmessages cm
      JOIN 
        users u1 ON cm.user_id = u1.id
      JOIN 
        users u2 ON cm.to_id = u2.id
      WHERE 
        (cm.user_id = ? AND cm.to_id = ?) OR 
        (cm.user_id = ? AND cm.to_id = ?)
      ORDER BY cm.date ASC; 
    `;

    // Fetching the messages
    db.query(query, [user_id, to_id, to_id, user_id], (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the chat messages in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
async function sendEmailFor_ReceivingNotification(
  too,
  name,
  message,
  callback
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "amourette.no@gmail.com",
      pass: "ozox fcff dftd mguf",
    },
  });

  const mailOptions = {
    from: "amourette.no@gmail.com",
    to: too,
    subject: `You received a new message from ${name} on Amourette`, // Corrected grammar
    text: `Hello,\n\nYou have received a new message from ${name} on Amourette.\n\nMessage: "${message}"\n\nLog in now to view and reply.\n\nBest regards,\nAmourette Team`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

exports.saveUserChat = async (req, res) => {
  const { user_id, to_id, message } = req.body;
  //console.log(req.body);

  const wss = req.wss; // Get the WebSocket server instance from the request

  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !to_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and to_id are required" });
    }

    // Prepare the current date
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // Retrieve file URLs from the request
    const fileUrls = req.files ? req.files.map((file) => file.location) : []; // Get S3 URLs from uploaded files

    // Prepare data to save into the database
    const data = {
      user_id: user_id,
      to_id: to_id,
      files: JSON.stringify(fileUrls), // Store the files array as a JSON string
      message: message, // Insert the message
      date: date,
    };

    // Insert the message along with file URLs into a single database row
    db.query(
      "INSERT INTO chatmessages (user_id, to_id, file, message, date) VALUES (?, ?, ?, ?, ?)",
      [data.user_id, data.to_id, data.files, data.message, data.date],
      (insertErr, result) => {
        if (insertErr) {
          // console.error("Database insert error:", insertErr);
          return res.status(500).json({
            message: "Database insert error",
            error: insertErr,
            status: "",
          });
        }
        const lastInsertId = result.insertId;
        // Broadcast the message to WebSocket clients
        const broadcastMessage = JSON.stringify({
          event: "ChatMessage",
          user_id: user_id,
          to_id: to_id,
          message: message,
          file: fileUrls, // Send files as an array
          date: date,
          lastInsertId: lastInsertId,
        });
        const queryy = `SELECT 
                    MAX(CASE WHEN id = ? THEN email END) AS user1_email,
                    MAX(CASE WHEN id = ? THEN email END) AS user2_email,
                    MAX(CASE WHEN id = ? THEN username END) AS user1_username,
                    MAX(CASE WHEN id = ? THEN username END) AS user2_username,
                    MAX(CASE WHEN id = ? THEN notification_message END) AS user1_notification_message,
                    MAX(CASE WHEN id = ? THEN notification_message END) AS user2_notification_message
                FROM users`;
        db.query(
          queryy,
          [to_id, user_id, to_id, user_id, to_id, user_id],
          (err, row) => {
            if (err) {
              return res.status(500).json({
                message: "Database query error",
                error: err,
              });
            }
            var name = row[0].user1_username;
            var sentto_name = row[0].user2_username;
            var email = row[0].user2_email;
            var check1 = row[0].user1_notification_message;
            var mesg = message;

            if (check1 === "Yes") {
              sendEmailFor_ReceivingNotification(
                email,
                sentto_name,
                mesg,
                (info) => {
                  res.send(info);
                }
              );
            }

            logActivity(
              user_id,
              `sent a message to user with : ${sentto_name}`
            );
          }
        );

        if (wss) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              console.log(client.to_id);

              client.send(broadcastMessage);
            }
          });
        }

        // Return success response
        res.status(200).json({
          message: message,
          user_id: user_id,
          to_id: to_id,
          file: fileUrls,
          status: "1",
        });
      }
    );
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getSEndMessage = async (req, res) => {
  const { data } = req.body;
  console.log(req.body);
  try {
    // Ensure user_id and to_id are provided
    const { user_id, to_id } = data; // Destructure user_id and to_id

    // Query to fetch chat messages between user_id and to_id
    const query = `
          SELECT 
              cm.*, 
            u1.profile_image AS user1_profile, 
            u1.makeImagePrivate AS user1_makeImagePrivate, 
            u2.profile_image AS user2_profile, 
            u2.makeImagePrivate AS user2_makeImagePrivate
          FROM 
              chatmessages cm
          JOIN 
              users u1 ON cm.user_id = u1.id
          JOIN 
              users u2 ON cm.to_id = u2.id
          WHERE 
              (cm.user_id = ? AND cm.to_id = ?) OR 
              (cm.user_id = ? AND cm.to_id = ?)
          ORDER BY 
              cm.date DESC LIMIT 1
      `;

    // Fetching the messages
    db.query(query, [user_id, to_id, to_id, user_id], (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the chat messages in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getAllgallery = async (req, res) => {
  const { user_ids } = req.body; // Expecting a string of user IDs

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Prepare SQL query to fetch galleries for multiple user IDs
    const query = `
          SELECT g.*, u.username, u.profile_type, u.gender
          FROM gallery g
          JOIN users u ON g.user_id = u.id
          WHERE g.user_id IN (${user_ids})  -- Use IN clause to filter by multiple user IDs
          ORDER BY g.id DESC;
      `;

    // Fetching the galleries
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the gallery data in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getAllfriends = async (req, res) => {
  const { user_id } = req.body;
  try {
    // Ensure user_id and to_id are provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
     SELECT 
    u.*, 
    CASE 
        WHEN fr.status = 'Yes' THEN true 
        ELSE false 
    END AS is_friend,
    CASE 
        WHEN bu.user_id IS NOT NULL THEN true 
        ELSE false 
    END AS is_blocked
FROM 
    users u 
JOIN 
    friendRequest_accept fr 
    ON (u.id = fr.sent_to AND fr.user_id = ?) 
    OR (u.id = fr.user_id AND fr.sent_to = ?) 
LEFT JOIN 
    blockuser bu 
    ON (u.id = bu.user_id AND bu.to_id = ?) 
    OR (u.id = bu.to_id AND bu.user_id = ?)
WHERE 
    fr.status = 'Yes' 
    AND (
        bu.user_id IS NULL  -- Not blocked by the user
        AND bu.to_id IS NULL -- User has not blocked the current user
    );
  -- Ensure that the friend request is accepted`;

    // Fetching the messages
    db.query(query, [user_id, user_id, user_id, user_id], (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the chat messages in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getgallery = async (req, res) => {
  const { user_id } = req.body;
  try {
    // Ensure user_id and to_id are provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
      SELECT g.*, u.username,u.profile_type,u.gender
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id = ? And u.id = ?  ORDER BY g.id DESC; `;

    // Fetching the messages
    db.query(query, [user_id, user_id], (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the chat messages in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid characters
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/--+/g, "-"); // Replace multiple hyphens with a single one
}

// Function to create a unique slug
function createUniqueSlug(title, callback) {
  const slug = generateSlug(title);

  // Check if the slug already exists
  db.query(
    "SELECT COUNT(*) as count FROM gallery WHERE slug = ?",
    [slug],
    (err, rows) => {
      if (err) {
        return callback(err); // Handle the error
      }

      // If the slug exists, add a number to the end and check again
      if (rows[0].count > 0) {
        let i = 1;
        const checkSlug = () => {
          const newSlug = `${slug}-${i}`;
          db.query(
            "SELECT COUNT(*) as count FROM gallery WHERE slug = ?",
            [newSlug],
            (err, newRows) => {
              if (err) {
                return callback(err); // Handle the error
              }
              if (newRows[0].count === 0) {
                return callback(null, newSlug); // Return the new unique slug
              }
              i++;
              checkSlug(); // Check again with the incremented slug
            }
          );
        };
        checkSlug(); // Start checking with the incremented slug
      } else {
        callback(null, slug); // Return the original slug if it's unique
      }
    }
  );
}

exports.gallerysave = async (req, res) => {
  const {
    user_id,
    name,
    makeImageUse,
    description,
    image, // Optional, depending on your needs
  } = req.body;

  // Validate required fields
  if (!user_id || !name || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const wss = req.wss;
  try {
    // Create Date objects and validate

    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    var mp = req.body.makeImageUse;
    mp = mp === true || mp === "true" ? 1 : 0;
    if (makeImageUse === "true" || makeImageUse === true) {
      var galleryImage = req.body.image; // Assuming `image` is passed as a URL or path
    } else if (req.file) {
      // If a new file is uploaded, use the file's location
      var galleryImage = req.file?.location || null;
    }
    // Generate a unique slug for the event name
    createUniqueSlug(name, (err, slug) => {
      if (err) {
        console.error("Slug generation error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err });
      }

      if (mp === 1) {
        db.query(
          "INSERT INTO gallery (makeImageUse,slug, image, user_id, name, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [mp, slug, galleryImage, user_id, name, description, date],
          (err, result) => {
            if (err) {
              console.error("Database insertion error:", err); // Log error to console
              return res.status(500).json({
                message: "Database insertion error",
                error: err,
              });
            }

            const query = `
            SELECT 
                u.*,
                CASE 
                    WHEN fr.status = 'Yes' THEN true 
                    ELSE false 
                END AS is_friend
                
            FROM 
                users u 
            JOIN 
                friendRequest_accept fr ON 
                    (u.id = fr.sent_to AND fr.user_id = ?) OR 
                    (u.id = fr.user_id AND fr.sent_to = ?) 
            
            WHERE 
                fr.status = 'Yes'  -- Ensure that the friend request is accepted;;`;

            // Fetching the messages
            db.query(query, [user_id, user_id], (err, results) => {
              if (err) {
                return res.status(500).json({
                  message: "Database query error",
                  error: err,
                });
              }
              // console.log("dddd");
              // console.log(results);
              const broadcastMessage = JSON.stringify({
                event: "gallerynotification",
                user_id: results,
                LoginData: results,
              });
              // console.log(wss);
              if (wss) {
                wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    // console.log(client.to_id);

                    client.send(broadcastMessage);
                  }
                });
              }
              res.status(201).json({
                message: "Gallery1 created successfully",
                galleryId: result.insertId,
                user_id: user_id,
                slug: slug, // Return the generated slug
              });
              logActivity(user_id, `created a new gallery post successfully`);
              results.forEach((item) => {
                const user_id = item.id; // Use `id` from the results array

                db.query(
                  "INSERT INTO notification (user_id, message, date) VALUES (?, ?, ?)",
                  [user_id, " posted a new photo", date],
                  (err, result) => {
                    if (err) {
                      console.error(
                        "Database insertion error for user_id:",
                        user_id,
                        err
                      );
                    } else {
                      // console.log(
                      //   "Successfully inserted notification for user_id:",
                      //   user_id
                      // );
                    }
                  }
                );
              });
            });
          }
        );
      } else {
        db.query(
          "INSERT INTO gallery (makeImageUse,slug, image, user_id, name, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [mp, slug, galleryImage, user_id, name, description, date],
          (err, result) => {
            if (err) {
              console.error("Database insertion error:", err); // Log error to console
              return res
                .status(500)
                .json({ message: "Database insertion error", error: err });
            }
            const query = `
                    SELECT 
                        u.*,
                        CASE 
                            WHEN fr.status = 'Yes' THEN true 
                            ELSE false 
                        END AS is_friend
                        
                    FROM 
                        users u 
                    JOIN 
                        friendRequest_accept fr ON 
                            (u.id = fr.sent_to AND fr.user_id = ?) OR 
                            (u.id = fr.user_id AND fr.sent_to = ?) 
                    
                    WHERE 
                        fr.status = 'Yes'  -- Ensure that the friend request is accepted;;`;

            // Fetching the messages
            db.query(query, [user_id, user_id], (err, results) => {
              if (err) {
                return res.status(500).json({
                  message: "Database query error",
                  error: err,
                });
              }
              // console.log("dddd");
              // console.log(results);
              const broadcastMessage = JSON.stringify({
                event: "gallerynotification",
                user_id: results,
                LoginData: results,
              });
              //console.log(wss);
              if (wss) {
                wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    // console.log(client.to_id);

                    client.send(broadcastMessage);
                  }
                });
              }
              res.status(200).json({
                message: "Gallery created successfully",
                galleryId: result.insertId,
                user_id: user_id,
                slug: slug, // Return the generated slug
              });
              logActivity(user_id, `created a new gallery post successfully`);
              results.forEach((item) => {
                const user_id = item.id; // Use `id` from the results array

                db.query(
                  "INSERT INTO notification (user_id, message, date) VALUES (?, ?, ?)",
                  [user_id, " posted a new photo", date],
                  (err, result) => {
                    if (err) {
                      console.error(
                        "Database insertion error for user_id:",
                        user_id,
                        err
                      );
                    } else {
                      console.log(
                        "Successfully inserted notification for user_id:",
                        user_id
                      );
                    }
                  }
                );
              });
            });
          }
        );
      }
      // Insert the event data including the slug
    });
  } catch (error) {
    console.error("Event creation error:", error); // Log error to console
    res.status(500).json({ message: "Event creation error", error });
  }
};

exports.getGalleryDetail = async (req, res) => {
  const { id, user_id } = req.body;
  try {
    // Ensure user_id and to_id are provided
    if (!id) {
      return res.status(400).json({ message: "ID is required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
     SELECT g.*, 
       u.username, 
       u.profile_type, 
       u.gender, 
       u.profile_image,
       COUNT(gf.id) AS total_favourites,
       CASE 
         WHEN EXISTS (
           SELECT 1 
           FROM gallery_favourite gf2 
           WHERE gf2.gallery_id = g.id AND gf2.user_id = ?
         ) THEN 1
         ELSE 0
       END AS user_favourited
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN gallery_favourite gf ON g.id = gf.gallery_id
      WHERE g.id = ?
      GROUP BY g.id, u.username, u.profile_type, u.gender, u.profile_image;
;
      `;

    // Fetching the messages
    db.query(query, [user_id, id], (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the chat messages in the response
      return res.status(200).json({ row });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getUserDetail = async (req, res) => {
  const { user_id } = req.body;
  try {
    // Ensure user_id and to_id are provided
    if (!user_id) {
      return res.status(400).json({ message: "ID is required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
      SELECT * from users where id=?`;

    // Fetching the messages
    db.query(query, [user_id], (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the chat messages in the response
      return res.status(200).json({ row });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.galleryPostLike = async (req, res) => {
  const { id, user_id } = req.body;
  const wss = req.wss;

  // Validate required fields
  if (!id || !user_id) {
    return res.status(400).json({ message: "ID and User ID are required." });
  }

  try {
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // Check if the entry already exists
    const checkExistsQuery = `SELECT * FROM gallery_favourite WHERE user_id = ? AND gallery_id = ?`;
    db.query(checkExistsQuery, [user_id, id], (err, row) => {
      if (err) {
        console.error("Database query error:", err);
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }

      if (row.length > 0) {
        // If exists, update the existing record by deleting it
        const deleteQuery = `DELETE FROM gallery_favourite WHERE user_id = ? AND gallery_id = ?`;
        db.query(deleteQuery, [user_id, id], (deleteErr) => {
          if (deleteErr) {
            console.error("Database delete error:", deleteErr);
            return res
              .status(500)
              .json({ message: "Database delete error", error: deleteErr });
          }
          // Broadcast the unliking event
          handleBroadcast(user_id, id, wss, date, res);
        });
      } else {
        // If not exists, insert a new record
        const insertQuery = `INSERT INTO gallery_favourite (gallery_id, user_id, date) VALUES (?, ?, ?)`;
        db.query(insertQuery, [id, user_id, date], (insertErr) => {
          if (insertErr) {
            console.error("Database insert error:", insertErr);
            return res
              .status(500)
              .json({ message: "Database insert error", error: insertErr });
          }
          // Broadcast the liking event
          handleBroadcast(user_id, id, wss, date, res);
        });
      }
    });
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

// Function to handle broadcasting of like/unlike events
function handleBroadcast(user_id, id, wss, date, res) {
  const userQuery = `SELECT g.*, 
    u.username, 
    u.profile_image,
    COUNT(gf.id) AS total_favourites,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM gallery_favourite gf2 
        WHERE gf2.gallery_id = g.id AND gf2.user_id = ?
      ) THEN 1
      ELSE 0
    END AS user_favourited
    FROM gallery g
    JOIN users u ON g.user_id = u.id
    LEFT JOIN gallery_favourite gf ON g.id = gf.gallery_id
    WHERE g.id = ?
    GROUP BY g.id, u.username, u.profile_image`;

  db.query(userQuery, [user_id, id], (err, userResult) => {
    if (err || userResult.length === 0) {
      return res
        .status(500)
        .json({ message: "User not found or query error", error: err });
    }

    const {
      username,
      profile_image,
      description,
      user_favourited,
      total_favourites,
    } = userResult[0];

    // Create the broadcast message
    const broadcastMessage = JSON.stringify({
      event: "GalleryLike",
      user_favourited: user_favourited,
      user_id: user_id,
      total_favourites: total_favourites,
      gallery_id: id,
      description: description,
      username: username, // Include username
      date: date, // Use the current date
      profile_image: profile_image, // Include profile image URL
    });

    // Ensure that wss exists and is broadcasting
    if (wss) {
      try {
        console.log("Broadcasting message to clients...");
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
        console.log("Message broadcasted successfully.");
      } catch (error) {
        console.error("WebSocket broadcast error:", error);
      }
    } else {
      console.log("WebSocket Server not attached");
    }

    res.status(201).json({
      message: "Gallery Favourite created successfully.",
      status: "1",
    });
  });
}

exports.getGalleryComments = async (req, res) => {
  const { id, user_id } = req.body;
  console.log(req.body);
  // Validate required fields
  if (!id || !user_id) {
    return res.status(400).json({ message: "ID and User ID are required." });
  }

  try {
    // Check if the entry already exists

    const query = `
      SELECT gc.*, 
       u.username,u.makeImagePrivate, 
       u.profile_image
      FROM gallery_comment gc
      JOIN users u ON gc.user_id = u.id
      WHERE gc.gallery_id = ?;
    `;

    // Fetching the messages
    db.query(query, [id], (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the chat messages in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.GalleryPostSave = async (req, res) => {
  const { description, gallery_id, user_id } = req.body;
  const wss = req.wss;

  try {
    if (!gallery_id || !user_id) {
      return res
        .status(400)
        .json({ message: "Gallery ID and User ID are required" });
    }

    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    const insertQuery = `INSERT INTO gallery_comment (gallery_id, user_id, description, date) VALUES (?, ?, ?, ?)`;

    db.query(
      insertQuery,
      [gallery_id, user_id, description, date],
      (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database insertion error", error: err });
        }

        const lastInsertId = result.insertId;

        // Fetch user details to include in the broadcast message
        const userQuery = `SELECT username, profile_image,makeImagePrivate FROM users WHERE id = ?`;

        db.query(userQuery, [user_id], (err, userResult) => {
          if (err || userResult.length === 0) {
            return res
              .status(500)
              .json({ message: "User not found or query error", error: err });
          }

          const { username, profile_image, makeImagePrivate } = userResult[0];

          const broadcastMessage = JSON.stringify({
            event: "GalleryPost",
            user_id: user_id,
            gallery_id: gallery_id,
            username: username, // Include username
            message: description,
            makeImagePrivate: makeImagePrivate,
            date: date, // Include date
            profile_image: profile_image, // Include profile image URL
            lastInsertId: lastInsertId, // Include the last insert ID
          });
          const query = `SELECT * from gallery where id = ?;`;

          // Fetching the messages
          db.query(query, [gallery_id], (err, row) => {
            if (err) {
              return res.status(500).json({
                message: "Database query error",
                error: err,
              });
            }
            var gname = row[0].name;
            logActivity(user_id, `commented on the gallery ` + gname + ``);
          });

          // Ensure that wss exists and is broadcasting
          if (wss) {
            try {
              console.log("Broadcasting message to clients...");
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(broadcastMessage);
                }
              });
              console.log("Message broadcasted successfully.");
            } catch (error) {
              console.error("WebSocket broadcast error:", error);
            }
          } else {
            console.log("WebSocket Server not attached");
          }

          return res.status(201).json({
            message: "Comment added successfully",
            commentId: result.insertId,
          });
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getgallerySearch = async (req, res) => {
  const { user_id, search } = req.body;

  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Prepare search terms with wildcards for partial matching
    const searchTerm = search ? `%${search}%` : "%"; // If no search term is provided, match all

    // Query to fetch gallery items based on user_id and search terms
    const query = `
      SELECT g.*, u.username, u.profile_type, u.gender
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id = ?
      AND (g.name LIKE ? OR g.description LIKE ? OR u.username LIKE ?)
      ORDER BY g.id DESC;`;

    // Fetching the gallery items
    db.query(
      query,
      [user_id, searchTerm, searchTerm, searchTerm],
      (err, results) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }

        // Sending the results in the response
        return res.status(200).json({ results });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getAllgallerySearch = async (req, res) => {
  const { user_ids, search } = req.body; // Expecting a string of user IDs

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Prepare search term with wildcards for partial matching
    const searchTerm = search ? `%${search}%` : "%"; // Match all if no search term is provided

    // Prepare SQL query to fetch galleries for multiple user IDs
    const query = `
      SELECT g.*, u.username, u.profile_type, u.gender
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id IN (${user_ids})  -- Use IN clause to filter by multiple user IDs
      AND (g.name LIKE ? OR g.description LIKE ? OR u.username LIKE ?)  -- Search filter
      ORDER BY g.id DESC;
    `;

    // Fetching the galleries
    db.query(query, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the gallery data in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.searchfilter = async (req, res) => {
  const { user_ids, search } = req.body;

  console.log("user_ids:", user_ids);
  console.log("search:", search);

  try {
    // Ensure user_ids is provided and is an array
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ message: "Valid user IDs are required" });
    }

    // Prepare the search term (expecting an array or empty)
    const searchTerm = Array.isArray(search) ? search : [];

    // Initialize query parameters
    const queryParams = [user_ids]; // Add user_ids first for "IN (?)"

    // Dynamically build the WHERE clause for gender
    let whereClause = "";

    if (searchTerm.length > 0) {
      whereClause += " AND (";
      searchTerm.forEach((term, index) => {
        whereClause += "u.gender = ?";
        queryParams.push(term); // Add gender terms dynamically to queryParams

        if (index < searchTerm.length - 1) {
          whereClause += " OR ";
        }
      });
      whereClause += ")";
    }

    // Prepare the final SQL query

    const query = `
    SELECT g.*, u.username, u.gender, u.female, u.male, u.couple
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id IN (?) ${whereClause}
    `;

    console.log("Final Query:", query);
    console.log("Query Params:", queryParams);

    // Execute the query
    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Send the results
      return res.status(200).json({ results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.requestToview = async (req, res) => {
  const { user_id, to_id } = req.body;
  //console.log(req.body);

  const wss = req.wss; // Get the WebSocket server instance from the request

  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !to_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and to_id are required" });
    }

    // Prepare the current date
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // Insert the message along with file URLs into a single database row
    // First, check if the record exists
    db.query(
      "SELECT * FROM userphotoPrivate WHERE user_id = ? AND to_id = ?",
      [user_id, to_id],
      (selectErr, selectResults) => {
        if (selectErr) {
          return res.status(500).json({
            message: "Database select error",
            error: selectErr,
          });
        }
        console.log(selectResults);
        // If the record exists, return status "2"
        if (selectResults.length > 0) {
          if (selectResults[0].status === "No") {
            return res.status(200).json({
              user_id: user_id,
              to_id: to_id,
              status: "2",
            });
          }
          if (selectResults[0].status === "Yes") {
            return res.status(200).json({
              user_id: user_id,
              to_id: to_id,
              status: "3",
            });
          }
        } else {
          // If no record exists, proceed to insert
          const date = new Date(); // Ensure you set the date correctly
          db.query(
            "INSERT INTO userphotoPrivate (user_id, to_id, status, date) VALUES (?, ?, ?, ?)",
            [user_id, to_id, "No", date],
            (insertErr, result) => {
              if (insertErr) {
                return res.status(500).json({
                  message: "Database insert error",
                  error: insertErr,
                  status: "",
                });
              }

              const lastInsertId = result.insertId;

              // Broadcast the message to WebSocket clients
              const broadcastMessage = JSON.stringify({
                event: "Requestview",
                user_id: user_id,
                to_id: to_id,
                lastInsertId: lastInsertId,
              });

              if (wss) {
                wss.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    console.log(client.to_id);
                    client.send(broadcastMessage);
                  }
                });
              }

              // Return success response
              res.status(200).json({
                user_id: user_id,
                to_id: to_id,
                status: "1",
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.RequestConfirm = async (req, res) => {
  const { req_id, to_id, user_id } = req.body;
  //console.log(req.body);

  const wss = req.wss; // Get the WebSocket server instance from the request

  try {
    // Ensure user_id and to_id are provided
    if (!req_id) {
      return res.status(400).json({ message: "Both Id id required" });
    }

    // Prepare the current date

    db.query(
      "UPDATE userphotoPrivate SET status = ? WHERE id = ?",
      ["Yes", req_id],
      (updateErr, result) => {
        if (updateErr) {
          return res.status(500).json({
            message: "Database update error",
            error: updateErr,
          });
        }

        // Check if any rows were affected (i.e., if the update was successful)
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "No record found with this ID." });
        }

        const broadcastMessage = JSON.stringify({
          event: "Requestconfirm",
          to_id: to_id,
          user_id: user_id,
        });

        if (wss) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              console.log(client.to_id);
              client.send(broadcastMessage);
            }
          });
        }

        // Return success response
        res.status(200).json({
          message: "Record updated successfully.",
          to_id: to_id,
          user_id: user_id,
        });
      }
    );
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.Requestdelete = async (req, res) => {
  const { req_id, to_id, user_id } = req.body;
  //console.log(req.body);

  const wss = req.wss; // Get the WebSocket server instance from the request

  try {
    // Ensure user_id and to_id are provided
    if (!req_id) {
      return res.status(400).json({ message: "Both Id id required" });
    }

    // Prepare the current date

    db.query(
      "DELETE FROM userphotoPrivate WHERE id = ?",
      [req_id],
      (deleteErr, result) => {
        if (deleteErr) {
          return res.status(500).json({
            message: "Database delete error",
            error: deleteErr,
          });
        }

        // Check if any rows were affected (i.e., if the delete was successful)
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "No record found with this ID." });
        }
        const broadcastMessage = JSON.stringify({
          event: "Requestconfirm",
          to_id: to_id,
          user_id: user_id,
        });

        if (wss) {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              console.log(client.to_id);
              client.send(broadcastMessage);
            }
          });
        }
        // Return success response
        res.status(200).json({
          message: "Record deleted successfully.",
          to_id: to_id,
          user_id: user_id,
        });
      }
    );
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.visitprofile = async (req, res) => {
  const { user_id, to_id } = req.body;
  //console.log(req.body);

  const wss = req.wss; // Get the WebSocket server instance from the request

  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !to_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and to_id are required" });
    }

    // Prepare the current date
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // Insert the message along with file URLs into a single database row
    // First, check if the record exists
    db.query(
      "SELECT * FROM profile_visit WHERE user_id = ? AND to_id = ?",
      [user_id, to_id],
      (selectErr, selectResults) => {
        if (selectErr) {
          return res.status(500).json({
            message: "Database select error",
            error: selectErr,
          });
        }

        if (selectResults.length > 0) {
          res.status(200).json({
            message: "",
          });
        } else {
          // If no record exists, proceed to insert
          const date = new Date(); // Ensure you set the date correctly
          db.query(
            "INSERT INTO profile_visit (user_id, to_id, date) VALUES (?, ?, ?)",
            [user_id, to_id, date],
            (insertErr, result) => {
              if (insertErr) {
                return res.status(500).json({
                  message: "Database insert error",
                  error: insertErr,
                  status: "",
                });
              }

              // Return success response
              res.status(200).json({
                user_id: user_id,
                to_id: to_id,
                status: "1",
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.forumscommentSave = async (req, res) => {
  const { user_id, forum_id, description, message } = req.body;
  //console.log(req.body);

  const wss = req.wss; // Get the WebSocket server instance from the request

  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !forum_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and forum_id are required" });
    }

    // Prepare the current date
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // Prepare data to save into the database
    const data = {
      user_id: user_id,
      forum_id: forum_id,
      description: description, // Insert the message
      date: date,
    };

    // Insert the message along with file URLs into a single database row
    db.query(
      "INSERT INTO forum_comment (user_id, forum_id, description, date) VALUES (?, ?, ?, ?)",
      [data.user_id, data.forum_id, data.description, data.date],
      (insertErr, result) => {
        if (insertErr) {
          // console.error("Database insert error:", insertErr);
          return res.status(500).json({
            message: "Database insert error",
            error: insertErr,
            status: "",
          });
        }
        const lastInsertId = result.insertId;
        db.query(
          `SELECT fc.*, u.profile_image, u.username
            FROM forum_comment fc
            JOIN users u ON fc.user_id = u.id
            WHERE fc.id = ?`,
          [lastInsertId],
          (err, row) => {
            if (err) {
              console.error("Database query error:", err);
              return res.status(500).json({
                message: "Database query error",
                error: err,
                event: "",
              });
            }
            var rr = row[0];
            const broadcastMessage = JSON.stringify({
              event: "ForumComments",
              user_id: user_id,
              forum_id: forum_id,
              makeImagePrivate: rr.makeImagePrivate,
              profile_image: rr.profile_image,
              username: rr.username,
              description: rr.description,
              date: rr.date,
              id: lastInsertId,
            });

            if (wss) {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  console.log(client.to_id);

                  client.send(broadcastMessage);
                }
              });
            }
            logActivity(user_id, `commented on the forum post `);
            // Return success response
            res.status(200).json({
              message: message,
              user_id: user_id,
              status: "1",
            });
          }
        );
        // Broadcast the message to WebSocket clients
      }
    );
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getdashboardpost = async (req, res) => {
  const { user_ids, user_id } = req.body; // Expecting an array or string of user IDs

  try {
    // Ensure user_ids and user_id are provided
    if (!user_ids || !user_id) {
      return res
        .status(400)
        .json({ message: "User IDs and User ID are required" });
    }

    // If user_ids is a comma-separated string, convert it into an array
    const userIdsArray = Array.isArray(user_ids)
      ? user_ids
      : user_ids.split(",").map((id) => id.trim());

    // Generate placeholders for the IN clause
    const placeholders = userIdsArray.map(() => "?").join(",");

    // Prepare SQL query to fetch galleries for multiple user IDs
    const query = `
      SELECT g.*, u.username, u.makeImagePrivate, u.profile_type, u.gender, u.profile_image as uimage
      FROM gallery g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id IN (${placeholders}) AND g.user_id = ?
      ORDER BY g.id DESC;
    `;

    // Combine the user IDs and user_id into the query parameters array
    const queryParams = [...userIdsArray, user_id];
    console.log(queryParams);
    // Fetching the galleries using parameterized query
    db.query(query, queryParams, (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the gallery data in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.messageseen = async (req, res) => {
  const { to_id, user_id } = req.body; // Expecting message ID and user ID
  const wss = req.wss; // Get the WebSocket server instance from the request
  console.log(req.body);

  try {
    // Ensure both ID and User ID are provided
    if (!user_id) {
      return res.status(400).json({ message: "ID and User ID are required" });
    }

    // First, check if the message with the provided ID exists and if the to_id matches the user_id
    db.query(
      "SELECT * FROM chatmessages WHERE user_id = ? AND to_id = ? ORDER BY id desc",
      [to_id, user_id],
      (selectErr, selectResults) => {
        if (selectErr) {
          console.error("Database select error:", selectErr); // Log select query error
          return res.status(500).json({
            message: "Database select error",
            error: selectErr,
            status: "2",
          });
        }

        // Check if the message exists
        if (selectResults.length === 0) {
          return res.status(404).json({
            message: "Message not found or incorrect user ID",
            status: "2",
          });
        }
        var idd = selectResults[0].id;
        // Message exists, proceed with the update
        db.query(
          "UPDATE chatmessages SET `read` = 'Yes' WHERE id = ? AND to_id = ?",
          [idd, user_id],
          (updateErr) => {
            if (updateErr) {
              console.error("Database update error:", updateErr); // Log update query error
              return res.status(500).json({
                message: "Database update error",
                error: updateErr,
                status: "2",
              });
            }
            const broadcastMessage = JSON.stringify({
              event: "MessageseenScroll",
              user_id: user_id,
              to_id: to_id,
            });

            if (wss) {
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(broadcastMessage);
                }
              });
            }
            return res.status(200).json({ status: "1" });
          }
        );
      }
    );
  } catch (error) {
    console.error("Server error:", error); // Log server-side errors
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.membersearch = async (req, res) => {
  var user_id = req.body.user_id;
  var search = req.body.search;
  console.log(user_id);

  try {
    // Ensure search term is provided
    const searchTerm = `%${search}%`; // Using '%' for LIKE search

    // Prepare the SQL query string
    const query = `
      SELECT 
        u.*, 
        CASE 
            WHEN fr.status = 'Yes' THEN true 
            ELSE false 
        END AS is_friend,
        fr.status AS friend_status
      FROM 
        users u
      LEFT JOIN 
        friendRequest_accept fr 
        ON (u.id = fr.sent_to AND fr.user_id = ?) 
        OR (u.id = fr.user_id AND fr.sent_to = ?)
      WHERE 
        
          u.email LIKE ? OR
          u.location LIKE ? OR
          u.town LIKE ? OR
          u.birthday_date LIKE ? OR
          u.looking_for LIKE ? OR
          u.username LIKE ? OR
          u.nationality LIKE ? OR
          u.sexual_orientation LIKE ? OR
          u.relationship_status LIKE ? OR
          u.search_looking_for LIKE ? OR
          u.degree LIKE ? OR
          u.drinker LIKE ? OR
          u.smoker LIKE ? OR
          u.tattos LIKE ? OR
          u.body_piercings LIKE ? OR
          u.fetish LIKE ? OR
          u.connectwith LIKE ? OR
          u.interstedin LIKE ? OR
          u.male LIKE ? OR
          u.couple LIKE ? OR
          u.female LIKE ?
        
    `;

    // Prepare the parameters for the query
    const params = [
      user_id, // user_id for friendRequest_accept
      user_id, // user_id for friendRequest_accept
      user_id, // Exclude current user
      searchTerm, // For u.email
      searchTerm, // For u.location
      searchTerm, // For u.town
      searchTerm, // For u.birthday_date
      searchTerm, // For u.looking_for
      searchTerm, // For u.username
      searchTerm, // For u.nationality
      searchTerm, // For u.sexual_orientation
      searchTerm, // For u.relationship_status
      searchTerm, // For u.search_looking_for
      searchTerm, // For u.degree
      searchTerm, // For u.drinker
      searchTerm, // For u.smoker
      searchTerm, // For u.tattos
      searchTerm, // For u.body_piercings
      searchTerm, // For u.fetish
      searchTerm, // For u.connectwith
      searchTerm, // For u.interstedin
      searchTerm, // For u.male
      searchTerm, // For u.couple
      searchTerm, // For u.female
    ];

    // Log the query and the parameters to see the final query being executed
    console.log("Executing query:");
    console.log(query);
    console.log("With parameters:");
    console.log(params);

    // SQL query with LIKE for multiple columns
    db.query(query, params, (err, row) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      return res.status(200).json({ results: row });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.areafilter = async (req, res) => {
  var user_id = req.body.user_id;
  var search = req.body.age;
  var fromage = req.body.fromage;
  var toage = req.body.toage;
  var startDate = `${fromage}-12-31`; // Convert to "2002-01-01"
  var endDate = `${toage}-01-01`;
  var selectedTowns = req.body.selectedTowns;
  try {
    // Ensure search term is provided
    // Using '%' for LIKE search
    const location = req.body.location;
    const sexual_orientation = req.body.sexual_orientation;

    // Initialize conditions and parameters
    let conditions = [];
    let params = [user_id, user_id, user_id]; // Start with user_id for exclusions and joins

    if (sexual_orientation.length === 0 && selectedTowns.length === 0) {
      try {
        // Ensure the email is provided

        // Query the database to get the user's profile details
        db.query(
          `SELECT 
                u.*, 
                CASE 
                    WHEN fr.status = 'Yes' THEN true 
                    ELSE false 
                END AS is_friend,
                fr.status AS friend_status
            FROM 
                users u
            LEFT JOIN 
                friendRequest_accept fr 
                ON (u.id = fr.sent_to AND fr.user_id = ?) 
                OR (u.id = fr.user_id AND fr.sent_to = ?)
            WHERE 
                u.id != ? And  
                        u.birthday_date BETWEEN ? AND ?;;
        `,
          [user_id, user_id, user_id, endDate, startDate],
          (err, row) => {
            return res.status(200).json({ results: row });
          }
        );
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    } else {
      //console.log("nk");
      if (location != "") {
        conditions.push(`u.location LIKE ?`);
        params.push(`%${location}%`);
      }
      var selectedSubRegion = req.body.selectedSubRegion;
      if (req.body.selectedSubRegion !== null) {
        conditions.push(`u.subregion LIKE ?`);
        params.push(`%${selectedSubRegion}%`);
      }

      if (selectedTowns.length > 0) {
        const selectedTownsss = selectedTowns
          .map((so) => `u.town LIKE ?`)
          .join(" OR ");
        conditions.push(`(${selectedTownsss})`);
        params.push(...selectedTowns.map((so) => `%${so}%`));
      }

      // Dynamically build the birthday condition if provided
      if (fromage && toage) {
        // Assuming `fromage` and `toage` are just years, for example '2002' and '2005'
        const birthdayCondition = `u.birthday_date BETWEEN ? AND ?`;
        conditions.push(birthdayCondition);
        params.push(endDate, startDate); // Add the `fromage` and `toage` parameters
      }

      // Dynamically build the sexual_orientation condition if provided
      if (sexual_orientation && sexual_orientation.length > 0) {
        const sexualOrientationCondition = sexual_orientation
          .map((so) => `u.sexual_orientation LIKE ?`)
          .join(" OR ");
        conditions.push(`(${sexualOrientationCondition})`);
        params.push(...sexual_orientation.map((so) => `%${so}%`)); // Add sexual_orientation parameters
      }

      // Combine all conditions for the query
      let whereClause =
        conditions.length > 0 ? `AND (${conditions.join(" AND ")})` : "";

      const query = `
          SELECT 
            u.*, 
            CASE 
              WHEN fr.status = 'Yes' THEN true 
              ELSE false 
            END AS is_friend,
            fr.status AS friend_status
          FROM 
            users u
          LEFT JOIN 
            friendRequest_accept fr 
          ON 
            (u.id = fr.sent_to AND fr.user_id = ?) 
            OR (u.id = fr.user_id AND fr.sent_to = ?)
          WHERE 
            u.id != ? 
            ${whereClause}
        `;

      db.query(query, params, (err, row) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }
        return res.status(200).json({ results: row });
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.agefilter = async (req, res) => {
  var user_id = req.body.user_id;

  var fromage = req.body.fromage;
  var toage = req.body.toage;
  //console.log(req.body);
  var startDate = `${fromage}-12-31`; // Convert to "2002-01-01"
  var endDate = `${toage}-01-01`;
  try {
    // Ensure search term is provided
    // Using '%' for LIKE search
    const location = req.body.location;
    const sexual_orientation = req.body.sexual_orientation;

    // Initialize conditions and parameters
    let conditions = [];
    let params = [user_id, user_id, user_id]; // Start with user_id for exclusions and joins
    //console.log(startDate);
    //console.log(endDate);
    if (location === "" && sexual_orientation.length === 0) {
      try {
        // Ensure the email is provided

        // Query the database to get the user's profile details
        db.query(
          `SELECT 
                        u.*, 
                        CASE 
                            WHEN fr.status = 'Yes' THEN true 
                            ELSE false 
                        END AS is_friend,
                        fr.status AS friend_status
                        FROM 
                            users u
                        LEFT JOIN 
                            friendRequest_accept fr 
                            ON (u.id = fr.sent_to AND fr.user_id = ?) 
                            OR (u.id = fr.user_id AND fr.sent_to = ?)
                        WHERE 
                        u.birthday_date BETWEEN ? AND ?;
                    `,
          [user_id, user_id, user_id, endDate, startDate],
          (err, row) => {
            return res.status(200).json({ results: row });
          }
        );
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    } else {
      // Dynamically build the location condition if provided
      if (location && location.length > 0) {
        const locationConditions = location
          .map((loc) => `u.location LIKE ?`)
          .join(" OR ");
        conditions.push(`(${locationConditions})`);
        params.push(...location.map((loc) => `%${loc}%`)); // Add location parameters
      }

      // Dynamically build the birthday condition if provided

      // Dynamically build the sexual_orientation condition if provided
      if (sexual_orientation && sexual_orientation.length > 0) {
        const sexualOrientationCondition = sexual_orientation
          .map((so) => `u.sexual_orientation LIKE ?`)
          .join(" OR ");
        conditions.push(`(${sexualOrientationCondition})`);
        params.push(...sexual_orientation.map((so) => `%${so}%`)); // Add sexual_orientation parameters
      }
      if (fromage && toage) {
        // Assuming `fromage` and `toage` are just years, for example '2002' and '2005'
        const birthdayCondition = `u.birthday_date BETWEEN ? AND ?`;
        conditions.push(birthdayCondition);
        params.push(endDate, startDate); // Add the `fromage` and `toage` parameters
      }

      // Combine all conditions for the query
      let whereClause =
        conditions.length > 0 ? `AND (${conditions.join(" AND ")})` : "";
      //console.log(whereClause);
      const query = `
          SELECT 
            u.*, 
            CASE 
              WHEN fr.status = 'Yes' THEN true 
              ELSE false 
            END AS is_friend,
            fr.status AS friend_status
          FROM 
            users u
          LEFT JOIN 
            friendRequest_accept fr 
          ON 
            (u.id = fr.sent_to AND fr.user_id = ?) 
            OR (u.id = fr.user_id AND fr.sent_to = ?)
          WHERE 
            u.id != ? 
            ${whereClause}
        `;
      db.query(query, params, (err, row) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }
        return res.status(200).json({ results: row });
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.sexfilter = async (req, res) => {
  var sexual_orientation = [];
  if (req.body.sexual_orientation) {
    // Check if it's already an array
    if (Array.isArray(req.body.sexual_orientation)) {
      var sexual_orientation = req.body.sexual_orientation;
    } else {
      // Split a comma-separated string into an array
      var sexual_orientation = req.body.sexual_orientation.split(",");
    }
  }

  try {
    // Initialize conditions and parameters
    const user_id = req.body.user_id;
    const birthday = req.body.age;
    const location = req.body.location;
    let conditions = [];
    let params = [user_id, user_id]; // Start with user_id for exclusions and joins
    console.log("kl");

    if (location.length === 0 && sexual_orientation.length === 0) {
      console.log("ccj");
      // Default query without additional filters
      const query = `
                SELECT 
                    u.*, 
                    CASE 
                        WHEN fr.status = 'Yes' THEN true 
                        ELSE false 
                    END AS is_friend,
                    fr.status AS friend_status
                FROM 
                    users u
                LEFT JOIN 
                    friendRequest_accept fr 
                ON 
                    (u.id = fr.sent_to AND fr.user_id = ?) 
                    OR (u.id = fr.user_id AND fr.sent_to = ?);
            `;
      db.query(query, [user_id, user_id], (err, row) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }
        return res.status(200).json({ results: row });
      });
    } else {
      // Build dynamic conditions based on the provided filters

      // Build location condition
      if (Array.isArray(sexual_orientation) && sexual_orientation.length > 0) {
        const sexualOrientationConditions = sexual_orientation
          .map((so) => `u.sexual_orientation LIKE ?`)
          .join(" OR ");
        conditions.push(`(${sexualOrientationConditions})`);
        params.push(...sexual_orientation.map((so) => `%${so}%`));
      }

      if (Array.isArray(location) && location.length > 0) {
        const locationConditions = location
          .map((loc) => `u.location LIKE ?`)
          .join(" OR ");
        conditions.push(`(${locationConditions})`);
        params.push(...location.map((loc) => `%${loc}%`));
      }

      // Build birthday condition

      const escapeLike = (str) => str.replace(/[%_]/g, "\\$&");

      if (birthday) {
        const birthdayCondition = `u.birthday_date LIKE ?`;
        conditions.push(birthdayCondition);
        params.push(`%${escapeLike(birthday)}%`);
      }

      // Combine all conditions into the WHERE clause
      const whereClause =
        conditions.length > 0 ? `(${conditions.join(" AND ")})` : "";

      console.log(conditions);

      const query = `
                    SELECT 
                        u.*, 
                        CASE 
                            WHEN fr.status = 'Yes' THEN true 
                            ELSE false 
                        END AS is_friend,
                        fr.status AS friend_status
                    FROM 
                        users u
                    LEFT JOIN 
                        friendRequest_accept fr 
                    ON 
                        (u.id = fr.sent_to AND fr.user_id = ?) 
                        OR (u.id = fr.user_id AND fr.sent_to = ?)
                    WHERE 
                        ${whereClause};
                `;

      // Log the constructed query
      console.log("Generated Query:", query);

      // Log the parameters passed to the query
      console.log("Query Parameters:", params);
      db.query(query, params, (err, row) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }
        return res.status(200).json({ results: row });
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.checkmembership = async (req, res) => {
  const { user_id } = req.body; // Expecting an array or string of user IDs

  try {
    // Ensure user_ids and user_id are provided
    if (!user_id) {
      return res.status(400).json({ message: " User ID are required" });
    }

    const query = `
      SELECT membership.*, users.status
      FROM membership
      JOIN users ON users.id = membership.user_id
      WHERE membership.user_id = ?
      ;
    `;

    db.query(query, user_id, (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }
      console.log("d", row.length);
      var isExpired = true;
      if (row.length > 0) {
        const currentDate = moment
          .tz(new Date(), "Europe/Oslo")
          .format("YYYY-MM-DD");
        // Get the end_date from the row (assuming it's in a valid date format)
        const endDate = moment(row[0].end_date)
          .tz("Europe/Oslo")
          .format("YYYY-MM-DD");

        console.log("Current Date:", currentDate);
        console.log("End Date:", endDate);

        // Check if the current date is after the end_date
        var isExpired = moment(currentDate).isAfter(endDate);
        console.log(isExpired);
        return res.status(200).json({ status: isExpired, result: row });
      } else {
        return res.status(200).json({ status: isExpired, result: row });
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.userblock = async (req, res) => {
  const { user_id, sent_id } = req.body; // Expecting an array or string of user IDs

  try {
    // Ensure user_ids and user_id are provided
    if (!user_id) {
      return res.status(400).json({ message: " User ID are required" });
    }

    const query = `
    INSERT INTO blockuser (user_id, to_id) 
    VALUES (?, ?)
  `;

    // Assuming you're using a query function from a database library
    db.query(query, [user_id, sent_id]);

    return res.status(200).json({ message: "User successfully blocked" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getcheckuserblock = async (req, res) => {
  const { user_id, to_id } = req.body; // Expecting user_id and to_id from the request body

  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !to_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and to_id are required" });
    }

    const query = `
      SELECT * FROM blockuser WHERE user_id = ? AND to_id = ?
    `;

    // Pass both user_id and to_id as an array to the query function
    db.query(query, [to_id, user_id], (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // If a block relationship exists, return the data
      return res.status(200).json({ message: "User is blocked", result: row });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getcheckuserblockend = async (req, res) => {
  const { user_id, to_id } = req.body; // Expecting user_id and to_id from the request body

  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !to_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and to_id are required" });
    }

    const query = `
      SELECT * FROM blockuser WHERE user_id = ? AND to_id = ?
    `;

    // Pass both user_id and to_id as an array to the query function
    db.query(query, [user_id, to_id], (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // If a block relationship exists, return the data
      return res.status(200).json({ message: "User is blocked", result: row });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.userunblock = async (req, res) => {
  const { user_id, to_id } = req.body; // Expecting user_id and to_id from the request body

  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !to_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and to_id are required" });
    }

    // Step 1: Check if a block relationship exists
    const queryCheckBlock = `
      SELECT * FROM blockuser WHERE user_id = ? AND to_id = ?
    `;

    // Pass both user_id and to_id as an array to the query function
    db.query(queryCheckBlock, [user_id, to_id], (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // If no block exists, return a message saying so
      if (rows.length === 0) {
        return res.status(404).json({ message: "No block relationship found" });
      }

      // Step 2: If a block relationship exists, proceed to delete the record
      const queryDeleteBlock = `
        DELETE FROM blockuser WHERE user_id = ? AND to_id = ?
      `;

      db.query(queryDeleteBlock, [user_id, to_id], (err, result) => {
        if (err) {
          return res.status(500).json({
            message: "Failed to unblock user",
            error: err,
          });
        }
        logActivity(user_id, `Un block user with ID: ${to_id}`);
        // If deletion is successful, return a success message
        return res.status(200).json({ message: "User successfully unblocked" });
      });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.checkuserblock = async (req, res) => {
  const { user_id, to_id } = req.body; // Expecting user_id and to_id from the request body

  try {
    // Ensure user_id and to_id are provided
    if (!user_id || !to_id) {
      return res
        .status(400)
        .json({ message: "Both user_id and to_id are required" });
    }

    const query = `
      SELECT * FROM blockuser WHERE user_id = ? AND to_id = ? or user_id =? And to_id=?
    `;

    // Pass both user_id and to_id as an array to the query function
    db.query(query, [user_id, to_id, to_id, user_id], (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // If a block relationship exists, return the data
      return res.status(200).json({ message: "User is blocked", result: row });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.create_customer = async (req, res) => {
  try {
    const { email, name } = req.body;

    const customer = await stripe.customers.create({
      email,
      name,
    });

    res.json({ customer_id: customer.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// exports.create_payment_intent = async (req, res) => {
//   console.log(req.body);
//   try {
//     const { amount, customerId } = req.body;

//     const paymentIntent = await stripe.paymentIntents.create({
//       amount,
//       currency: "usd",
//       payment_method_types: ["card"],
//     });
//     return res.status(200).json({ clientSecret: paymentIntent.client_secret });
//     res.send({ clientSecret: paymentIntent.client_secret });
//   } catch (error) {
//     return res.status(200).json({ error: error.message, clientSecret: "" });
//   }
// };
exports.create_payment_intent = async (req, res) => {
  try {
    console.log(req.body);
    const { customerId, productId } = req.body;

    // Step 1: Retrieve the customer's active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active", // Only look for active subscriptions
      limit: 1, // Only need one active subscription to update
    });

    // Step 2: Check if there's an active subscription
    if (subscriptions.data.length > 0) {
      // The user already has an active subscription, so update it
      const existingSubscription = subscriptions.data[0];

      // Fetch the new price associated with the selected product
      const prices = await stripe.prices.list({ product: productId });
      if (!prices.data.length) {
        return res
          .status(400)
          .json({ error: "No subscription price found for the product" });
      }
      const newPriceId = prices.data[0].id; // New subscription price ID

      // Step 3: Update the subscription with the new plan
      const updatedSubscription = await stripe.subscriptions.update(
        existingSubscription.id,
        {
          items: [
            {
              id: existingSubscription.items.data[0].id, // The subscription item ID to replace
              price: newPriceId, // The new price ID
            },
          ],
          proration_behavior: "create_prorations", // Handles prorating the charges for the switch
          expand: ["latest_invoice.payment_intent"], // Get payment intent details
        }
      );

      return res.status(200).json({
        subscriptionId: updatedSubscription.id,
        clientSecret:
          updatedSubscription.latest_invoice.payment_intent.client_secret,
      });
    } else {
      // The user does not have an active subscription, so create a new one

      // Fetch the price associated with the product
      const prices = await stripe.prices.list({ product: productId });
      if (!prices.data.length) {
        return res
          .status(400)
          .json({ error: "No subscription price found for the product" });
      }

      const priceId = prices.data[0].id; // Subscription price ID

      // Step 4: Create a new subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete", // Allows front-end confirmation
        expand: ["latest_invoice.payment_intent"], // Get payment intent details
      });

      return res.status(200).json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
exports.galleryfilter = async (req, res) => {
  const { user_id, search } = req.body;

  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Prepare search term with wildcards for partial matching (search term can be for name, description, or username)
    const searchTerm = search ? `%${search}%` : "%"; // If no search term is provided, match all

    // Prepare gender filter condition and query parameters
    let genderCondition = "";
    const queryParams = [user_id]; // Params for search fields

    // Gender-based filtering for different fields (male, female, couple)
    if (search === "male") {
      genderCondition = "AND u.male != 1"; // Filter by male field
    } else if (search === "female") {
      genderCondition = "AND u.female = 1"; // Filter by female field
    } else if (search === "couple") {
      genderCondition = "AND u.couple = 1"; // Filter by couple field
    }

    // Query to fetch gallery items based on user_id, search terms, and optional gender filter
    const query = `
            SELECT g.*, u.username, u.profile_type, u.gender
            FROM gallery g
            JOIN users u ON g.user_id = u.id
            WHERE g.user_id = ?
            ${genderCondition}
            ORDER BY g.id DESC;
        `;

    // Fetching the gallery items
    db.query(query, queryParams, (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the results in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getonlineuser = async (req, res) => {
  const { user_ids, user_id } = req.body; // Expecting user IDs array and current user ID
  const wss = req.wss; // Get the WebSocket server instance from the request
  console.log(req.body);
  try {
    // Validate input
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res
        .status(200)
        .json({ message: "Invalid user_ids. It must be a non-empty array." });
    }
    if (!user_id) {
      return res
        .status(200)
        .json({ message: "Missing user_id in request body." });
    }

    // Define the query
    const query = `
          SELECT * FROM users 
          WHERE id IN (?) 
          AND online_user = ? 
          AND id != ?
        `;

    // Execute the query
    db.query(query, [user_ids, "Online", user_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err); // Log the error
        return res.status(500).json({
          message: "Database query error",
          error: err.message || err,
        });
      }

      // Prepare the WebSocket broadcast message
      const broadcastMessage = JSON.stringify({
        event: "otherusercheckonline",
        users: results,
      });

      // Broadcast to all connected WebSocket clients
      if (wss && wss.clients) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
      }

      // Respond with results
      return res.status(200).json({ results });
    });
  } catch (error) {
    console.error("Server error:", error); // Log the error
    return res
      .status(500)
      .json({ message: "Server error", error: error.message || error });
  }
};
exports.useractivity = async (req, res) => {
  const { user_id } = req.body; // User ID from the request body
  const wss = req.wss; // WebSocket server instance
  try {
    // Update the logged-in user's `last_activity` to the current time
    const updateLastActivityQuery = `
        UPDATE users 
        SET last_activity = NOW(), online_user = 'Online' 
        WHERE id = ?;
      `;

    db.query(updateLastActivityQuery, [user_id], (updateErr) => {
      if (updateErr) {
        console.error("Error updating user activity:", updateErr);
        return res
          .status(500)
          .json({ message: "Database error", error: updateErr });
      }

      // Check for inactive users who are still marked as 'Online'
      const findInactiveUsersQuery = `
        SELECT id 
        FROM users 
        WHERE last_activity < NOW() - INTERVAL 20 SECOND AND online_user = 'Online' AND id != ?;
        `;

      db.query(findInactiveUsersQuery, [user_id], (err, results) => {
        if (err) {
          console.error("Error detecting offline users:", err);
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }

        if (results.length === 0) {
          // No other users went inactive
          return res
            .status(200)
            .json({ message: "Activity updated. No users became inactive." });
        }

        const inactiveUserIds = results.map((user) => user.id);

        // Update inactive users to 'Offline'
        const updateOfflineQuery = `
            UPDATE users 
            SET online_user = 'Offline' 
            WHERE id IN (?);
          `;

        db.query(updateOfflineQuery, [inactiveUserIds], (offlineErr) => {
          if (offlineErr) {
            console.error("Error updating offline users:", offlineErr);
            return res
              .status(500)
              .json({ message: "Database error", error: offlineErr });
          }

          // Broadcast the offline status to all WebSocket clients
          const broadcastMessage = JSON.stringify({
            event: "Offline",
            users: inactiveUserIds,
          });

          if (wss && wss.clients) {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastMessage);
              }
            });
          }

          console.log(`Users marked offline: ${inactiveUserIds.join(", ")}`);
          return res.status(200).json({
            message: "Activity updated.",
            offlineUsers: inactiveUserIds,
          });
        });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message || error });
  }
};

exports.paymentdatasave = async (req, res) => {
  const { detail, user_id, paymentdetail, customerId, productId } = req.body;

  try {
    // Data validation
    if (!detail || !user_id || !paymentdetail) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const dayss = paymentdetail.days;
    const start_date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    const end_date = moment
      .tz(new Date(), "Europe/Oslo")
      .add(dayss, "days")
      .format("YYYY-MM-DD HH:mm:ss");
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // First query: Insert into allmembership
    const insertQuery = `
        INSERT INTO allmembership (product_id,customerId,user_id, start_date, end_date, days, plan, amount, payment_id, currency, livemode, status, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

    await new Promise((resolve, reject) => {
      db.query(
        insertQuery,
        [
          productId,
          customerId,
          user_id,
          start_date,
          end_date,
          dayss,
          paymentdetail.plan,
          paymentdetail.amount,
          detail.id,
          paymentdetail.currency,
          detail.livemode,
          detail.status,
          date,
        ],
        (err, result) => {
          if (err) {
            console.error("Database insertion error:", err); // Log the error to the console
            return reject({ message: "Database insertion error", error: err });
          }
          resolve(result); // Resolve the promise if insertion is successful
        }
      );
    });

    const checkUserExistsQuery = `
    SELECT * FROM membership WHERE user_id = ?;
  `;

    const insertQueryy = `
    INSERT INTO membership 
      (product_id,customerId, start_date, end_date, days, plan, amount, payment_id, currency, livemode, status, date, user_id)
    VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

    const updateQuery = `
    UPDATE membership
    SET 
      product_id =?,
      customerId = ?, 
      start_date = ?, 
      end_date = ?, 
      days = ?, 
      plan = ?, 
      amount = ?, 
      payment_id = ?, 
      currency = ?, 
      livemode = ?, 
      status = ?, 
      date = ?
    WHERE user_id = ?;
  `;

    await new Promise((resolve, reject) => {
      // First, check if user exists
      db.query(checkUserExistsQuery, [user_id], async (err, result) => {
        if (err) {
          console.error("Database check error:", err);
          return reject({ message: "Database check error", error: err });
        }

        if (result.length > 0) {
          // User exists, update the record
          db.query(
            updateQuery,
            [
              productId,
              customerId,
              start_date,
              end_date,
              dayss,
              paymentdetail.plan,
              paymentdetail.amount,
              detail.id,
              paymentdetail.currency,
              detail.livemode,
              detail.status,
              date,
              user_id,
            ],
            (err, result) => {
              if (err) {
                console.error("Database update error:", err);
                return reject({ message: "Database update error", error: err });
              }
              resolve(result); // Resolve if update is successful
            }
          );
        } else {
          // User does not exist, insert a new record
          db.query(
            insertQueryy,
            [
              productId,
              customerId,
              start_date,
              end_date,
              dayss,
              paymentdetail.plan,
              paymentdetail.amount,
              detail.id,
              paymentdetail.currency,
              detail.livemode,
              detail.status,
              date,
              user_id,
            ],
            (err, result) => {
              if (err) {
                console.error("Database insert error:", err);
                return reject({ message: "Database insert error", error: err });
              }
              resolve(result); // Resolve if insert is successful
            }
          );
        }
      });
    });

    // If both queries succeed, send the response
    res
      .status(200)
      .json({ message: "Membership data saved and updated successfully" });
  } catch (error) {
    console.error("Server error:", error); // Log the error to the console
    res
      .status(500)
      .json({ message: "Server error", error: error.message || error });
  }
};

exports.getallgallerySearchfilter = async (req, res) => {
  const { user_id, search } = req.body;

  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Prepare search terms with wildcards for partial matching
    const searchTerm = Array.isArray(search) ? search : [];
    let whereClause = "";

    // Dynamically build the WHERE clause for search terms
    if (searchTerm.length > 0) {
      whereClause += " AND (";
      searchTerm.forEach((term, index) => {
        whereClause += "u.gender = ?"; // Adjust this condition as needed for your actual column
        if (index < searchTerm.length - 1) {
          whereClause += " OR ";
        }
      });
      whereClause += ")";
    }

    // Query to fetch gallery items based on user_id and search terms
    const query = `
            SELECT g.*, u.username, u.profile_type, u.gender
            FROM gallery g
            JOIN users u ON g.user_id = u.id
            WHERE g.user_id = ?
            ${whereClause}
            ORDER BY g.id DESC;
        `;

    // Parameters for query, combining user_id and search terms
    const queryParams = [user_id, ...searchTerm];

    // Fetching the gallery items
    db.query(query, queryParams, (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }

      // Sending the results in the response
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.statusupdateUser = async (req, res) => {
  const { user_id, status } = req.body;

  try {
    // Data validation
    const s = status === true ? "Yes" : "No"; // Simplified the conditional assignment

    // Second query: Update the membership table
    const updateQuery = `
          UPDATE users
          SET 
            online_user_active = ?
          WHERE id = ?;
        `;

    await new Promise((resolve, reject) => {
      db.query(updateQuery, [s, user_id], (err, result) => {
        if (err) {
          console.error("Database update error:", err); // Log the error to the console
          return reject({ message: "Database update error", error: err });
        }
        resolve(result); // Resolve the promise if update is successful
      });
    });

    // If both queries succeed, send the response
    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Server error:", error); // Log the error to the console
    res
      .status(500)
      .json({ message: "Server error", error: error.message || error });
  }
};

exports.saveprivateAlbums = async (req, res) => {
  try {
    // Extract data from the request
    const { visibility, rightsConfirmed, addToAlbum, user_id } = req.body;
    // Check if files were uploaded

    // Get uploaded image URLs from S3
    const uploadedImages = req.files
      ? req.files.map((file) => file.location)
      : []; // S3 URLs
    console.log("Uploaded Images:", uploadedImages);

    // Define the SQL query
    const query = `
      INSERT INTO usersalbum (images, visibility, rightsConfirmed, addToAlbum, user_id, date) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    // Prepare the current date in Oslo timezone
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // Execute the query
    db.query(
      query,
      [
        JSON.stringify(uploadedImages),
        visibility,
        rightsConfirmed,
        addToAlbum,
        user_id,
        date,
      ],
      (err, result) => {
        if (err) {
          console.error("Database Insertion Error:", err);
          return res
            .status(500)
            .json({ message: "Database insertion error", error: err });
        }

        // Respond with success
        res.status(200).json({
          message: "Album uploaded successfully",
          images: uploadedImages,
        });
      }
    );
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

exports.getalbumStatus = async (req, res) => {
  const { user_id } = req.body;
  var status = req.body.status;
  if (status === "Private") {
    var status = "Private_visible";
  }
  if (status === "Friends_visible") {
    var status = "Friends_visible";
  }
  if (status === "Public_visible") {
    var status = "Public_visible";
  }

  try {
    db.query(
      `SELECT * from usersalbum where user_id = ?`,
      [user_id],
      (err, results) => {
        console.log(results);
        return res.status(200).json({ results: results });
      }
    );
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};
async function sendEmailForOtp(too, otp, callback) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "amourette.no@gmail.com",
      pass: "ozox fcff dftd mguf",
    },
  });

  const mailOptions = {
    from: "amourette.no@gmail.com",
    to: too,
    subject: "Your One-Time OTP for Amourette", // Corrected and more descriptive subject
    text: `Dear User,\n\nYour one-time OTP for secure access is: ${otp}\n\nThis OTP is valid for a single use. Please do not share this code with anyone.\n\nThank you,\nAmourette Team`, // Improved text
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error:", error);
    } else {
      console.log("Email sent:", info.response); // Uncomment if you want to log successful sends
    }
  });
}

exports.checkOTP = async (req, res) => {
  const { id, otp } = req.body;

  // Ensure id and otp are provided
  if (!id || !otp) {
    return res.status(400).json({ message: "Missing id or otp" });
  }

  try {
    // First, check if the OTP is correct
    const [results] = await db
      .promise()
      .query(`SELECT * FROM users WHERE id = ? AND otp = ?`, [id, otp]);

    if (results.length > 0) {
      // OTP is valid, now update the user's two-factor authentication status
      const [updateResult] = await db
        .promise()
        .query("UPDATE users SET two_fA = ? WHERE id = ?", ["Yes", id]);
      if (results[0].two_fA === "Yes") {
        return res.status(200).json({
          status: "2",
          message: "OTP has already been used",
        });
      } else {
        if (updateResult.affectedRows > 0) {
          return res.status(200).json({
            status: "1",
            message: "OTP verified successfully",
          });
        } else {
          return res.status(200).json({
            status: "2",
            message: "Failed to update two-factor authentication status",
          });
        }
      }
    } else {
      return res.status(200).json({ status: "2", message: "Invalid OTP" });
    }
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
};
const generateOTP = () => {
  // Generate a random 6-digit number
  return Math.floor(100000 + Math.random() * 900000); // Returns a 6-digit number
};

exports.sendOTP = async (req, res) => {
  const { id, two_fA } = req.body;

  // Ensure id is provided
  if (!id) {
    return res.status(400).json({ message: "Missing id" });
  }

  try {
    // First, check if the user exists in the database
    const [results] = await db
      .promise()
      .query(`SELECT * FROM users WHERE id = ?`, [id]);

    if (results.length > 0) {
      // Generate a 6-digit OTP
      if (two_fA === "Yes") {
        const otp = generateOTP();
        var email = results[0].email;
        sendEmailForOtp(email, otp, (info) => {
          res.send(info);
        });
        // Update the user's record with the generated OTP
        const [updateResult] = await db
          .promise()
          .query("UPDATE users SET otp = ?,two_fA = ? WHERE id = ?", [
            otp,
            "No",
            id,
          ]);
        if (updateResult.affectedRows > 0) {
          // Send the OTP via email or SMS here (you can implement that part as needed)

          return res.status(200).json({
            status: "1",
            message: "OTP send successfully, please check your email",
          });
        } else {
          return res.status(200).json({
            status: "2",
            message: "Failed to update OTP",
          });
        }
      } else {
        var email = results[0].email;

        // Update the user's record with the generated OTP
        const [updateResult] = await db
          .promise()
          .query("UPDATE users SET otp = ?,two_fA = ? WHERE id = ?", [
            "",
            "No",
            id,
          ]);
        if (updateResult.affectedRows > 0) {
          // Send the OTP via email or SMS here (you can implement that part as needed)

          return res.status(200).json({
            status: "1",
            message: "Successfully updated",
          });
        } else {
          return res.status(200).json({
            status: "2",
            message: "Failed to update",
          });
        }
      }
    } else {
      return res.status(200).json({ status: "2", message: "Invalid user ID" });
    }
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
};

const logActivity = (userId, description) => {
  const query = `
    INSERT INTO logsactivity (user_id, description, date)
    VALUES (?, ?, NOW())
  `;
  db.query(query, [userId, description], (err, result) => {
    if (err) {
      console.error("Error inserting log activity:", err);
    }
  });
};
exports.checkoutpayy = async (req, res) => {
  const { plan } = req.body;
  try {
    let productId;
    let priceId;

    switch (plan) {
      case "BASIC":
        productId = "prod_RgE3FhSl8b2bBA";
        priceId = "price_1QmrbLAQYHZn8ah9URQGm8Kq";
        break;
      case "PRO":
        productId = "prod_RgE3ZRKXk0zYld";
        priceId = "price_1QmrbpAQYHZn8ah96ak9boc6";
        break;
      case "VIP":
        productId = "prod_RgE4fzKIFDYzLF";
        priceId = "price_1QmrceAQYHZn8ah9mUNqahg0";
        break;
      default:
        return res.status(400).json({ error: "Invalid plan selected" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `https://amourette.no/setting?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://amourette.no/setting?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Error creating checkout session", err);
    res.status(500).json({ error: err.message });
  }
};

// Webhook to handle Stripe events like subscription updates, trial ending, etc.
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  let event = req.body;
  const endpointSecret = "whsec_12345"; // Replace with your webhook secret

  if (endpointSecret) {
    const signature = req.headers["stripe-signature"];

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`⚠️ Webhook signature verification failed.`, err.message);
      return res.sendStatus(400);
    }
  }

  let subscription;
  let status;

  switch (event.type) {
    case "customer.subscription.created":
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription created: ${status}`);
      break;
    case "customer.subscription.updated":
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription updated: ${status}`);
      break;
    case "customer.subscription.deleted":
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription deleted: ${status}`);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.send(); // Respond with a 200 status to acknowledge receipt of the event
});

exports.paymentdatasaveafterpay = async (req, res) => {
  const { session_id, user_id, productId, amount, days } = req.body; // session_id sent from the client-side

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const customer = await stripe.customers.retrieve(session.customer); // Get the customer info
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );
    const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);

    const dayss = req.body.days;
    var dt = req.body;
    var customerId = customer.id;
    var payment_id = invoice.payment_intent;
    const start_date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    const end_date = moment
      .tz(new Date(), "Europe/Oslo")
      .add(dayss, "days")
      .format("YYYY-MM-DD HH:mm:ss");
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // First, check if session_id exists in the allmembership table
    const checkSessionExistsQuery = `
SELECT * FROM allmembership WHERE session_id = ?;
`;

    await new Promise((resolve, reject) => {
      db.query(checkSessionExistsQuery, [session_id], (err, result) => {
        if (err) {
          console.error("Database check error:", err);
          return reject({ message: "Database check error", error: err });
        }

        // If session_id exists, reject the request and do not proceed with the insert/update
        if (result.length > 0) {
          console.log("Session ID already exists, no further action taken.");
          return reject({
            message: "Session ID already exists, no further action taken.",
          });
        }

        // Session ID does not exist, proceed with insertion into allmembership table
        const insertQuery = `
    INSERT INTO allmembership (session_id, product_id, customerId, user_id, start_date, end_date, days, plan, amount, payment_id, currency, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

        db.query(
          insertQuery,
          [
            session_id,
            productId,
            customerId,
            user_id,
            start_date,
            end_date,
            dayss,
            dt.plan,
            dt.amount,
            payment_id,
            dt.currency,
            date,
          ],
          (err, result) => {
            if (err) {
              console.error("Database insertion error:", err);
              return reject({
                message: "Database insertion error",
                error: err,
              });
            }
            resolve(result); // Resolve the promise if insertion is successful
          }
        );
      });
    });

    // Now check if the user exists in the membership table
    const checkUserExistsQuery = `
SELECT * FROM membership WHERE user_id = ?;
`;

    const insertQueryy = `
INSERT INTO membership 
  (session_id, product_id, customerId, start_date, end_date, days, plan, amount, payment_id, currency, date, user_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

    const updateQuery = `
UPDATE membership
SET 
  session_id = ?, 
  product_id = ?, 
  customerId = ?, 
  start_date = ?, 
  end_date = ?, 
  days = ?, 
  plan = ?, 
  amount = ?, 
  payment_id = ?, 
  currency = ?, 
  date = ?
WHERE user_id = ?;
`;

    await new Promise((resolve, reject) => {
      // Check if user exists
      db.query(checkUserExistsQuery, [user_id], (err, result) => {
        if (err) {
          console.error("Database check error:", err);
          return reject({ message: "Database check error", error: err });
        }

        if (result.length > 0) {
          // User exists, update the record
          db.query(
            updateQuery,
            [
              session_id,
              productId,
              customerId,
              start_date,
              end_date,
              dayss,
              dt.plan,
              dt.amount,
              payment_id,
              dt.currency,
              date,
              user_id,
            ],
            (err, result) => {
              if (err) {
                console.error("Database update error:", err);
                return reject({ message: "Database update error", error: err });
              }
              resolve(result); // Resolve if update is successful
            }
          );
        } else {
          // User does not exist, insert a new record
          db.query(
            insertQueryy,
            [
              session_id,
              productId,
              customerId,
              start_date,
              end_date,
              dayss,
              dt.plan,
              dt.amount,
              payment_id,
              dt.currency,
              date,
              user_id,
            ],
            (err, result) => {
              if (err) {
                console.error("Database insert error:", err);
                return reject({ message: "Database insert error", error: err });
              }
              resolve(result); // Resolve if insert is successful
            }
          );
        }
      });
    });

    // If both queries succeed, send the response
    res
      .status(200)
      .json({ message: "Membership data saved and updated successfully" });
  } catch (err) {
    console.error("Error verifying session", err);
    res.status(500).json({ error: err.message });
  }
};
