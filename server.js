const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: __dirname
    }),
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(express.static('public'));

// Database connection
const dbPath = path.join(__dirname, 'contacts.db');
const db = new sqlite3.Database(dbPath);

// Initialize database if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        status TEXT DEFAULT 'available',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'viewer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.status(401).json({ error: 'Authentication required' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        return res.status(403).json({ error: 'Admin privileges required' });
    }
};

// Authentication Routes

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Get current user
app.get('/api/user', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Change password (admin only)
app.post('/api/change-password', requireAdmin, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

        db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.session.user.id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Password changed successfully' });
        });
    });
});

// Contact API Routes (with authentication)

// Get all contacts (requires authentication)
app.get('/api/contacts', requireAuth, (req, res) => {
    const { search, department, status } = req.query;
    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];

    if (search) {
        query += ' AND (name LIKE ? OR role LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    if (department) {
        query += ' AND department = ?';
        params.push(department);
    }

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY name ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single contact (requires authentication)
app.get('/api/contacts/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.json(row);
        } else {
            res.status(404).json({ error: 'Contact not found' });
        }
    });
});

// Create new contact (admin only)
app.post('/api/contacts', requireAdmin, (req, res) => {
    const { name, role, department, phone, email, status, notes } = req.body;
    
    if (!name || !role || !department) {
        res.status(400).json({ error: 'Name, role, and department are required' });
        return;
    }

    db.run(
        `INSERT INTO contacts (name, role, department, phone, email, status, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, role, department, phone, email, status || 'available', notes],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Contact created successfully' });
        }
    );
});

// Update contact (admin only)
app.put('/api/contacts/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, role, department, phone, email, status, notes } = req.body;

    db.run(
        `UPDATE contacts SET 
         name = ?, role = ?, department = ?, phone = ?, email = ?, 
         status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, role, department, phone, email, status, notes, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Contact not found' });
                return;
            }
            res.json({ message: 'Contact updated successfully' });
        }
    );
});

// Delete contact (admin only)
app.delete('/api/contacts/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Contact not found' });
            return;
        }
        res.json({ message: 'Contact deleted successfully' });
    });
});

// Get departments (requires authentication)
app.get('/api/departments', requireAuth, (req, res) => {
    db.all('SELECT DISTINCT department FROM contacts ORDER BY department', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(row => row.department));
    });
});

// Serve the login page for unauthenticated users
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Serve the main page (requires authentication)
app.get('/contacts', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Contact Management Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the website`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});