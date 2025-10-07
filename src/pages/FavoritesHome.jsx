import { useEffect, useMemo, useState } from "react";
import { favorites } from "../store/favorites";
import { FRONT_RANGE_DAYS } from "../config/leagueWhitelist";
import { dkWindowNextDaysUtcMs } from "../utils/time";
import { fetchLeagueNext } from "../api";
import FavoriteLeagueBlock from "../components/FavoriteLeagueBlock";
import { Link } from "react-router-dom";

const NEXT_FETCH_PER_LEAGUE = 60; // hent rigeligt og filtrér lokalt til 5 dage

export default function FavoritesHome() {
  const favIdsRaw = useMemo(() => favorites.getAll(), []);
  const favIds = useMemo(
    () => favIdsRaw.map(Number).filter(Number.isFinite),
    [favIdsRaw]
  );

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    let on = true;
    const tag = "[FavoritesHome] v6 league?next + DK window filter";
    (async () => {
      try {
        setLoading(true);
        if (favIds.length === 0) {
          if (on) setGroups([]);
          return;
        }

        const { fromMsUtc, toMsUtc, fromISO, toISO } =
          dkWindowNextDaysUtcMs(FRONT_RANGE_DAYS);
        const nowMs = Date.now();
        console.log(tag, "DK→UTC window", {
          fromISO,
          toISO,
          fromMsUtc,
          toMsUtc,
        });

        const out = [];

        for (const leagueId of favIds) {
          try {
            // Hent næste fixtures pr. liga (uden season)
            const res = await fetchLeagueNext({
              league: leagueId,
              next: NEXT_FETCH_PER_LEAGUE,
            });
            const nextList = res.response || [];
            console.log(tag, "league", leagueId, "next count", nextList.length);

            // Meta tages direkte fra fixtures.league (mere end nok til navn/logo/flag/season)
            const metaFromFx = nextList[0]?.league || null;

            // Filtrér til næste N dage i DK
            let windowList = nextList
              .filter((fx) => {
                const ts = fx?.fixture?.timestamp;
                if (!Number.isFinite(ts)) return false;
                const ms = ts * 1000;
                return ms >= fromMsUtc && ms <= toMsUtc;
              })
              .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp);

            // Fallback: hvis ingen i vinduet, vis de næste 10 kommende (så brugeren kan se ligaen er aktiv)
            if (windowList.length === 0) {
              const upcoming = nextList
                .filter((fx) => (fx?.fixture?.timestamp || 0) * 1000 >= nowMs)
                .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)
                .slice(0, 10);
              if (upcoming.length) {
                console.log(
                  tag,
                  `fallback upcoming used for league ${leagueId}:`,
                  upcoming.length
                );
                windowList = upcoming;
              }
            }

            if (metaFromFx || windowList.length) {
              out.push({
                leagueId,
                meta: metaFromFx
                  ? {
                      name: metaFromFx.name,
                      logo: metaFromFx.logo,
                      country: {
                        name: metaFromFx.country,
                        flag: metaFromFx.flag,
                      },
                      season: metaFromFx.season,
                    }
                  : { name: `League ${leagueId}` },
                fixtures: windowList,
              });
            }
          } catch (e) {
            console.warn(tag, "league failed", leagueId, e?.message);
          }
        }

        out.sort((a, b) =>
          (a.meta?.name || "").localeCompare(b.meta?.name || "")
        );
        if (on) setGroups(out);
      } catch (e) {
        console.error(tag, e);
        if (on) setGroups([]);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [favIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your favorite leagues</h1>
        <p className="text-sm text-muted">
          Showing fixtures in the next {FRONT_RANGE_DAYS} days (or next upcoming
          when the window is empty).
        </p>
      </div>

      {favIds.length === 0 && (
        <div className="text-sm text-muted">
          You have no favorites yet. Go to{" "}
          <Link className="underline" to="/leagues">
            Browse all
          </Link>{" "}
          and add some ★
        </div>
      )}

      {loading && <div className="text-sm text-muted">Loading fixtures…</div>}

      {!loading &&
        favIds.length > 0 &&
        groups.every((g) => g.fixtures.length === 0) && (
          <div className="text-sm text-muted">
            No fixtures found in this window or upcoming for your favorite
            leagues.
          </div>
        )}

      <div className="grid md:grid-cols-2 gap-4">
        {groups.map((g) => (
          <FavoriteLeagueBlock
            key={g.leagueId}
            leagueMeta={g.meta}
            fixtures={g.fixtures}
          />
        ))}
      </div>
    </div>
  );
}
