// Vercel Serverless Function (Node.js 18+)
// Placeret under /api for at kunne tilgås som https://<app>/api/api-football/...

const UPSTREAM = "https://v3.football.api-sports.io";

export default async function handler(req, res) {
  // Basic CORS (tillad fra alle origins – du kan låse den hvis du vil)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-apisports-key"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const segments = Array.isArray(req.query.path) ? req.query.path : [];
    const path = segments.join("/"); // fx "leagues" eller "fixtures"
    const qs = req.url.includes("?")
      ? req.url.substring(req.url.indexOf("?"))
      : "";
    const targetUrl = `${UPSTREAM}/${path}${qs}`;

    // Læs nøgle fra Vercel env (sæt den i Project Settings → Environment Variables)
    const apiKey =
      process.env.API_FOOTBALL_KEY || process.env.VITE_API_FOOTBALL_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Missing API key (API_FOOTBALL_KEY)" });
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "x-apisports-key": apiKey,
        // valgfrit: "Accept": "application/json",
      },
      // GET er default
    });

    // Forward status + json
    const text = await upstreamRes.text(); // bevar original body
    res.status(upstreamRes.status);
    res.setHeader(
      "Content-Type",
      upstreamRes.headers.get("content-type") || "application/json"
    );
    // bevar også caching hvis du vil
    const cache = upstreamRes.headers.get("cache-control");
    if (cache) res.setHeader("Cache-Control", cache);

    // CORS header er allerede sat øverst
    return res.send(text);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Proxy error" });
  }
}
