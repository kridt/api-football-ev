import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { formatClock } from "../utils/time";

function useCountdown(isoDate) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(isoDate).getTime() - now);
  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return { days, hours, minutes, seconds };
}

export default function MiniFixtureRow({ fx }) {
  const { fixture, teams } = fx;
  const { days, hours, minutes, seconds } = useCountdown(fixture.date);

  const countdown = useMemo(() => {
    return `${days}d ${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [days, hours, minutes, seconds]);

  return (
    <Link
      to={`/match/${fixture.id}`}
      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5"
      title="Open match details"
    >
      <div className="flex items-center gap-2 min-w-0">
        <img src={teams.home.logo} className="w-5 h-5" alt="" />
        <span className="truncate">{teams.home.name}</span>
        <span className="text-muted">vs</span>
        <span className="truncate">{teams.away.name}</span>
        <img src={teams.away.logo} className="w-5 h-5 ml-1" alt="" />
      </div>

      <div className="text-right">
        <div className="text-xs text-muted">{formatClock(fixture.date)}</div>
        <div className="text-[11px] font-medium">{countdown}</div>
      </div>
    </Link>
  );
}
