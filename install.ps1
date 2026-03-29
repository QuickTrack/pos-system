# Nairobi POS System - Windows Installer
# This script automates the installation of the Nairobi POS System on Windows

param(
    [switch]$SkipNodeCheck,
    [switch]$SkipBunCheck,
    [switch]$Help
)

# Display help information
if ($Help) {
    Write-Host @"
Nairobi POS System - Windows Installer

Usage: .\install.ps1 [OPTIONS]

Options:
    -SkipNodeCheck    Skip Node.js version check
    -SkipBunCheck     Skip Bun package manager check
    -Help             Display this help message

Examples:
    .\install.ps1                    # Run full installation
    .\install.ps1 -SkipNodeCheck     # Install without checking Node.js version

"@ -ForegroundColor Cyan
    exit 0
}

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }

# Banner
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║           Nairobi POS System - Installer                  ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Warning: Not running as administrator. Some installations may require elevated privileges."
    Write-Host ""
}

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to compare versions
function Compare-Version($current, $minimum) {
    $currentParts = $current.Split('.')
    $minimumParts = $minimum.Split('.')
    
    for ($i = 0; $i -lt [Math]::Max($currentParts.Length, $minimumParts.Length); $i++) {
        $currentPart = if ($i -lt $currentParts.Length) { [int]$currentParts[$i] } else { 0 }
        $minimumPart = if ($i -lt $minimumParts.Length) { [int]$minimumParts[$i] } else { 0 }
        
        if ($currentPart -gt $minimumPart) { return 1 }
        if ($currentPart -lt $minimumPart) { return -1 }
    }
    return 0
}

# Step 1: Check system prerequisites
Write-Info "Step 1: Checking system prerequisites..."
Write-Host ""

# Check Windows version
$osVersion = [System.Environment]::OSVersion.Version
Write-Host "  Operating System: Windows $($osVersion.Major).$($osVersion.Minor)" -ForegroundColor Gray

# Check available disk space (minimum 2GB)
$drive = (Get-Location).Drive
$freeSpace = [math]::Round((Get-PSDrive $drive.Name).Free / 1GB, 2)
Write-Host "  Available Disk Space: $freeSpace GB" -ForegroundColor Gray

if ($freeSpace -lt 2) {
    Write-Error "Error: Insufficient disk space. At least 2GB required, but only $freeSpace GB available."
    exit 1
}

# Check available RAM (minimum 4GB recommended)
$totalRAM = [math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1MB, 2)
Write-Host "  Total RAM: $totalRAM GB" -ForegroundColor Gray

if ($totalRAM -lt 4) {
    Write-Warning "Warning: Less than 4GB RAM detected. Performance may be affected."
}

Write-Success "  ✓ System prerequisites check passed"
Write-Host ""

# Step 2: Check and install Node.js
Write-Info "Step 2: Checking Node.js installation..."
Write-Host ""

$nodeInstalled = $false
$nodeVersion = $null

if (-not $SkipNodeCheck) {
    if (Test-Command "node") {
        try {
            $nodeVersion = (node --version) -replace 'v', ''
            $nodeInstalled = $true
            Write-Host "  Node.js version: v$nodeVersion" -ForegroundColor Gray
            
            # Check if version is 20 or higher
            if (Compare-Version $nodeVersion "20.0.0" -lt 0) {
                Write-Warning "Warning: Node.js version $nodeVersion detected. Version 20.0.0 or higher is recommended."
                Write-Host "  Download latest from: https://nodejs.org/" -ForegroundColor Yellow
            } else {
                Write-Success "  ✓ Node.js version check passed"
            }
        } catch {
            Write-Warning "Warning: Could not determine Node.js version"
        }
    } else {
        Write-Warning "Node.js is not installed."
        Write-Host ""
        Write-Host "  To install Node.js:" -ForegroundColor Yellow
        Write-Host "  1. Visit https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "  2. Download the LTS version (20.x or higher)" -ForegroundColor Yellow
        Write-Host "  3. Run the installer and follow the prompts" -ForegroundColor Yellow
        Write-Host "  4. Restart this script after installation" -ForegroundColor Yellow
        Write-Host ""
        
        $installNode = Read-Host "Would you like to open the Node.js download page? (Y/N)"
        if ($installNode -eq 'Y' -or $installNode -eq 'y') {
            Start-Process "https://nodejs.org/"
        }
        exit 1
    }
} else {
    Write-Host "  Skipping Node.js version check (-SkipNodeCheck)" -ForegroundColor Gray
}

Write-Host ""

# Step 3: Check and install Bun
Write-Info "Step 3: Checking Bun package manager..."
Write-Host ""

$bunInstalled = $false

if (-not $SkipBunCheck) {
    if (Test-Command "bun") {
        try {
            $bunVersion = (bun --version)
            $bunInstalled = $true
            Write-Host "  Bun version: $bunVersion" -ForegroundColor Gray
            Write-Success "  ✓ Bun is installed"
        } catch {
            Write-Warning "Warning: Could not determine Bun version"
        }
    } else {
        Write-Warning "Bun package manager is not installed."
        Write-Host ""
        Write-Host "  Installing Bun..." -ForegroundColor Yellow
        
        try {
            # Install Bun using the official installer
            powershell -c "irm bun.sh/install.ps1 | iex"
            
            # Refresh environment variables
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
            
            # Verify installation
            if (Test-Command "bun") {
                $bunVersion = (bun --version)
                $bunInstalled = $true
                Write-Success "  ✓ Bun installed successfully (version: $bunVersion)"
            } else {
                Write-Error "Error: Bun installation failed. Please install manually:"
                Write-Host "  powershell -c `"irm bun.sh/install.ps1 | iex`"" -ForegroundColor Yellow
                exit 1
            }
        } catch {
            Write-Error "Error: Failed to install Bun. Please install manually:"
            Write-Host "  powershell -c `"irm bun.sh/install.ps1 | iex`"" -ForegroundColor Yellow
            exit 1
        }
    }
} else {
    Write-Host "  Skipping Bun check (-SkipBunCheck)" -ForegroundColor Gray
}

Write-Host ""

# Step 4: Check MongoDB
Write-Info "Step 4: Checking MongoDB..."
Write-Host ""

$mongoInstalled = $false

if (Test-Command "mongod") {
    try {
        $mongoVersion = (mongod --version | Select-String "db version").ToString().Split(' ')[2]
        $mongoInstalled = $true
        Write-Host "  MongoDB version: $mongoVersion" -ForegroundColor Gray
        Write-Success "  ✓ MongoDB is installed"
    } catch {
        Write-Warning "Warning: Could not determine MongoDB version"
    }
} else {
    Write-Warning "MongoDB is not installed or not in PATH."
    Write-Host ""
    Write-Host "  To install MongoDB:" -ForegroundColor Yellow
    Write-Host "  1. Visit https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    Write-Host "  2. Download MongoDB Community Server" -ForegroundColor Yellow
    Write-Host "  3. Run the installer and follow the prompts" -ForegroundColor Yellow
    Write-Host "  4. Ensure MongoDB service is running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Alternatively, use MongoDB Atlas (cloud):" -ForegroundColor Yellow
    Write-Host "  https://www.mongodb.com/cloud/atlas" -ForegroundColor Yellow
    Write-Host ""
    
    $installMongo = Read-Host "Would you like to open the MongoDB download page? (Y/N)"
    if ($installMongo -eq 'Y' -or $installMongo -eq 'y') {
        Start-Process "https://www.mongodb.com/try/download/community"
    }
    Write-Warning "Note: You can continue without MongoDB, but the application will not start without a database connection."
}

Write-Host ""

# Step 5: Install project dependencies
Write-Info "Step 5: Installing project dependencies..."
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Error "Error: package.json not found. Please run this script from the project root directory."
    exit 1
}

Write-Host "  Installing dependencies with Bun..." -ForegroundColor Gray

try {
    # Install dependencies
    bun install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  ✓ Dependencies installed successfully"
    } else {
        Write-Error "Error: Failed to install dependencies"
        exit 1
    }
} catch {
    Write-Error "Error: Failed to install dependencies: $_"
    exit 1
}

Write-Host ""

# Step 6: Create environment file
Write-Info "Step 6: Setting up environment configuration..."
Write-Host ""

if (-not (Test-Path ".env.local")) {
    Write-Host "  Creating .env.local file..." -ForegroundColor Gray
    
    $envContent = @"
# Nairobi POS System - Environment Configuration
# Generated by installer on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# MongoDB Connection String
# Update this with your MongoDB connection details
MONGODB_URI=mongodb://localhost:27017/nairobi-pos

# JWT Secret for authentication
# Change this to a secure random string in production
JWT_SECRET=nairobi-pos-secret-key-$(Get-Random -Minimum 100000 -Maximum 999999)

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
"@
    
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Success "  ✓ Created .env.local file"
    Write-Warning "  Note: Please update MONGODB_URI in .env.local with your MongoDB connection string"
} else {
    Write-Host "  .env.local already exists, skipping creation" -ForegroundColor Gray
}

Write-Host ""

# Step 7: Build the application
Write-Info "Step 7: Building the application..."
Write-Host ""

Write-Host "  This may take a few minutes..." -ForegroundColor Gray

try {
    bun run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  ✓ Application built successfully"
    } else {
        Write-Warning "Warning: Build completed with warnings"
    }
} catch {
    Write-Error "Error: Failed to build application: $_"
    Write-Host "  You can try building manually with: bun run build" -ForegroundColor Yellow
}

Write-Host ""

# Step 8: Seed the database (optional)
Write-Info "Step 8: Database initialization..."
Write-Host ""

$seedDb = Read-Host "Would you like to seed the database with sample data? (Y/N)"
if ($seedDb -eq 'Y' -or $seedDb -eq 'y') {
    Write-Host "  Seeding database..." -ForegroundColor Gray
    
    try {
        bun run seed
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "  ✓ Database seeded successfully"
        } else {
            Write-Warning "Warning: Database seeding completed with warnings"
        }
    } catch {
        Write-Warning "Warning: Failed to seed database: $_"
        Write-Host "  You can seed manually later with: bun run seed" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Skipping database seeding" -ForegroundColor Gray
    Write-Host "  You can seed later with: bun run seed" -ForegroundColor Gray
}

Write-Host ""

# Step 9: Create startup scripts
Write-Info "Step 9: Creating startup scripts..."
Write-Host ""

# Create start-dev.ps1
$devScript = @'
# Nairobi POS System - Development Server
# Run this script to start the development server

Write-Host "Starting Nairobi POS Development Server..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please run install.ps1 first." -ForegroundColor Red
    exit 1
}

# Check if Bun is installed
if (-not (Get-Command "bun" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Bun is not installed. Please run install.ps1 first." -ForegroundColor Red
    exit 1
}

# Start the development server
bun run dev
'@

$devScript | Out-File -FilePath "start-dev.ps1" -Encoding UTF8
Write-Success "  ✓ Created start-dev.ps1"

# Create start-prod.ps1
$prodScript = @'
# Nairobi POS System - Production Server
# Run this script to start the production server

Write-Host "Starting Nairobi POS Production Server..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please run install.ps1 first." -ForegroundColor Red
    exit 1
}

# Check if Bun is installed
if (-not (Get-Command "bun" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Bun is not installed. Please run install.ps1 first." -ForegroundColor Red
    exit 1
}

# Check if build exists
if (-not (Test-Path ".next")) {
    Write-Host "Build not found. Building application..." -ForegroundColor Yellow
    bun run build
}

# Start the production server
bun run start
'@

$prodScript | Out-File -FilePath "start-prod.ps1" -Encoding UTF8
Write-Success "  ✓ Created start-prod.ps1"

Write-Host ""

# Step 10: Installation complete
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║           Installation Complete!                          ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Info "Next Steps:"
Write-Host ""
Write-Host "  1. Update .env.local with your MongoDB connection string" -ForegroundColor White
Write-Host "  2. Start the development server:" -ForegroundColor White
Write-Host "     .\start-dev.ps1" -ForegroundColor Cyan
Write-Host "     OR" -ForegroundColor Gray
Write-Host "     bun run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Open your browser to: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "  4. Default login credentials:" -ForegroundColor White
Write-Host "     Email: admin@nairobi-pos.com" -ForegroundColor Cyan
Write-Host "     Password: admin123" -ForegroundColor Cyan
Write-Host ""

Write-Info "Useful Commands:"
Write-Host ""
Write-Host "  bun run dev      - Start development server" -ForegroundColor Gray
Write-Host "  bun run build    - Build for production" -ForegroundColor Gray
Write-Host "  bun run start    - Start production server" -ForegroundColor Gray
Write-Host "  bun run seed     - Seed database with sample data" -ForegroundColor Gray
Write-Host "  bun run lint     - Run linter" -ForegroundColor Gray
Write-Host "  bun run typecheck - Run type checker" -ForegroundColor Gray
Write-Host ""

Write-Info "Documentation:"
Write-Host ""
Write-Host "  See INSTALL.md for detailed installation instructions" -ForegroundColor Gray
Write-Host "  See README.md for project documentation" -ForegroundColor Gray
Write-Host ""

# Ask if user wants to start the server
$startServer = Read-Host "Would you like to start the development server now? (Y/N)"
if ($startServer -eq 'Y' -or $startServer -eq 'y') {
    Write-Host ""
    Write-Info "Starting development server..."
    bun run dev
}
