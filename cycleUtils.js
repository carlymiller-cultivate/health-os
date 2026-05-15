// ─────────────────────────────────────────────
// Health OS — cycleUtils.js
// All cycle math lives here
// ─────────────────────────────────────────────

import { CONFIG } from "./config";

export function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateString(date) {
  return date.toISOString().split("T")[0];
}

export function getDayOfCycle(date = new Date()) {
  const start = parseDate(CONFIG.cycle.lastPeriodStart);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((target - start) / 86400000);
  if (diff < 0) return null;
  return (diff % CONFIG.cycle.length) + 1;
}

export function getPhase(dayNum) {
  const { periodLength } = CONFIG.cycle;
  const { fertile, pms, migraine } = CONFIG.windows;
  if (dayNum <= periodLength)        return "menstrual";
  if (dayNum < fertile.start)        return "follicular";
  if (dayNum <= fertile.end)         return "fertile";
  if (dayNum < pms.start)            return "luteal";
  if (dayNum >= migraine.start)      return "pms-migraine";
  if (dayNum >= pms.start)           return "pms";
  return "luteal";
}

export const PHASE_META = {
  menstrual:     { label: "Menstrual",            color: "#C94040", bg: "#FEF0F0", icon: "🌑", energy: "low" },
  follicular:    { label: "Follicular",           color: "#1D9E75", bg: "#E1F5EE", icon: "🌱", energy: "rising" },
  fertile:       { label: "Fertile",              color: "#C2436E", bg: "#FBEAF0", icon: "🌸", energy: "peak" },
  luteal:        { label: "Luteal",               color: "#9A6700", bg: "#FEF4E0", icon: "🍂", energy: "steady" },
  pms:           { label: "PMS window",           color: "#6B5FCC", bg: "#EEEDFE", icon: "⚡", energy: "low" },
  "pms-migraine":{ label: "PMS + migraine risk",  color: "#8B2020", bg: "#FDECEC", icon: "⚠️", energy: "low" },
};

export function getPhaseForDay(dayNum) {
  return PHASE_META[getPhase(dayNum)];
}

export function getActiveSupplement(dayNum) {
  return CONFIG.supplements.filter(s => {
    if (!s.days) return true;
    return dayNum >= s.days[0] && dayNum <= s.days[1];
  });
}

export function getUpcomingWindows(dayNum) {
  const start = parseDate(CONFIG.cycle.lastPeriodStart);
  const windows = [
    { name: "Fertile window",    ...CONFIG.windows.fertile,  color: "#C2436E", icon: "🌸", note: "Peak energy and focus" },
    { name: "B6 starts",         ...CONFIG.windows.pmsStart, color: "#6B5FCC", icon: "💊", note: "PMS mood support begins" },
    { name: "PMS window",        ...CONFIG.windows.pms,      color: "#6B5FCC", icon: "⚡", note: "Magnesium from day 17" },
    { name: "Migraine risk",     ...CONFIG.windows.migraine, color: "#8B2020", icon: "⚠️", note: "Double Mg, no alcohol from day 18" },
  ];
  return windows.map(w => {
    const daysUntil = w.start - dayNum;
    const isActive = dayNum >= w.start && dayNum <= w.end;
    const windowStart = new Date(start);
    windowStart.setDate(start.getDate() + w.start - 1);
    return {
      ...w,
      daysUntil,
      isActive,
      startsOn: windowStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysRemaining: isActive ? w.end - dayNum + 1 : null,
    };
  });
}

export function getNextCycleStart() {
  const start = parseDate(CONFIG.cycle.lastPeriodStart);
  const next = new Date(start);
  next.setDate(next.getDate() + CONFIG.cycle.length);
  return next;
}

export function get7DayStrip(fromDate = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const dayNum = getDayOfCycle(d);
    const phase = getPhase(dayNum);
    const meta = PHASE_META[phase];
    return {
      date: d,
      dayNum,
      phase,
      meta,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      dateNum: d.getDate(),
    };
  });
}

export function getDailyBriefing(dayNum, todayData, yesterdayData) {
  const phase = getPhase(dayNum);
  const meta = PHASE_META[phase];
  const alerts = [];

  // Readiness delta
  const readinessDrop = yesterdayData?.readiness && todayData?.readiness
    ? yesterdayData.readiness - todayData.readiness : 0;

  let intro = "";

  if (phase === "menstrual") {
    intro = `Day ${dayNum} of your cycle. Your body is in active repair mode. Rest is productive right now, not lazy.`;
    if (readinessDrop > 10) intro += ` Readiness dropped ${readinessDrop} points — expected on day ${dayNum}.`;
    alerts.push({ color: "#C94040", text: "Take today: Iron + Omega-3 (days 1-5 protocol)" });
    alerts.push({ color: "#9A6700", text: "Prioritize warmth, hydration, and low-demand movement" });
    alerts.push({ color: "#1D9E75", text: `Fertile window opens in ${CONFIG.windows.fertile.start - dayNum} days — high-energy phase incoming` });
  } else if (phase === "follicular") {
    intro = `Day ${dayNum} — follicular phase. Estrogen is climbing. Cognitive sharpness and motivation tend to be strong now. Good window for Cultivate work that needs your full brain.`;
    alerts.push({ color: "#1D9E75", text: "Energy typically rises through this phase — lean into it" });
    if (CONFIG.windows.fertile.start - dayNum <= 3) {
      alerts.push({ color: "#C2436E", text: `Fertile window opens in ${CONFIG.windows.fertile.start - dayNum} day${CONFIG.windows.fertile.start - dayNum !== 1 ? "s" : ""}` });
    }
  } else if (phase === "fertile") {
    intro = `Day ${dayNum} — fertile window. Peak estrogen. This is often the highest-energy, most socially magnetic phase of the cycle. Schedule anything that needs presence and confidence.`;
    alerts.push({ color: "#C2436E", text: "Peak performance window — good for client calls, pitches, visibility work" });
  } else if (phase === "luteal") {
    intro = `Day ${dayNum} — luteal phase. Progesterone rising. Energy starts to shift toward more inward, detail-oriented work. Good for writing, planning, and deep focus.`;
    const daysUntilPMS = CONFIG.windows.pms.start - dayNum;
    if (daysUntilPMS <= 3 && daysUntilPMS > 0) {
      alerts.push({ color: "#6B5FCC", text: `PMS window starts in ${daysUntilPMS} day${daysUntilPMS !== 1 ? "s" : ""} — B6 incoming` });
    }
  } else if (phase === "pms" || phase === "pms-migraine") {
    intro = `Day ${dayNum} — PMS window. Progesterone dropping. Mood, sleep, and energy can be more variable. This is not a character flaw, it is a hormonal reality. Protect your schedule.`;
    alerts.push({ color: "#6B5FCC", text: "B6 active — take with breakfast" });
    if (dayNum >= 17) alerts.push({ color: "#9A6700", text: "Magnesium glycinate tonight before bed" });
    if (dayNum >= 20) alerts.push({ color: "#8B2020", text: "Migraine risk window — double magnesium, protect sleep hard, no alcohol" });
    if (dayNum >= 18) alerts.push({ color: "#8B2020", text: "No alcohol from day 18 — it meaningfully raises migraine risk for you" });
  }

  // HRV note
  if (todayData?.hrv_balance && todayData.hrv_balance < 70) {
    alerts.push({ color: "#9A6700", text: `HRV balance at ${todayData.hrv_balance} — nervous system under load. Keep demands light today.` });
  }

  return { intro, alerts, phase, meta };
}
