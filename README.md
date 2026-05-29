# CrystalLog

A web-based protein crystallization data management system for research labs. Upload screening kit spreadsheets, track crystal experiments with photos, and share data across your team.

## Why CrystalLog?

Protein crystallization screening is a core workflow in structural biology labs. A typical experiment involves testing a protein against 96-condition screening kits, with multiple proteins, multiple kits, and observations over days or weeks. The common approach — jotting notes in lab notebooks or scattered Excel files — leads to:

- **Lost context**: which well corresponded to which condition?
- **Scattered data**: photos on phones, notes on paper, conditions in separate files
- **No sharing**: each lab member works in isolation
- **Manual matching**: tedious cross-referencing of well IDs to condition tables

CrystalLog solves this by centralizing everything in one place:

### Key Features

- **One-click kit import (the killer feature)** — Upload a Molecular Dimensions screening kit Excel file (.xls/.xlsx) and CrystalLog automatically detects the format, parses all 96 (or 48) conditions, and maps every well ID (A1–H12) to its full chemical composition. Supports all 12 common kit formats (JCSG-plus, PACT premier, Morpheus, MIDASplus, PGA Screen, and more) with robust multi-format auto-detection. No manual data entry, no format hassles.

- **Auto-fill conditions** — When creating a crystal record, simply select a kit and well ID. The full condition formulation (salt, buffer, pH, precipitant, concentrations) is automatically filled in. Never look up a condition table again.

- **Team collaboration** — Multi-user with role-based access. Admin uploads kits once, shared across the entire group. Each member manages their own crystal records. Search and group by protein, person, or kit.

- **Photo management** — Attach crystal images directly to records. Visual card-based layout makes browsing and comparing results intuitive.

- **Simple deployment** — Single Node.js process, SQLite database (no external DB setup), Docker-free. Deploy on any Linux server with one script. Data stored outside the code directory so updates don't touch your data.

## Screenshots

<!-- TODO: add screenshots -->

## Tech Stack

- **Backend**: Node.js + Express + SQLite (sql.js, zero native dependencies)
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT + bcryptjs
- **Deployment**: PM2 + Nginx

## Quick Start

```bash
git clone https://github.com/2024liuzhen/CrystalLog.git
cd CrystalLog
cd server && npm install
cd ../client && npm install && npm run build
cd ../server

# Required: set a secret for JWT signing
export JWT_SECRET="your-random-secret-string"
export ADMIN_PASSWORD="your-admin-password"

node index.js
# Open http://localhost:3000
```

The admin account (username: `admin`) is created automatically on first start. The password is set via `ADMIN_PASSWORD` env var, or randomly generated if not set (check the startup log).

## Deployment

```bash
bash deploy.sh [port] [/data/crystallog]
```

This script installs dependencies, builds the frontend, initializes the database, and starts the server with PM2. Data (database, uploaded images) is stored in `/data/crystallog/` (customizable) — separate from the code directory — so updating the code never touches your data.

See `nginx.conf` for Nginx reverse proxy configuration.

## Example Kit Files

The `examples/kits/` directory contains sample screening kit spreadsheets from Molecular Dimensions for testing. These are freely available from the [Molecular Dimensions website](https://www.moleculardimensions.com). Upload them via the Kit Library page after deployment.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `ADMIN_PASSWORD` | No | Initial admin password (random if not set) |
| `PORT` | No | Server port (default: 3000) |
| `DATA_DIR` | No | Data storage directory (default: ./data) |

## License

MIT
