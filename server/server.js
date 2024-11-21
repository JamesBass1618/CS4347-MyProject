const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'library_db',
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL Database.');
});

// Employee login endpoint
app.post('/employee-login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM employee WHERE Email = ? AND PhoneNum = ?';

    db.query(query, [username, password], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.length > 0) {
            res.json({ success: true, employee: result[0] });
        } else {
            res.json({ success: false, message: 'Invalid credentials.' });
        }
    });
});

// Guest login endpoint
app.post('/guest-login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM User WHERE Email = ? AND PhoneNum = ?';

    db.query(query, [username, password], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.length > 0) {
            res.json({ success: true, user: result[0] });
        } else {
            res.json({ success: false, message: 'Invalid credentials.' });
        }
    });
});

app.get('/get-books', (req, res) => {
    const option = req.query.option; // e.g., BookID, Title
    const value = req.query.value; // Search term

    let query = 'SELECT * FROM Book'; // Default: fetch all books
    let params = [];

    if (option && value) {
        query += ` WHERE ?? = ?`; // Dynamic query with column name and value
        params = [option, value];
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database query failed');
        }
        res.json(results);
    });
});

// Endpoint for adding a new book
app.post('/add-book', (req, res) => {
    console.log('Received book data:', req.body); // Log
    let { title, author, publisher, genre, pubdate, isrented, sectionnum } = req.body;

    // Ensure the correct data types:
    title = String(title);        // Make sure title is a string
    author = String(author);      // Make sure author is a string
    publisher = String(publisher); // Make sure publisher is a string
    genre = String(genre);        // Make sure genre is a string

    pubdate = new Date(pubdate);  // Convert pubdate to a Date object if it's not already in the correct format
    pubdate = pubdate.toISOString().split('T')[0]; // Convert Date to 'YYYY-MM-DD' format

    isrented = parseInt(isrented) === 1 ? 1 : 0; // Ensure isrented is 1 (true) or 0 (false)
    sectionnum = sectionnum ? parseInt(sectionnum) : null; // Ensure sectionnum is a valid integer or null

    // SQL query to insert the new book into the 'Book' table
    const query = `
        INSERT INTO Book (Author, Title, Publisher, Genre, PubDate, IsRented, SectionNum) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [author, title, publisher, genre, pubdate, isrented, sectionnum || null];  // Default sectionnum to NULL if not provided

    db.query(query, params, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Failed to add the book' });
        }
        res.json({ success: true, message: 'Book added successfully!' });
    });
});

// Endpoint to delete a book by title
app.delete('/delete-book', (req, res) => {
    console.log('Received book data:', req.body); // Log
    let { title } = req.body; // Extract title from the request body
    title = String(title);

    const query = `DELETE FROM Book WHERE Title = ?`;

    const params = [title];

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Error deleting book:', err);
            return res.status(500).json({ success: false, message: 'Failed to delete the book' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        res.json({ success: true, message: 'Book deleted successfully!' });
    });
});



// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
