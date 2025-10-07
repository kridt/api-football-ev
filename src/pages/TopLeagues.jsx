import SelectedLeagueGroup from "../components/SelectedLeagueGroup";
import { HOME_LEAGUES } from "../config/selectedLeagues";
import { FRONT_RANGE_DAYS } from "../config/leagueWhitelist";

export default function TopLeagues() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Selected Leagues</h1>
        <p className="text-sm text-muted">
          Showing fixtures from the <b>current season only</b> within the next{" "}
          {FRONT_RANGE_DAYS} days.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {HOME_LEAGUES.map((id) => (
          <SelectedLeagueGroup key={id} leagueId={id} />
        ))}
      </div>
    </div>
  );
}
