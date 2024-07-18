const express = require('express');
const app = express();
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

app.use(express.json());
app.use(cors());
dotenv.config();

// Connection to the database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Check if the connection works
db.connect((err) => {
    if (err) return console.log("Error connecting to mysql:", err);
    console.log("Connected to mysql as id:", db.threadId);

    // Create database if connection is working
    db.query(`CREATE DATABASE IF NOT EXISTS expense_tracker`, (err) => {
        if (err) return console.log("Error Creating Database:", err);
        console.log("Database expense_tracker created successfully!");

        // Change to our database
        db.changeUser({ database: 'expense_tracker' }, (err) => {
            if (err) return console.log("Error selecting the database:", err);
            console.log("Database expense_tracker selected!");

            // Create user table
            const userTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    username VARCHAR(50) NOT NULL,
                    password VARCHAR(255)
                )`;
            // Create the table
            db.query(userTable, (err, result) => {
                if (err) return console.log("Error creating the table:", err);
                console.log("Table created successfully");
            });
        });
    });
});

// User registration route
app.post('/api/register', async (req, res) => {
    try {
        const users = `SELECT * FROM users WHERE email = ?`;
        // Check if user exists
        db.query(users, [req.body.email], (err, data) => {
            if (err) return res.status(500).json("Database query error");
            // If we find user with same email in database
            if (data.length > 0) return res.status(409).json("User already exists");

            // If we don't find user email in database
            // Hashing password (encryption)
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(req.body.password, salt);

            // Query to create new user
            const newUser = `INSERT INTO users(email, username, password) VALUES (?)`;
            const value = [req.body.email, req.body.username, hashedPassword];

            db.query(newUser, [value], (err, data) => {
                if (err) return res.status(400).json("Something went wrong");

                return res.status(200).json("User created successfully");
            });
        });
    } catch (err) {
        res.status(500).json("Internal Server Error");
    }
});

// User login route
app.post('/api/login', async (req, res) => {
    try {
        const users = `SELECT * FROM users WHERE email = ?`;
        db.query(users, [req.body.email], (err, data) => {
            if (err) return res.status(500).json("Database query error");
            if (data.length === 0) return res.status(404).json("User not found");

            const isPasswordValid = bcrypt.compareSync(req.body.password, data[0].password);
            if (!isPasswordValid) return res.status(400).json("Invalid username or password");

            return res.status(200).json("Login successful");
        });
    } catch (error) {
        res.status(500).json("Internal Server Error");
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
