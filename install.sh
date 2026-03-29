#!/bin/bash

# Nairobi POS System - Linux/Mac Installer
# This script automates the installation of the Nairobi POS System on Linux and macOS

set -e  # Exit on error

# Configuration
MIN_NODE_VERSION="20.0.0"
MIN_DISK_SPACE_GB=2
MIN_RAM_GB=4

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Helper functions
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }
print_step() { echo -e "\n${BOLD}$1${NC}"; }

# Banner
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║           Nairobi POS System - Installer                  ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Parse command line arguments
SKIP_NODE_CHECK=false
SKIP_BUN_CHECK=false
HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-node-check)
            SKIP_NODE_CHECK=true
            shift
            ;;
        --skip-bun-check)
            SKIP_BUN_CHECK=true
            shift
            ;;
        --help|-h)
            HELP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

if [ "$HELP" = true ]; then
    echo "Nairobi POS System - Linux/Mac Installer"
    echo ""
    echo "Usage: ./install.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "    --skip-node-check    Skip Node.js version check"
    echo "    --skip-bun-check     Skip Bun package manager check"
    echo "    --help, -h           Display this help message"
    echo ""
    echo "Examples:"
    echo "    ./install.sh                    # Run full installation"
    echo "    ./install.sh --skip-node-check  # Install without checking Node.js version"
    echo ""
    exit 0
fi

# Function to compare versions
version_compare() {
    echo "$1" | awk -v min="$2" 'BEGIN {
        split(min, mina, ".");
        split($1, cura, ".");
        for (i = 1; i <= 3; i++) {
            if (cura[i] + 0 > mina[i] + 0) exit 0;
            if (cura[i] + 0 < mina[i] + 0) exit 1;
        }
        exit 0;
    }'
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
print_info "Detected operating system: $OS"

# Step 1: Check system prerequisites
print_step "Step 1: Checking system prerequisites..."

# Check available disk space
if [[ "$OS" == "macos" ]]; then
    FREE_SPACE_KB=$(df -k / | awk 'NR==2 {print $4}')
elif [[ "$OS" == "linux" ]]; then
    FREE_SPACE_KB=$(df -k / | awk 'NR==2 {print $4}')
else
    FREE_SPACE_KB=0
fi

FREE_SPACE_GB=$((FREE_SPACE_KB / 1024 / 1024))
echo "  Available Disk Space: ${FREE_SPACE_GB} GB"

if [ "$FREE_SPACE_GB" -lt "$MIN_DISK_SPACE_GB" ]; then
    print_error "Insufficient disk space. At least ${MIN_DISK_SPACE_GB}GB required, but only ${FREE_SPACE_GB}GB available."
    exit 1
fi

# Check available RAM
if [[ "$OS" == "macos" ]]; then
    TOTAL_RAM_KB=$(sysctl -n hw.memsize | awk '{print $1/1024}')
elif [[ "$OS" == "linux" ]]; then
    TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
else
    TOTAL_RAM_KB=0
fi

TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
echo "  Total RAM: ${TOTAL_RAM_GB} GB"

if [ "$TOTAL_RAM_GB" -lt "$MIN_RAM_GB" ]; then
    print_warning "Less than ${MIN_RAM_GB}GB RAM detected. Performance may be affected."
fi

print_success "System prerequisites check passed"

# Step 2: Check and install Node.js
print_step "Step 2: Checking Node.js installation..."

NODE_INSTALLED=false

if [ "$SKIP_NODE_CHECK" = false ]; then
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        NODE_INSTALLED=true
        echo "  Node.js version: v${NODE_VERSION}"
        
        if version_compare "$NODE_VERSION" "$MIN_NODE_VERSION"; then
            print_success "Node.js version check passed"
        else
            print_warning "Node.js version ${NODE_VERSION} detected. Version ${MIN_NODE_VERSION} or higher is recommended."
            echo "  Download latest from: https://nodejs.org/"
        fi
    else
        print_warning "Node.js is not installed."
        echo ""
        echo "  To install Node.js:"
        
        if [[ "$OS" == "macos" ]]; then
            echo "  Option 1: Using Homebrew (recommended)"
            echo "    brew install node"
            echo ""
            echo "  Option 2: Using official installer"
            echo "    Visit https://nodejs.org/"
            echo "    Download the LTS version (${MIN_NODE_VERSION} or higher)"
            echo "    Run the installer and follow the prompts"
        elif [[ "$OS" == "linux" ]]; then
            echo "  Option 1: Using NodeSource repository (recommended)"
            echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "    sudo apt-get install -y nodejs"
            echo ""
            echo "  Option 2: Using package manager"
            echo "    sudo apt update"
            echo "    sudo apt install nodejs npm"
            echo ""
            echo "  Option 3: Using official installer"
            echo "    Visit https://nodejs.org/"
            echo "    Download the LTS version (${MIN_NODE_VERSION} or higher)"
        fi
        
        echo ""
        read -p "Would you like to open the Node.js download page? (y/N): " install_node
        if [[ "$install_node" == "y" || "$install_node" == "Y" ]]; then
            if [[ "$OS" == "macos" ]]; then
                open "https://nodejs.org/"
            elif [[ "$OS" == "linux" ]]; then
                xdg-open "https://nodejs.org/" 2>/dev/null || echo "Please visit https://nodejs.org/"
            fi
        fi
        exit 1
    fi
else
    echo "  Skipping Node.js version check (--skip-node-check)"
fi

# Step 3: Check and install Bun
print_step "Step 3: Checking Bun package manager..."

BUN_INSTALLED=false

if [ "$SKIP_BUN_CHECK" = false ]; then
    if command_exists bun; then
        BUN_VERSION=$(bun --version)
        BUN_INSTALLED=true
        echo "  Bun version: ${BUN_VERSION}"
        print_success "Bun is installed"
    else
        print_warning "Bun package manager is not installed."
        echo ""
        echo "  Installing Bun..."
        
        # Install Bun using the official installer
        if curl -fsSL https://bun.sh/install | bash; then
            # Add Bun to PATH for current session
            export BUN_INSTALL="$HOME/.bun"
            export PATH="$BUN_INSTALL/bin:$PATH"
            
            # Verify installation
            if command_exists bun; then
                BUN_VERSION=$(bun --version)
                BUN_INSTALLED=true
                print_success "Bun installed successfully (version: ${BUN_VERSION})"
            else
                print_error "Bun installation failed. Please install manually:"
                echo "  curl -fsSL https://bun.sh/install | bash"
                exit 1
            fi
        else
            print_error "Failed to install Bun. Please install manually:"
            echo "  curl -fsSL https://bun.sh/install | bash"
            exit 1
        fi
    fi
else
    echo "  Skipping Bun check (--skip-bun-check)"
fi

# Step 4: Check MongoDB
print_step "Step 4: Checking MongoDB..."

MONGO_INSTALLED=false

if command_exists mongod; then
    MONGO_VERSION=$(mongod --version | grep "db version" | awk '{print $3}' | sed 's/v//')
    MONGO_INSTALLED=true
    echo "  MongoDB version: ${MONGO_VERSION}"
    print_success "MongoDB is installed"
else
    print_warning "MongoDB is not installed or not in PATH."
    echo ""
    echo "  To install MongoDB:"
    
    if [[ "$OS" == "macos" ]]; then
        echo "  Option 1: Using Homebrew (recommended)"
        echo "    brew tap mongodb/brew"
        echo "    brew install mongodb-community"
        echo ""
        echo "  Option 2: Using official installer"
        echo "    Visit https://www.mongodb.com/try/download/community"
        echo "    Download MongoDB Community Server"
    elif [[ "$OS" == "linux" ]]; then
        echo "  Option 1: Using apt (Ubuntu/Debian)"
        echo "    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -"
        echo "    echo \"deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse\" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list"
        echo "    sudo apt update"
        echo "    sudo apt install -y mongodb-org"
        echo ""
        echo "  Option 2: Using official installer"
        echo "    Visit https://www.mongodb.com/try/download/community"
    fi
    
    echo ""
    echo "  Alternatively, use MongoDB Atlas (cloud):"
    echo "  https://www.mongodb.com/cloud/atlas"
    echo ""
    
    read -p "Would you like to open the MongoDB download page? (y/N): " install_mongo
    if [[ "$install_mongo" == "y" || "$install_mongo" == "Y" ]]; then
        if [[ "$OS" == "macos" ]]; then
            open "https://www.mongodb.com/try/download/community"
        elif [[ "$OS" == "linux" ]]; then
            xdg-open "https://www.mongodb.com/try/download/community" 2>/dev/null || echo "Please visit https://www.mongodb.com/try/download/community"
        fi
    fi
    print_warning "Note: You can continue without MongoDB, but the application will not start without a database connection."
fi

# Step 5: Install project dependencies
print_step "Step 5: Installing project dependencies..."

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

echo "  Installing dependencies with Bun..."

if bun install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 6: Create environment file
print_step "Step 6: Setting up environment configuration..."

if [ ! -f ".env.local" ]; then
    echo "  Creating .env.local file..."
    
    RANDOM_NUM=$((RANDOM % 900000 + 100000))
    
    cat > .env.local << EOF
# Nairobi POS System - Environment Configuration
# Generated by installer on $(date +"%Y-%m-%d %H:%M:%S")

# MongoDB Connection String
# Update this with your MongoDB connection details
MONGODB_URI=mongodb://localhost:27017/nairobi-pos

# JWT Secret for authentication
# Change this to a secure random string in production
JWT_SECRET=nairobi-pos-secret-key-${RANDOM_NUM}

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
EOF
    
    print_success "Created .env.local file"
    print_warning "Please update MONGODB_URI in .env.local with your MongoDB connection string"
else
    echo "  .env.local already exists, skipping creation"
fi

# Step 7: Build the application
print_step "Step 7: Building the application..."

echo "  This may take a few minutes..."

if bun run build; then
    print_success "Application built successfully"
else
    print_warning "Build completed with warnings"
    echo "  You can try building manually with: bun run build"
fi

# Step 8: Seed the database (optional)
print_step "Step 8: Database initialization..."

read -p "Would you like to seed the database with sample data? (y/N): " seed_db
if [[ "$seed_db" == "y" || "$seed_db" == "Y" ]]; then
    echo "  Seeding database..."
    
    if bun run seed; then
        print_success "Database seeded successfully"
    else
        print_warning "Database seeding completed with warnings"
        echo "  You can seed manually later with: bun run seed"
    fi
else
    echo "  Skipping database seeding"
    echo "  You can seed later with: bun run seed"
fi

# Step 9: Create startup scripts
print_step "Step 9: Creating startup scripts..."

# Create start-dev.sh
cat > start-dev.sh << 'EOF'
#!/bin/bash

# Nairobi POS System - Development Server
# Run this script to start the development server

echo "Starting Nairobi POS Development Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please run install.sh first."
    exit 1
fi

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "Error: Bun is not installed. Please run install.sh first."
    exit 1
fi

# Start the development server
bun run dev
EOF

chmod +x start-dev.sh
print_success "Created start-dev.sh"

# Create start-prod.sh
cat > start-prod.sh << 'EOF'
#!/bin/bash

# Nairobi POS System - Production Server
# Run this script to start the production server

echo "Starting Nairobi POS Production Server..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please run install.sh first."
    exit 1
fi

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "Error: Bun is not installed. Please run install.sh first."
    exit 1
fi

# Check if build exists
if [ ! -d ".next" ]; then
    echo "Build not found. Building application..."
    bun run build
fi

# Start the production server
bun run start
EOF

chmod +x start-prod.sh
print_success "Created start-prod.sh"

# Step 10: Installation complete
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║           Installation Complete!                          ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

print_info "Next Steps:"
echo ""
echo "  1. Update .env.local with your MongoDB connection string"
echo "  2. Start the development server:"
echo "     ./start-dev.sh"
echo "     OR"
echo "     bun run dev"
echo ""
echo "  3. Open your browser to: http://localhost:3000"
echo ""
echo "  4. Default login credentials:"
echo "     Email: admin@nairobi-pos.com"
echo "     Password: admin123"
echo ""

print_info "Useful Commands:"
echo ""
echo "  bun run dev      - Start development server"
echo "  bun run build    - Build for production"
echo "  bun run start    - Start production server"
echo "  bun run seed     - Seed database with sample data"
echo "  bun run lint     - Run linter"
echo "  bun run typecheck - Run type checker"
echo ""

print_info "Documentation:"
echo ""
echo "  See INSTALL.md for detailed installation instructions"
echo "  See README.md for project documentation"
echo ""

# Ask if user wants to start the server
read -p "Would you like to start the development server now? (y/N): " start_server
if [[ "$start_server" == "y" || "$start_server" == "Y" ]]; then
    echo ""
    print_info "Starting development server..."
    bun run dev
fi
