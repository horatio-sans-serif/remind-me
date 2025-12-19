# remind-me

A macOS calendar reminder tool with flexible date parsing. Available as a shell script and MCP server.

## Installation

### Homebrew (recommended)

```bash
brew tap horatio-sans-serif/tools
brew install remind-me
```

### Manual

```bash
# Clone or copy to ~/projects/remind-me
# Symlink to your PATH
ln -sf ~/projects/remind-me/remind-me ~/Projects/bin/remind-me

# For MCP server, install dependencies
cd ~/projects/remind-me/mcp && npm install
```

## Usage

```bash
remind-me -m "message" -d "datetime" [-c calendar] [-t time]
```

### Options

| Option | Description |
|--------|-------------|
| `-m MESSAGE` | Reminder message (required) |
| `-d DATETIME` | Date/time (required) - see formats below |
| `-c CALENDAR` | Calendar name: Work, Family, Private |
| `-t TIME` | Default time if not in -d (default: 9:00 AM) |
| `-h` | Show help |

### Date Formats

| Format | Example | Result |
|--------|---------|--------|
| Relative days | `2d` | 2 days from now |
| Relative weeks | `3w` | 3 weeks from now |
| Relative months | `1m` | 1 month from now |
| Relative years | `1y` | 1 year from now |
| Tomorrow | `tomorrow` | Next day |
| Next week | `next week` | 7 days from now |
| Next month | `next month` | 1st of next month |
| Next year | `next year` | Same day next year |
| Partial date | `Jan 2` | January 2nd (next occurrence) |
| Partial + time | `Jan 2 2pm` | January 2nd at 2:00 PM |
| Full date | `January 2, 2025 9:00 AM` | Exact date and time |

### Examples

```bash
remind-me -m "Call mom" -d tomorrow
remind-me -m "Review PR" -d 2d
remind-me -m "Quarterly review" -d "next month"
remind-me -m "Birthday" -d "Jan 15" -t "10:00 AM" -c Family
remind-me -m "Meeting" -d "January 2, 2025 2:00 PM"
```

## Configuration

Environment variables for customization:

| Variable | Default | Description |
|----------|---------|-------------|
| `REMIND_ME_CALENDARS` | `Work\|Family\|Private` | Allowed calendar names (pipe-separated) |
| `REMIND_ME_WORK_PATHS` | `$HOME/work\|$HOME/Work\|$HOME/projects` | Paths that trigger "Work" calendar default |

### Calendar Auto-Selection

The default calendar is determined by your current working directory:
- If cwd matches any path in `REMIND_ME_WORK_PATHS` → **Work**
- Otherwise → **Private**

Override with `-c` flag or customize paths:

```bash
export REMIND_ME_WORK_PATHS="$HOME/work|$HOME/code|$HOME/dev"
```

## MCP Server

The MCP server exposes two tools for Claude Code integration:

- `create_reminder` - Create calendar events
- `list_calendars` - List available calendars

### Configuration

Add to your Claude MCP settings or copy `.mcp.json`:

```json
{
  "mcpServers": {
    "remind-me": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/remind-me/mcp/server.js"]
    }
  }
}
```

## Requirements

- macOS (uses Calendar.app via AppleScript)
- Python 3 (for date parsing in shell script)
  - Only uses stdlib modules, any Python 3.x works
  - Install via Xcode Command Line Tools: `xcode-select --install`
- Node.js (for MCP server only)

## License

MIT
