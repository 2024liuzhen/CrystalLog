# CrystalLog

A web application for managing protein crystallization experiments. Built for research groups.

## Features

- Upload Molecular Dimensions crystal screening kit Excel files (.xls/.xlsx) -- auto-parses well → condition mappings
- Record crystallization experiments (protein, kit, well, photos) -- selects kit + well auto-fills conditions
- Multi-user login with role-based access control (admin manages kits, members manage their own data)
- Search, group by protein/owner, batch export

## Tech Stack

- **Backend**: Node.js + Express + SQLite (sql.js)
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT + bcryptjs
- **Deployment**: PM2 + Nginx

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd CrystalLog
cd server && npm install
cd ../client && npm install && npm run build
cd ../server

# 2. Set environment variables
export JWT_SECRET="your-random-secret-here"
export ADMIN_PASSWORD="your-admin-password"

# 3. Start
node index.js
# Visit http://localhost:3000
```

The admin account (username: `admin`) is created automatically on first start with the password from `ADMIN_PASSWORD` env var (or a random one if not set).

## Deployment

```bash
bash deploy.sh [port] [/data/crystallog]
```

See `nginx.conf` for Nginx reverse proxy configuration.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `ADMIN_PASSWORD` | No | Initial admin password (random if not set) |
| `PORT` | No | Server port (default: 3000) |
| `DATA_DIR` | No | Data storage directory (default: ./data) |

## License

MIT
