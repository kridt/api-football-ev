// Vercel Serverless Function (Node.js 18+)
// Robust path-udtræk der virker på Vercel uanset query-parsing.

const UPSTREAM = "https://v3.football.api-sports.io";

export default async function handler(req, res) {
  // CORS
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
    // Eksempel: req.url = /api/api-football/fixtures?league=525&next=15
    const urlStr = req.url || "";
    // Fjern prefix /api/api-football/
    const prefix = "/api/api-football/";
    const idx = urlStr.indexOf(prefix);
    let tail =
      idx >= 0 ? urlStr.slice(idx + prefix.length) : urlStr.replace(/^\/+/, "");

    // Split i path + query
    const qIdx = tail.indexOf("?");
    const path = (qIdx === -1 ? tail : tail.slice(0, qIdx)).replace(
      /^\/+|\/+$/g,
      ""
    ); // "fixtures" / "leagues"
    const qs = qIdx === -1 ? "" : tail.slice(qIdx); // fx "?league=525&next=15"

    if (!path) {
      return res.status(400).json({ error: "Missing endpoint path" });
    }

    const targetUrl = `${UPSTREAM}/${path}${qs}`;

    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "Missing API_FOOTBALL_KEY" });

    console.log("[proxy] ->", targetUrl, "keyLen:", apiKey.length);

    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "x-apisports-key": apiKey, // KORREKT header til API-Football v3
        Accept: "application/json",
      },
    });

    const text = await upstreamRes.text();
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
