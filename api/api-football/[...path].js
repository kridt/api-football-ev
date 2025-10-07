// Vercel Serverless Function (Node.js 18+)
const UPSTREAM = "https://v3.football.api-sports.io";

export default async function handler(req, res) {
  // Basis CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-apisports-key, x-rapidapi-key"
  );

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const segments = Array.isArray(req.query.path) ? req.query.path : [];
    const path = segments.join("/");
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const targetUrl = `${UPSTREAM}/${path}${qs}`;

    const apiKey =
      process.env.API_FOOTBALL_KEY || process.env.VITE_API_FOOTBALL_KEY;
    if (!apiKey)
      return res
        .status(500)
        .json({ error: "Missing API key (API_FOOTBALL_KEY)" });

    // Nogle konti/konfigurationer forventer rapidapi-headeren, andre apisports – vi sender begge.
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "x-apisports-key": apiKey,
        "x-rapidapi-key": apiKey,
        // "Accept": "application/json" // valgfrit
      },
    });

    const text = await upstreamRes.text();
    console.log("[proxy] ->", targetUrl);
    console.log("[proxy] <-", upstreamRes.status, (text || "").slice(0, 120));

    res.status(upstreamRes.status);
    res.setHeader(
      "Content-Type",
      upstreamRes.headers.get("content-type") || "application/json"
    );
    const cache = upstreamRes.headers.get("cache-control");
    if (cache) res.setHeader("Cache-Control", cache);
    return res.send(text);
  } catch (err) {
    console.error("[proxy] error:", err?.message);
    return res.status(500).json({ error: err?.message || "Proxy error" });
  }
}
