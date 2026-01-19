# AI PC Optimizer

AI-powered PC optimization system with automated updates, driver management, and performance monitoring for Windows.

## Features

- 🔄 **Automatic Windows Updates**: Check and install Windows updates automatically
- 🎮 **Driver Management**: Scan, check, and update GPU/CPU drivers
- ⚡ **Performance Optimization**: Monitor system metrics and optimize CPU/GPU performance
- 🧹 **File System Cleanup**: Clean temporary files, browser cache, and free up disk space
- 🤖 **AI-Powered Analysis**: Intelligent system analysis with prioritized recommendations
- 🖥️ **Modern GUI**: Beautiful Electron-based graphical interface
- 🧠 **Multiple AI Providers**: Choose from Ollama (local/free), Google Gemini (cloud), or rule-based analysis

## AI Providers

The optimizer supports multiple AI backends for generating intelligent recommendations:

### Rule-Based (Default)
- No setup required, works out of the box
- Uses predefined rules and thresholds
- No API keys or external services needed

### Ollama (Local AI - Free)
Runs AI models locally on your machine. Completely free and private.

```bash
# 1. Install Ollama from https://ollama.ai
# 2. Start the server
ollama serve

# 3. Pull a model
ollama pull llama2

# 4. Configure in .env
AI_PROVIDER=ollama
OLLAMA_MODEL=llama2
```

**Available models**: llama2, mistral, codellama, phi, neural-chat

### Google Gemini (Cloud AI)
Powerful cloud AI with a generous free tier.

- **Free tier**: 15 requests/minute, 1 million tokens/month
- **Get API key**: https://makersuite.google.com/app/apikey

```bash
# Configure in .env
AI_PROVIDER=gemini
AI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-pro
```

**Pricing** (beyond free tier): See https://ai.google.dev/pricing

## Installation

```bash
# Clone the repository
git clone https://github.com/colliercody24-bit/ai-pc-optimizer.git
cd ai-pc-optimizer

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Graphical Interface (GUI)

Launch the modern desktop application:

```bash
npm run start:gui
```

The GUI provides:
- **Dashboard**: System health score, metrics, and AI recommendations at a glance
- **Updates**: Check and install Windows updates with one click
- **Drivers**: Scan and manage hardware drivers, view GPU information
- **Performance**: Monitor processes, set power plans, optimize system
- **Cleanup**: Scan and clean temporary files, empty recycle bin

### Command Line Interface (CLI)

For automation and scripting, use the CLI:

#### Quick System Status

```bash
npm start status
```

#### Full System Analysis

```bash
npm start analyze
```

Get a comprehensive analysis of your system including:
- System health score (0-100)
- Prioritized recommendations
- Current system metrics (CPU, Memory, Disk, GPU)

#### AI-Powered Optimization

```bash
npm start optimize
```

Automatically apply recommended optimizations including:
- Windows updates installation
- Driver updates
- Memory optimization
- Disk cleanup

#### Windows Updates

```bash
# Check for updates
npm start updates -- --check

# Install updates
npm start updates -- --install
```

#### Driver Management

```bash
# Scan all installed drivers
npm start drivers -- --scan

# Check for driver updates
npm start drivers -- --check

# Install driver updates
npm start drivers -- --install

# View GPU driver info
npm start drivers -- --gpu
```

#### Performance Optimization

```bash
# View system metrics
npm start performance -- --metrics

# View resource-hungry processes
npm start performance -- --processes

# Run performance optimizations
npm start performance -- --optimize

# Set power plan
npm start performance -- --power high-performance
npm start performance -- --power balanced
npm start performance -- --power power-saver
```

#### Disk Cleanup

```bash
# Scan cleanup opportunities
npm start cleanup -- --scan

# Run full cleanup
npm start cleanup -- --clean

# Clean browser cache only
npm start cleanup -- --browser

# Empty recycle bin
npm start cleanup -- --recycle

# Run Windows Disk Cleanup
npm start cleanup -- --disk
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
│   ├── gui/                     # Electron GUI
│   │   ├── electron-main.ts    # Electron main process
│   │   ├── preload.ts          # Preload script
│   │   └── index.html          # GUI interface
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
