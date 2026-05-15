// ─────────────────────────────────────────────
// Health OS — config.js
// Edit this file to update your personal settings
// ─────────────────────────────────────────────

export const CONFIG = {
  // Your name (shown in header greeting)
  name: "Carly",

  // Google Sheet ID (the long string in your sheet URL)
  // https://docs.google.com/spreadsheets/d/SHEET_ID/edit
  SHEET_ID: "1vq19qTInRUhKvKU0d8Y48qpUWB9hSAt5TTzrG2ioLoE",

  // Google Sheets API key
  // Get one at: https://console.cloud.google.com → APIs & Services → Credentials
  // Enable "Google Sheets API" for this project
  SHEETS_API_KEY: "YOUR_GOOGLE_SHEETS_API_KEY",

  // Tab names in your Google Sheet
  TABS: {
    dailyData: "Daily Data",
    cycleHistory: "Cycle History",
    checkIns: "Check-ins",   // Will be created if it doesn't exist
  },

  // Cycle settings (from your Oura data)
  cycle: {
    length: 23,
    variability: 1,
    periodLength: 3,

    // Most recent period start date (update this each cycle)
    // Format: "YYYY-MM-DD"
    lastPeriodStart: "2026-05-15",
  },

  // Cycle phase windows (cycle day numbers)
  windows: {
    fertile:   { start: 10, end: 13 },
    pmsStart:  { start: 15, end: 15 },   // B6 starts
    pms:       { start: 15, end: 20 },
    migraine:  { start: 20, end: 23 },
    noAlcohol: { start: 18, end: 23 },
  },

  // Supplement protocol
  // days: null = every day, [n, m] = cycle days n through m
  supplements: [
    { name: "Omega-3",             days: null,    note: "Daily year-round" },
    { name: "Iron",                days: [1, 5],  note: "Replenish from period" },
    { name: "Vitamin B6",          days: [15, 23], note: "PMS mood support" },
    { name: "Magnesium glycinate", days: [17, 23], note: "Double dose from day 20" },
  ],

  // Symptoms to show in daily check-in
  symptoms: [
    "Cramps", "Bloating", "Fatigue", "Low mood", "Brain fog",
    "Headache", "Cravings", "Tender breasts", "Good energy",
    "Anxious", "Motivated", "Migraine aura", "Insomnia",
  ],
};
