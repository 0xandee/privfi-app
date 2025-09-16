#!/bin/bash

# Deposit Migration Runner Script
# This script coordinates the entire deposit migration process

set -e  # Exit on any error

echo "🌪️  Typhoon Deposit Migration Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: v$NODE_VERSION"
    exit 1
fi

print_success "Node.js version check passed: v$NODE_VERSION"

# Check if ts-node is available
if ! command -v npx &> /dev/null; then
    print_error "npx is not available. Please install npm properly."
    exit 1
fi

# Install dependencies if not present
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Check if source files exist
SOURCE_FILES=(
    "/Users/0xandee/Downloads/deposits (2).json"
    "/Users/0xandee/Downloads/deposits (1).json"
    "/Users/0xandee/Downloads/deposits.json"
)

print_status "Checking source files..."
MISSING_FILES=0

for file in "${SOURCE_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Missing source file: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    else
        print_success "Found: $(basename "$file")"
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    print_error "$MISSING_FILES source file(s) missing. Please ensure all deposit JSON files are in Downloads folder."
    exit 1
fi

# Parse command line arguments
STEP="all"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --step)
            STEP="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo ""
            echo "Usage: ./run.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --step <step>    Run specific step only (unify|withdraw|all)"
            echo "  --dry-run        Simulate withdrawals without executing"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Steps:"
            echo "  1. unify         Parse and unify deposit files"
            echo "  2. withdraw      Execute individual withdrawals"
            echo "  3. all           Run both steps (default)"
            echo ""
            echo "Examples:"
            echo "  ./run.sh                      # Run complete process"
            echo "  ./run.sh --step unify         # Only unify deposits"
            echo "  ./run.sh --step withdraw      # Only run withdrawals"
            echo "  ./run.sh --dry-run            # Simulate entire process"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo ""
print_status "Starting deposit migration process..."
print_status "Step: $STEP"
if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No actual transactions will be executed"
fi
echo ""

# Step 1: Unify deposits
if [ "$STEP" = "all" ] || [ "$STEP" = "unify" ]; then
    print_status "Step 1: Unifying deposit files..."

    if npm run unify; then
        print_success "Deposit unification completed"

        # Check if unified file was created
        if [ -f "unified-deposits.json" ]; then
            DEPOSIT_COUNT=$(jq '.meta.totalDeposits' unified-deposits.json)
            print_success "Created unified-deposits.json with $DEPOSIT_COUNT deposits"
        else
            print_error "unified-deposits.json was not created"
            exit 1
        fi
    else
        print_error "Deposit unification failed"
        exit 1
    fi

    echo ""
fi

# Step 2: Execute withdrawals
if [ "$STEP" = "all" ] || [ "$STEP" = "withdraw" ]; then
    print_status "Step 2: Executing withdrawals..."

    # Check if unified deposits file exists
    if [ ! -f "unified-deposits.json" ]; then
        print_error "unified-deposits.json not found. Run unification first."
        exit 1
    fi

    DEPOSIT_COUNT=$(jq '.meta.totalDeposits' unified-deposits.json 2>/dev/null || echo "0")

    if [ "$DEPOSIT_COUNT" = "0" ]; then
        print_warning "No deposits found in unified-deposits.json"
        exit 0
    fi

    print_status "Found $DEPOSIT_COUNT deposits to process"

    if [ "$DRY_RUN" = true ]; then
        print_status "Running withdrawal simulation..."
        if npm run withdraw:dry-run; then
            print_success "Withdrawal simulation completed"
        else
            print_error "Withdrawal simulation failed"
            exit 1
        fi
    else
        print_warning "About to execute REAL withdrawals for $DEPOSIT_COUNT deposits"
        print_warning "This will interact with the blockchain and consume gas fees"
        echo ""
        read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Executing withdrawals..."
            if npm run withdraw; then
                print_success "Withdrawal process completed"

                # Show results summary
                if [ -f "withdrawal-results.json" ]; then
                    SUCCESSFUL=$(jq '.meta.successful' withdrawal-results.json)
                    FAILED=$(jq '.meta.failed' withdrawal-results.json)

                    print_success "Results: $SUCCESSFUL successful, $FAILED failed"

                    if [ "$FAILED" -gt 0 ]; then
                        print_warning "Some withdrawals failed. Check withdrawal-results.json for details."
                    fi
                fi
            else
                print_error "Withdrawal process failed"
                exit 1
            fi
        else
            print_status "Withdrawal cancelled by user"
            exit 0
        fi
    fi

    echo ""
fi

print_success "Deposit migration process completed!"
echo ""
print_status "Generated files:"
if [ -f "unified-deposits.json" ]; then
    echo "  📄 unified-deposits.json - Processed deposit data"
fi
if [ -f "withdrawal-results.json" ]; then
    echo "  📊 withdrawal-results.json - Withdrawal execution results"
fi

echo ""
print_status "Next steps:"
echo "  1. Review the results files"
echo "  2. Keep unified-deposits.json as backup"
echo "  3. Check withdrawal-results.json for any failed transactions"

if [ "$DRY_RUN" = true ]; then
    echo ""
    print_status "To execute actual withdrawals, run:"
    echo "  ./run.sh --step withdraw"
fi