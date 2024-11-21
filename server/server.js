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

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
