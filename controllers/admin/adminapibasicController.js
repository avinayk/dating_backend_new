const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../db");
const moment = require("moment-timezone");
require("dotenv").config();

exports.getuserfriendlist = (req, res) => {
  var user_id = req.body.user_id;
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
exports.getusereventlist = async (req, res) => {
  const user_id = req.body.user_id;
  console.log(req.body);
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      "SELECT * FROM events WHERE user_id = ? ORDER BY id DESC",
      [user_id],
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
exports.getusergrouplist = async (req, res) => {
  const user_id = req.body.user_id;
  console.log(req.body);
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      "SELECT * FROM groups WHERE user_id = ? ORDER BY id DESC",
      [user_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Groups retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};
exports.getusereventJoin = async (req, res) => {
  const user_id = req.body.user_id;
  const event_id = req.body.event_id;
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      "SELECT a.*,c.username,c.profile_image FROM events a Join events_invite b on a.id = b.event_id join users c on b.sent_id = c.id WHERE  a.id =? And b.accept = 'Yes'  ORDER BY a.id DESC;",
      [event_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Join events retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getusereventinterested = async (req, res) => {
  const user_id = req.body.user_id;
  const event_id = req.body.event_id;
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      "SELECT a.*,c.username,c.profile_image FROM events a Join events_intersted b on a.id = b.event_id join users c on b.user_id = c.id WHERE b.event_id =?  ORDER BY a.id DESC;",
      [event_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Join events retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};
exports.getusereventInvite = async (req, res) => {
  const user_id = req.body.user_id;
  const event_id = req.body.event_id;
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all events for the given user_id
    db.query(
      "SELECT a.*,c.username,c.profile_image FROM events a Join events_invite b on a.id = b.event_id join users c on b.sent_id = c.id WHERE b.sent_id = ? And a.id =? And b.accept =?  ORDER BY a.id DESC;",
      [user_id, event_id, "No"],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If events are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Join events retrieved successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getusergroupinterested = async (req, res) => {
  const user_id = req.body.user_id;
  const group_id = req.body.group_id;
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all Group for the given user_id
    db.query(
      "SELECT a.*,c.username,c.profile_image FROM groups a Join groups_intersted b on a.id = b.group_id join users c on b.user_id = c.id WHERE b.group_id =?  ORDER BY a.id DESC;",
      [group_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If Group are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Result successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.getusergroupinvite = async (req, res) => {
  const user_id = req.body.user_id;
  const group_id = req.body.group_id;
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all group for the given user_id
    db.query(
      "SELECT a.*,c.username,c.profile_image FROM groups a Join  groups_invite b on a.id = b.group_id join users c on b.sent_id = c.id WHERE b.sent_id = ? And a.id =? And b.accept =?  ORDER BY a.id DESC;",
      [user_id, group_id, "No"],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If group are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Group successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};

exports.getuserjoinGroup = async (req, res) => {
  const user_id = req.body.user_id;
  const group_id = req.body.group_id;
  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Fetch all group for the given user_id
    db.query(
      "SELECT a.*,c.username,c.profile_image FROM groups a Join groups_invite b on a.id = b.group_id join users c on b.sent_id = c.id WHERE a.id =? And b.accept = 'Yes'  ORDER BY a.id DESC;",
      [group_id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }

        // If group are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Group successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Event retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Event retrieval error", error });
  }
};
exports.getgroupPostData = async (req, res) => {
  const slug = req.body.slug;
  // Validate required fields
  if (!slug) {
    return res.status(400).json({ message: "Slug is required" });
  }

  try {
    // Fetch all group for the given user_id
    db.query(
      `SELECT 
    a.*, b.id as post_id,b.file as image,
    COUNT(DISTINCT c.id) AS total_comments,
    COUNT(DISTINCT f.id) AS total_likes
  FROM 
    groups a
  JOIN 
    group_post b ON a.id = b.group_id
  LEFT JOIN 
    group_post_comment c ON b.id = c.group_post_id
  LEFT JOIN 
    group_post_favourite f ON b.id = f.post_id
  WHERE 
    a.slug = ?
  GROUP BY 
    a.id, b.id
  ORDER BY 
    b.id DESC`,
      [slug],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }
        // If group are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Group post successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.getgroupData = async (req, res) => {
  const slug = req.body.slug;
  // Validate required fields
  if (!slug) {
    return res.status(400).json({ message: "Slug is required" });
  }

  try {
    // Fetch all group for the given user_id
    db.query("SELECT * from groups where slug = ?", [slug], (err, row) => {
      if (err) {
        console.error("Database query error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Database query error", error: err });
      }
      // If group are found, return them; otherwise, return a message
      res.status(200).json({
        message: "Group post successfully",
        results: row[0],
      });
    });
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

const { promisify } = require("util"); // To promisify the db.query function

// Promisify the query function
const query = promisify(db.query).bind(db);

exports.deletegrouppost = async (req, res) => {
  const postid = req.body.id;

  try {
    // Start deleting from related tables in the correct order
    await query(`DELETE FROM group_post WHERE id = ?`, [postid]);
    await query(`DELETE FROM group_post_comment WHERE group_id = ?`, [postid]);
    await query(`DELETE FROM group_post_favourite WHERE group_id = ?`, [
      postid,
    ]);

    // Return success response after all deletions
    return res.status(200).json({
      message: "Group and related data deleted successfully",
    });
  } catch (err) {
    // If any of the queries fail, return a 500 error with the error message
    return res.status(500).json({
      message: "Database delete error",
      error: err,
    });
  }
};
exports.deletegrouppostComment = async (req, res) => {
  const postid = req.body.id;

  try {
    // Start deleting from related tables in the correct order

    await query(`DELETE FROM group_post_comment WHERE id = ?`, [postid]);

    // Return success response after all deletions
    return res.status(200).json({
      message: "",
    });
  } catch (err) {
    // If any of the queries fail, return a 500 error with the error message
    return res.status(500).json({
      message: "Database delete error",
      error: err,
    });
  }
};
exports.deletegrouppostLike = async (req, res) => {
  const postid = req.body.id;
  console.log(postid);
  try {
    // Start deleting from related tables in the correct order

    await query(`DELETE FROM group_post_favourite WHERE id = ?`, [postid]);

    // Return success response after all deletions
    return res.status(200).json({
      message: "",
    });
  } catch (err) {
    // If any of the queries fail, return a 500 error with the error message
    return res.status(500).json({
      message: "Database delete error",
      error: err,
    });
  }
};

exports.getallgroupinteresteduser = async (req, res) => {
  const id = req.body.id;
  // Validate required fields
  if (!id) {
    return res.status(400).json({ message: "Id is required" });
  }

  try {
    // Fetch all group for the given user_id
    db.query(
      "SELECT a.*,b.username,b.profile_image from groups_intersted a Left join users b on a.user_id = b.id  where a.group_id = ?",
      [id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }
        // If group are found, return them; otherwise, return a message
        res.status(200).json({
          message: "Group post successfully",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};
exports.deletemediacomment = async (req, res) => {
  const postid = req.body.id;

  try {
    // Start deleting from related tables in the correct order

    await query(`DELETE FROM gallery_comment WHERE id = ?`, [postid]);

    // Return success response after all deletions
    return res.status(200).json({
      message: "",
    });
  } catch (err) {
    // If any of the queries fail, return a 500 error with the error message
    return res.status(500).json({
      message: "Database delete error",
      error: err,
    });
  }
};

exports.getallforumComments = async (req, res) => {
  const id = req.body.id;
  // Validate required fields
  if (!id) {
    return res.status(400).json({ message: "Id is required" });
  }

  try {
    // Fetch all group for the given user_id
    db.query(
      "SELECT a.*,b.username,b.profile_image from forum_comment a Left join users b on a.user_id = b.id  where a.forum_id = ?",
      [id],
      (err, results) => {
        if (err) {
          console.error("Database query error:", err); // Log error to console
          return res
            .status(500)
            .json({ message: "Database query error", error: err });
        }
        // If group are found, return them; otherwise, return a message
        res.status(200).json({
          message: "",
          results: results,
        });
      }
    );
  } catch (error) {
    console.error("Group retrieval error:", error); // Log error to console
    res.status(500).json({ message: "Group retrieval error", error });
  }
};

exports.deleteforumComment = async (req, res) => {
  const postid = req.body.id;

  try {
    // Start deleting from related tables in the correct order

    await query(`DELETE FROM forum_comment WHERE id = ?`, [postid]);

    // Return success response after all deletions
    return res.status(200).json({
      message: "",
    });
  } catch (err) {
    // If any of the queries fail, return a 500 error with the error message
    return res.status(500).json({
      message: "Database delete error",
      error: err,
    });
  }
};

exports.gettotalSaleRevenueYearly = (req, res) => {
  const query = `
    SELECT
      MONTH(start_date) AS month,
      SUM(CAST(amount AS DECIMAL(10, 2))) AS total_sale,
      SUM(CAST(amount AS DECIMAL(10, 2))) AS total_revenue
    FROM allmembership
    WHERE YEAR(start_date) = YEAR(CURRENT_DATE)
    GROUP BY MONTH(start_date)
    ORDER BY MONTH(start_date) ASC;
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Database query error", error: err });
    }

    // Initialize data with all months set to 0
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const totalSales = Array(12).fill(0);
    const totalRevenues = Array(12).fill(0);

    // Map results to the corresponding month
    results.forEach((row) => {
      const index = row.month - 1; // Months are 1-based in SQL
      totalSales[index] = row.total_sale;
      totalRevenues[index] = row.total_revenue;
    });

    // Format the response to match the required chart structure
    const data = {
      labels: months,
      datasets: [
        {
          label: "Sale",
          data: totalSales,
          backgroundColor: "rgba(0, 156, 255, .7)",
        },
        {
          label: "Revenue",
          data: totalRevenues,
          backgroundColor: "rgba(0, 156, 255, .5)",
        },
      ],
    };

    res.status(200).json({ result: data });
  });
};

exports.adminEditevent = async (req, res) => {
  const { id, name, start_date, end_date, time, location, description } =
    req.body;

  // Validate required fields
  if (
    !id ||
    !name ||
    !start_date ||
    !end_date ||
    !time ||
    !location ||
    !description
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let eventImage = req.file?.location || null; // For single file upload, defaults to null if no file uploaded

  try {
    // Create Date objects and validate
    const startDate = moment
      .tz(new Date(start_date), "Europe/Oslo")
      .format("YYYY-MM-DD");
    const endDate = moment
      .tz(new Date(end_date), "Europe/Oslo")
      .format("YYYY-MM-DD");

    // Optionally check if start_date is before end_date
    if (startDate >= endDate) {
      return res
        .status(200)
        .json({ message: "Start date must be before end date", status: "2" });
    }

    const updatedAt = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    var mp = req.body.makeImagePrivatee;
    mp = mp === true || mp === "true" ? 1 : 0;

    // Generate a unique slug for the event name
    createUniqueSlug(name, id, "events", (err, slug) => {
      if (err) {
        console.error("Slug generation error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err, status: "2" });
      }

      // First, get the current image from the database
      db.query("SELECT image FROM events WHERE id = ?", [id], (err, rows) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }

        // If no event found with the given ID
        if (rows.length === 0) {
          return res.status(404).json({ message: "Event not found" });
        }

        // If no new image is uploaded, use the current image from the database
        if (!eventImage) {
          eventImage = rows[0].image;
        }

        // Update the event data including the slug and image
        db.query(
          "UPDATE events SET makeImagePrivate = ?, slug = ?, image = ?, name = ?, start_date = ?, end_date = ?, time = ?, location = ?, description = ?, updated_at = ? WHERE id = ?",
          [
            mp, // makeImagePrivate
            slug, // slug
            eventImage, // image
            name, // name
            startDate, // start_date
            endDate, // end_date
            time, // time
            location, // location
            description, // description
            updatedAt, // updated_at
            id, // id (the ID of the event to update)
          ],
          (err, result) => {
            if (err) {
              console.error("Database update error:", err); // Log error to console
              return res
                .status(500)
                .json({ message: "Database update error", error: err });
            }

            // Check if any rows were affected
            if (result.affectedRows === 0) {
              return res.status(404).json({ message: "Event not found" });
            }

            res.status(200).json({
              message: "Event updated successfully",
              eventId: id,
              slug: slug,
              status: "1",
            });
          }
        );
      });
    });
  } catch (error) {
    console.error("Something went wrong, please try again:", error); // Log error to console
    res
      .status(500)
      .json({ message: "Something went wrong, please try again", error });
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
function createUniqueSlug(title, id, table, callback) {
  const slug = generateSlug(title);

  // Check if the slug already exists
  db.query(
    "SELECT COUNT(*) as count FROM ?? WHERE slug = ? AND id != ?",
    [table, slug, id],
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
            "SELECT COUNT(*) as count FROM events WHERE slug = ?",
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
exports.adminEditgroup = async (req, res) => {
  const { id, name, description } = req.body;

  // Validate required fields
  if (!id || !name) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let eventImage = req.file?.location || null; // For single file upload, defaults to null if no file uploaded

  try {
    // Create Date objects and validate

    const updatedAt = moment
      .tz(new Date(), "Europe/Oslo")
      .format("YYYY-MM-DD HH:mm:ss");

    var mp = req.body.makeImagePrivatee;
    mp = mp === true || mp === "true" ? 1 : 0;

    // Generate a unique slug for the event name
    createUniqueSlug(name, id, "groups", (err, slug) => {
      if (err) {
        console.error("Slug generation error:", err); // Log error to console
        return res
          .status(500)
          .json({ message: "Slug generation error", error: err, status: "2" });
      }

      // First, get the current image from the database
      db.query("SELECT image FROM groups WHERE id = ?", [id], (err, rows) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }

        // If no event found with the given ID
        if (rows.length === 0) {
          return res.status(404).json({ message: "Group not found" });
        }

        // If no new image is uploaded, use the current image from the database
        if (!eventImage) {
          eventImage = rows[0].image;
        }

        // Update the event data including the slug and image
        db.query(
          "UPDATE groups SET makeImageUse = ?, slug = ?, image = ?, name = ?, description = ?, updated_at = ? WHERE id = ?",
          [
            mp, // makeImagePrivate
            slug, // slug
            eventImage, // image
            name, // name
            description, // description
            updatedAt, // updated_at
            id, // id (the ID of the event to update)
          ],
          (err, result) => {
            if (err) {
              console.error("Database update error:", err); // Log error to console
              return res
                .status(500)
                .json({ message: "Database update error", error: err });
            }

            // Check if any rows were affected
            if (result.affectedRows === 0) {
              return res.status(404).json({ message: "Group not found" });
            }

            res.status(200).json({
              message: "Group updated successfully",
              groupId: id,
              slug: slug,
              status: "1",
            });
          }
        );
      });
    });
  } catch (error) {
    console.error("Something went wrong, please try again:", error); // Log error to console
    res
      .status(500)
      .json({ message: "Something went wrong, please try again", error });
  }
};

exports.getusertotalgroups = (req, res) => {
  var user_id = req.body.user_id;
  db.query(
    `SELECT * from groups where user_id =? `,
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
exports.getusertotalevents = (req, res) => {
  var user_id = req.body.user_id;
  db.query(
    `SELECT * from events where user_id =? `,
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
exports.getusertotalforum = (req, res) => {
  var user_id = req.body.user_id;
  db.query(
    `SELECT * from forum where user_id =? `,
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
exports.getusertotalspeeddate = (req, res) => {
  var user_id = req.body.user_id;
  db.query(
    `SELECT * from speeddate where user_id =? `,
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
