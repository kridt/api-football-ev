import { useEffect, useState } from "react";
import { fetchLeagueById, searchLeague, fetchFixturesInRange } from "../api";
import MiniFixtureRow from "./MiniFixtureRow";
import { FRONT_RANGE_DAYS } from "../config/leagueWhitelist";
import { dkRangeNextDaysISO } from "../utils/time";

function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function labelVariants(label) {
  const v = [
    label,
    label.replace("Women's", "Women"),
    label.replace("Women", "Women's"),
    label.replace(" - ", " "),
    label.replace("Qualification Europe", "Qualification - Europe"),
    label.replace(
      "Qualification North America",
      "Qualification - North America"
    ),
    label.replace("UEFA ", ""), // fx "UEFA Nations League" -> "Nations League"
  ];
  return unique(v);
}

async function resolveLeagueMeta({ id, label, country }) {
  const tag = `[resolveLeagueMeta] ${label}${id ? ` (id:${id})` : ""}`;
  try {
    if (id) {
      console.log(tag, "try direct id");
      const r = await fetchLeagueById(id);
      const L = r.response?.[0];
      if (L) {
        console.log(
          tag,
          "found by id:",
          L.league?.name,
          "| country:",
          L.country?.name
        );
        return L;
      }
      console.warn(tag, "not found by id");
    }

    // Try sequence of search variants
    const variants = labelVariants(label);
    for (const q of variants) {
      // 1) country-scoped search (if provided)
      if (country) {
        console.log(tag, "country search ->", country, "| q:", q);
        const r2 = await searchLeague({ country, search: q });
        const list2 = r2.response || [];
        console.log(tag, "results (country+q):", list2.length);
        const exact2 = list2.find(
          (x) => x.league?.name?.toLowerCase() === q.toLowerCase()
        );
        if (exact2) {
          console.log(tag, "picked exact (country):", exact2.league?.name);
          return exact2;
        }
        if (list2[0]) {
          console.log(tag, "picked first (country):", list2[0].league?.name);
          return list2[0];
        }
      }

      // 2) global search
      console.log(tag, "global search -> q:", q);
      const r3 = await searchLeague({ search: q });
      const list3 = r3.response || [];
      console.log(tag, "results (global q):", list3.length);
      const exact3 = list3.find(
        (x) => x.league?.name?.toLowerCase() === q.toLowerCase()
      );
      if (exact3) {
        console.log(tag, "picked exact (global):", exact3.league?.name);
        return exact3;
      }
      if (list3[0]) {
        console.log(tag, "picked first (global):", list3[0].league?.name);
        return list3[0];
      }
    }

    console.warn(tag, "no league match at all");
    return null;
  } catch (e) {
    console.error(tag, "error:", e);
    return null;
  }
}

function chooseSeason(seasons = []) {
  if (!Array.isArray(seasons) || seasons.length === 0) return undefined;
  const current = seasons.find((s) => s.current);
  if (current?.year) return current.year;
  const years = seasons.map((s) => s.year).filter((n) => Number.isFinite(n));
  years.sort((a, b) => b - a); // newest first
  return years[0];
}

export default function LeagueRow({ item }) {
  const [meta, setMeta] = useState(null);
  const [fxList, setFxList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const tag = `[LeagueRow] ${item.label}${item.id ? ` (id:${item.id})` : ""}`;
    console.log(tag, "mount -> start fetch");

    (async () => {
      try {
        const L = await resolveLeagueMeta(item);
        if (!mounted) return;
        setMeta(L);

        if (!L) {
          console.warn(tag, "no league meta resolved");
          setFxList([]);
          return;
        }

        const season = chooseSeason(L.seasons);
        const leagueId = L.league?.id;
        console.log(
          tag,
          "chosen season:",
          season,
          "| leagueId:",
          leagueId,
          "| country:",
          L.country?.name
        );

        if (!leagueId) {
          console.warn(tag, "missing leagueId, skip fixtures");
          setFxList([]);
          return;
        }

        const { fromISO, toISO } = dkRangeNextDaysISO(FRONT_RANGE_DAYS);
        console.log(tag, "range:", { fromISO, toISO, FRONT_RANGE_DAYS });

        // ATTEMPT 1: with season
        let list = [];
        if (season) {
          console.log(tag, "fetch with season...");
          const fx1 = await fetchFixturesInRange({
            league: leagueId,
            season,
            from: fromISO,
            to: toISO,
          });
          list = fx1.response || [];
          console.log(tag, "with season ->", list.length);
        }

        // ATTEMPT 2: without season (some international comps ignore or mismatch season param)
        if (!season || list.length === 0) {
          console.log(tag, "fetch without season (fallback)...");
          const fx2 = await fetchFixturesInRange({
            league: leagueId,
            from: fromISO,
            to: toISO,
          });
          const l2 = fx2.response || [];
          console.log(tag, "without season ->", l2.length);
          if (l2.length > 0) list = l2;
        }

        list.sort(
          (a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)
        );
        console.log(
          tag,
          "final fixtures:",
          list.length,
          list.map((x) => ({ id: x.fixture.id, date: x.fixture.date }))
        );
        if (!mounted) return;
        setFxList(list);
      } catch (e) {
        console.error(tag, "fatal error:", e);
        if (mounted) setFxList([]);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log(tag, "done. loading=false");
        }
      }
    })();

    return () => {
      mounted = false;
      console.log(tag, "unmount");
    };
  }, [item]);

  const leagueLogo = meta?.league?.logo;
  const leagueName = meta?.league?.name || item.label;
  const countryFlag = meta?.country?.flag;
  const seasonText = chooseSeason(meta?.seasons);

  return (
    <div className="bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card">
      <div className="flex items-center gap-3 mb-3">
        {leagueLogo && (
          <img src={leagueLogo} alt="" className="w-7 h-7 object-contain" />
        )}
        <div className="flex-1">
          <div className="font-semibold">{leagueName}</div>
          <div className="text-xs text-muted flex items-center gap-2">
            {countryFlag && (
              <img
                src={countryFlag}
                alt=""
                className="w-4 h-3 object-cover rounded"
              />
            )}
            <span>{item.country || meta?.country?.name || "—"}</span>
            {seasonText && <span>· Season {seasonText}</span>}
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-muted">Loading matches…</div>}
      {!loading && fxList.length === 0 && (
        <div className="text-sm text-muted">
          No matches in the next {FRONT_RANGE_DAYS} days.
        </div>
      )}

      <div className="divide-y divide-white/10">
        {fxList.map((fx) => (
          <MiniFixtureRow key={fx.fixture.id} fx={fx} />
        ))}
      </div>
    </div>
  );
}
