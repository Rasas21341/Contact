const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database file
const dbPath = path.join(__dirname, 'contacts.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    // Create contacts table
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

    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'viewer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert sample contacts
    const sampleContacts = [
        ['John Smith', 'Manager', 'IT', '555-0101', 'john.smith@company.com', 'available', 'IT department manager'],
        ['Sarah Johnson', 'HR Director', 'Human Resources', '555-0102', 'sarah.johnson@company.com', 'busy', 'Head of HR department'],
        ['Mike Davis', 'Sales Lead', 'Sales', '555-0103', 'mike.davis@company.com', 'available', 'Senior sales representative'],
        ['Lisa Chen', 'Marketing Manager', 'Marketing', '555-0104', 'lisa.chen@company.com', 'out-of-office', 'Marketing team lead'],
        ['David Wilson', 'Finance Director', 'Finance', '555-0105', 'david.wilson@company.com', 'available', 'Chief financial officer']
    ];

    const contactStmt = db.prepare(`INSERT OR IGNORE INTO contacts 
        (name, role, department, phone, email, status, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);

    sampleContacts.forEach(contact => {
        contactStmt.run(contact);
    });
    contactStmt.finalize();

    // Create default admin user
    // Default password: "admin123" - CHANGE THIS IN PRODUCTION!
    const adminPassword = bcrypt.hashSync('admin123', 10);
    
    const userStmt = db.prepare(`INSERT OR IGNORE INTO users 
        (username, password, role) 
        VALUES (?, ?, ?)`);

    userStmt.run('admin', adminPassword, 'admin');
    userStmt.finalize();
    
    console.log('Database initialized with sample contacts and admin user');
    console.log('Default admin credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('*** IMPORTANT: Change the admin password after first login! ***');
});

db.close();