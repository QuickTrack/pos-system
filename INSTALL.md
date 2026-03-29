# Nairobi POS System - Installation Guide

This guide provides step-by-step instructions for installing and setting up the Nairobi POS System on your machine.

## Table of Contents

- [System Requirements](#system-requirements)
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [Automated Installation (Recommended)](#automated-installation-recommended)
  - [Manual Installation](#manual-installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Starting the Application](#starting-the-application)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

---

## System Requirements

### Minimum Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Ubuntu 20.04+
- **Processor**: 2 GHz dual-core processor
- **RAM**: 4 GB (8 GB recommended)
- **Disk Space**: 2 GB free space
- **Network**: Internet connection for initial setup

### Recommended Requirements

- **Operating System**: Windows 11, macOS 12+, or Ubuntu 22.04+
- **Processor**: 3 GHz quad-core processor
- **RAM**: 8 GB or more
- **Disk Space**: 5 GB free space
- **Network**: Broadband internet connection

---

## Prerequisites

The following software must be installed before running the Nairobi POS System:

### 1. Node.js (v20.0.0 or higher)

Node.js is required to run the JavaScript runtime environment.

**Windows:**
1. Visit [https://nodejs.org/](https://nodejs.org/)
2. Download the LTS version (20.x or higher)
3. Run the installer and follow the prompts
4. Verify installation: `node --version`

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node

# Verify installation
node --version
```

**Linux (Ubuntu/Debian):**
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
```

### 2. Bun Package Manager

Bun is the recommended package manager for this project.

**Windows:**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Verify installation:**
```bash
bun --version
```

### 3. MongoDB (v7.0 or higher)

MongoDB is required for data storage.

**Option A: Local MongoDB Installation**

**Windows:**
1. Visit [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Download MongoDB Community Server
3. Run the installer and follow the prompts
4. Ensure MongoDB service is running

**macOS:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Option B: MongoDB Atlas (Cloud)**

1. Visit [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update `MONGODB_URI` in `.env.local`

---

## Installation Methods

### Automated Installation (Recommended)

The automated installer handles all dependencies and setup steps automatically.

#### Windows

1. **Download the project**
   ```powershell
   git clone <repository-url>
   cd pos-system
   ```

2. **Run the installer**
   ```powershell
   .\install.ps1
   ```

3. **Follow the prompts**
   - The installer will check for prerequisites
   - Install missing dependencies
   - Configure environment variables
   - Build the application
   - Optionally seed the database

4. **Start the application**
   ```powershell
   .\start-dev.ps1
   ```

#### macOS/Linux

1. **Download the project**
   ```bash
   git clone <repository-url>
   cd pos-system
   ```

2. **Make the installer executable**
   ```bash
   chmod +x install.sh
   ```

3. **Run the installer**
   ```bash
   ./install.sh
   ```

4. **Follow the prompts**
   - The installer will check for prerequisites
   - Install missing dependencies
   - Configure environment variables
   - Build the application
   - Optionally seed the database

5. **Start the application**
   ```bash
   ./start-dev.sh
   ```

### Manual Installation

If you prefer to install manually or the automated installer fails:

#### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd pos-system
```

#### Step 2: Install Dependencies

```bash
bun install
```

#### Step 3: Create Environment File

Create a `.env.local` file in the project root:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/nairobi-pos

# JWT Secret for authentication
JWT_SECRET=your-secret-key-here

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

**Important:** Replace `your-secret-key-here` with a secure random string.

#### Step 4: Build the Application

```bash
bun run build
```

#### Step 5: Seed the Database (Optional)

```bash
bun run seed
```

---

## Configuration

### Environment Variables

The following environment variables can be configured in `.env.local`:

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/nairobi-pos` |
| `JWT_SECRET` | Secret key for JWT tokens | (required) |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NODE_ENV` | Node environment | `development` |

### Application Settings

After installation, you can configure application settings through the Settings page in the application:

1. Start the application
2. Log in with default credentials
3. Navigate to Settings
4. Configure:
   - Business information
   - Tax settings
   - Currency
   - Receipt templates
   - Payment methods

---

## Database Setup

### Local MongoDB

1. **Start MongoDB service**

   **Windows:**
   ```powershell
   net start MongoDB
   ```

   **macOS:**
   ```bash
   brew services start mongodb-community
   ```

   **Linux:**
   ```bash
   sudo systemctl start mongod
   ```

2. **Verify MongoDB is running**
   ```bash
   mongosh
   ```

3. **Seed the database**
   ```bash
   bun run seed
   ```

### MongoDB Atlas

1. **Get connection string**
   - Log in to MongoDB Atlas
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

2. **Update environment file**
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/nairobi-pos?retryWrites=true&w=majority
   ```

3. **Seed the database**
   ```bash
   bun run seed
   ```

---

## Starting the Application

### Development Mode

**Windows:**
```powershell
.\start-dev.ps1
```

**macOS/Linux:**
```bash
./start-dev.sh
```

**Or directly:**
```bash
bun run dev
```

The application will be available at: [http://localhost:3000](http://localhost:3000)

### Production Mode

**Windows:**
```powershell
.\start-prod.ps1
```

**macOS/Linux:**
```bash
./start-prod.sh
```

**Or directly:**
```bash
bun run build
bun run start
```

---

## Verification

After installation, verify that everything is working correctly:

### 1. Check Application Status

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the login page.

### 2. Log In

Use the default credentials:
- **Email**: admin@nairobi-pos.com
- **Password**: admin123

### 3. Verify Features

After logging in, verify the following:

- [ ] Dashboard loads correctly
- [ ] POS page is accessible
- [ ] Products can be viewed
- [ ] Settings page loads
- [ ] No console errors in browser (F12)

### 4. Run Verification Script

**Windows:**
```powershell
.\verify.ps1
```

**macOS/Linux:**
```bash
./verify.sh
```

---

## Troubleshooting

### Common Issues

#### 1. Port 3000 is already in use

**Error:** `Port 3000 is in use`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

#### 2. MongoDB connection failed

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
1. Verify MongoDB is running
2. Check connection string in `.env.local`
3. Ensure MongoDB port (27017) is not blocked

#### 3. Bun not found

**Error:** `bun: command not found`

**Solution:**
```bash
# Add Bun to PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Or reinstall Bun
curl -fsSL https://bun.sh/install | bash
```

#### 4. Build fails

**Error:** `Build failed`

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
bun install
bun run build
```

#### 5. Permission denied (Linux/macOS)

**Error:** `Permission denied`

**Solution:**
```bash
# Make scripts executable
chmod +x install.sh
chmod +x start-dev.sh
chmod +x start-prod.sh
```

### Getting Help

If you encounter issues not covered here:

1. Check the [README.md](README.md) for additional documentation
2. Search existing issues in the repository
3. Create a new issue with:
   - Error message
   - Steps to reproduce
   - System information
   - Logs (if available)

---

## Uninstallation

To remove the Nairobi POS System:

### 1. Stop the Application

Press `Ctrl+C` in the terminal running the application.

### 2. Remove Project Files

**Windows:**
```powershell
Remove-Item -Recurse -Force pos-system
```

**macOS/Linux:**
```bash
rm -rf pos-system
```

### 3. Remove Database (Optional)

**Local MongoDB:**
```bash
mongosh
use nairobi-pos
db.dropDatabase()
```

**MongoDB Atlas:**
- Log in to MongoDB Atlas
- Navigate to your cluster
- Click "Browse Collections"
- Delete the `nairobi-pos` database

### 4. Remove Environment Variables

Delete the `.env.local` file from the project directory.

---

## Additional Resources

- [README.md](README.md) - Project documentation
- [API Documentation](docs/api.md) - API reference
- [User Guide](docs/user-guide.md) - User manual
- [Developer Guide](docs/developer-guide.md) - Development documentation

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Support

For support and questions:
- Email: support@nairobi-pos.com
- Documentation: [https://docs.nairobi-pos.com](https://docs.nairobi-pos.com)
- GitHub Issues: [https://github.com/nairobi-pos/issues](https://github.com/nairobi-pos/issues)
