// api/api-football/[...path].js
// Vercel Serverless Function (Node.js 18+)

const UPSTREAM = "https://v3.football.api-sports.io";

export default async function handler(req, res) {
  // Basic CORS (åben for alt — du kan låse den ned senere)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-apisports-key"
  );

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    // Byg upstream URL
    const segments = Array.isArray(req.query.path) ? req.query.path : [];
    const path = segments.join("/");
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const targetUrl = `${UPSTREAM}/${path}${qs}`;

    // Hent API-nøglen fra miljøvariabel
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "Missing API_FOOTBALL_KEY" });

    console.log("[proxy] ->", targetUrl);

    // Kald API-Football direkte
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "x-apisports-key": apiKey, // korrekt header
        Accept: "application/json",
      },
    });

    const text = await upstreamRes.text();
    console.log("[proxy] <-", upstreamRes.status, text.slice(0, 100));

    // Returner uændret svar
    res.status(upstreamRes.status);
    res.setHeader(
      "Content-Type",
      upstreamRes.headers.get("content-type") || "application/json"
    );
    const cache = upstreamRes.headers.get("cache-control");
    if (cache) res.setHeader("Cache-Control", cache);

    return res.send(text);
  } catch (err) {
    console.error("[proxy] error:", err);
    return res.status(500).json({ error: err?.message || "Proxy error" });
  }
}
