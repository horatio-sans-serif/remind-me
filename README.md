# remind-me

A macOS reminder tool with flexible date parsing using Reminders.app.

## Installation

```bash
brew tap horatio-sans-serif/tools
brew install remind-me
```

## Usage

```bash
remind-me -m "message" -d "datetime" [-l list] [-n notes] [-t time]
```

### Options

| Option | Description |
|--------|-------------|
| `-m MESSAGE` | Reminder message (required) |
| `-d DATETIME` | Due date/time (required) - see formats below |
| `-l LIST` | Reminders list name (default: Reminders) |
| `-n NOTES` | Notes/body text for the reminder |
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
remind-me -m "Birthday" -d "Jan 15" -t "10:00 AM" -l Family
remind-me -m "Meeting" -d "January 2, 2025 2:00 PM" -n "Agenda: Q1 planning"
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REMIND_ME_DEFAULT_LIST` | `Reminders` | Default list when -l not specified |

## MCP Server

The MCP server exposes two tools for Claude Code integration:

- `create_reminder` - Create reminders with flexible date parsing
- `list_reminders_lists` - List available Reminders.app lists

### Configuration

Add to your Claude MCP settings:

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

- macOS (uses Reminders.app via AppleScript)
- Python 3 (for date parsing)
  - Only uses stdlib modules, any Python 3.x works
  - Install via Xcode Command Line Tools: `xcode-select --install`
- Node.js (for MCP server only)

## Development

To work on remind-me locally:

```bash
git clone https://github.com/horatio-sans-serif/remind-me.git
cd remind-me

# Run directly from the repo
./remind-me -m "test" -d tomorrow

# Or unlink Homebrew version and add to PATH
brew unlink remind-me
export PATH="$PWD:$PATH"
```

For MCP server development:

```bash
cd mcp && npm install
```

## License

MIT
