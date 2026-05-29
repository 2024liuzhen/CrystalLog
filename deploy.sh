#!/bin/bash
# CrystalLog Deployment Script
# Usage: bash deploy.sh [port] [data_dir]

set -e

PORT=${1:-3000}
DATA_DIR=${2:-/data/crystallog}
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Deploying CrystalLog from: $APP_DIR"
echo "Data directory: $DATA_DIR"

# 1. Install Node.js (if not installed)
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node.js $(node -v)"

# 2. Create data directory (outside project, survives redeploy)
sudo mkdir -p "$DATA_DIR/images"
sudo mkdir -p "$DATA_DIR/temp"
sudo chown -R "$USER:$USER" "$DATA_DIR"

# 3. Install server dependencies
echo "Installing server dependencies..."
cd "$APP_DIR/server"
npm install --production

# 4. Initialize database (in DATA_DIR)
echo "Initializing database..."
DATA_DIR="$DATA_DIR" node db.js --init

# 5. Install client dependencies and build
echo "Building frontend..."
cd "$APP_DIR/client"
npm install
npm run build

# 6. Stop existing PM2 process
if command -v pm2 &> /dev/null; then
    pm2 delete crystallog 2>/dev/null || true
fi

# 7. Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# 8. Start with PM2
echo "Starting CrystalLog on port $PORT..."
cd "$APP_DIR/server"
PORT=$PORT DATA_DIR="$DATA_DIR" pm2 start index.js --name crystallog
pm2 save
pm2 startup

echo ""
echo "==================================="
echo "CrystalLog deployed successfully!"
echo "Backend:  http://localhost:$PORT"
echo "Data dir: $DATA_DIR"
echo ""
echo "Admin username: admin (check startup log for password)"
echo ""
echo "Next steps:"
echo "  1. Configure Nginx (see nginx.conf)"
echo "  2. Change default admin password immediately"
echo "  3. Ensure JWT_SECRET is set in environment"
echo "==================================="
