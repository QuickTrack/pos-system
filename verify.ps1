# Nairobi POS System - Verification Script
# This script verifies that the installation is complete and working correctly

param(
    [switch]$Detailed,
    [switch]$Help
)

# Display help information
if ($Help) {
    Write-Host @"
Nairobi POS System - Verification Script

Usage: .\verify.ps1 [OPTIONS]

Options:
    -Detailed    Show detailed verification information
    -Help        Display this help message

Examples:
    .\verify.ps1              # Run basic verification
    .\verify.ps1 -Detailed    # Run detailed verification

"@ -ForegroundColor Cyan
    exit 0
}

# Configuration
$ErrorActionPreference = "Continue"

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
Write-Host "║           Nairobi POS System - Verification               ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Initialize counters
$totalChecks = 0
$passedChecks = 0
$failedChecks = 0
$warningChecks = 0

# Function to run a check
function Test-Check($name, $scriptBlock) {
    $global:totalChecks++
    Write-Host "  Checking $name..." -NoNewline
    
    try {
        $result = & $scriptBlock
        if ($result -eq $true) {
            Write-Success " ✓ PASS"
            $global:passedChecks++
            return $true
        } elseif ($result -eq "warning") {
            Write-Warning " ⚠ WARNING"
            $global:warningChecks++
            return "warning"
        } else {
            Write-Error " ✗ FAIL"
            $global:failedChecks++
            return $false
        }
    } catch {
        Write-Error " ✗ FAIL"
        $global:failedChecks++
        return $false
    }
}

# Check 1: Node.js installation
Test-Check "Node.js installation" {
    if (Get-Command "node" -ErrorAction SilentlyContinue) {
        $version = (node --version) -replace 'v', ''
        if ($Detailed) {
            Write-Host "    Version: $version" -ForegroundColor Gray
        }
        return $true
    }
    return $false
}

# Check 2: Node.js version
Test-Check "Node.js version (>= 20.0.0)" {
    if (Get-Command "node" -ErrorAction SilentlyContinue) {
        $version = (node --version) -replace 'v', ''
        $versionParts = $version.Split('.')
        $majorVersion = [int]$versionParts[0]
        
        if ($Detailed) {
            Write-Host "    Version: $version" -ForegroundColor Gray
        }
        
        if ($majorVersion -ge 20) {
            return $true
        } else {
            return "warning"
        }
    }
    return $false
}

# Check 3: Bun installation
Test-Check "Bun package manager" {
    if (Get-Command "bun" -ErrorAction SilentlyContinue) {
        $version = (bun --version)
        if ($Detailed) {
            Write-Host "    Version: $version" -ForegroundColor Gray
        }
        return $true
    }
    return $false
}

# Check 4: MongoDB installation
Test-Check "MongoDB installation" {
    if (Get-Command "mongod" -ErrorAction SilentlyContinue) {
        $version = (mongod --version | Select-String "db version").ToString().Split(' ')[2]
        if ($Detailed) {
            Write-Host "    Version: $version" -ForegroundColor Gray
        }
        return $true
    }
    return "warning"
}

# Check 5: Project directory
Test-Check "Project directory structure" {
    $requiredFiles = @("package.json", "next.config.ts", "tsconfig.json")
    $missingFiles = @()
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $missingFiles += $file
        }
    }
    
    if ($Detailed -and $missingFiles.Count -gt 0) {
        Write-Host "    Missing files: $($missingFiles -join ', ')" -ForegroundColor Gray
    }
    
    return $missingFiles.Count -eq 0
}

# Check 6: Dependencies installed
Test-Check "Dependencies installed" {
    if (Test-Path "node_modules") {
        if ($Detailed) {
            $moduleCount = (Get-ChildItem "node_modules" -Directory).Count
            Write-Host "    Installed modules: $moduleCount" -ForegroundColor Gray
        }
        return $true
    }
    return $false
}

# Check 7: Environment file
Test-Check "Environment configuration" {
    if (Test-Path ".env.local") {
        if ($Detailed) {
            Write-Host "    File: .env.local" -ForegroundColor Gray
        }
        return $true
    }
    return "warning"
}

# Check 8: Build directory
Test-Check "Application build" {
    if (Test-Path ".next") {
        if ($Detailed) {
            $buildSize = [math]::Round((Get-ChildItem ".next" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
            Write-Host "    Build size: $buildSize MB" -ForegroundColor Gray
        }
        return $true
    }
    return "warning"
}

# Check 9: Port availability
Test-Check "Port 3000 availability" {
    $portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    
    if ($Detailed) {
        if ($portInUse) {
            Write-Host "    Status: Port 3000 is in use" -ForegroundColor Gray
        } else {
            Write-Host "    Status: Port 3000 is available" -ForegroundColor Gray
        }
    }
    
    return $null -eq $portInUse
}

# Check 10: MongoDB connection (if running)
Test-Check "MongoDB connection" {
    try {
        $mongoProcess = Get-Process "mongod" -ErrorAction SilentlyContinue
        if ($mongoProcess) {
            if ($Detailed) {
                Write-Host "    Status: MongoDB is running" -ForegroundColor Gray
            }
            return $true
        } else {
            if ($Detailed) {
                Write-Host "    Status: MongoDB is not running" -ForegroundColor Gray
            }
            return "warning"
        }
    } catch {
        return "warning"
    }
}

# Check 11: Startup scripts
Test-Check "Startup scripts" {
    $scripts = @("start-dev.ps1", "start-prod.ps1")
    $missingScripts = @()
    
    foreach ($script in $scripts) {
        if (-not (Test-Path $script)) {
            $missingScripts += $script
        }
    }
    
    if ($Detailed -and $missingScripts.Count -gt 0) {
        Write-Host "    Missing scripts: $($missingScripts -join ', ')" -ForegroundColor Gray
    }
    
    return $missingScripts.Count -eq 0
}

# Check 12: TypeScript configuration
Test-Check "TypeScript configuration" {
    if (Test-Path "tsconfig.json") {
        try {
            $tsConfig = Get-Content "tsconfig.json" | ConvertFrom-Json
            if ($Detailed) {
                Write-Host "    Target: $($tsConfig.compilerOptions.target)" -ForegroundColor Gray
                Write-Host "    Strict: $($tsConfig.compilerOptions.strict)" -ForegroundColor Gray
            }
            return $true
        } catch {
            return "warning"
        }
    }
    return $false
}

# Check 13: ESLint configuration
Test-Check "ESLint configuration" {
    if (Test-Path "eslint.config.mjs") {
        if ($Detailed) {
            Write-Host "    File: eslint.config.mjs" -ForegroundColor Gray
        }
        return $true
    }
    return "warning"
}

# Check 14: Tailwind CSS configuration
Test-Check "Tailwind CSS configuration" {
    if (Test-Path "postcss.config.mjs") {
        if ($Detailed) {
            Write-Host "    File: postcss.config.mjs" -ForegroundColor Gray
        }
        return $true
    }
    return "warning"
}

# Check 15: Git repository
Test-Check "Git repository" {
    if (Test-Path ".git") {
        if ($Detailed) {
            $gitBranch = (git branch --show-current 2>$null)
            Write-Host "    Branch: $gitBranch" -ForegroundColor Gray
        }
        return $true
    }
    return "warning"
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      Verification Summary                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "  Total Checks:    $totalChecks" -ForegroundColor White
Write-Success "  Passed:          $passedChecks"
if ($warningChecks -gt 0) {
    Write-Warning "  Warnings:        $warningChecks"
}
if ($failedChecks -gt 0) {
    Write-Error "  Failed:          $failedChecks"
}

Write-Host ""

# Overall status
if ($failedChecks -eq 0) {
    if ($warningChecks -eq 0) {
        Write-Success "  ✓ All checks passed! The application is ready to run."
    } else {
        Write-Warning "  ⚠ All critical checks passed, but there are warnings."
        Write-Host "  The application should work, but some features may be limited." -ForegroundColor Gray
    }
} else {
    Write-Error "  ✗ Some checks failed. Please fix the issues before running the application."
}

Write-Host ""

# Recommendations
if ($failedChecks -gt 0 -or $warningChecks -gt 0) {
    Write-Info "Recommendations:"
    Write-Host ""
    
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Write-Host "  • Install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    }
    
    if (-not (Get-Command "bun" -ErrorAction SilentlyContinue)) {
        Write-Host "  • Install Bun: powershell -c `"irm bun.sh/install.ps1 | iex`"" -ForegroundColor Yellow
    }
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "  • Install dependencies: bun install" -ForegroundColor Yellow
    }
    
    if (-not (Test-Path ".env.local")) {
        Write-Host "  • Create .env.local file with MongoDB connection string" -ForegroundColor Yellow
    }
    
    if (-not (Test-Path ".next")) {
        Write-Host "  • Build the application: bun run build" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# Next steps
Write-Info "Next Steps:"
Write-Host ""

if ($failedChecks -eq 0) {
    Write-Host "  1. Start the development server:" -ForegroundColor White
    Write-Host "     .\start-dev.ps1" -ForegroundColor Cyan
    Write-Host "     OR" -ForegroundColor Gray
    Write-Host "     bun run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Open your browser to: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "  3. Log in with default credentials:" -ForegroundColor White
    Write-Host "     Email: admin@nairobi-pos.com" -ForegroundColor Cyan
    Write-Host "     Password: admin123" -ForegroundColor Cyan
} else {
    Write-Host "  1. Fix the failed checks listed above" -ForegroundColor White
    Write-Host "  2. Run this verification script again" -ForegroundColor White
    Write-Host "  3. See INSTALL.md for detailed instructions" -ForegroundColor White
}

Write-Host ""

# Exit with appropriate code
if ($failedChecks -gt 0) {
    exit 1
} else {
    exit 0
}
