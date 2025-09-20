# Contact Management Website

A professional contact management system with database functionality for organizations.

## Features

- **Contact Management**: Add, edit, delete, and view contacts
- **Database Storage**: SQLite database for persistent data storage
- **Search & Filter**: Search by name/role and filter by department/status
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Professional UI**: Modern, clean interface with status indicators
- **Real-time Updates**: Instant updates when contacts are modified

## Contact Information Fields

- Full Name (required)
- Role/Position (required)  
- Department (required)
- Phone Number
- Email Address
- Availability Status (Available, Busy, Out of Office)
- Notes

## Installation

1. Install Node.js (v14 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the database:
   ```bash
   node init-db.js
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Development

For development with auto-restart:
```bash
npm run dev
```

## Deployment

### For Local Network Access
- Change server.js to bind to `0.0.0.0` instead of localhost
- Access via your machine's IP address on port 3000

### For Web Hosting
1. Set environment variable for port: `PORT=80` or `PORT=443`
2. Configure your domain's DNS to point to your server
3. Consider using PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "contact-manager"
   ```

### Database Backup
The SQLite database (`contacts.db`) should be backed up regularly. Copy the file to backup location.

## API Endpoints

- `GET /api/contacts` - Get all contacts (with optional search/filter parameters)
- `GET /api/contacts/:id` - Get single contact
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/departments` - Get list of departments

## Browser Support

- Chrome/Chromium 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## License

MIT License