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
    // Vulnerable query construction
    const query = `SELECT * FROM employee WHERE Email = '${username}' AND PhoneNum = '${password}'`;

    db.query(query, (err, result) => {
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

    // Query to verify the user's credentials
    const userQuery = 'SELECT * FROM User WHERE Email = ? AND PhoneNum = ?';

    db.query(userQuery, [username, password], (err, userResult) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }
        console.log(userResult);

        if (userResult.length > 0) {
            const user = userResult[0];

            // Query to fetch rented items for the authenticated user
            const rentedItemsQuery = `
                SELECT BookID, Rent_Date, Return_Date
                FROM RentReturn
                WHERE UserID = ?
            `;

            db.query(rentedItemsQuery, [user.UserID], (err, rentedItemsResult) => {
                if (err) {
                    console.error('Error fetching rented items:', err);
                    return res.status(500).send('Error retrieving rented items');
                }

                // Respond with user details and rented items
                res.json({
                    success: true,
                    user: {
                        UserID: user.UserID,
                        FName: user.FName,
                        MiddleI: user.MiddleI,
                        LName: user.LName,
                        PhoneNum: user.PhoneNum,
                        Email: user.Email,
                    },
                    rentedItems: rentedItemsResult, // List of rented items
                });
            });
        } else {
            res.json({ success: false, message: 'Invalid credentials.' });
        }
    });
});


app.get('/get-books', (req, res) => {
    const option = req.query.option; // e.g., BookID, Title
    const value = req.query.value; // Search term

    const validColumns = ['BookID', 'ISBN', 'Title', 'Author', 'Publisher', 'Genre', 'IsRented', 'SectionNum'];
    let query = 'SELECT * FROM Book'; // Default: fetch all books
    let params = [];

    // Check if a valid column and value are provided
    if (option && validColumns.includes(option)) {
        query += ` WHERE ${option} = ?`;
        params = [value];
    }

    // Execute the query
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

app.patch('/update-book', (req, res) => {
    const { title, publisher } = req.body;

    // Validate that at least the title is provided
    if (!title) {
        return res.status(400).json({ success: false, message: 'Title is required for update' });
    }

    // Dynamically build the `SET` clause based on provided fields
    let updates = '';
    if (publisher !== undefined) {
        updates += `Publisher = '${publisher}'`;  // Vulnerable part
    }

    /*if (isrented !== undefined) {
        if (updates) updates += ', ';  // Adding a comma if previous fields exist
        updates += `IsRented = ${isrented}`;  // Vulnerable part
    }*/

    if (!updates) {
        return res.status(400).json({ success: false, message: 'No update fields provided' });
    }

    // Construct the SQL query dynamically (vulnerable to injection)
    const query = `UPDATE Book SET Publisher = '${publisher}' WHERE Title = '${title}'`;  // Vulnerable part

    // Execute the query without prepared statements
    db.query(query, (err, result) => {
        if (err) {
            console.error('Error updating book:', err);
            return res.status(500).json({ success: false, message: 'Failed to update the book' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        res.json({ success: true, message: 'Book updated successfully!' });
    });
});


app.post('/rent-book', (req, res) => {
    console.log('Received rental data:', req.body); // Log
    let { title, userID, rentDate, returnDate } = req.body;

    title = String(title); 
    userID = parseInt(userID); 
    rentDate = new Date(rentDate); 
    returnDate = new Date(returnDate); 

    const checkQuery = `SELECT * FROM Book WHERE Title = ? AND IsRented = 0`;
    db.query(checkQuery, [title], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Database error occurred while checking book availability' });
        }

        if (result.length === 0) {
            return res.status(400).json({ success: false, message: 'This book is either unavailable or already rented' });
        }

        // Now rent the book 
        const rentQuery = `UPDATE Book SET IsRented = 1 WHERE Title = ?`;
        db.query(rentQuery, [title], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Failed to rent the book' });
            }

            // Insert rental record into RentReturn table
            const rentalQuery = `
                INSERT INTO RentReturn (UserID, BookTitle, RentDate, ReturnDate)
                VALUES (?, ?, ?, ?)
            `;
            db.query(rentalQuery, [userID, title, rentDate, returnDate], (err, result) => {
                //if (err) {
                    //console.error(err);
                    //return res.status(500).json({ success: false, message: 'Failed to log rental transaction' });
                //}
                res.json({ success: true, message: 'Book rented successfully!' });
            });
        });
    });
});



// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


