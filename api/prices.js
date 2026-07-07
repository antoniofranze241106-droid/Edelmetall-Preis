// Beispiel: Serverless-Funktion für Vercel (api/prices.js)
// Läuft NICHT im Browser — hier ist der API-Key sicher, weil er nie an den Client geht.
//
// Setup:
// 1. Datei nach /api/prices.js in deinem Vercel-Projekt kopieren
// 2. Environment-Variable METALS_DEV_API_KEY in den Projekteinstellungen setzen
// 3. In der App fetchLatestPrices() auf `fetch("/api/prices")` umstellen (siehe App.jsx)
//
// Nutzt metals.dev — Free-Plan ohne Kreditkarte, 100 Anfragen/Monat (Stand: aktuelle Pricing-Seite
// von metals.dev prüfen, da sich Kontingente ändern können).

export default async function handler(req, res) {
  const apiKey = process.env.METALS_DEV_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "METALS_DEV_API_KEY ist nicht gesetzt" });
  }

  try {
    // unit=g liefert die Preise direkt in USD pro Gramm — passt zum Format, das die App erwartet.
    const response = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=g`
    );
    const data = await response.json();

    if (data.status !== "success") {
      return res.status(502).json({ error: data.error_message || "Kursanbieter hat einen Fehler gemeldet" });
    }

    const m = data.metals;

    const result = {
      gold: { usdPerGram: m.gold, changePct: 0 },
      silver: { usdPerGram: m.silver, changePct: 0 },
      platinum: { usdPerGram: m.platinum, changePct: 0 },
      palladium: { usdPerGram: m.palladium, changePct: 0 },
      copper: { usdPerGram: m.copper, changePct: 0 },
    };

    // changePct (Veränderung zum Vortag) braucht einen zweiten Aufruf gegen den Timeseries-Endpoint
    // (z. B. Kurs von gestern) — hier aus Übersichtsgründen weggelassen.

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: "Anfrage an Kursanbieter fehlgeschlagen" });
  }
}
