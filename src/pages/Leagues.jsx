import { useEffect, useMemo, useState } from "react";
import { fetchLeaguesAll } from "../api";
import { favorites } from "../store/favorites";

function LeagueCard({ leagueObj, onToggleFav }) {
  const league = leagueObj.league;
  const country = leagueObj.country;
  const seasons = leagueObj.seasons || [];
  const isFav = favorites.has(league.id);

  return (
    <div className="bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card">
      <div className="flex items-center gap-3">
        <img src={league.logo} alt="" className="w-8 h-8 object-contain" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{league.name}</div>
          <div className="text-xs text-muted flex items-center gap-2">
            {country?.flag && (
              <img
                src={country.flag}
                alt=""
                className="w-4 h-3 object-cover rounded"
              />
            )}
            <span className="truncate">{country?.name}</span>
            {seasons.length > 0 && <span>· {seasons.length} seasons</span>}
          </div>
        </div>
        <button
          onClick={() => {
            onToggleFav(league.id);
          }}
          className={`text-xs px-2 py-1 rounded border ${
            isFav
              ? "border-yellow-400 text-yellow-300"
              : "border-white/20 text-muted hover:text-white"
          }`}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          {isFav ? "★" : "☆"}
        </button>
      </div>
    </div>
  );
}

export default function Leagues() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [q, setQ] = useState(""); // lokal søgning

  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchLeaguesAll();
        if (on) setData(res.response || []);
      } catch (e) {
        console.error(e);
        if (on) setData([]);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const list = useMemo(() => {
    const all = (data || []).filter((l) => l.league && l.country);
    if (!q.trim()) return all;
    const s = q.trim().toLowerCase();
    return all.filter(
      (l) =>
        l.league.name.toLowerCase().includes(s) ||
        (l.country.name || "").toLowerCase().includes(s)
    );
  }, [data, q]);

  function toggleFav(id) {
    favorites.toggle(id);
    // force re-render by updating state with shallow copy
    setData((arr) => [...arr]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Browse all leagues</h1>
          <p className="text-sm text-muted">
            Add leagues to your favorites (★) to see them on the home page.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-ink-2 border border-white/10 rounded px-3 py-2 text-sm w-64"
            placeholder="Search league or country…"
          />
        </div>
      </div>

      {loading && <div className="text-muted">Loading leagues…</div>}
      {!loading && list.length === 0 && (
        <div className="text-muted text-sm">No leagues found.</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((l) => (
          <LeagueCard
            key={l.league.id + "-" + (l.seasons?.[0]?.year || "")}
            leagueObj={l}
            onToggleFav={toggleFav}
          />
        ))}
      </div>
    </div>
  );
}
