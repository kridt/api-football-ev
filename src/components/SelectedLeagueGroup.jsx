import { useEffect, useState } from "react";
import {
  getCurrentSeasonForLeague,
  getLeagueMetaById,
  fetchFixturesInRange,
  fetchNextFixturesLeagueSeason,
  fetchFixturesInRangeNoSeason,
} from "../api";
import { dkRangeNextDaysISO } from "../utils/time";
import MiniFixtureRow from "./MiniFixtureRow";
import { FRONT_RANGE_DAYS } from "../config/leagueWhitelist";

export default function SelectedLeagueGroup({ leagueId }) {
  const [meta, setMeta] = useState(null);
  const [season, setSeason] = useState(undefined);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    const tag = `[SelectedLeagueGroup] leagueId:${leagueId}`;
    console.log(tag, "mount");
    (async () => {
      try {
        const m = await getLeagueMetaById(leagueId);
        if (!on) return;
        setMeta(m);

        let s = await getCurrentSeasonForLeague(leagueId);
        if (!on) return;
        setSeason(s);

        const { fromISO, toISO } = dkRangeNextDaysISO(FRONT_RANGE_DAYS);
        const fromDate = new Date(fromISO + "T00:00:00");
        const toDate = new Date(toISO + "T23:59:59");

        // ---- Attempt A: strict range + season
        console.log(tag, "Attempt A: range+season", {
          season: s,
          fromISO,
          toISO,
        });
        let list = [];
        try {
          if (s) {
            const rA = await fetchFixturesInRange({
              league: leagueId,
              season: s,
              from: fromISO,
              to: toISO,
            });
            list = rA.response || [];
            console.log(tag, "A count:", list.length);
          } else {
            console.warn(tag, "no season yet for Attempt A");
          }
        } catch (e) {
          console.warn(tag, "Attempt A error:", e?.message);
        }

        // ---- Attempt B: next+season (then date-filter client-side)
        if (list.length === 0) {
          console.log(
            tag,
            "Attempt B: next+season, then filter by date window"
          );
          try {
            const rB = await fetchNextFixturesLeagueSeason({
              league: leagueId,
              season: s,
              next: 200,
            });
            const rawB = rB.response || [];
            list = rawB.filter((fx) => {
              const dt = new Date(fx.fixture?.date);
              return dt >= fromDate && dt <= toDate;
            });
            console.log(
              tag,
              "B raw:",
              rawB.length,
              "after window filter:",
              list.length
            );
          } catch (e) {
            console.warn(tag, "Attempt B error:", e?.message);
          }
        }

        // ---- Attempt C: range WITHOUT season (some comps ignore/mismatch season on range).
        // Then we post-filter by fx.league.season === s to keep "current season only".
        if (list.length === 0) {
          console.log(
            tag,
            "Attempt C: range (no season) + post-filter by season"
          );
          try {
            const rC = await fetchFixturesInRangeNoSeason({
              league: leagueId,
              from: fromISO,
              to: toISO,
            });
            const rawC = rC.response || [];
            const filtered = s
              ? rawC.filter((fx) => Number(fx.league?.season) === Number(s))
              : rawC;
            list = filtered;
            console.log(
              tag,
              "C raw:",
              rawC.length,
              "post-filter season:",
              s,
              "=>",
              list.length
            );
          } catch (e) {
            console.warn(tag, "Attempt C error:", e?.message);
          }
        }

        // final sort + set
        list.sort(
          (a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)
        );
        if (!on) return;
        setFixtures(list);
      } catch (e) {
        console.error(tag, "fatal", e);
        if (on) setFixtures([]);
      } finally {
        if (on) {
          setLoading(false);
          console.log(tag, "done. loading=false, fixtures:", fixtures?.length);
        }
      }
    })();

    return () => {
      on = false;
      console.log(tag, "unmount");
    };
  }, [leagueId]);

  const leagueLogo = meta?.league?.logo;
  const leagueName = meta?.league?.name || `League ${leagueId}`;
  const countryFlag = meta?.country?.flag;

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
            <span>{meta?.country?.name || "—"}</span>
            {season && <span>· Season {season}</span>}
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-muted">Loading matches…</div>}
      {!loading && fixtures.length === 0 && (
        <div className="text-sm text-muted">
          No fixtures in the next {FRONT_RANGE_DAYS} days for this season.
        </div>
      )}

      <div className="divide-y divide-white/10">
        {fixtures.map((fx) => (
          <MiniFixtureRow key={fx.fixture.id} fx={fx} />
        ))}
      </div>
    </div>
  );
}
