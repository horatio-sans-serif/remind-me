#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";

const server = new Server(
  {
    name: "remind-me-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to run AppleScript
function runAppleScript(script) {
  return new Promise((resolve, reject) => {
    const proc = spawn("osascript", ["-e", script]);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `osascript exited with code ${code}`));
      }
    });
  });
}

// Parse relative datetime
function parseDateTime(input, defaultTime = "9:00 AM") {
  const now = new Date();

  // Helper to format date for AppleScript
  const formatDate = (date, time) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month} ${day}, ${year} ${time}`;
  };

  // Helper to add months
  const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  // Helper to add years
  const addYears = (date, years) => {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  };

  // Parse time string to "H:MM AM/PM" format
  const parseTime = (timeStr) => {
    if (!timeStr) return defaultTime;
    timeStr = timeStr.trim().toLowerCase();

    // Already good format
    if (/\d{1,2}:\d{2}\s*(am|pm)/i.test(timeStr)) {
      return timeStr.toUpperCase();
    }

    // 9am, 2pm
    let m = timeStr.match(/^(\d{1,2})(am|pm)$/);
    if (m) {
      return `${m[1]}:00 ${m[2].toUpperCase()}`;
    }

    // 9:30am
    m = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
    if (m) {
      return `${m[1]}:${m[2]} ${m[3].toUpperCase()}`;
    }

    // 14:00 (24-hour)
    m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      let hour = parseInt(m[1], 10);
      const minute = m[2];
      const ampm = hour < 12 ? "AM" : "PM";
      if (hour > 12) hour -= 12;
      if (hour === 0) hour = 12;
      return `${hour}:${minute} ${ampm}`;
    }

    return timeStr;
  };

  // Relative: Nd, Nw, Nm, Ny
  let match = input.match(/^(\d+)([dwmy])$/);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2];
    let target = new Date(now);

    if (unit === "d") {
      target.setDate(target.getDate() + num);
    } else if (unit === "w") {
      target.setDate(target.getDate() + num * 7);
    } else if (unit === "m") {
      target = addMonths(target, num);
    } else if (unit === "y") {
      target = addYears(target, num);
    }

    return formatDate(target, defaultTime);
  }

  // Keywords
  if (input === "tomorrow") {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    return formatDate(target, defaultTime);
  }

  if (input === "next week") {
    const target = new Date(now);
    target.setDate(target.getDate() + 7);
    return formatDate(target, defaultTime);
  }

  if (input === "next month") {
    const target = addMonths(now, 1);
    target.setDate(1);
    return formatDate(target, defaultTime);
  }

  if (input === "next year") {
    const target = addYears(now, 1);
    return formatDate(target, defaultTime);
  }

  // Partial date: "Jan 2", "Jan 2 9am"
  const monthNames = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9,
    november: 10, december: 11
  };

  match = input.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s+(.+))?$/);
  if (match) {
    const monthStr = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const timePart = match[3];

    const month = monthNames[monthStr];
    if (month !== undefined) {
      let year = now.getFullYear();

      // Validate day against month
      let target = new Date(year, month, day);
      if (target.getMonth() !== month) {
        // Day overflowed to next month - invalid day for this month
        throw new Error(`Invalid day ${day} for ${monthStr}`);
      }

      // If date is in the past, use next year
      if (target < now) {
        year++;
        target = new Date(year, month, day);
        // Re-validate for next year (handles leap year edge case)
        if (target.getMonth() !== month) {
          throw new Error(`Invalid day ${day} for ${monthStr}`);
        }
      }

      const time = parseTime(timePart);
      return formatDate(target, time);
    }
  }

  // Pass through as-is (full date format)
  return input;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_reminder",
        description:
          "Create a calendar reminder/event on macOS Calendar app. " +
          "Supports relative dates (2d, 3w, 1m, 1y), keywords (tomorrow, next week, next month, next year), " +
          "partial dates (Jan 2, Dec 25 2pm), and full dates (January 2, 2025 9:00 AM).",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The reminder message/event title",
            },
            datetime: {
              type: "string",
              description:
                "When to set the reminder. Examples: '1m' (1 minute), '2d' (2 days), 'tomorrow', 'next week', 'Jan 2', 'Jan 2 2pm', 'January 2, 2025 9:00 AM'",
            },
            calendar: {
              type: "string",
              description: "Calendar name (default: Private)",
              enum: ["Work", "Family", "Private"],
              default: "Private",
            },
            default_time: {
              type: "string",
              description: "Default time if not specified in datetime (default: 9:00 AM)",
              default: "9:00 AM",
            },
          },
          required: ["message", "datetime"],
        },
      },
      {
        name: "list_calendars",
        description: "List available calendars in macOS Calendar app",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "list_calendars") {
    try {
      const script = `
        tell application "Calendar"
          set calNames to {}
          repeat with c in calendars
            set end of calNames to name of c
          end repeat
          return calNames
        end tell
      `;
      const result = await runAppleScript(script);
      return {
        content: [
          {
            type: "text",
            text: `Available calendars: ${result}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing calendars: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "create_reminder") {
    const message = args.message;
    const datetime = args.datetime;
    const calendar = args.calendar || "Private";
    const defaultTime = args.default_time || "9:00 AM";

    if (!message || !datetime) {
      return {
        content: [
          {
            type: "text",
            text: "Error: message and datetime are required",
          },
        ],
        isError: true,
      };
    }

    // Validate calendar to prevent injection
    const VALID_CALENDARS = new Set(["Work", "Family", "Private"]);
    if (!VALID_CALENDARS.has(calendar)) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid calendar '${calendar}'. Must be one of: Work, Family, Private`,
          },
        ],
        isError: true,
      };
    }

    try {
      // Parse the datetime
      const parsedDatetime = parseDateTime(datetime, defaultTime);

      // Escape message for AppleScript
      const safeMessage = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

      // Create the event
      const script = `
        tell application "Calendar"
          tell calendar "${calendar}"
            set startDate to date "${parsedDatetime}"
            set endDate to startDate + 30 * minutes
            set newEvent to make new event with properties {summary:"${safeMessage}", start date:startDate, end date:endDate}
            tell newEvent
              make new display alarm with properties {trigger interval:0}
            end tell
          end tell
        end tell
      `;

      await runAppleScript(script);

      return {
        content: [
          {
            type: "text",
            text: `Reminder created successfully:\n  Message: ${message}\n  When: ${parsedDatetime}\n  Calendar: ${calendar}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating reminder: ${error.message}\nVerify calendar '${calendar}' exists in Calendar.app`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("remind-me MCP server running on stdio");
}

main().catch(console.error);
