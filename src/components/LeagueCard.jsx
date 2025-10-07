import { Link } from "react-router-dom";
import { favorites } from "../store/favorites";

export default function LeagueCard({ leagueObj }) {
  const league = leagueObj.league;
  const country = leagueObj.country;
  const currentSeason =
    leagueObj.seasons?.find((s) => s.current) ||
    leagueObj.seasons?.slice(-1)[0];

  const isFav = favorites.has(league.id);

  return (
    <div className="bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card hover:border-white/20 transition">
      <div className="flex items-center gap-3">
        <img src={league.logo} alt="" className="w-8 h-8 object-contain" />
        <div className="flex-1">
          <div className="font-semibold">{league.name}</div>
          <div className="text-xs text-muted flex items-center gap-2">
            {country?.flag && (
              <img
                src={country.flag}
                alt=""
                className="w-4 h-3 object-cover rounded"
              />
            )}
            <span>{country?.name}</span>
          </div>
        </div>
        <button
          onClick={() => {
            favorites.toggle(league.id);
            location.reload();
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

      {currentSeason && (
        <Link
          to={`/league/${league.id}/${currentSeason.year}`}
          className="mt-4 block text-center text-sm bg-white/10 hover:bg-white/20 rounded-md py-2"
        >
          View fixtures (season {currentSeason.year})
        </Link>
      )}
    </div>
  );
}
