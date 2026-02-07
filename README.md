# Personal Portfolio Site – Iven Boxem

A lightweight, self-hosted personal portfolio website built with Node.js, Express, and SQLite. Features project showcase, team member management with contribution tracking, role-based access control, and secure authentication with one-time registration codes.

## Features

- 🎨 Modern Material 3 design with cyan/green/blue color scheme
- 👤 Owner dashboard for project & team management
- 🔐 Secure login with bcrypt hashing
- 📝 Project creation with full CRUD operations
- 👥 Team member assignment with contribution descriptions
- 🎟️ One-time registration codes for user invitations
- 📱 Responsive design for mobile, tablet, and desktop
- 🚀 Lightweight (~15MB total with dependencies)

## Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** SQLite3 (file-based, no external dependencies)
- **Authentication:** express-session + bcrypt
- **Frontend:** Vanilla HTML/CSS/JavaScript (no build step required)
- **Security:** Helmet.js for CSP headers

## Quick Start

### Prerequisites

- Node.js 16+ (or Node.js 18+ recommended)
- npm

### Local Development

1. **Clone/Download the project:**

   ```bash
   cd ~/projects/henk  # or your project directory
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Reset database (first time or fresh start):**

   ```bash
   npm run reset-db
   ```

   This creates a fresh database and initializes the schema with the admin account from `.env`.

4. **Start the server:**

   ```bash
   npm start
   ```

   Server runs on `http://localhost:3000`

5. **Login:**
   - Username: `henk`
   - Password: `henk123` (as set in `.env`)

### Environment Variables (`.env`)

```dotenv
PORT=3000
NODE_ENV=production
DB_PATH=./data/site.db
SESSION_SECRET=supersecretkeychange123456789abcdef
INITIAL_OWNER=henk:henk123
INITIAL_OWNER_NAME=Iven Boxem
```

**Important:** Change `SESSION_SECRET` to a strong random string in production.

## VPS Deployment

### 1. Server Setup (Ubuntu 20.04+)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (18+ LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Create app directory
mkdir -p /var/www/portfolio
cd /var/www/portfolio

# Copy files to server (from local machine)
# scp -r ./* user@your-vps-ip:/var/www/portfolio/
```

### 2. Install & Configure

```bash
cd /var/www/portfolio

# Install dependencies
npm install

# Initialize database
npm run reset-db

# Test locally
npm start
# Visit http://localhost:3000 (or use curl)
```

### 3. Production Setup with Systemd

Create `/etc/systemd/system/portfolio.service`:

```ini
[Unit]
Description=Iven Boxem Portfolio Site
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/portfolio
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/node /var/www/portfolio/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable portfolio
sudo systemctl start portfolio
sudo systemctl status portfolio
```

Check logs:

```bash
sudo journalctl -u portfolio -f
```

### 4. Reverse Proxy (Nginx)

Install Nginx:

```bash
sudo apt install -y nginx
```

Create `/etc/nginx/sites-available/portfolio`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Auto-renewal:

```bash
sudo systemctl enable certbot.timer
```

### 6. Database Management

**Backup database:**

```bash
cp /var/www/portfolio/data/site.db /var/www/portfolio/data/site.db.backup
```

**Reset database (dangerous!):**

```bash
cd /var/www/portfolio
npm run reset-db
sudo systemctl restart portfolio
```

**Update admin password:**
Edit `/var/www/portfolio/.env`:

```dotenv
INITIAL_OWNER=henk:newpassword123
```

Then:

```bash
cd /var/www/portfolio
sudo systemctl restart portfolio
```

## NPM Scripts

- `npm start` – Start production server
- `npm run dev` – Start development server (with NODE_ENV=development)
- `npm run init-db` – Initialize empty database
- `npm run reset-db` – Delete all data and reinitialize database
- `npm run reset-and-start` – Reset DB and start server

## File Structure

```
.
├── server.js              # Express app & API endpoints
├── auth.js                # Authentication middleware
├── db.js                  # SQLite helpers & schema
├── init_db.js             # Database initialization script
├── reset_password.js      # Manual password reset tool (for dev)
├── .env                   # Environment configuration
├── package.json           # Dependencies & scripts
├── public/                # Frontend files
│   ├── index.html         # Homepage
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── dashboard.html     # Owner dashboard
│   ├── profile.html       # User profile
│   ├── project.html       # Project detail page
│   ├── user.html          # User profile page
│   ├── app.css            # Global styles (Material 3)
│   ├── index.js
│   ├── login.js
│   ├── register.js
│   ├── dashboard.js
│   ├── project.js
│   ├── user.js
│   └── profile.js
├── data/                  # Database & session storage (auto-created)
│   ├── site.db            # Main database
│   └── sessions.sqlite    # Session storage (created on first run)
└── scripts/
    └── reset_db.js        # Database reset helper
```

## API Endpoints

### Public Endpoints

- `GET /api/me` – Current user (null if not logged in)
- `GET /api/projects` – List published projects
- `GET /api/projects/:slug` – Project details with team members
- `GET /api/users/:username` – User profile with projects

### Authentication

- `POST /api/login` – Login with username & password
- `POST /api/logout` – Logout
- `POST /api/register` – Register with one-time code

### Admin Endpoints (Owner only)

- `GET /api/admin/projects` – List all projects
- `POST /api/admin/projects` – Create project
- `PUT /api/admin/projects/:id` – Update project
- `DELETE /api/admin/projects/:id` – Delete project
- `GET /api/codes` – List registration codes
- `POST /api/codes` – Generate new codes
- `DELETE /api/codes/:code` – Delete a code
- `GET /api/admin/projects/:id/members` – List team members
- `POST /api/admin/projects/:id/members` – Add team member
- `PUT /api/admin/projects/:id/members/:member_id` – Update member
- `DELETE /api/admin/projects/:id/members/:member_id` – Remove member
- `GET /api/users` – List all users (for team member selection)

### User Endpoints

- `GET /api/users/me` – Get own profile
- `PUT /api/users/me` – Update own bio/name/password

## Troubleshooting

### Database Issues

- **"no such column"** → Run `npm run reset-db` to recreate schema
- **Port already in use** → Change `PORT` in `.env` or kill existing process

### Login Fails

- Check `.env` for correct `INITIAL_OWNER` username:password
- Verify user exists: `npm run reset-db` will recreate initial owner

### Systemd Service Won't Start

```bash
sudo journalctl -u portfolio -n 50  # View last 50 lines
sudo systemctl restart portfolio    # Restart service
```

## Security Notes

1. **Change SESSION_SECRET** – Generate a strong random string in `.env`
2. **Use HTTPS** – Always use Let's Encrypt or similar
3. **Backup regularly** – `cp data/site.db data/site.db.backup`
4. **Update Node.js** – Keep Node.js and npm dependencies updated
5. **Firewall** – Restrict SSH access; only open HTTP/HTTPS ports

## License

MIT
