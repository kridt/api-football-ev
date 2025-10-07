// --- BASE / HEADERS ---------------------------------------------------------
const RAW_BASE = (import.meta.env.VITE_API_FOOTBALL_BASE ?? "").trim();
// Default til Vercel serverless route (ikke dev-proxy)
const DEFAULT_BASE = "/api/api-football/";
const KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
const TZ = import.meta.env.VITE_TZ || "Europe/Copenhagen";
const LOG = true;

function isAbsolute(url) {
  return /^https?:\/\//i.test(url);
}
function normBase(raw) {
  let b = raw || DEFAULT_BASE;
  if (!isAbsolute(b) && !b.startsWith("/")) b = "/" + b;
  if (!b.endsWith("/")) b += "/";
  return b;
}
const BASE = normBase(RAW_BASE);

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
  const h = {};
  if (KEY) h["x-apisports-key"] = KEY; // i prod bruges serverless-nøglen; her gør det ikke skade
  return h;
}

async function request(path, params = {}) {
  const url = buildUrl(path, params);
  LOG && console.log("[API request]", url);
  const res = await fetch(url, { headers: headers() });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    console.warn("[API error]", res.status, text?.slice(0, 400));
    throw new Error(`API error ${res.status}`);
  }

  // prøv at parse som JSON – fallback til tomt objekt med debug
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (e) {
    console.warn("[API warn] Non-JSON body received:", text?.slice(0, 120));
    json = {};
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

/* ---------- Leagues (browse + meta) ---------- */
export async function fetchLeaguesAll() {
  return request("/leagues", {});
}
export async function fetchLeaguesByCountry(country) {
  return request("/leagues", { country });
}
export async function fetchLeagueMetaWithSeasons(id) {
  const r = await request("/leagues", { id });
  return r.response?.[0] || null;
}

/* ---------- Fixtures: NEXT per league ---------- */
export async function fetchLeagueNext({ league, next = 50 }) {
  return request("/fixtures", { league, next });
}

/* ---------- Single fixture / stats ---------- */
export async function fetchFixtureById(fixtureId) {
  const res = await request("/fixtures", { id: fixtureId, timezone: TZ });
  return res.response?.[0] || null;
}
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
