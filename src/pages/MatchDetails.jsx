import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchFixtureById,
  fetchHeadToHead,
  fetchTeamLastFixtures,
  fetchFixtureStatistics,
  fetchPredictionsByFixture,
  fetchOddsByFixture,
} from "../api";
import { formatClock } from "../utils/time";
import StatTable from "../components/StatTable";

// ----- utils
function parseNumber(val) {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string" && val.endsWith("%"))
    return Number(val.replace("%", "")) || 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}
function pickStat(statsArr, type) {
  const item = statsArr?.find(
    (s) => s.type?.toLowerCase() === type.toLowerCase()
  );
  return parseNumber(item?.value);
}

async function computeTeamLastN(teamId, n = 15) {
  const list = await fetchTeamLastFixtures({ teamId, last: n });
  const fixtures = list.response || [];
  const ids = fixtures.map((f) => f.fixture.id);

  let sums = {
    "Corner Kicks": 0,
    "Yellow Cards": 0,
    "Red Cards": 0,
    Fouls: 0,
    Offsides: 0,
    "Shots on Goal": 0,
    "Shots off Goal": 0,
    "Total Shots": 0,
    "Ball Possession": 0,
  };
  let countPoss = 0;

  for (const id of ids) {
    const st = await fetchFixtureStatistics(id);
    const blocks = st.response || [];
    const me = blocks.find((b) => b.team?.id === Number(teamId));
    if (!me) continue;
    const S = me.statistics || [];
    for (const key of Object.keys(sums)) {
      const v = pickStat(S, key);
      if (key === "Ball Possession") {
        if (v > 0) {
          sums[key] += v;
          countPoss++;
        }
      } else {
        sums[key] += v;
      }
    }
  }

  const res = {
    matches: ids.length,
    avg: {
      corners: sums["Corner Kicks"] / ids.length || 0,
      yellow: sums["Yellow Cards"] / ids.length || 0,
      red: sums["Red Cards"] / ids.length || 0,
      fouls: sums["Fouls"] / ids.length || 0,
      offsides: sums["Offsides"] / ids.length || 0,
      sog: sums["Shots on Goal"] / ids.length || 0,
      sof: sums["Shots off Goal"] / ids.length || 0,
      shots: sums["Total Shots"] / ids.length || 0,
      poss: countPoss ? sums["Ball Possession"] / countPoss : 0,
    },
  };
  return res;
}

// ---- Optional: parse predictions/odds (badge/visning – beholdt kun på denne side)
function impliedFromDecimal(odds) {
  const o = Number(odds);
  if (!Number.isFinite(o) || o <= 1) return 0;
  return 1 / o;
}
function extractBestFromOdds(oddsResponse) {
  try {
    const list = oddsResponse?.response || [];
    const picks = [];
    for (const row of list) {
      for (const bm of row.bookmakers || []) {
        for (const bet of bm.bets || []) {
          const nm = String(bet.name || "").toLowerCase();
          const isOU =
            nm.includes("over/under") ||
            nm.includes("totals") ||
            nm.includes("corners") ||
            nm.includes("cards");
          if (!isOU) continue;
          for (const v of bet.values || []) {
            const odd = v.odd || v.price || v.odds;
            const p = impliedFromDecimal(odd);
            if (!p) continue;
            picks.push({
              label: `${bet.name}: ${v.value || v.selection}`,
              p,
              provider: bm.name,
            });
          }
        }
      }
    }
    if (!picks.length) return null;
    picks.sort((a, b) => b.p - a.p);
    return picks[0];
  } catch {
    return null;
  }
}
function parsePredictionPayload(json) {
  try {
    const row = (json?.response || [])[0];
    const P = row?.predictions || row?.prediction || row;
    const uo = P?.under_over || P?.goals?.under_over;
    if (
      typeof uo === "string" &&
      (uo.toLowerCase().startsWith("over") ||
        uo.toLowerCase().startsWith("under"))
    ) {
      const conf =
        Number(P?.advice_confidence) / 100 ||
        Number(P?.confidence) / 100 ||
        Number(P?.win_or_draw) / 100 ||
        0;
      const p = conf && isFinite(conf) && conf > 0 ? conf : 0.6;
      return { label: uo, p, provider: "API-FOOTBALL predictions" };
    }
    if (P?.percent?.home || P?.percent?.away || P?.percent?.draw) {
      const arr = [
        {
          k: "Home",
          v: Number(String(P.percent.home || "").replace("%", "")) / 100,
        },
        {
          k: "Draw",
          v: Number(String(P.percent.draw || "").replace("%", "")) / 100,
        },
        {
          k: "Away",
          v: Number(String(P.percent.away || "").replace("%", "")) / 100,
        },
      ].filter((x) => isFinite(x.v));
      arr.sort((a, b) => b.v - a.v);
      const top = arr[0];
      return {
        label: `1X2 – ${top.k}`,
        p: top.v,
        provider: "API-FOOTBALL predictions",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function MatchDetails() {
  const { fixtureId } = useParams();
  const [fx, setFx] = useState(null);
  const [h2h, setH2h] = useState([]);
  const [homeStats, setHomeStats] = useState(null);
  const [awayStats, setAwayStats] = useState(null);
  const [bestProb, setBestProb] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const f = await fetchFixtureById(fixtureId);
        if (!mounted) return;
        setFx(f);

        const homeId = f.teams?.home?.id;
        const awayId = f.teams?.away?.id;

        // H2H (last 10) – valgfri opsummering
        const h = await fetchHeadToHead({ homeId, awayId, last: 10 });
        if (!mounted) return;
        setH2h(h.response || []);

        // Team last 15 (for averages)
        const [hS, aS] = await Promise.all([
          computeTeamLastN(homeId, 15),
          computeTeamLastN(awayId, 15),
        ]);
        if (!mounted) return;
        setHomeStats(hS);
        setAwayStats(aS);

        // Probability (kun her)
        try {
          const [pred, odds] = await Promise.all([
            fetchPredictionsByFixture(fixtureId),
            fetchOddsByFixture({ fixture: fixtureId }),
          ]);
          const p1 = parsePredictionPayload(pred);
          const p2 = extractBestFromOdds(odds);
          const pick =
            [p1, p2]
              .filter(Boolean)
              .sort((a, b) => (b.p || 0) - (a.p || 0))[0] || null;
          if (mounted) setBestProb(pick);
        } catch {}
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fixtureId]);

  const header = useMemo(() => {
    if (!fx) return null;
    const { fixture, teams, league, goals } = fx;
    const status = fixture.status?.short || "";
    const done = ["FT", "AET", "PEN"].includes(status);
    return (
      <div className="bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card">
        <div className="flex items-center justify-between text-xs text-muted mb-2">
          <div className="flex items-center gap-2">
            <img src={league.logo} className="w-4 h-4" alt="" />
            <span>{league.name}</span>
          </div>
          <div>
            {formatClock(fixture.date)} · {status}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="flex items-center gap-2">
            <img src={teams.home.logo} className="w-8 h-8" alt="" />
            <div className="truncate">{teams.home.name}</div>
          </div>
          <div className="text-center text-2xl">
            {done ? (
              <span className="font-semibold">
                {goals.home} - {goals.away}
              </span>
            ) : (
              <span className="text-muted">vs</span>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <div className="truncate text-right">{teams.away.name}</div>
            <img src={teams.away.logo} className="w-8 h-8" alt="" />
          </div>
        </div>
      </div>
    );
  }, [fx]);

  // Totals per match (home avg + away avg)
  const totalsAvg = useMemo(() => {
    if (!homeStats || !awayStats) return null;
    const sum = (a, b) => Number(a || 0) + Number(b || 0);
    return {
      corners: sum(homeStats.avg.corners, awayStats.avg.corners),
      yellow: sum(homeStats.avg.yellow, awayStats.avg.yellow),
      red: sum(homeStats.avg.red, awayStats.avg.red),
      fouls: sum(homeStats.avg.fouls, awayStats.avg.fouls),
      offsides: sum(homeStats.avg.offsides, awayStats.avg.offsides),
      sog: sum(homeStats.avg.sog, awayStats.avg.sog),
      sof: sum(homeStats.avg.sof, awayStats.avg.sof),
      shots: sum(homeStats.avg.shots, awayStats.avg.shots),
      possHome: homeStats.avg.poss,
      possAway: awayStats.avg.poss,
    };
  }, [homeStats, awayStats]);

  const h2hSummary = useMemo(() => {
    if (!fx || h2h.length === 0) return null;
    const homeId = fx.teams.home.id;
    let hw = 0,
      aw = 0,
      d = 0;
    for (const m of h2h) {
      const g = m.goals;
      if (g.home === g.away) d++;
      else if (
        (m.teams.home.id === homeId && g.home > g.away) ||
        (m.teams.away.id === homeId && g.away > g.home)
      )
        hw++;
      else aw++;
    }
    return { hw, aw, d, count: h2h.length };
  }, [fx, h2h]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-sm text-muted hover:text-white">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Match Details</h1>
      </div>

      {header}

      {loading && <div className="text-muted">Loading data…</div>}

      {!loading && fx && (
        <>
          {/* Probability badge (kun her) */}
          {bestProb && (
            <div className="bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card">
              <div className="text-sm">
                <span className="mr-2 font-semibold">Model pick:</span>
                <span>{bestProb.label}</span>
                <span className="ml-2 text-muted">
                  ({(bestProb.p * 100).toFixed(1)}% via {bestProb.provider})
                </span>
              </div>
            </div>
          )}

          {/* H2H (kort opsummering + liste) */}
          <div className="bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card">
            <div className="font-semibold mb-3">Head to Head (last 10)</div>
            {h2hSummary ? (
              <div className="text-sm mb-3">
                <span className="mr-4">
                  Home wins: <b>{h2hSummary.hw}</b>
                </span>
                <span className="mr-4">
                  Draws: <b>{h2hSummary.d}</b>
                </span>
                <span>
                  Away wins: <b>{h2hSummary.aw}</b>
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted mb-3">
                No recent H2H found.
              </div>
            )}

            <div className="divide-y divide-white/10">
              {h2h.slice(0, 10).map((m) => (
                <div
                  key={m.fixture.id}
                  className="py-2 text-sm flex items-center justify-between"
                >
                  <div className="truncate">
                    <span className="text-muted mr-2">
                      {new Date(m.fixture.date).toLocaleDateString("da-DK")}
                    </span>
                    <span>
                      {m.teams.home.name}{" "}
                      <b>
                        {m.goals.home}-{m.goals.away}
                      </b>{" "}
                      {m.teams.away.name}
                    </span>
                  </div>
                  <div className="text-muted">{m.league.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals for hele kampen (last 15, averages) */}
          {totalsAvg && (
            <div className="grid md:grid-cols-2 gap-4">
              <StatTable
                title="Match totals – averages (last 15)"
                stats={[
                  { label: "Corners", value: totalsAvg.corners.toFixed(2) },
                  { label: "Yellow Cards", value: totalsAvg.yellow.toFixed(2) },
                  { label: "Red Cards", value: totalsAvg.red.toFixed(3) },
                  { label: "Fouls", value: totalsAvg.fouls.toFixed(2) },
                  { label: "Offsides", value: totalsAvg.offsides.toFixed(2) },
                  { label: "Shots on Goal", value: totalsAvg.sog.toFixed(2) },
                  { label: "Shots off Goal", value: totalsAvg.sof.toFixed(2) },
                  { label: "Total Shots", value: totalsAvg.shots.toFixed(2) },
                ]}
              />
              <StatTable
                title="Possession split (avg, last 15)"
                stats={[
                  {
                    label: "Home",
                    value: totalsAvg.possHome.toFixed(1),
                    suffix: "%",
                  },
                  {
                    label: "Away",
                    value: totalsAvg.possAway.toFixed(1),
                    suffix: "%",
                  },
                ]}
              />
            </div>
          )}

          <div className="text-xs text-muted">
            Averages are computed from per-fixture statistics for each team over
            their last 15 matches; match totals = home avg + away avg.
          </div>
        </>
      )}
    </div>
  );
}
