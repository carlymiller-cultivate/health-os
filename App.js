import React, { useState, useEffect, useCallback } from "react";
import { CONFIG } from "./config";
import {
  getDayOfCycle, getPhase, PHASE_META, getActiveSupplement,
  getUpcomingWindows, getNextCycleStart, get7DayStrip, getDailyBriefing,
} from "./cycleUtils";
import { fetchDailyData, getTodayAndYesterday, writeCheckin } from "./sheetsApi";
import "./App.css";

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, delta, deltaDir, barColor, barPct, sub }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: barColor }}>{value}</div>
      {delta && (
        <div className={`metric-delta delta-${deltaDir}`}>
          {deltaDir === "down" ? "▾" : deltaDir === "up" ? "▴" : "—"} {delta}
        </div>
      )}
      {sub && <div className="metric-sub">{sub}</div>}
      <div className="metric-bar">
        <div className="metric-bar-fill" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    </div>
  );
}

// ─── Scale selector ──────────────────────────────────────────────────────────
function ScaleSelector({ id, value, onChange }) {
  return (
    <div className="scale-row" role="group" aria-label={`${id} scale 1 to 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={`scale-btn${value === n ? " selected" : ""}`}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const [energy, setEnergy] = useState(null);
  const [mood, setMood] = useState(null);
  const [activeSymptoms, setActiveSymptoms] = useState([]);
  const [notes, setNotes] = useState("");
  const [checkinSaved, setCheckinSaved] = useState(false);

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const cycleDay = getDayOfCycle(today);
  const phase = getPhase(cycleDay);
  const phaseMeta = PHASE_META[phase];
  const nextCycle = getNextCycleStart();
  const daysUntilNext = Math.ceil((nextCycle - today) / 86400000);
  const weekStrip = get7DayStrip(today);
  const windows = getUpcomingWindows(cycleDay);
  const activeSupps = getActiveSupplement(cycleDay);
  const inactiveSupps = CONFIG.supplements.filter(
    s => !activeSupps.find(a => a.name === s.name)
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailyData();
      setRows(data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { today: todayData, yesterday: yesterdayData } = getTodayAndYesterday(rows);
  const { intro, alerts } = getDailyBriefing(cycleDay, todayData, yesterdayData);

  function toggleSymptom(s) {
    setActiveSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  async function handleSaveCheckin() {
    await writeCheckin({
      date: today.toISOString().split("T")[0],
      cycleDay,
      phase,
      energy: energy ?? "",
      mood: mood ?? "",
      symptoms: activeSymptoms,
      notes,
    });
    setCheckinSaved(true);
    setTimeout(() => setCheckinSaved(false), 3000);
  }

  function handleWeeklyDebrief() {
    const url = `https://claude.ai/new?q=${encodeURIComponent(
      `Health OS weekly debrief — ${todayStr}\n\nCycle day ${cycleDay}, phase: ${phaseMeta.label}\n` +
      `Readiness: ${todayData?.readiness ?? "n/a"} (yesterday: ${yesterdayData?.readiness ?? "n/a"})\n` +
      `HRV: ${todayData?.hrv_balance ?? "n/a"}, RHR: ${todayData?.resting_heart_rate ?? "n/a"}, ` +
      `Sleep balance: ${todayData?.sleep_balance ?? "n/a"}, Activity: ${todayData?.activity_balance ?? "n/a"}\n` +
      `Temp deviation: ${todayData?.temperature_deviation ?? "n/a"}, Trend: ${todayData?.temperature_trend ?? "n/a"}\n\n` +
      `Today's check-in — Energy: ${energy ?? "not logged"}/5, Mood: ${mood ?? "not logged"}/5\n` +
      `Symptoms: ${activeSymptoms.join(", ") || "none"}\nNotes: ${notes || "none"}\n\n` +
      `Cycle history: ${["2026-05-15","2026-04-20","2026-03-29","2026-03-07","2026-02-12","2026-01-24"].join(", ")}\n\n` +
      `Please give me a weekly debrief: patterns in my data this cycle, what my body responded well to, ` +
      `what to watch for in the coming days, and any adjustments worth making to my supplement or lifestyle protocol.`
    )}`;
    window.open(url, "_blank");
  }

  function scoreColor(val) {
    if (!val) return "#888";
    if (val >= 85) return "#1D9E75";
    if (val >= 70) return "#BA7517";
    return "#C94040";
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="header-eyebrow">Health OS</div>
          <h1 className="header-date">{todayStr}</h1>
          <div className={`phase-pill phase-${phase}`}>
            <span>{phaseMeta.icon}</span>
            <span>{phaseMeta.label} — day {cycleDay} of {CONFIG.cycle.length}</span>
          </div>
        </div>
        <div className="header-right">
          <div className="header-stat-label">Next cycle</div>
          <div className="header-stat-val">
            {nextCycle.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
          <div className="header-stat-sub">{daysUntilNext} days away</div>
          <button className="refresh-btn" onClick={load} aria-label="Refresh data from Google Sheet">
            <span className={loading ? "spin" : ""}>↻</span>
            {lastRefresh && !loading && (
              <span className="refresh-time">
                {lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          Could not load sheet data: {error}. Showing last known data.
        </div>
      )}

      {/* Daily briefing */}
      <section className="briefing" aria-label="Daily briefing">
        <p className="briefing-text">{intro}</p>
        {alerts.length > 0 && (
          <ul className="alert-list">
            {alerts.map((a, i) => (
              <li key={i} className="alert-item">
                <span className="alert-dot" style={{ background: a.color }} aria-hidden="true" />
                <span dangerouslySetInnerHTML={{ __html: a.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Oura metrics */}
      <section className="section" aria-label="Today's Oura metrics">
        <h2 className="section-title">
          Today's metrics
          {todayData?.date && <span className="section-sub"> — {todayData.date}</span>}
        </h2>
        {loading && !todayData ? (
          <div className="loading-state">Loading from sheet...</div>
        ) : (
          <div className="metrics-grid">
            <MetricCard
              label="Readiness" value={todayData?.readiness ?? "—"}
              delta={yesterdayData?.readiness ? `${Math.abs(todayData.readiness - yesterdayData.readiness)} from yesterday` : null}
              deltaDir={todayData?.readiness < yesterdayData?.readiness ? "down" : "up"}
              barColor={scoreColor(todayData?.readiness)} barPct={todayData?.readiness ?? 0}
            />
            <MetricCard
              label="HRV balance" value={todayData?.hrv_balance ?? "—"}
              delta={yesterdayData?.hrv_balance ? `${Math.abs(todayData.hrv_balance - yesterdayData.hrv_balance)} from yesterday` : null}
              deltaDir={todayData?.hrv_balance < yesterdayData?.hrv_balance ? "down" : "up"}
              barColor={scoreColor(todayData?.hrv_balance)} barPct={todayData?.hrv_balance ?? 0}
            />
            <MetricCard
              label="Resting HR" value={todayData?.resting_heart_rate ? `${todayData.resting_heart_rate} bpm` : "—"}
              delta={yesterdayData?.resting_heart_rate ? `${yesterdayData.resting_heart_rate} → ${todayData?.resting_heart_rate}` : null}
              deltaDir={todayData?.resting_heart_rate > yesterdayData?.resting_heart_rate ? "down" : "up"}
              barColor="#888780" barPct={todayData?.resting_heart_rate ? Math.min(100, (todayData.resting_heart_rate / 100) * 100) : 0}
            />
            <MetricCard
              label="Sleep balance" value={todayData?.sleep_balance ?? "—"}
              barColor={scoreColor(todayData?.sleep_balance)} barPct={todayData?.sleep_balance ?? 0}
            />
            <MetricCard
              label="Activity balance" value={todayData?.activity_balance ?? "—"}
              barColor={scoreColor(todayData?.activity_balance)} barPct={todayData?.activity_balance ?? 0}
            />
            <MetricCard
              label="Temp deviation"
              value={todayData?.temperature_deviation != null ? `${todayData.temperature_deviation}°` : "—"}
              sub={todayData?.temperature_trend != null ? `Trend: ${todayData.temperature_trend > 0 ? "+" : ""}${todayData.temperature_trend}° (${todayData.temperature_trend > 0 ? "rising" : "falling"})` : null}
              barColor="#7F77DD" barPct={50}
            />
          </div>
        )}
      </section>

      {/* 7-day strip */}
      <section className="section" aria-label="7-day cycle view">
        <h2 className="section-title">7-day view</h2>
        <div className="week-strip">
          {weekStrip.map((d, i) => (
            <div
              key={i}
              className={`day-cell${i === 0 ? " today" : ""}`}
              style={{ background: d.meta.bg }}
              aria-label={`${d.label} ${d.dateNum}, cycle day ${d.dayNum}, ${d.meta.label}`}
            >
              <div className="day-label">{d.label}</div>
              <div className="day-num">{d.dateNum}</div>
              <div className="day-cd" style={{ color: d.meta.color }}>cd{d.dayNum}</div>
              <div className="day-dot" style={{ background: d.meta.color }} aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="phase-legend">
          {Object.entries(PHASE_META).map(([key, m]) => (
            <span key={key} className="legend-item">
              <span className="legend-dot" style={{ background: m.color }} aria-hidden="true" />
              {m.label}
            </span>
          ))}
        </div>
      </section>

      {/* Upcoming windows */}
      <section className="section" aria-label="Upcoming cycle windows">
        <h2 className="section-title">Upcoming windows</h2>
        <div className="windows-grid">
          {windows.map((w, i) => (
            <div
              key={i}
              className={`window-card${w.isActive ? " window-active" : ""}`}
              style={{ borderLeftColor: w.color }}
              aria-label={`${w.name}, days ${w.start} to ${w.end}${w.isActive ? ", currently active" : w.daysUntil > 0 ? `, starts in ${w.daysUntil} days` : ", passed"}`}
            >
              <div className="window-name">{w.icon} {w.name}</div>
              <div className="window-range">Days {w.start}–{w.end}</div>
              {w.isActive ? (
                <div className="window-countdown active" style={{ color: w.color }}>
                  Active · {w.daysRemaining}d remaining
                </div>
              ) : w.daysUntil > 0 ? (
                <div className="window-countdown">In {w.daysUntil} days · {w.startsOn}</div>
              ) : (
                <div className="window-countdown passed">Passed</div>
              )}
              <div className="window-note">{w.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Supplements */}
      <section className="section" aria-label="Supplement protocol">
        <h2 className="section-title">Supplements — today</h2>
        <div className="supp-list">
          {activeSupps.map((s, i) => (
            <div key={i} className="supp-row supp-active">
              <span className="supp-dot" style={{ background: "#1D9E75" }} aria-hidden="true" />
              <span className="supp-name">{s.name}</span>
              <span className="supp-note">{s.note}</span>
              <span className="supp-badge badge-active">Take today</span>
            </div>
          ))}
          {inactiveSupps.map((s, i) => (
            <div key={i} className="supp-row supp-inactive">
              <span className="supp-dot" style={{ background: "#ccc" }} aria-hidden="true" />
              <span className="supp-name">{s.name}</span>
              <span className="supp-note">{s.note}</span>
              <span className="supp-badge badge-upcoming">
                Day {s.days?.[0]}–{s.days?.[1]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Daily check-in */}
      <section className="section" aria-label="Daily check-in">
        <h2 className="section-title">Daily check-in</h2>
        <div className="checkin-grid">
          <div className="checkin-field">
            <label className="checkin-label" htmlFor="energy-scale">Energy</label>
            <ScaleSelector id="energy" value={energy} onChange={setEnergy} />
          </div>
          <div className="checkin-field">
            <label className="checkin-label" htmlFor="mood-scale">Mood</label>
            <ScaleSelector id="mood" value={mood} onChange={setMood} />
          </div>
          <div className="checkin-field checkin-full">
            <div className="checkin-label">Symptoms</div>
            <div className="symptom-grid" role="group" aria-label="Symptoms">
              {CONFIG.symptoms.map(s => (
                <button
                  key={s}
                  className={`symptom-tag${activeSymptoms.includes(s) ? " active" : ""}`}
                  onClick={() => toggleSymptom(s)}
                  aria-pressed={activeSymptoms.includes(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="checkin-field checkin-full">
            <label className="checkin-label" htmlFor="checkin-notes">Notes</label>
            <textarea
              id="checkin-notes"
              className="checkin-textarea"
              rows={2}
              placeholder="How are you actually feeling today?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="action-row">
          <button
            className={`action-btn primary${checkinSaved ? " saved" : ""}`}
            onClick={handleSaveCheckin}
          >
            {checkinSaved ? "✓ Saved" : "Save check-in"}
          </button>
          <button className="action-btn" onClick={handleWeeklyDebrief}>
            Weekly debrief ↗
          </button>
        </div>
      </section>

      <footer className="app-footer">
        Health OS · Built for Carly · Powered by Oura + n8n
      </footer>
    </div>
  );
}
