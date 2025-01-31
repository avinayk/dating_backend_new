const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const moment = require("moment-timezone");
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const WebSocket = require("ws");
const wss = new WebSocket.Server({ server });
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
exports.getAllFriend = async (req, res) => {
  var user_id = req.body.user_id;
  console.log(user_id);
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
exports.getUsersFriendRequest = async (req, res) => {
  var user_id = req.body.user_id;
  console.log(user_id);
  try {
    // Ensure the email is provided
    if (!user_id) {
      return res.status(400).json({ message: "User id  is required" });
    }

    // Query the database to get the user's profile details
    db.query(
      `SELECT 
          u.* ,fr.id as frq_id, fr.user_id AS sentid 
      FROM 
          users u 
      JOIN 
          friendRequest_accept fr 
      ON 
          u.id = fr.user_id
      WHERE 
          fr.sent_to = ? AND fr.status = ?;
      `,
      [user_id, "No"],
      (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        res.status(200).json({
          message: "Friend Request",
          results: results, // Return the first event object
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.AcceptRequest = async (req, res) => {
  const { id, user_id, sentto } = req.body; // Get the ID of the friend request to accept
  const wss = req.wss;
  try {
    // Ensure the friend request ID is provided
    if (!id) {
      return res.status(400).json({ message: "Friend request ID is required" });
    }
    console.log(sentto);
    console.log(user_id);
    // Update the friend request status to 'Yes'
    db.query(
      `UPDATE friendRequest_accept 
       SET status = 'Yes' 
       WHERE id = ?`,
      [id],
      (updateErr, updateResults) => {
        if (updateErr) {
          return res
            .status(500)
            .json({ message: "Database update error", error: updateErr });
        }
        console.log(updateResults);
        console.log("ccc");
        // Query to get the user's profile details after accepting the request
        db.query(
          `SELECT 
              u.*, fr.id AS frq_id, fr.user_id AS sentid 
          FROM 
              users u 
          JOIN 
              friendRequest_accept fr 
          ON 
              u.id = fr.user_id 
          WHERE 
              fr.sent_to = ? AND fr.status = ?;`,
          [updateResults.insertId, "No"], // Use insertId or another appropriate identifier
          (queryErr, results) => {
            if (queryErr) {
              return res
                .status(500)
                .json({ message: "Database query error", error: queryErr });
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
              db.query(
                `SELECT username FROM users WHERE id = ?`,
                [user_id], // Fetch the username of the user who accepted the request
                (err, userResult) => {
                  if (err) {
                    return res.status(500).json({
                      message: "Error fetching username for user_id",
                      error: err,
                    });
                  }

                  const userUsername =
                    userResult[0]?.username || "Unknown User"; // Username of the user who accepted the request

                  // Fetch the username of the user who sent the request
                  db.query(
                    `SELECT username FROM users WHERE id = ?`,
                    [user_id], // Fetch the username of the user who sent the friend request
                    (err, senderResult) => {
                      if (err) {
                        return res.status(500).json({
                          message: "Error fetching username for sentto",
                          error: err,
                        });
                      }

                      const senderUsername =
                        senderResult[0]?.username || "Unknown User"; // Username of the user who sent the request

                      // Prepare the notification message
                      const notificationMessage = ` and ${senderUsername} are now friends`;

                      // Broadcast WebSocket notification to clients
                      const broadcastMessage = JSON.stringify({
                        event: "friendrequestacceptnotification",
                        user_id: results,
                        LoginData: results,
                      });

                      if (wss) {
                        wss.clients.forEach((client) => {
                          if (client.readyState === WebSocket.OPEN) {
                            client.send(broadcastMessage);
                          }
                        });
                      }

                      // Insert notification into the database
                      const date = moment
                        .tz(new Date(), "Europe/Oslo")
                        .format("YYYY-MM-DD HH:mm:ss");
                      results.forEach((item) => {
                        const user_id = item.id; // Use `id` from the results array

                        db.query(
                          "INSERT INTO notification (user_id, message, date) VALUES (?, ?, ?)",
                          [user_id, notificationMessage, date],
                          (err, result) => {
                            if (err) {
                              console.error("Database insertion error:", err); // Log error to console
                            }
                          }
                        );
                      });
                      logActivity(user_id, notificationMessage);
                      // Send the response back to the client
                      res.status(200).json({
                        message: "Friend request accepted",
                        results: results, // Return the results after accepting the request
                      });
                    }
                  );
                }
              );
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getReceivedMessage = async (req, res) => {
  const user_id = req.body.user_id;
  console.log(user_id);
  try {
    // Ensure the user ID is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query the database to get the user's profile details
    db.query(
      `SELECT 
          cm.*, 
          u1.profile_image AS sender_profile, 
          u1.username AS sender_username,         
          u1.birthday_date AS sender_age,         
          u1.slug AS sender_slug,                 -- Sender's slug
          u2.profile_image AS recipient_profile, 
          u2.username AS recipient_username,      
          u2.location AS recipient_location,      
          u2.birthday_date AS recipient_birthday,
          u2.slug AS recipient_slug               -- Recipient's slug
      FROM 
          chatmessages cm
      JOIN 
          users u1 ON cm.user_id = u1.id          -- Join to get sender profile
      JOIN 
          users u2 ON cm.to_id = u2.id            -- Join to get recipient profile
      WHERE 
          cm.to_id = ? AND
          cm.message != ''                          -- Filter messages by recipient (to_id)
      ORDER BY 
          cm.date DESC; `,
      [user_id],
      (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        res.status(200).json({
          results: results, // Return all results
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSendMessage = async (req, res) => {
  const user_id = req.body.user_id;
  console.log(user_id);

  try {
    // Ensure the user ID is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query the database to get the user's profile details
    db.query(
      `SELECT 
          cm.*, 
          u1.profile_image AS sender_profile, 
          u1.username AS sender_username,         
          u1.birthday_date AS sender_age,         
          u1.slug AS sender_slug,
          u2.profile_image AS recipient_profile, 
          u2.username AS recipient_username,      
          u2.location AS recipient_location,      
          u2.birthday_date AS recipient_birthday,
          u2.slug AS recipient_slug
      FROM 
          chatmessages cm
      JOIN 
          users u1 ON cm.user_id = u1.id
      JOIN 
          users u2 ON cm.to_id = u2.id
      WHERE 
          cm.user_id = ? AND          
          cm.message != ''            
      ORDER BY 
          cm.date DESC; `,
      [user_id],
      (err, results) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        res.status(200).json({
          results: results, // Return all results
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getSendMessageSearch = async (req, res) => {
  const user_id = req.body.user_id;
  const searchTerm = req.body.search; // Assuming searchTerm is provided in the request body

  console.log(user_id);
  try {
    // Ensure the user ID is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // SQL query to search for messages with filtering
    const query = `
      SELECT 
          cm.*, 
          u1.profile_image AS sender_profile, 
          u1.username AS sender_username,         
          u1.birthday_date AS sender_age,         
          u1.slug AS sender_slug,                 -- Sender's slug
          u2.profile_image AS recipient_profile, 
          u2.username AS recipient_username,      
          u2.location AS recipient_location,      
          u2.birthday_date AS recipient_birthday  
      FROM 
          chatmessages cm
      JOIN 
          users u1 ON cm.user_id = u1.id          -- Join to get sender profile
      JOIN 
          users u2 ON cm.to_id = u2.id            -- Join to get recipient profile
      WHERE 
          cm.user_id = ? AND
          cm.message != '' AND                     -- Filter out empty messages
          (u2.username LIKE ? OR 
           u2.birthday_date LIKE ? OR 
           u2.location LIKE ? OR 
           cm.message LIKE ?)                    
      ORDER BY 
          cm.date DESC;
    `;

    // Prepare the search terms for the LIKE query
    const searchPattern = `%${searchTerm}%`; // Using wildcards for searching
    const params = [
      user_id,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    ];

    // Execute the query
    db.query(query, params, (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }

      res.status(200).json({
        results: results, // Return the filtered results
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getReceivedMessageSearch = async (req, res) => {
  const user_id = req.body.user_id;
  const searchTerm = req.body.search; // Assuming searchTerm is provided in the request body

  console.log(user_id);
  try {
    // Ensure the user ID is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // SQL query to search for messages with filtering
    const query = `
      SELECT 
          cm.*, 
          u1.profile_image AS sender_profile, 
          u1.username AS sender_username,         
          u1.birthday_date AS sender_age,         
          u1.slug AS sender_slug,                 -- Sender's slug
          u2.profile_image AS recipient_profile, 
          u2.username AS recipient_username,      
          u2.location AS recipient_location,      
          u2.birthday_date AS recipient_birthday  
      FROM 
          chatmessages cm
      JOIN 
          users u1 ON cm.user_id = u1.id          -- Join to get sender profile
      JOIN 
          users u2 ON cm.to_id = u2.id            -- Join to get recipient profile
      WHERE 
          cm.to_id = ? AND
          cm.message != '' AND 
          (u1.username LIKE ? OR 
           u1.birthday_date LIKE ? OR 
           u2.location LIKE ? OR 
           cm.message LIKE ?)                    
      ORDER BY 
          cm.date DESC;
    `;

    // Prepare the search terms for the LIKE query
    const searchPattern = `%${searchTerm}%`; // Using wildcards for searching
    const params = [
      user_id,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    ];

    // Execute the query
    db.query(query, params, (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }

      res.status(200).json({
        results: results, // Return the filtered results
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getUserSlug = async (req, res) => {
  var slug = req.body.slug;

  try {
    // Ensure the email is provided

    // Query the database to get the user's profile details
    db.query(
      `SELECT * FROM users where slug = ? ;
      `,
      [slug],
      (err, row) => {
        return res.status(200).json({ row: row });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getUsercheckPermisson = async (req, res) => {
  var slug = req.body.slug;
  var user_id = req.body.user_id;
  var to_id = req.body.to_id;
  console.log(req.body);
  try {
    // Ensure the email is provided

    // Query the database to get the user's profile details
    db.query(
      `SELECT 
        users.*, 
        userphotoPrivate.user_id, 
        userphotoPrivate.to_id, 
        userphotoPrivate.status As uStatus
    FROM 
        users 
    LEFT JOIN 
        userphotoPrivate ON userphotoPrivate.to_id = users.id 
        AND userphotoPrivate.user_id = ? -- Only match with user_id
    WHERE 
        users.slug = ?
        AND (userphotoPrivate.status = 'Yes' OR userphotoPrivate.status IS NULL OR userphotoPrivate.status = 'No')
        AND (userphotoPrivate.to_id = ? OR userphotoPrivate.to_id IS NULL)
    ORDER BY 
        users.id DESC;
      `,
      [user_id, slug, to_id],
      (err, row) => {
        return res.status(200).json({ row: row });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.setonline = async (req, res) => {
  const user_id = req.body.user_id;

  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update the user status to 'Online'
    db.query(
      `UPDATE users 
       SET online_user = 'Online' 
       WHERE id = ?`,
      [user_id],
      (updateErr, updateResults) => {
        if (updateErr) {
          return res
            .status(500)
            .json({ message: "Database update error", error: updateErr });
        }

        // Query to get online users and the total count of online users
        db.query(
          `SELECT *, 
              (SELECT COUNT(*) FROM users WHERE online_user = 'Online' AND id != ?) AS onlineCount 
           FROM users 
           WHERE online_user = 'Online' AND id != ?`,
          [user_id, user_id],
          (queryErr, results) => {
            if (queryErr) {
              return res
                .status(500)
                .json({ message: "Database query error", error: queryErr });
            }

            res.status(200).json({
              message: "Online users",
              onlineCount: results[0]?.onlineCount || 0, // Total count of online users
              results: results, // List of online users
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.setoffline = async (req, res) => {
  const user_id = req.body.user_id;

  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update the user status to 'Offline'
    db.query(
      `UPDATE users 
       SET online_user = 'Offline' 
       WHERE id = ?`,
      [user_id],
      (updateErr, updateResults) => {
        if (updateErr) {
          return res
            .status(500)
            .json({ message: "Database update error", error: updateErr });
        }

        // Query to get offline users and the total count of offline users
        db.query(
          `SELECT *, 
              (SELECT COUNT(*) FROM users WHERE online_user = 'Offline' AND id != ?) AS offlineCount 
           FROM users 
           WHERE online_user = 'Offline' AND id != ?`,
          [user_id, user_id],
          (queryErr, results) => {
            if (queryErr) {
              return res
                .status(500)
                .json({ message: "Database query error", error: queryErr });
            }

            res.status(200).json({
              message: "Offline users",
              offlineCount: results[0]?.offlineCount || 0, // Total count of offline users
              results: results, // List of offline users
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.gettotalOnline = async (req, res) => {
  const user_id = req.body.user_id;

  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update the user status to 'Online'
    db.query(
      `SELECT *, 
          (SELECT COUNT(*) FROM users WHERE online_user = 'Online' AND id != ?) AS onlineCount 
       FROM users 
       WHERE online_user = 'Online' AND id != ?`,
      [user_id, user_id],
      (queryErr, results) => {
        if (queryErr) {
          return res
            .status(500)
            .json({ message: "Database query error", error: queryErr });
        }

        res.status(200).json({
          message: "Online users",
          onlineCount: results[0]?.onlineCount || 0, // Total count of online users
          results: results, // List of online users
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.gettotalImages = async (req, res) => {
  const user_id = req.body.user_id;
  console.log("cf");
  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update the user status to 'Online'
    db.query(
      `SELECT *, 
          (SELECT COUNT(*) FROM gallery WHERE user_id = ?) AS imagesCount 
       FROM gallery 
       WHERE user_id = ?`,
      [user_id, user_id],
      (queryErr, results) => {
        if (queryErr) {
          return res
            .status(500)
            .json({ message: "Database query error", error: queryErr });
        }

        res.status(200).json({
          message: "",
          imagesCount: results[0]?.imagesCount || 0, // Total count of online users
          results: results, // List of online users
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.gettotalGroups = async (req, res) => {
  const user_id = req.body.user_id;
  console.log("cf");
  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update the user status to 'Online'
    db.query(
      `SELECT *, 
          (SELECT COUNT(*) FROM groups WHERE user_id = ?) AS groupsCount 
       FROM groups 
       WHERE user_id = ?`,
      [user_id, user_id],
      (queryErr, results) => {
        if (queryErr) {
          return res
            .status(500)
            .json({ message: "Database query error", error: queryErr });
        }

        res.status(200).json({
          message: "",
          groupsCount: results[0]?.groupsCount || 0, // Total count of online users
          results: results, // List of online users
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.gettotalEvents = async (req, res) => {
  const user_id = req.body.user_id;
  console.log("cf");
  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update the user status to 'Online'
    db.query(
      `SELECT *, 
          (SELECT COUNT(*) FROM groups WHERE user_id = ?) AS eventsCount 
       FROM events 
       WHERE user_id = ?`,
      [user_id, user_id],
      (queryErr, results) => {
        if (queryErr) {
          return res
            .status(500)
            .json({ message: "Database query error", error: queryErr });
        }

        res.status(200).json({
          message: "",
          eventsCount: results[0]?.eventsCount || 0, // Total count of online users
          results: results, // List of online users
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getvisitprofile = async (req, res) => {
  const user_id = req.body.user_id;
  console.log("cf");
  try {
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update the user status to 'Online'
    db.query(
      `SELECT 
            pv.*, 
            u.id AS uid,
            u.username, 
            u.profile_image
        FROM 
            profile_visit pv
        JOIN 
            users u ON pv.user_id = u.id
        WHERE 
            pv.to_id = ? 
        ORDER BY 
            pv.id DESC;`,
      [user_id],
      (queryErr, results) => {
        if (queryErr) {
          return res
            .status(500)
            .json({ message: "Database query error", error: queryErr });
        }

        res.status(200).json({
          message: "",
          result: results, // List of online users
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

function generateSlug(title) {
  if (!title) {
    throw new Error("Title is undefined or null");
  }
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid characters
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/--+/g, "-");
}

function generateSlugedit(title) {
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
    "SELECT COUNT(*) as count FROM speeddate WHERE slug = ?",
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
            "SELECT COUNT(*) as count FROM speeddate WHERE slug = ?",
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

exports.speeddateSave = async (req, res) => {
  const {
    user_id,
    name,
    speed_date,
    speed_time,
    makeImageUse,
    description,
    image, // Optional, depending on your needs
  } = req.body;

  // Validate required fields
  if (!user_id || !name || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }
  //const galleryImage = req.file?.location || null; // For single file upload

  try {
    // Create Date objects and validate

    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    const speed_dates = moment
      .tz(new Date(speed_date), "Europe/Oslo")
      .format("YYYY-MM-DD");
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
      console.log(mp);
      if (err) {
        console.error("Slug generation error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err });
      }

      db.query(
        "INSERT INTO speeddate (speed_date,speed_time,makeImageUse,slug, image, user_id, name, description, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          speed_dates,
          speed_time,
          mp,
          slug,
          galleryImage,
          user_id,
          name,
          description,
          date,
        ],
        (err, result) => {
          if (err) {
            console.error("Database insertion error:", err); // Log error to console
            return res
              .status(500)
              .json({ message: "Database insertion error", error: err });
          }
          logActivity(user_id, `created a speed date session successfully`);
          res.status(201).json({
            message: "Speed Date created successfully",
            galleryId: result.insertId,
            user_id: user_id,
            slug: slug, // Return the generated slug
          });
        }
      );
      // Insert the event data including the slug
    });
  } catch (error) {
    console.error("Event creation error:", error); // Log error to console
    res.status(500).json({ message: "Event creation error", error });
  }
};

exports.getAlldates = async (req, res) => {
  const { user_id } = req.body;
  try {
    // Ensure user_id and to_id are provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
          SELECT g.*, u.username, u.profile_type, u.gender,u.birthday_date
          FROM speeddate g
          JOIN users u ON g.user_id = u.id
          WHERE g.user_id IN (${user_id})  -- Use IN clause to filter by multiple user IDs
          ORDER BY g.id DESC;
      `;

    // Fetching the messages
    db.query(query, (err, results) => {
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
exports.getdates = async (req, res) => {
  const { user_id } = req.body;
  try {
    // Ensure user_id and to_id are provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
      SELECT g.*, u.username,u.profile_type,u.gender,u.birthday_date
      FROM speeddate g
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

exports.getAlldatesSearch = async (req, res) => {
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
      SELECT g.*, u.username, u.profile_type, u.gender,u.birthday_date
      FROM speeddate g
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

exports.getalldatesSearchfilter = async (req, res) => {
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
      SELECT g.*, u.username, u.profile_type, u.gender, u.birthday_date
      FROM speeddate g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id IN (?) ${whereClause}
      ORDER BY g.id DESC;
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

exports.getdatesSearch = async (req, res) => {
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
      SELECT g.*, u.username, u.profile_type, u.gender,u.birthday_date
      FROM speeddate g
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

exports.forumSave = async (req, res) => {
  const {
    user_id,
    name,
    category,
    description,
    image, // Optional, depending on your needs
  } = req.body;

  // Validate required fields
  if (!user_id || !name || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const galleryImage = req.file?.location || null; // For single file upload

  try {
    // Create Date objects and validate

    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    var mp = req.body.makeImageUse;
    mp = mp === true || mp === "true" ? 1 : 0;

    // Generate a unique slug for the event name
    createUniqueSlugForum(name, (err, slug) => {
      console.log(mp);
      if (err) {
        console.error("Slug generation error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err });
      }

      db.query(
        "INSERT INTO forum (category,slug, image, user_id, name, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [category, slug, galleryImage, user_id, name, description, date],
        (err, result) => {
          if (err) {
            console.error("Database insertion error:", err); // Log error to console
            return res
              .status(500)
              .json({ message: "Database insertion error", error: err });
          }
          logActivity(user_id, `created a new forum post successfully`);
          res.status(201).json({
            message: "Forum created successfully",
            galleryId: result.insertId,
            user_id: user_id,
            slug: slug, // Return the generated slug
          });
        }
      );

      // Insert the event data including the slug
    });
  } catch (error) {
    console.error("Event creation error:", error); // Log error to console
    res.status(500).json({ message: "Event creation error", error });
  }
};

function createUniqueSlugForum(title, callback) {
  const slug = generateSlug(title);

  // Check if the slug already exists
  db.query(
    "SELECT COUNT(*) as count FROM forum WHERE slug = ?",
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
            "SELECT COUNT(*) as count FROM forum WHERE slug = ?",
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

exports.getAllforum = async (req, res) => {
  const { user_id } = req.body;
  console.log(user_id);
  try {
    // Ensure user_id and to_id are provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
        SELECT g.*, 
              u.username, 
              u.profile_type, 
              u.gender, 
              u.birthday_date, 
              COUNT(fc.id) AS total_comments
        FROM forum g
        JOIN users u ON g.user_id = u.id
        LEFT JOIN forum_comment fc ON g.id = fc.forum_id  -- Left join to count comments
        WHERE g.user_id IN (${user_id})  -- Use IN clause to filter by multiple user IDs
        GROUP BY g.id, u.username, u.profile_type, u.gender, u.birthday_date  -- Group by all selected fields
        ORDER BY g.id DESC;
    `;

    // Fetching the messages
    db.query(query, (err, results) => {
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

exports.getforum = async (req, res) => {
  const { user_id } = req.body;
  try {
    // Ensure user_id and to_id are provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Query to fetch chat messages between user_id and to_id
    const query = `
      SELECT g.*, u.username,u.profile_type,u.gender,u.birthday_date, COUNT(fc.id) AS total_comments
      FROM forum g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN forum_comment fc ON g.id = fc.forum_id
      WHERE g.user_id = ? And u.id = ?  GROUP BY g.id, u.username, u.profile_type, u.gender, u.birthday_date ORDER BY g.id DESC  `;

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

exports.getAllforumSearch = async (req, res) => {
  const { user_ids, search } = req.body; // Expecting a string of user IDs
  const categories = search || []; // Expecting `search` to be an array of category values

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Ensure categories is an array
    if (!Array.isArray(categories) || categories.length === 0) {
      return res
        .status(400)
        .json({ message: "Search categories are required" });
    }

    // Prepare placeholders for category filtering
    const categoryPlaceholders = categories.map(() => "?").join(", ");

    // Prepare SQL query to fetch galleries for multiple user IDs
    const query = `
      SELECT g.*, u.username, u.profile_type, u.gender, u.birthday_date, COUNT(fc.id) AS total_comments
      FROM forum g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN forum_comment fc ON g.id = fc.forum_id
      WHERE g.user_id IN (${user_ids})
      AND g.category IN (${categoryPlaceholders})
      GROUP BY g.id, u.username, u.profile_type, u.gender, u.birthday_date
      ORDER BY g.id DESC;
    `;

    // Combine categories into the parameters array
    const queryParams = [...categories];

    // Fetching the galleries
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

exports.getforumSearch = async (req, res) => {
  const { user_id, search } = req.body;
  const categories = search || [];

  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Prepare search terms with wildcards for partial matching
    const categoryPlaceholders = categories.map(() => "?").join(", "); // If no search term is provided, match all

    // Query to fetch gallery items based on user_id and search terms
    const query = `
      SELECT g.*, u.username, u.profile_type, u.gender,u.birthday_date, COUNT(fc.id) AS total_comments
      FROM forum g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN forum_comment fc ON g.id = fc.forum_id
      WHERE g.user_id = ?
      AND g.category IN (${categoryPlaceholders})
      GROUP BY g.id, u.username, u.profile_type, u.gender, u.birthday_date ORDER BY g.id DESC;`;
    const queryParams = [...categories];
    // Fetching the gallery items

    db.query(query, [user_id, queryParams], (err, results) => {
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

exports.get_ForumDetailSlug = async (req, res) => {
  const slug = req.body.slug;
  // Validate required fields
  if (!slug) {
    return res.status(400).json({ message: "Event Slug is required." });
  }

  try {
    // Fetch the event for the given event_id
    db.query(
      ` SELECT g.*, u.username, u.profile_type, u.gender,u.birthday_date, COUNT(fc.id) AS total_comments
      FROM forum g
      JOIN users u ON g.user_id = u.id
      LEFT JOIN forum_comment fc ON g.id = fc.forum_id
      WHERE g.slug =? 
      GROUP BY g.id, u.username, u.profile_type, u.gender, u.birthday_date ORDER BY g.id DESC;`,
      [slug],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err, event: "" });
        }

        if (results.length === 0) {
          return res
            .status(200)
            .json({ message: "Event not found.", event: "" });
        }

        // Return the first event since we expect only one row
        res.status(200).json({
          message: "Event retrieved successfully.",
          result: results, // Return the first event object
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.get_ForumComments = async (req, res) => {
  const id = req.body.id;
  // Validate required fields
  if (!id) {
    return res.status(400).json({ message: "Id is required." });
  }

  try {
    // Fetch the event for the given event_id
    db.query(
      `SELECT fc.*, u.profile_image, u.username, u.makeImagePrivate
      FROM forum_comment AS fc
      JOIN users AS u ON fc.user_id = u.id
      WHERE fc.forum_id = ?
      ORDER BY fc.id DESC;
      `,
      [id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err, event: "" });
        }

        // Return the first event since we expect only one row
        res.status(200).json({
          message: "",
          result: results, // Return the first event object
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.forumdelete = async (req, res) => {
  const id = req.body.id;

  // Validate required fields
  if (!id) {
    return res.status(400).json({ message: "Id is required." });
  }

  try {
    // Delete the forum first
    const deleteForumQuery = `DELETE FROM forum WHERE id = ?`;
    db.query(deleteForumQuery, [id], (forumDeleteErr) => {
      if (forumDeleteErr) {
        console.error("Database delete error (forum):", forumDeleteErr);
        return res.status(500).json({
          message: "Database delete error (forum)",
          error: forumDeleteErr,
        });
      }

      // Delete associated comments in forum_comment after successful forum deletion
      const deleteCommentQuery = `DELETE FROM forum_comment WHERE forum_id = ?`;
      db.query(deleteCommentQuery, [id], (commentDeleteErr) => {
        if (commentDeleteErr) {
          console.error("Database delete error (comments):", commentDeleteErr);
          return res.status(500).json({
            message: "Database delete error (comments)",
            error: commentDeleteErr,
          });
        }

        // Success response if both deletions are successful
        res.status(200).json({
          message: "Forum and associated comments deleted successfully.",
        });
      });
    });
  } catch (error) {
    console.error("Event retrieval error:", error);
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.userreport = async (req, res) => {
  const { user_id, to_id, reportData, otherReport } = req.body;
  console.log(req.body);
  // Validate required fields
  if (!user_id || !to_id) {
    return res.status(400).json({ message: "User ID and To ID are required." });
  }

  try {
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    // Step 1: Check if the combination of user_id and to_id exists in the userreport table
    db.query(
      "SELECT * FROM userreport WHERE user_id = ? AND to_id = ?",
      [user_id, to_id],
      (err, result) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // Step 2: If the user_id and to_id exist, update the record
        if (result.length > 0) {
          db.query(
            "UPDATE userreport SET otherReport = ?, report = ?, date = ? WHERE user_id = ? AND to_id = ?",
            [otherReport, reportData, date, user_id, to_id],
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error("Database update error:", updateErr);
                return res
                  .status(500)
                  .json({ message: "Database update error", error: updateErr });
              }
              logActivity(user_id, `sent a report.`);
              return res.status(200).json({
                message: "Report inserted successfully",
                result: updateResult,
              });
            }
          );
        } else {
          // Step 3: If it doesn't exist, insert a new record
          db.query(
            "INSERT INTO userreport (otherReport, user_id, to_id, report, date) VALUES (?, ?, ?, ?, ?)",
            [otherReport, user_id, to_id, reportData, date],
            (insertErr, insertResult) => {
              if (insertErr) {
                console.error("Database insertion error:", insertErr); // Log error to console
                return res.status(500).json({
                  message: "Database insertion error",
                  error: insertErr,
                });
              }
              logActivity(user_id, `sent a report.`);
              return res.status(200).json({
                message: "Report inserted successfully",
                result: insertResult,
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error);
    return res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getdatesSearchfilter = async (req, res) => {
  const { user_id, search } = req.body;
  console.log(req.body);
  try {
    // Ensure user_id is provided
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // If no search term is provided, match all
    const searchTerm = search && search.length > 0 ? search : []; // If no filters, return an empty array

    // Prepare the WHERE clause dynamically based on the search array
    let whereClause = "";
    let queryParams = [user_id]; // Start with the user_id in the query parameters

    if (searchTerm.length > 0) {
      whereClause += " AND (";
      // Dynamically build the WHERE condition for the array of values (e.g., ['Female', 'Couple'])
      searchTerm.forEach((term, index) => {
        // Add condition for each term (e.g., g.gender = ?)
        if (term === "Couple") {
          whereClause += `u.gender = ?`; // Assuming 'is_couple' is the column name for couple filter
        }
        if (term === "Male") {
          whereClause += `u.gender = ?`; // Assuming 'is_couple' is the column name for couple filter
        }
        if (term === "Female") {
          whereClause += `u.gender = ?`; // Assuming 'is_couple' is the column name for couple filter
        }

        if (index < searchTerm.length - 1) {
          whereClause += " OR ";
        }

        queryParams.push(term); // Add each term to the query parameters
      });
      whereClause += ")";
    }

    // Query to fetch gallery items based on user_id and dynamically built search terms
    const query = `
      SELECT g.*, u.username, u.profile_type, u.gender, u.birthday_date
      FROM speeddate g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id = ?
      ${whereClause}
      ORDER BY g.id DESC;
    `;
    console.log(query);
    console.log(whereClause);
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

exports.allforumfilter = async (req, res) => {
  const id = req.body.id;
  // Validate required fields
  if (!id) {
    return res.status(400).json({ message: "Id is required." });
  }

  try {
    // Fetch the event for the given event_id
    db.query(
      `SELECT fc.*, u.profile_image, u.username, u.makeImagePrivate
      FROM forum_comment AS fc
      JOIN users AS u ON fc.user_id = u.id
      WHERE fc.forum_id = ?
      ORDER BY fc.id DESC;
      `,
      [id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database query error", error: err, event: "" });
        }

        // Return the first event since we expect only one row
        res.status(200).json({
          message: "",
          result: results, // Return the first event object
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.handlepostDelete = (req, res) => {
  const { id, user_id } = req.body;

  try {
    // Ensure both id and user_id are provided
    if (!id || !user_id) {
      return res
        .status(400)
        .json({ message: "Both ID and User ID are required" });
    }

    // Query to delete from the group_post table
    db.query(
      `DELETE FROM speeddate WHERE id = ? AND user_id = ?`,
      [id, user_id],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }
        return res.status(200).json({
          message: "Post and related records deleted successfully",
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getdatesedit = (req, res) => {
  const { id, user_id } = req.body;

  try {
    // Ensure both id and user_id are provided
    if (!id || !user_id) {
      return res
        .status(400)
        .json({ message: "Both ID and User ID are required" });
    }

    // Query to delete from the group_post table
    db.query(
      `SELECT * FROM speeddate WHERE id = ? AND user_id = ?`,
      [id, user_id],
      (err, row) => {
        if (err) {
          return res.status(500).json({
            message: "Database query error",
            error: err,
          });
        }
        return res.status(200).json({
          message: "Get date",
          result: row[0],
        });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.speeddateUpdate = async (req, res) => {
  const {
    speedIdedit, // ID of the record to update
    user_id, // ID of the user
    name,
    speed_date,
    speed_time,
    makeImageUse,
    description,
    image,
  } = req.body;
  // Validate required fields
  // if (!speedIdedit || !user_id || !name || !description) {
  //   return res.status(400).json({ message: "All fields are required" });
  // }
  console.log(req.body);
  try {
    // Format dates
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    const speed_dates = moment
      .tz(new Date(speed_date), "Europe/Oslo")
      .format("YYYY-MM-DD");

    // Convert `makeImageUse` to numeric format
    let mp = makeImageUse === true || makeImageUse === "true" ? 1 : 0;

    // Handle image logic
    let galleryImage = null;
    galleryImage = req.body.image;

    // Generate a unique slug for the event name
    createUniqueSlug(name, (err, slug) => {
      if (err) {
        console.error("Slug generation error:", err);
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err });
      }

      // Perform the update query
      db.query(
        `UPDATE speeddate
         SET speed_date = ?, speed_time = ?, makeImageUse = ?, slug = ?, image = ?, name = ?, description = ?, date = ?
         WHERE id = ? AND user_id = ?`,
        [
          speed_dates,
          speed_time,
          mp,
          slug,
          galleryImage,
          name,
          description,
          date,
          speedIdedit, // ID of the record to update
          user_id, // User ID to ensure proper ownership
        ],
        (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return res
              .status(500)
              .json({ message: "Database update error", error: err });
          }

          // If no rows were affected, the record doesn't exist
          if (result.affectedRows === 0) {
            return res
              .status(404)
              .json({ message: "Record not found or no changes made" });
          }

          // Respond with success
          res.status(200).json({
            message: "Speed Date updateds successfully",
            speedIdedit: speedIdedit,
            user_id: user_id,
            slug: slug,
          });
        }
      );
    });
  } catch (error) {
    console.error("Event update error:", error);
    res.status(500).json({ message: "Event update error", error });
  }
};

exports.updatespeed_dates = async (req, res) => {
  const {
    speedIdedit, // ID of the record to update
    user_id, // ID of the user
    name,
    speed_date,
    speed_time,
    makeImageUse,
    description,
    image,
  } = req.body;
  // Validate required fields
  // if (!speedIdedit || !user_id || !name || !description) {
  //   return res.status(400).json({ message: "All fields are required" });
  // }

  try {
    // Format dates
    const date = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");
    const speed_dates = moment
      .tz(new Date(speed_date), "Europe/Oslo")
      .format("YYYY-MM-DD");

    // Convert `makeImageUse` to numeric format
    let mp = makeImageUse === true || makeImageUse === "true" ? 1 : 0;

    // Handle image logic
    let galleryImage = null;
    if (mp === 1) {
      galleryImage = req.body.image; // Use the existing image if provided
    } else if (req.file) {
      galleryImage = req.file?.location || null; // Use the uploaded file location if available
    }

    // Generate a unique slug for the event name
    createUniqueSlug(name, (err, slug) => {
      if (err) {
        console.error("Slug generation error:", err);
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err });
      }

      // Perform the update query
      db.query(
        `UPDATE speeddate
         SET speed_date = ?, speed_time = ?, makeImageUse = ?, slug = ?, image = ?, name = ?, description = ?, date = ?
         WHERE id = ? AND user_id = ?`,
        [
          speed_dates,
          speed_time,
          mp,
          slug,
          galleryImage,
          name,
          description,
          date,
          speedIdedit, // ID of the record to update
          user_id, // User ID to ensure proper ownership
        ],
        (err, result) => {
          if (err) {
            console.error("Database update error:", err);
            return res
              .status(500)
              .json({ message: "Database update error", error: err });
          }

          // If no rows were affected, the record doesn't exist
          if (result.affectedRows === 0) {
            return res
              .status(404)
              .json({ message: "Record not found or no changes made" });
          }

          // Respond with success
          res.status(200).json({
            message: "Speed Date updated successfully",
            speedIdedit: speedIdedit,
            user_id: user_id,
            slug: slug,
          });
        }
      );
    });
  } catch (error) {
    console.error("Event update error:", error);
    res.status(500).json({ message: "Event update error", error });
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
