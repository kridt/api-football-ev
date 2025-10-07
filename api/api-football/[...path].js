// Vercel Serverless Function (Node.js 18+)
// Robust path-parsing + sanitering af Vercel's "__path" query.

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
    // Eksempel: /api/api-football/fixtures?league=525&next=15
    // eller (pga. nogle frameworks): /api/api-football?__path=fixtures&league=525
    const fullUrl = new URL(req.url, "http://localhost"); // base kræves bare for parsing
    const prefix = "/api/api-football/";
    let path = "";
    if (fullUrl.pathname.startsWith(prefix)) {
      path = fullUrl.pathname.slice(prefix.length).replace(/^\/+|\/+$/g, ""); // "fixtures" / "leagues"
    }

    // Hvis path ikke lå i pathname, så kig efter __path fx "?__path=fixtures"
    if (!path) {
      const qpPath =
        fullUrl.searchParams.get("__path") || fullUrl.searchParams.get("path");
      if (qpPath) path = qpPath.replace(/^\/+|\/+$/g, "");
    }
    if (!path) return res.status(400).json({ error: "Missing endpoint path" });

    // Saniter query: fjern __path og path inden vi sender til upstream
    const sp = fullUrl.searchParams;
    sp.delete("__path");
    sp.delete("path");
    const qs = sp.toString();
    const targetUrl = `${UPSTREAM}/${path}${qs ? `?${qs}` : ""}`;

    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey)
      return res.status(500).json({ error: "Missing API_FOOTBALL_KEY" });

    console.log("[proxy] ->", targetUrl, "keyLen:", apiKey.length);

    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "x-apisports-key": apiKey, // korrekt header til API-Football v3
        Accept: "application/json",
      },
    });

    const text = await upstreamRes.text();
    console.log("[proxy] <-", upstreamRes.status, (text || "").slice(0, 140));

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
