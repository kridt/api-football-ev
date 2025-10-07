import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchFixturesByDate } from "../api";
import { toDateInputValue } from "../utils/time";
import FixtureCard from "../components/FixtureCard";

export default function LeagueFixtures() {
  const { leagueId, season } = useParams();
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [loading, setLoading] = useState(false);
  const [fixtures, setFixtures] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchFixturesByDate({
          dateISO: date,
          league: leagueId,
          season: season,
          timezone: "Europe/Copenhagen",
        });
        if (mounted) setFixtures(res.response || []);
      } catch (e) {
        console.error(e);
        if (mounted) setFixtures([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [date, leagueId, season]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-sm text-muted hover:text-white">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Fixtures</h1>
        <div className="ml-auto">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-ink-2 border border-white/10 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && <div className="text-muted">Loading fixtures…</div>}

      {!loading && fixtures.length === 0 && (
        <div className="text-muted text-sm">No fixtures on this date.</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {fixtures.map((fx) => (
          <FixtureCard key={fx.fixture.id} fx={fx} />
        ))}
      </div>
    </div>
  );
}
