const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const multer = require("multer");
const path = require("path");
const WebSocket = require("ws");
const slugify = require("slugify");
const moment = require("moment-timezone");
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);
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
exports.getnotifications = async (req, res) => {
  const { user_id, user_ids } = req.body; // Expecting a string of user IDs

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Prepare SQL query to fetch galleries for multiple user IDs
    const query = `
      SELECT g.*, u.username, u.profile_image,u.profile_type, u.gender
      FROM notification g
      JOIN users u ON g.user_id = u.id
      WHERE g.user_id = ${user_id}  -- Use IN clause to filter by multiple user IDs
      ORDER BY g.id DESC;
    `;
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getnotificationsdashboard = async (req, res) => {
  const { user_id, user_ids } = req.body; // Expecting a string of user IDs

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Prepare SQL query to fetch galleries for multiple user IDs
    const query = `
      SELECT g.*, u.username, u.profile_image,u.profile_type, u.gender
      FROM notification g
      JOIN users u ON g.user_id = u.id
      WHERE  g.user_id = ${user_id}  -- Use IN clause to filter by multiple user IDs
      ORDER BY g.id DESC LIMIT 5;
    `;
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Database query error",
          error: err,
        });
      }
      return res.status(200).json({ results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.updatenotifications = async (req, res) => {
  const { user_id, user_ids } = req.body; // Expecting a string of user IDs

  try {
    // Ensure user_ids is provided
    if (!user_ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Prepare SQL query to update notifications for multiple user IDs
    const updateQuery = `
      UPDATE notification
      SET \`read\` = 'Yes'
      WHERE user_id = ?;
    `;

    // Usage with a parameterized query
    db.query(updateQuery, [user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }
      return res
        .status(200)
        .json({ message: "Notifications updated successfully", results });
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.notificationfriend_request = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided
    if (user_id == null || check == null) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Determine the value to set for notification_friend_request
    const notificationValue = check;

    // Prepare SQL query to update the notification_friend_request field
    const updateQuery = `
      UPDATE users
      SET notification_friend_request = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.notificationnew_message = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided
    if (user_id == null || check == null) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Determine the value to set for notification_message
    const notificationValue = check;

    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET notification_message = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.notificationevent_group = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided
    if (user_id == null || check == null) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Determine the value to set for notification_message
    const notificationValue = check;

    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET notification_group_event = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.notificationnew_created = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided
    if (user_id == null || check == null) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Determine the value to set for notification_message
    const notificationValue = check;

    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET notification_new_created = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.notificationnews_update = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided

    // Determine the value to set for notification_message
    const notificationValue = check;
    console.log(check);
    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET notification_news_update = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.notificationnews_profile = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided
    if (user_id == null || check == null) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Determine the value to set for notification_message
    const notificationValue = check;

    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET notification_news_profile = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.notificationspecial_offers = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided
    if (user_id == null || check == null) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Determine the value to set for notification_message
    const notificationValue = check;

    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET notification_special_offers = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.notificationother_users = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided
    if (user_id == null || check == null) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Determine the value to set for notification_message
    const notificationValue = check;

    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET notification_other_users = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.notificationactive_users = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided

    // Determine the value to set for notification_message
    const notificationValue = check;

    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET notification_show_activity = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Notification updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.album_statussave = async (req, res) => {
  const { user_id, check } = req.body; // Expecting user_id and check from the request body

  try {
    // Ensure user_id and check are provided

    // Determine the value to set for notification_message
    const notificationValue = check;

    // Prepare SQL query to update the notification_message field
    const updateQuery = `
      UPDATE users
      SET album_setting_status = ?
      WHERE id = ?;
    `;

    // Execute the parameterized query
    db.query(updateQuery, [notificationValue, user_id], (err, results) => {
      if (err) {
        console.error("Database update error:", err);
        return res
          .status(500)
          .json({ message: "Database update error", error: err });
      }

      // Respond with success message
      return res
        .status(200)
        .json({ message: "Album setting updated successfully", results });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
