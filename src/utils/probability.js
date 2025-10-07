// Probability helpers: use (1) API predictions when available,
// (2) implied probability from odds (Over/Under, corners/cards when possible),
// (3) fallback to naive Poisson on team averages.

export function poissonPmf(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let pmf = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) pmf *= lambda / i;
  return pmf;
}

export function poissonCdf(k, lambda) {
  if (k < 0) return 0;
  let sum = 0;
  let pmf = Math.exp(-lambda);
  sum += pmf; // k=0
  for (let i = 1; i <= k; i++) {
    pmf *= lambda / i;
    sum += pmf;
  }
  return sum;
}

export function probOverUnder(totalLambda, line) {
  const floorK = Math.floor(line);
  const cdf = poissonCdf(floorK, totalLambda);
  const over = 1 - cdf;
  const under = cdf;
  return { over, under };
}

// ---------- Odds → implied prob ----------
export function impliedFromDecimal(odds) {
  const o = Number(odds);
  if (!Number.isFinite(o) || o <= 1) return 0;
  return 1 / o; // uden margin-justering; kan evt. normaliseres på tværs af outcomes
}

// Scan odds response to find OU on goals/corners/cards
export function extractBestFromOdds(oddsResponse) {
  try {
    const list = oddsResponse?.response || [];
    // Structure: [{bookmakers:[{bets:[{name:'Over/Under', values:[{value:'Over 2.5', odd:'1.85'}]}]}]}]
    const picks = [];

    for (const row of list) {
      for (const bm of row.bookmakers || []) {
        for (const bet of bm.bets || []) {
          const nm = String(bet.name || "").toLowerCase();

          const isGoalsOU =
            nm.includes("over/under") ||
            nm.includes("goals over/under") ||
            nm === "totals";
          const isCornersOU = nm.includes("corners");
          const isCardsOU = nm.includes("cards") || nm.includes("bookings");

          if (!isGoalsOU && !isCornersOU && !isCardsOU) continue;

          for (const v of bet.values || []) {
            const label = v.value || v.selection || "";
            const odd = v.odd || v.price || v.odds;
            const p = impliedFromDecimal(odd);
            if (!p) continue;

            if (isGoalsOU) {
              // Expect formats like "Over 2.5" / "Under 2.5"
              picks.push({
                key: "ou_goals",
                label: `Goals ${label}`,
                p,
                provider: bm.name,
              });
            } else if (isCornersOU) {
              picks.push({
                key: "ou_corners",
                label: `Corners ${label}`,
                p,
                provider: bm.name,
              });
            } else if (isCardsOU) {
              picks.push({
                key: "ou_cards",
                label: `Cards ${label}`,
                p,
                provider: bm.name,
              });
            }
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

// ---------- Build from team averages (fallback) ----------
export function buildMarketsFromAverages(home, away) {
  const markets = [];

  // Goals O/U 2.5 (Poisson)
  if (
    isFinite(home?.gf) &&
    isFinite(home?.ga) &&
    isFinite(away?.gf) &&
    isFinite(away?.ga)
  ) {
    const lambdaHome = (Number(home.gf) + Number(away.ga)) / 2;
    const lambdaAway = (Number(away.gf) + Number(home.ga)) / 2;
    const lambdaGoals = Math.max(0, lambdaHome) + Math.max(0, lambdaAway);
    const { over: goalsOver, under: goalsUnder } = probOverUnder(
      lambdaGoals,
      2.5
    );
    markets.push(
      {
        key: "goals_o25",
        label: "Goals O2.5",
        p: goalsOver,
        meta: { lambdaGoals },
      },
      {
        key: "goals_u25",
        label: "Goals U2.5",
        p: goalsUnder,
        meta: { lambdaGoals },
      }
    );
  }

  // Cards O/U 3.5 (Poisson on yellow+red totals)
  if (isFinite(home?.cards) && isFinite(away?.cards)) {
    const lambdaCards =
      Math.max(0, Number(home.cards)) + Math.max(0, Number(away.cards));
    const { over: cardsOver, under: cardsUnder } = probOverUnder(
      lambdaCards,
      3.5
    );
    markets.push(
      {
        key: "cards_o35",
        label: "Cards O3.5",
        p: cardsOver,
        meta: { lambdaCards },
      },
      {
        key: "cards_u35",
        label: "Cards U3.5",
        p: cardsUnder,
        meta: { lambdaCards },
      }
    );
  }

  const best = markets.length
    ? markets.slice().sort((a, b) => b.p - a.p)[0]
    : null;
  return { markets, best };
}

// ---------- Combine sources ----------
export function pickBestProbability({
  predictionPick,
  oddsPick,
  fallbackPick,
}) {
  // Heuristic: prefer API prediction if it gives explicit %; else take odds; else fallback
  const ranked = [predictionPick, oddsPick, fallbackPick].filter(Boolean);
  if (!ranked.length) return null;
  ranked.sort((a, b) => (b.p || 0) - (a.p || 0));
  return ranked[0];
}

/**
 * Parse API-FOOTBALL predictions payload into a unified "pick".
 * We look for under/over & btts/winner prob fields if available.
 * Falls back to null if structure not present.
 */
export function parsePredictionPayload(json) {
  try {
    const row = (json?.response || [])[0];
    // Common fields seen in docs/blog: 'predictions', 'under_over', 'percent', 'advice'
    // We normalize to an O/U pick if available.
    const P = row?.predictions || row?.prediction || row; // be liberal
    // Some payloads have: P.under_over (e.g., "Over 2.5") and P.percent.{home,draw,away}
    const uo = P?.under_over || P?.goals?.under_over;
    if (
      typeof uo === "string" &&
      (uo.toLowerCase().startsWith("over") ||
        uo.toLowerCase().startsWith("under"))
    ) {
      // If a "confidence" field exists, try to map to %; else fall back to 0.60 as a soft default
      const conf =
        Number(P?.advice_confidence) / 100 ||
        Number(P?.confidence) / 100 ||
        Number(P?.win_or_draw) / 100 ||
        0;

      const p = conf && isFinite(conf) && conf > 0 ? conf : 0.6;
      return {
        key: "pred_ou",
        label: uo,
        p,
        provider: "API-FOOTBALL predictions",
      };
    }
    // Winner prob example (if present)
    if (P?.percent?.home || P?.percent?.away || P?.percent?.draw) {
      const triplet = [
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
      if (triplet.length) {
        triplet.sort((a, b) => b.v - a.v);
        const top = triplet[0];
        return {
          key: "pred_wdw",
          label: `1X2 – ${top.k}`,
          p: top.v,
          provider: "API-FOOTBALL predictions",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
