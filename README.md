# AI PC Optimizer

AI-powered PC optimization system with automated updates, driver management, and performance monitoring for Windows.

## Features

- 🔄 **Automatic Windows Updates**: Check and install Windows updates automatically
- 🎮 **Driver Management**: Scan, check, and update GPU/CPU drivers
- ⚡ **Performance Optimization**: Monitor system metrics and optimize CPU/GPU performance
- 🧹 **File System Cleanup**: Clean temporary files, browser cache, and free up disk space
- 🤖 **AI-Powered Analysis**: Intelligent system analysis with prioritized recommendations

## Installation

```bash
# Clone the repository
git clone https://github.com/colliercody24-bit/ai-pc-optimizer.git
cd ai-pc-optimizer

# Install dependencies
npm install

# Build the project
npm run build

# Run the optimizer
npm start
```

## Usage

### Quick System Status

```bash
ai-pc-optimizer status
```

### Full System Analysis

```bash
ai-pc-optimizer analyze
```

Get a comprehensive analysis of your system including:
- System health score (0-100)
- Prioritized recommendations
- Current system metrics (CPU, Memory, Disk, GPU)

### AI-Powered Optimization

```bash
ai-pc-optimizer optimize
```

Automatically apply recommended optimizations including:
- Windows updates installation
- Driver updates
- Memory optimization
- Disk cleanup

### Windows Updates

```bash
# Check for updates
ai-pc-optimizer updates --check

# Install updates
ai-pc-optimizer updates --install
```

### Driver Management

```bash
# Scan all installed drivers
ai-pc-optimizer drivers --scan

# Check for driver updates
ai-pc-optimizer drivers --check

# Install driver updates
ai-pc-optimizer drivers --install

# View GPU driver info
ai-pc-optimizer drivers --gpu
```

### Performance Optimization

```bash
# View system metrics
ai-pc-optimizer performance --metrics

# View resource-hungry processes
ai-pc-optimizer performance --processes

# Run performance optimizations
ai-pc-optimizer performance --optimize

# Set power plan
ai-pc-optimizer performance --power high-performance
ai-pc-optimizer performance --power balanced
ai-pc-optimizer performance --power power-saver
```

### Disk Cleanup

```bash
# Scan cleanup opportunities
ai-pc-optimizer cleanup --scan

# Run full cleanup
ai-pc-optimizer cleanup --clean

# Clean browser cache only
ai-pc-optimizer cleanup --browser

# Empty recycle bin
ai-pc-optimizer cleanup --recycle

# Run Windows Disk Cleanup
ai-pc-optimizer cleanup --disk
```

## Configuration

Copy `.env.example` to `.env` and customize the settings:

```bash
cp .env.example .env
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `ENABLE_AUTO_UPDATES` | `true` | Enable Windows updates feature |
| `ENABLE_DRIVER_UPDATES` | `true` | Enable driver updates feature |
| `ENABLE_PERFORMANCE_OPTIMIZATION` | `true` | Enable performance optimization feature |
| `ENABLE_FILE_SYSTEM_CLEANUP` | `true` | Enable file system cleanup feature |
| `SCAN_INTERVAL_MINUTES` | `60` | Interval for scheduled scans |
| `TEMP_FILE_MAX_AGE_DAYS` | `7` | Maximum age for temp files before cleanup |
| `CLEANUP_PATHS` | `` | Additional paths to clean (comma-separated) |

## Requirements

- **Operating System**: Windows 10/11 (Windows-specific features require Windows)
- **Node.js**: v16.0.0 or higher
- **Administrator Privileges**: Required for updates, driver management, and some optimizations

## Project Structure

```
ai-pc-optimizer/
├── src/
│   ├── core/                    # Core optimization modules
│   │   ├── updater.ts          # Windows Updates manager
│   │   ├── driver-manager.ts   # GPU/Driver management
│   │   ├── performance.ts      # CPU/GPU optimization
│   │   └── cleaner.ts          # File system cleanup
│   ├── ai/                      # AI components
│   │   └── optimization-agent.ts  # AI-powered analysis
│   ├── utils/                   # Utilities
│   │   ├── logger.ts           # Winston logger
│   │   ├── config.ts           # Configuration
│   │   └── helpers.ts          # Helper functions
│   └── main.ts                  # CLI entry point
├── config/                      # Configuration files
├── docs/                        # Documentation
├── tests/                       # Test files
├── package.json
├── tsconfig.json
└── .env.example
```

## How It Works

### AI Analysis

The AI optimization agent analyzes your system across four dimensions:

1. **Updates**: Checks for pending Windows and driver updates
2. **Performance**: Monitors CPU, memory, and GPU usage
3. **Disk Space**: Analyzes disk utilization and cleanup opportunities
4. **Device Health**: Identifies problematic hardware devices

Based on this analysis, it generates a health score (0-100) and prioritized recommendations.

### Auto-Fix Capability

Many recommendations can be automatically fixed:
- ✅ Windows updates can be installed automatically
- ✅ Driver updates can be installed via Windows Update
- ✅ Temporary files can be cleaned automatically
- ✅ Memory can be optimized
- ❌ Some issues require manual intervention (e.g., hardware problems)

## Security Considerations

- The application requires administrator privileges for system-level operations
- All operations are performed locally; no data is sent to external servers
- Update operations use official Windows Update APIs
- Cleanup operations only target safe-to-delete files (temp files, caches)

## License

MIT
