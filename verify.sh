#!/bin/bash

# Nairobi POS System - Verification Script
# This script verifies that the installation is complete and working correctly

set -e

# Configuration
DETAILED=false
HELP=false

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

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --detailed|-d)
            DETAILED=true
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
    echo "Nairobi POS System - Verification Script"
    echo ""
    echo "Usage: ./verify.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "    --detailed, -d    Show detailed verification information"
    echo "    --help, -h        Display this help message"
    echo ""
    echo "Examples:"
    echo "    ./verify.sh              # Run basic verification"
    echo "    ./verify.sh --detailed    # Run detailed verification"
    echo ""
    exit 0
fi

# Banner
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║           Nairobi POS System - Verification               ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Initialize counters
total_checks=0
passed_checks=0
failed_checks=0
warning_checks=0

# Function to run a check
run_check() {
    local name="$1"
    local check_command="$2"
    
    ((total_checks++))
    echo -n "  Checking $name..."
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e " ${GREEN}✓ PASS${NC}"
        ((passed_checks++))
        return 0
    else
        echo -e " ${RED}✗ FAIL${NC}"
        ((failed_checks++))
        return 1
    fi
}

# Function to run a check with warning
run_check_warning() {
    local name="$1"
    local check_command="$2"
    
    ((total_checks++))
    echo -n "  Checking $name..."
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e " ${GREEN}✓ PASS${NC}"
        ((passed_checks++))
        return 0
    else
        echo -e " ${YELLOW}⚠ WARNING${NC}"
        ((warning_checks++))
        return 1
    fi
}

# Check 1: Node.js installation
run_check "Node.js installation" "command -v node"

# Check 2: Node.js version
if command -v node > /dev/null 2>&1; then
    node_version=$(node --version | sed 's/v//')
    node_major=$(echo "$node_version" | cut -d. -f1)
    
    if [ "$DETAILED" = true ]; then
        echo "    Version: $node_version"
    fi
    
    if [ "$node_major" -ge 20 ]; then
        run_check "Node.js version (>= 20.0.0)" "true"
    else
        run_check_warning "Node.js version (>= 20.0.0)" "false"
    fi
else
    run_check "Node.js version (>= 20.0.0)" "false"
fi

# Check 3: Bun installation
run_check "Bun package manager" "command -v bun"

# Check 4: MongoDB installation
run_check_warning "MongoDB installation" "command -v mongod"

# Check 5: Project directory structure
run_check "Project directory structure" "[ -f package.json ] && [ -f next.config.ts ] && [ -f tsconfig.json ]"

# Check 6: Dependencies installed
run_check "Dependencies installed" "[ -d node_modules ]"

# Check 7: Environment file
run_check_warning "Environment configuration" "[ -f .env.local ]"

# Check 8: Build directory
run_check_warning "Application build" "[ -d .next ]"

# Check 9: Port availability
if command -v lsof > /dev/null 2>&1; then
    run_check "Port 3000 availability" "! lsof -i :3000 > /dev/null 2>&1"
else
    run_check_warning "Port 3000 availability" "true"
fi

# Check 10: MongoDB connection (if running)
if pgrep -x "mongod" > /dev/null 2>&1; then
    run_check "MongoDB connection" "true"
else
    run_check_warning "MongoDB connection" "false"
fi

# Check 11: Startup scripts
run_check "Startup scripts" "[ -f start-dev.sh ] && [ -f start-prod.sh ]"

# Check 12: TypeScript configuration
if [ -f tsconfig.json ]; then
    if [ "$DETAILED" = true ]; then
        echo "    File: tsconfig.json"
    fi
    run_check "TypeScript configuration" "true"
else
    run_check "TypeScript configuration" "false"
fi

# Check 13: ESLint configuration
run_check_warning "ESLint configuration" "[ -f eslint.config.mjs ]"

# Check 14: Tailwind CSS configuration
run_check_warning "Tailwind CSS configuration" "[ -f postcss.config.mjs ]"

# Check 15: Git repository
run_check_warning "Git repository" "[ -d .git ]"

# Summary
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                      Verification Summary                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "  Total Checks:    $total_checks"
echo -e "  ${GREEN}Passed:          $passed_checks${NC}"
if [ "$warning_checks" -gt 0 ]; then
    echo -e "  ${YELLOW}Warnings:        $warning_checks${NC}"
fi
if [ "$failed_checks" -gt 0 ]; then
    echo -e "  ${RED}Failed:          $failed_checks${NC}"
fi

echo ""

# Overall status
if [ "$failed_checks" -eq 0 ]; then
    if [ "$warning_checks" -eq 0 ]; then
        echo -e "  ${GREEN}✓ All checks passed! The application is ready to run.${NC}"
    else
        echo -e "  ${YELLOW}⚠ All critical checks passed, but there are warnings.${NC}"
        echo "  The application should work, but some features may be limited."
    fi
else
    echo -e "  ${RED}✗ Some checks failed. Please fix the issues before running the application.${NC}"
fi

echo ""

# Recommendations
if [ "$failed_checks" -gt 0 ] || [ "$warning_checks" -gt 0 ]; then
    print_info "Recommendations:"
    echo ""
    
    if ! command -v node > /dev/null 2>&1; then
        echo "  • Install Node.js from https://nodejs.org/"
    fi
    
    if ! command -v bun > /dev/null 2>&1; then
        echo "  • Install Bun: curl -fsSL https://bun.sh/install | bash"
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "  • Install dependencies: bun install"
    fi
    
    if [ ! -f ".env.local" ]; then
        echo "  • Create .env.local file with MongoDB connection string"
    fi
    
    if [ ! -d ".next" ]; then
        echo "  • Build the application: bun run build"
    fi
    
    echo ""
fi

# Next steps
print_info "Next Steps:"
echo ""

if [ "$failed_checks" -eq 0 ]; then
    echo "  1. Start the development server:"
    echo "     ./start-dev.sh"
    echo "     OR"
    echo "     bun run dev"
    echo ""
    echo "  2. Open your browser to: http://localhost:3000"
    echo ""
    echo "  3. Log in with default credentials:"
    echo "     Email: admin@nairobi-pos.com"
    echo "     Password: admin123"
else
    echo "  1. Fix the failed checks listed above"
    echo "  2. Run this verification script again"
    echo "  3. See INSTALL.md for detailed instructions"
fi

echo ""

# Exit with appropriate code
if [ "$failed_checks" -gt 0 ]; then
    exit 1
else
    exit 0
fi
