// src/api.js

// ----------------------------------------------------------------------------
// Base URL vælger automatisk korrekt endpoint:
//  - DEV:  /api-football/  (Vite dev-proxy)
//  - PROD: /api/api-football/ (Vercel serverless proxy)
// Kan overrides med VITE_API_FOOTBALL_BASE i .env
// ----------------------------------------------------------------------------
const RAW_BASE = (import.meta.env.VITE_API_FOOTBALL_BASE ?? "").trim();
const BASE = normalizeBase(
  RAW_BASE || (import.meta.env.DEV ? "/api-football/" : "/api/api-football/") // default
);

const TZ = import.meta.env.VITE_TZ || "Europe/Copenhagen";
const LOG = true;

function isAbsolute(url) {
  return /^https?:\/\//i.test(url);
}
function normalizeBase(b) {
  let out = b;
  if (!out) return "/";
  if (!isAbsolute(out) && !out.startsWith("/")) out = "/" + out;
  if (!out.endsWith("/")) out += "/";
  return out;
}
function buildUrl(path, params = {}) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, v);
  });
  const qs = search.toString();
  if (isAbsolute(BASE)) {
    const u = new URL(cleanPath, BASE);
    if (qs) u.search = qs;
    return u.toString();
  }
  return `${BASE}${cleanPath}${qs ? `?${qs}` : ""}`;
}
function headers() {
  return { Accept: "application/json" }; // nøgle sendes af proxy (dev/Vercel)
}
async function request(path, params = {}) {
  const url = buildUrl(path, params);
  LOG && console.log("[API request]", url);
  const res = await fetch(url, { headers: headers() });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    console.warn("[API error]", res.status, text?.slice(0, 200));
    throw new Error(`API error ${res.status}`);
  }
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch (_e) {
    console.warn("[API warn] Non-JSON response:", text?.slice(0, 200));
  }
  LOG &&
    console.log(
      "[API response]",
      path,
      "count:",
      Array.isArray(json?.response) ? json.response.length : "n/a",
      "paging:",
      json?.paging
    );
  return json;
}

// --------------------------- Leagues ----------------------------------------
export async function fetchLeaguesAll() {
  // GET /leagues
  return request("/leagues");
}
export async function fetchLeaguesByCountry(country) {
  // GET /leagues?country=Denmark
  return request("/leagues", { country });
}
export async function fetchLeagueMetaWithSeasons(id) {
  // GET /leagues?id=39
  const r = await request("/leagues", { id });
  return r.response?.[0] || null;
}
export function pickCurrentSeasonFromMeta(meta) {
  const seasons = meta?.seasons || [];
  if (!seasons.length) return undefined;
  const years = seasons
    .map((s) => s.year)
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
  return years[0];
}

// --------------------------- Fixtures ---------------------------------------
export async function fetchLeagueNext({ league, next = 50 }) {
  // GET /fixtures?league=ID&next=N
  return request("/fixtures", { league, next });
}
export async function fetchSeasonFixturesAllPages({
  league,
  season,
  maxPages = 50,
}) {
  // A) uden timezone
  let page = 1;
  let out = [];
  let total = 1;
  do {
    const r = await request("/fixtures", { league, season, page });
    out.push(...(r.response || []));
    total = r?.paging?.total || 1;
    LOG &&
      console.log("[fetchSeasonFixturesAllPages:A]", {
        league,
        season,
        page,
        total,
        added: r.response?.length || 0,
      });
    page += 1;
  } while (page <= total && page <= maxPages);
  if (out.length) return out;

  // B) fallback MED timezone (nogle få ligaer)
  page = 1;
  out = [];
  total = 1;
  do {
    const r = await request("/fixtures", {
      league,
      season,
      page,
      timezone: TZ,
    });
    out.push(...(r.response || []));
    total = r?.paging?.total || 1;
    LOG &&
      console.log("[fetchSeasonFixturesAllPages:B]", {
        league,
        season,
        page,
        total,
        added: r.response?.length || 0,
      });
    page += 1;
  } while (page <= total && page <= maxPages);
  return out;
}
export async function fetchFixtureById(fixtureId) {
  const r = await request("/fixtures", { id: fixtureId, timezone: TZ });
  return r.response?.[0] || null;
}

// --------------------------- Stats / H2H / Odds -----------------------------
export async function fetchHeadToHead({ homeId, awayId, last = 10 }) {
  return request("/fixtures/headtohead", {
    h2h: `${homeId}-${awayId}`,
    last,
    timezone: TZ,
  });
}
export async function fetchTeamLastFixtures({ teamId, last = 15 }) {
  return request("/fixtures", { team: teamId, last, timezone: TZ });
}
export async function fetchFixtureStatistics(fixtureId) {
  return request("/fixtures/statistics", { fixture: fixtureId });
}
export async function fetchTeamSeasonStats({ team, league, season }) {
  return request("/teams/statistics", { team, league, season });
}
export async function fetchPredictionsByFixture(fixture) {
  return request("/predictions", { fixture });
}
export async function fetchOddsByFixture({
  fixture,
  bookmaker,
  bet,
  page,
} = {}) {
  const params = { fixture };
  if (bookmaker) params.bookmaker = bookmaker;
  if (bet) params.bet = bet;
  if (page) params.page = page;
  return request("/odds", params);
}
