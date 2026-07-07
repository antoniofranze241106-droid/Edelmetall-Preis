import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  ChevronLeft, Settings as SettingsIcon, LayoutGrid, Sun, Moon,
  ArrowUpRight, ArrowDownRight, Landmark, Info,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Design tokens                                                          */
/* ---------------------------------------------------------------------- */
const THEME = {
  dark: {
    bg: "#111318",
    surface: "#1A1D23",
    surfaceRaised: "#20242B",
    border: "#2B2F37",
    text: "#ECEDEF",
    textMuted: "#8B92A0",
    textFaint: "#5B6270",
  },
  light: {
    bg: "#F1F2F4",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    border: "#E1E3E8",
    text: "#14161A",
    textMuted: "#5B6270",
    textFaint: "#8B92A0",
  },
};

/* Metal identity — each color drawn from the metal's own material tone */
const METALS = [
  {
    id: "gold",
    name: "Gold",
    symbol: "Au",
    color: "#C9A45C",
    gradient: ["#E4C689", "#9C7A34"],
    basePriceUSDPerGram: 76.5,
    volatility: 0.006,
    globalStockTonnes: 212000,
    description:
      "Gold gilt seit Jahrtausenden als Wertspeicher und Krisenwährung. Es ist chemisch nahezu reaktionsträge, weshalb es kaum korrodiert, und wird sowohl als Anlageform als auch in Schmuck und Elektronik verwendet.",
  },
  {
    id: "silver",
    name: "Silber",
    symbol: "Ag",
    color: "#C7CDD6",
    gradient: ["#E7EBEF", "#9AA2AE"],
    basePriceUSDPerGram: 0.948,
    volatility: 0.011,
    globalStockTonnes: 1750000,
    description:
      "Silber vereint industrielle Nutzung – etwa in der Elektronik und Photovoltaik – mit seiner Rolle als Anlagemetall. Der Preis reagiert daher stärker auf Konjunkturdaten als Gold.",
  },
  {
    id: "platinum",
    name: "Platin",
    symbol: "Pt",
    color: "#9FC1CC",
    gradient: ["#C9E1E8", "#5F8A96"],
    basePriceUSDPerGram: 31.67,
    volatility: 0.009,
    globalStockTonnes: 9500,
    description:
      "Platin ist seltener als Gold und wird vor allem in der Automobilindustrie für Abgaskatalysatoren sowie in der Schmuckherstellung eingesetzt. Das Angebot stammt größtenteils aus Südafrika.",
  },
  {
    id: "palladium",
    name: "Palladium",
    symbol: "Pd",
    color: "#B7ADC9",
    gradient: ["#D9D2E6", "#83769C"],
    basePriceUSDPerGram: 30.38,
    volatility: 0.013,
    globalStockTonnes: 4200,
    description:
      "Palladium wird hauptsächlich in Katalysatoren für Benzinmotoren verwendet. Ein begrenztes Angebot, das größtenteils aus Russland und Südafrika stammt, macht den Preis besonders schwankungsanfällig.",
  },
  {
    id: "copper",
    name: "Kupfer",
    symbol: "Cu",
    color: "#C97B4A",
    gradient: ["#E4A377", "#9C572C"],
    basePriceUSDPerGram: 0.0095,
    volatility: 0.008,
    globalStockTonnes: 32000000,
    description:
      "Kupfer ist ein industrielles Basismetall mit zentraler Bedeutung für Elektrifizierung, Bauwesen und erneuerbare Energien. Anders als Gold oder Silber wird es kaum als reines Anlagemetall gehandelt.",
  },
];

const CURRENCIES = {
  EUR: { label: "Euro", symbol: "€", rateFromUSD: 0.92 },
  USD: { label: "US-Dollar", symbol: "$", rateFromUSD: 1 },
  CHF: { label: "Schweizer Franken", symbol: "CHF", rateFromUSD: 0.88 },
  GBP: { label: "Britisches Pfund", symbol: "£", rateFromUSD: 0.79 },
};

const UNITS = {
  gram: { label: "Gramm", short: "g", grams: 1 },
  kilogram: { label: "Kilogramm", short: "kg", grams: 1000 },
  troyOunce: { label: "Feinunze", short: "oz t", grams: 31.1034768 },
  tonne: { label: "Tonne", short: "t", grams: 1_000_000 },
};

const TIMEFRAMES = [
  { id: "1D", label: "1T", points: 24, unitMs: 60 * 60 * 1000 },
  { id: "1W", label: "1W", points: 7, unitMs: 24 * 60 * 60 * 1000 },
  { id: "1M", label: "1M", points: 30, unitMs: 24 * 60 * 60 * 1000 },
  { id: "6M", label: "6M", points: 26, unitMs: 7 * 24 * 60 * 60 * 1000 },
  { id: "1Y", label: "1J", points: 52, unitMs: 7 * 24 * 60 * 60 * 1000 },
  { id: "5Y", label: "5J", points: 60, unitMs: 30 * 24 * 60 * 60 * 1000 },
  { id: "MAX", label: "Max", points: 120, unitMs: 30 * 24 * 60 * 60 * 1000 },
];

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */

// deterministic pseudo-random generator so charts don't jump around on re-render
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

function generateSeries(metal, timeframe) {
  const rand = mulberry32(seedFromString(metal.id + timeframe.id));
  const { points, unitMs } = timeframe;
  const now = Date.now();
  let price = metal.basePriceUSDPerGram * (0.94 + rand() * 0.12);
  const series = [];
  for (let i = points; i >= 0; i--) {
    const drift = (rand() - 0.5) * 2 * metal.volatility;
    price = Math.max(price * (1 + drift), price * 0.5);
    series.push({
      t: now - i * unitMs,
      price,
    });
  }
  // anchor the last point close to the "live" base price for consistency
  series[series.length - 1].price = metal.basePriceUSDPerGram;
  return series;
}

function formatDate(ts, timeframe) {
  const d = new Date(ts);
  if (timeframe.id === "1D") return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (["1W", "1M"].includes(timeframe.id)) return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

function convertPrice(pricePerGramUSD, currency, unit) {
  const usdRate = CURRENCIES[currency].rateFromUSD;
  const grams = UNITS[unit].grams;
  return pricePerGramUSD * usdRate * grams;
}

function formatNumber(value, currency) {
  const decimals = value >= 1000 ? 0 : value >= 10 ? 2 : 4;
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/* ---------------------------------------------------------------------- */
/* Data layer — this is the one place to connect a real price feed.        */
/*                                                                          */
/* fetchLatestPrices() and fetchHistory() are the only two functions that   */
/* touch "market data". Right now they return simulated values so the app   */
/* works standalone. To go live, replace the body of each function with a   */
/* call to your own backend endpoint (see api-example/prices.js) — nothing  */
/* else in the app needs to change, since both keep the same return shape.  */
/* ---------------------------------------------------------------------- */

// Returns: { [metalId]: { usdPerGram: number, changePct: number } }
async function fetchLatestPrices() {
  // --- REAL API HOOK-UP GOES HERE ---
  // const res = await fetch("/api/prices");
  // if (!res.ok) throw new Error("Preise konnten nicht geladen werden");
  // return const res = await fetch("/api/prices");

const res = await fetch("/api/prices");
if (!res.ok) throw new Error("Preise konnten nicht geladen werden");
return res.json();



   

// Returns: [{ t: timestampMs, price: usdPerGram }, ...]
async function fetchHistory(metal, timeframe) {
  // --- REAL API HOOK-UP GOES HERE ---
  // const res = await fetch(`/api/history?metal=${metal.id}&range=${timeframe.id}`);
  // if (!res.ok) throw new Error("Kursverlauf konnte nicht geladen werden");
  // return res.json();

  await new Promise((r) => setTimeout(r, 250));
  return generateSeries(metal, timeframe);
}

/* ---------------------------------------------------------------------- */
/* Storage hook                                                            */
/* ---------------------------------------------------------------------- */
function useSettings() {
  const [settings, setSettings] = useState({ currency: "EUR", unit: "gram", theme: "dark" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("settings");
      if (stored) setSettings(JSON.parse(stored));
    } catch (e) {
      // kein gespeicherter Wert vorhanden — Standardwerte werden verwendet
    } finally {
      setLoaded(true);
    }
  }, []);

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem("settings", JSON.stringify(next));
      } catch (e) {
        // Speichern fehlgeschlagen (z. B. privater Modus) — App funktioniert trotzdem weiter
      }
      return next;
    });
  }, []);

  return [settings, update, loaded];
}

/* ---------------------------------------------------------------------- */
/* Shared bits                                                             */
/* ---------------------------------------------------------------------- */
function Sparkline({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#spark-${color.replace("#", "")})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MetalSwatch({ metal, size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: `linear-gradient(155deg, ${metal.gradient[0]}, ${metal.gradient[1]})`,
        flexShrink: 0,
      }}
    />
  );
}

/* ---------------------------------------------------------------------- */
/* Dashboard                                                               */
/* ---------------------------------------------------------------------- */
function Dashboard({ t, settings, onOpen, livePrices, loading, error, onRetry }) {
  const dayFrame = TIMEFRAMES[0];

  return (
    <div style={{ padding: "20px 16px 96px" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 13, color: t.textFaint, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 600, margin: "4px 0 0", color: t.text }}>
            Edelmetalle
          </h1>
        </div>
        {loading && (
          <span style={{ fontSize: 11, color: t.textFaint, fontFamily: "'JetBrains Mono', monospace" }}>lädt…</span>
        )}
      </div>

      {error && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 14, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: t.textMuted }}>Kurse konnten nicht geladen werden.</span>
          <button onClick={onRetry} style={{ border: "none", background: "transparent", color: t.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Erneut versuchen
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {METALS.map((metal) => {
          const live = livePrices?.[metal.id];
          const priceUSD = live ? live.usdPerGram : metal.basePriceUSDPerGram;
          const changePct = live ? live.changePct : 0;
          const series = generateSeries(metal, dayFrame);
          const displayPrice = convertPrice(priceUSD, settings.currency, settings.unit);
          const positive = changePct >= 0;

          return (
            <button
              key={metal.id}
              onClick={() => onOpen(metal.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 16,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <MetalSwatch metal={metal} />
              <div style={{ flex: "0 0 auto", minWidth: 88 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: t.text }}>
                  {metal.name}
                </div>
                <div style={{ fontSize: 12, color: t.textFaint, fontFamily: "'JetBrains Mono', monospace" }}>
                  {metal.symbol} · {UNITS[settings.unit].short}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0, height: 40 }}>
                <Sparkline data={series} color={metal.color} />
              </div>

              <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, color: t.text }}>
                  {CURRENCIES[settings.currency].symbol} {formatNumber(displayPrice, settings.currency)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 2,
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: positive ? "#6FCF97" : "#EB5757",
                  }}
                >
                  {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(changePct).toFixed(2)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Detail                                                                  */
/* ---------------------------------------------------------------------- */
function Detail({ t, metal, settings, onBack, livePrice }) {
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1]);
  const [series, setSeries] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [yearData, setYearData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    fetchHistory(metal, timeframe).then((data) => {
      if (!cancelled) { setSeries(data); setHistoryLoading(false); }
    });
    return () => { cancelled = true; };
  }, [metal, timeframe]);

  useEffect(() => {
    let cancelled = false;
    fetchHistory(metal, TIMEFRAMES[0]).then((data) => { if (!cancelled) setDayData(data); });
    fetchHistory(metal, TIMEFRAMES[4]).then((data) => { if (!cancelled) setYearData(data); });
    return () => { cancelled = true; };
  }, [metal]);

  const currentUSD = livePrice ? livePrice.usdPerGram : metal.basePriceUSDPerGram;
  const displayPrice = convertPrice(currentUSD, settings.currency, settings.unit);
  const changePct = livePrice
    ? livePrice.changePct
    : series ? ((series[series.length - 1].price - series[0].price) / series[0].price) * 100 : 0;
  const positive = changePct >= 0;

  if (!series || !dayData || !yearData) {
    return (
      <div style={{ padding: "60px 16px", textAlign: "center", color: t.textFaint, fontSize: 13 }}>
        Kursdaten werden geladen…
      </div>
    );
  }
  const symbol = CURRENCIES[settings.currency].symbol;

  const dayHigh = Math.max(...dayData.map((d) => d.price));
  const dayLow = Math.min(...dayData.map((d) => d.price));
  const yearHigh = Math.max(...yearData.map((d) => d.price));
  const yearLow = Math.min(...yearData.map((d) => d.price));

  const bankBuy = currentUSD * 0.965; // Bank kauft (vom Kunden) günstiger
  const bankSell = currentUSD * 1.045; // Bank verkauft teurer

  const marketCapUSD = metal.globalStockTonnes * 1_000_000 * currentUSD;

  return (
    <div style={{ padding: "0 16px 96px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0 8px" }}>
        <button
          onClick={onBack}
          style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: t.text }}
        >
          <ChevronLeft size={18} />
        </button>
        <MetalSwatch metal={metal} size={30} />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: t.text }}>
          {metal.name}
        </div>
      </div>

      {/* Current price */}
      <div style={{ padding: "12px 0 20px" }}>
        <div style={{ fontSize: 13, color: t.textFaint, fontFamily: "'JetBrains Mono', monospace" }}>
          {symbol} pro {UNITS[settings.unit].label.toLowerCase()} · aktualisiert vor wenigen Minuten
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 700, color: t.text }}>
            {symbol} {formatNumber(displayPrice, settings.currency)}
          </span>
          <span
            style={{
              display: "flex", alignItems: "center", gap: 2, fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
              color: positive ? "#6FCF97" : "#EB5757",
            }}
          >
            {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(changePct).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "16px 8px 12px" }}>
        <div style={{ display: "flex", gap: 6, padding: "0 8px 12px", flexWrap: "wrap" }}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf)}
              style={{
                border: "none",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
                background: tf.id === timeframe.id ? metal.color : "transparent",
                color: tf.id === timeframe.id ? "#14161A" : t.textMuted,
                fontWeight: tf.id === timeframe.id ? 700 : 500,
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={series} margin={{ top: 5, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metal.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={metal.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={t.border} vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(v) => formatDate(v, timeframe)}
              tick={{ fill: t.textFaint, fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: t.surfaceRaised, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: t.textMuted }}
              labelFormatter={(v) => formatDate(v, timeframe)}
              formatter={(v) => [
                `${symbol} ${formatNumber(convertPrice(v, settings.currency, settings.unit), settings.currency)}`,
                metal.name,
              ]}
            />
            <Area type="monotone" dataKey="price" stroke={metal.color} strokeWidth={2} fill="url(#detailGradient)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bank buy/sell */}
      <div style={{ marginTop: 16 }}>
        <SectionTitle t={t} icon={<Landmark size={15} />} title="An- und Verkaufspreise" />
        <div style={{ display: "flex", gap: 10 }}>
          <PriceBox t={t} label="Bank-Ankauf" value={convertPrice(bankBuy, settings.currency, settings.unit)} symbol={symbol} settings={settings} />
          <PriceBox t={t} label="Bank-Verkauf" value={convertPrice(bankSell, settings.currency, settings.unit)} symbol={symbol} settings={settings} />
        </div>
        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 6 }}>
          Beispielhafte Kurse eines Referenzhändlers, inkl. üblicher Handelsspanne.
        </div>
      </div>

      {/* Additional info */}
      <div style={{ marginTop: 20 }}>
        <SectionTitle t={t} icon={<Info size={15} />} title="Weitere Informationen" />
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 4 }}>
          <StatRow t={t} label="Tageshoch" value={`${symbol} ${formatNumber(convertPrice(dayHigh, settings.currency, settings.unit), settings.currency)}`} />
          <StatRow t={t} label="Tagestief" value={`${symbol} ${formatNumber(convertPrice(dayLow, settings.currency, settings.unit), settings.currency)}`} />
          <StatRow t={t} label="Jahreshoch" value={`${symbol} ${formatNumber(convertPrice(yearHigh, settings.currency, settings.unit), settings.currency)}`} />
          <StatRow t={t} label="Jahrestief" value={`${symbol} ${formatNumber(convertPrice(yearLow, settings.currency, settings.unit), settings.currency)}`} />
          <StatRow
            t={t}
            label="Marktkapitalisierung (geschätzt)"
            value={`${symbol} ${new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 }).format(marketCapUSD * CURRENCIES[settings.currency].rateFromUSD)}`}
            last
          />
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: t.textMuted, marginTop: 14 }}>{metal.description}</p>
      </div>
    </div>
  );
}

function SectionTitle({ t, icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: t.textMuted }}>
      {icon}
      <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{title}</span>
    </div>
  );
}

function PriceBox({ t, label, value, symbol, settings }) {
  return (
    <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: t.textFaint }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 700, color: t.text, marginTop: 2 }}>
        {symbol} {formatNumber(value, settings.currency)}
      </div>
    </div>
  );
}

function StatRow({ t, label, value, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "12px 14px",
        borderBottom: last ? "none" : `1px solid ${t.border}`,
      }}
    >
      <span style={{ fontSize: 13, color: t.textMuted }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: t.text }}>{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Settings                                                                */
/* ---------------------------------------------------------------------- */
function SettingsView({ t, settings, update }) {
  return (
    <div style={{ padding: "20px 16px 96px" }}>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, margin: "0 0 20px", color: t.text }}>
        Einstellungen
      </h1>

      <SectionTitle t={t} icon={null} title="Darstellung" />
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {[
          { id: "dark", label: "Dunkel", icon: <Moon size={15} /> },
          { id: "light", label: "Hell", icon: <Sun size={15} /> },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => update({ theme: opt.id })}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 0",
              borderRadius: 14,
              cursor: "pointer",
              border: `1px solid ${settings.theme === opt.id ? t.text : t.border}`,
              background: settings.theme === opt.id ? t.surfaceRaised : t.surface,
              color: t.text,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      <SectionTitle t={t} icon={null} title="Währung" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {Object.entries(CURRENCIES).map(([code, c]) => (
          <button
            key={code}
            onClick={() => update({ currency: code })}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              cursor: "pointer",
              textAlign: "left",
              border: `1px solid ${settings.currency === code ? t.text : t.border}`,
              background: settings.currency === code ? t.surfaceRaised : t.surface,
              color: t.text,
            }}
          >
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>{code}</div>
            <div style={{ fontSize: 11, color: t.textFaint }}>{c.label}</div>
          </button>
        ))}
      </div>

      <SectionTitle t={t} icon={null} title="Gewichtseinheit" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {Object.entries(UNITS).map(([id, u]) => (
          <button
            key={id}
            onClick={() => update({ unit: id })}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              cursor: "pointer",
              textAlign: "left",
              border: `1px solid ${settings.unit === id ? t.text : t.border}`,
              background: settings.unit === id ? t.surfaceRaised : t.surface,
              color: t.text,
            }}
          >
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>{u.short}</div>
            <div style={{ fontSize: 11, color: t.textFaint }}>{u.label}</div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: t.textFaint, lineHeight: 1.6 }}>
        Die Einstellungen werden automatisch gespeichert und gelten für alle angezeigten Edelmetalle. Kurse in
        dieser Demo sind simulierte Beispieldaten.
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Root                                                                    */
/* ---------------------------------------------------------------------- */
export default function App() {
  const [settings, update, loaded] = useSettings();
  const [view, setView] = useState("dashboard"); // dashboard | detail | settings
  const [selectedId, setSelectedId] = useState(null);

  const [livePrices, setLivePrices] = useState(null);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState(false);

  const loadPrices = useCallback(() => {
    setPricesLoading(true);
    setPricesError(false);
    fetchLatestPrices()
      .then((data) => setLivePrices(data))
      .catch(() => setPricesError(true))
      .finally(() => setPricesLoading(false));
  }, []);

  useEffect(() => {
    loadPrices();
    // Refresh periodically. Adjust interval to match your API's rate limits.
    const id = setInterval(loadPrices, 60_000);
    return () => clearInterval(id);
  }, [loadPrices]);

  const t = THEME[settings.theme] || THEME.dark;
  const selectedMetal = METALS.find((m) => m.id === selectedId);

  if (!loaded) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        fontFamily: "'Inter', sans-serif",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        button:focus-visible { outline: 2px solid ${settings.theme === "dark" ? "#fff" : "#000"}; outline-offset: 2px; }
      `}</style>

      {view === "dashboard" && (
        <Dashboard
          t={t}
          settings={settings}
          onOpen={(id) => { setSelectedId(id); setView("detail"); }}
          livePrices={livePrices}
          loading={pricesLoading}
          error={pricesError}
          onRetry={loadPrices}
        />
      )}
      {view === "detail" && selectedMetal && (
        <Detail
          t={t}
          metal={selectedMetal}
          settings={settings}
          onBack={() => setView("dashboard")}
          livePrice={livePrices?.[selectedMetal.id]}
        />
      )}
      {view === "settings" && <SettingsView t={t} settings={settings} update={update} />}

      {view !== "detail" && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 480,
            display: "flex",
            gap: 6,
            padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
            background: t.surface,
            borderTop: `1px solid ${t.border}`,
          }}
        >
          {[
            { id: "dashboard", label: "Übersicht", icon: <LayoutGrid size={18} /> },
            { id: "settings", label: "Einstellungen", icon: <SettingsIcon size={18} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 0",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: view === tab.id ? t.text : t.textFaint,
              }}
            >
              {tab.icon}
              <span style={{ fontSize: 10.5, fontWeight: 600 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
