const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sql = require("mssql");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const path = require("path");

// Middleware
app.use(bodyParser.json());
app.use(cors());



// SQL Server configuration
const config = {
  user: "sa",
  password: "Qtickets@123$",
  server: "94.237.61.190",
  database: "JobExchange",
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true, // Set to true if the server uses a self-signed certificate
  },
};

// Connect to SQL Server
async function connectToDatabase() {
  try {
    await sql.connect(config);
    console.log("Connected to SQL Server");
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
}

// Swagger definition and options
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Contact Form API",
      version: "1.0.0",
      description: "API for handling contact form submissions",
    },
    servers: [
      {
        url: "http://localhost:5000", // Updated server URL
        description: "Local server",
      },
    ],
  },
  apis: ["./server.js"], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Swagger API documentation for ContactForm schema
/**
 * @swagger
 * components:
 *   schemas:
 *     ContactForm:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - subject
 *         - message
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated ID for the contact message
 *         name:
 *           type: string
 *           description: Name of the person submitting the form
 *         email:
 *           type: string
 *           description: Email address of the person
 *         subject:
 *           type: string
 *           description: Subject of the message
 *         message:
 *           type: string
 *           description: The actual message
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Time of the form submission
 */

// Swagger API for submitting a contact form
/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit a contact form
 *     tags: [ContactForm]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactForm'
 *     responses:
 *       200:
 *         description: Form submitted successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */


app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "Please fill all fields" });
  }

  const timestamp = new Date();

  try {
    const pool = await sql.connect(config);
    const query = `
      INSERT INTO contact_us (name, email, subject, message, timestamp) 
      VALUES (@name, @Email, @Subject, @Message, @Timestamp)
    `;

    const request = pool.request();
    request.input("name", sql.VarChar, name);
    request.input("Email", sql.VarChar, email);
    request.input("Subject", sql.VarChar, subject);
    request.input("Message", sql.VarChar, message);
    request.input("Timestamp", sql.DateTime, timestamp);

    await request.query(query);

    res.status(200).json({ message: "Form submitted successfully!" });
  } catch (err) {
    console.error("Error inserting data into SQL:", err);
    res.status(500).json({ error: "Failed to submit form" });
  }
});

// Swagger API for retrieving contact messages
/**
 * @swagger
 * /api/contact/list:
 *   get:
 *     summary: Retrieve all contact form messages
 *     tags: [ContactForm]
 *     responses:
 *       200:
 *         description: Successfully retrieved contact messages
 *       500:
 *         description: Internal server error
 */
app.get("/api/contact/list", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const query = `SELECT * FROM contact_us ORDER BY timestamp DESC`;
    const result = await pool.request().query(query);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error retrieving data from SQL:", err);
    res.status(500).json({ error: "Failed to retrieve messages" });
  }
});

app.use(express.static(path.join(__dirname, "frontend/build"))); // Adjust the path as needed

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/build", "index.html"));
});

// Start the server
const PORT = 5000; // Updated port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectToDatabase();
});
