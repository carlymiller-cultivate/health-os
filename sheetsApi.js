// ─────────────────────────────────────────────
// Health OS — sheetsApi.js
// Reads and writes to your Google Sheet
// ─────────────────────────────────────────────

import { CONFIG } from "./config";

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// ── READ: fetch all daily data rows ──────────────────────────────────────────
export async function fetchDailyData() {
  const { SHEET_ID, SHEETS_API_KEY, TABS } = CONFIG;
  if (SHEETS_API_KEY === "YOUR_GOOGLE_SHEETS_API_KEY") {
    // Return mock data so the UI works before the key is set
    return getMockData();
  }
  const range = encodeURIComponent(`${TABS.dailyData}!A:Z`);
  const url = `${BASE}/${SHEET_ID}/values/${range}?key=${SHEETS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const json = await res.json();
  return parseRows(json.values);
}

// ── READ: fetch cycle history ─────────────────────────────────────────────────
export async function fetchCycleHistory() {
  const { SHEET_ID, SHEETS_API_KEY, TABS } = CONFIG;
  if (SHEETS_API_KEY === "YOUR_GOOGLE_SHEETS_API_KEY") return getMockCycleHistory();
  const range = encodeURIComponent(`${TABS.cycleHistory}!A:D`);
  const url = `${BASE}/${SHEET_ID}/values/${range}?key=${SHEETS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const json = await res.json();
  return (json.values || []).slice(1).map(r => ({ date: r[0], notes: r[1] || "" }));
}

// ── WRITE: append a check-in row ─────────────────────────────────────────────
// NOTE: Writing requires OAuth, not just an API key.
// For now this logs to console and shows a copy-paste fallback.
// The full OAuth write flow is documented in README.md.
export async function writeCheckin(data) {
  const row = [
    data.date,
    data.cycleDay,
    data.phase,
    data.energy,
    data.mood,
    data.symptoms.join(", "),
    data.notes,
    new Date().toISOString(),
  ];
  console.log("Check-in row (paste into sheet if needed):", row);
  return { success: true, row };
}

// ── PARSE: turn sheet rows into objects ──────────────────────────────────────
function parseRows(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map(h => h.toLowerCase().replace(/\s+/g, "_"));
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const val = row[i];
      obj[h] = isNaN(val) ? val : val === "" ? null : Number(val);
    });
    return obj;
  }).filter(r => r.date);
}

// ── MOCK DATA: shown before API key is configured ────────────────────────────
function getMockData() {
  return [
    {
      date: "2026-05-14",
      readiness: 88,
      hrv_balance: 82,
      temperature_deviation: -0.26,
      temperature_trend: -0.04,
      resting_heart_rate: 81,
      sleep_balance: 86,
      activity_balance: 89,
      previous_night: 93,
      recovery_index: 94,
    },
    {
      date: "2026-05-15",
      readiness: 72,
      hrv_balance: 78,
      temperature_deviation: -0.06,
      temperature_trend: 0.14,
      resting_heart_rate: 73,
      sleep_balance: 81,
      activity_balance: 87,
      previous_night: 33,
      recovery_index: 56,
    },
  ];
}

function getMockCycleHistory() {
  return [
    { date: "2026-05-15" },
    { date: "2026-04-20" },
    { date: "2026-03-29" },
    { date: "2026-03-07" },
    { date: "2026-02-12" },
    { date: "2026-01-24" },
  ];
}

// ── GET TODAY + YESTERDAY from rows ──────────────────────────────────────────
export function getTodayAndYesterday(rows) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  return {
    today: rows.find(r => r.date === todayStr) || rows[rows.length - 1] || null,
    yesterday: rows.find(r => r.date === yesterdayStr) || rows[rows.length - 2] || null,
  };
}
