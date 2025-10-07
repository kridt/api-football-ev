import MiniFixtureRow from "./MiniFixtureRow";

export default function FavoriteLeagueBlock({ leagueMeta, fixtures }) {
  if (!leagueMeta) return null;
  const { name, logo, country, season } = leagueMeta;

  return (
    <div className="bg-ink-2 border border-white/10 rounded-xl2 p-4 shadow-card">
      <div className="flex items-center gap-3 mb-3">
        {logo && <img src={logo} alt="" className="w-7 h-7 object-contain" />}
        <div className="flex-1">
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-muted flex items-center gap-2">
            {country?.flag && (
              <img
                src={country.flag}
                alt=""
                className="w-4 h-3 object-cover rounded"
              />
            )}
            <span>{country?.name || "—"}</span>
            {season && <span>· Season {season}</span>}
          </div>
        </div>
      </div>

      {fixtures.length === 0 ? (
        <div className="text-sm text-muted">No fixtures in window.</div>
      ) : (
        <div className="divide-y divide-white/10">
          {fixtures.map((fx) => (
            <MiniFixtureRow key={fx.fixture.id} fx={fx} />
          ))}
        </div>
      )}
    </div>
  );
}
