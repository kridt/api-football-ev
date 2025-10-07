import { Link } from "react-router-dom";
import { formatClock } from "../utils/time";

export default function FixtureCard({ fx }) {
  const { fixture, teams, goals, league } = fx;
  const status = fixture.status?.short || "";
  const isLive = ["1H", "2H", "ET", "P", "BT", "HT"].includes(status);
  const done = ["FT", "AET", "PEN"].includes(status);

  return (
    <Link
      to={`/match/${fixture.id}`}
      className="block bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card hover:border-white/20"
    >
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
          <img src={teams.home.logo} className="w-6 h-6" alt="" />
          <div className="truncate">{teams.home.name}</div>
        </div>

        <div
          className={`text-center text-lg ${
            isLive ? "text-red-300 animate-pulse" : ""
          }`}
        >
          {done || isLive ? (
            <span className="font-semibold">
              {goals.home} - {goals.away}
            </span>
          ) : (
            <span className="text-muted">vs</span>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <div className="truncate text-right">{teams.away.name}</div>
          <img src={teams.away.logo} className="w-6 h-6" alt="" />
        </div>
      </div>
    </Link>
  );
}
