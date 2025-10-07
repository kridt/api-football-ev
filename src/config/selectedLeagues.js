// src/config/selectedLeagues.js
// Kuraterede lister, så forsiden kan hente kampe fra de rigtige turneringer.
// Redigér roligt nedenfor – alt andet i app'en kan blive som det er.

export const DENMARK_LEAGUES = [
  // Danmark (mænd)
  119, // Superliga
  120, // 1. Division
  122, // 2. Division
  862, // 3. Division
  121, // DBU Pokalen
  // Danmark (kvinder)
  1419, // Kvindeliga
];

// 20 største/lækreste klub-ligaer globalt (mænd)
export const CLUB_TOP20 = [
  39, // Premier League (England)
  140, // La Liga (Spain)
  135, // Serie A (Italy)
  78, // Bundesliga (Germany)
  61, // Ligue 1 (France)
  88, // Eredivisie (Netherlands)
  94, // Primeira Liga (Portugal)
  144, // Belgian Pro League
  203, // Süper Lig (Turkey)
  179, // Scottish Premiership
  207, // Swiss Super League
  218, // Austrian Bundesliga
  235, // Russian Premier League
  236, // Ukrainian Premier League
  71, // Brazil Serie A
  128, // Argentina Liga Profesional
  253, // MLS (USA)
  262, // Liga MX (Mexico)
  307, // Saudi Pro League
  197, // Greece Super League 1
];

// Landskampe (mænd og kvinder, Europa/Amerika + globale)
export const NATIONAL_TEAM_COMPETITIONS = [
  10, // Friendlies (World)
  22, // CONCACAF Gold Cup (Nord/Mellemamerika)
  858, // CONCACAF Gold Cup Qualification
  6, // Africa Cup of Nations (global konf. – ofte relevant i landskampsvinduer)
  // Kvinder – populære UEFA-landsholdsturneringer:
  1083, // UEFA Women's Euro Qualification
  1040, // UEFA Nations League Women
];

// Kvinde-klubber vi også gerne vil følge (ønsket tidligere)
export const WOMEN_CLUB_COMPETITIONS = [
  525, // UEFA Women's Champions League
];

// Kombineret liste til forsiden (unikke ID'er)
export const HOME_LEAGUES = Array.from(
  new Set([
    ...DENMARK_LEAGUES,
    ...CLUB_TOP20,
    ...NATIONAL_TEAM_COMPETITIONS,
    ...WOMEN_CLUB_COMPETITIONS,
  ])
);

// Hjælpe-eksport med lidt labels hvis du vil vise navne statisk et sted
export const LABELS = {
  119: "Superliga (DK)",
  120: "1. Division (DK)",
  122: "2. Division (DK)",
  862: "3. Division (DK)",
  121: "DBU Pokalen (DK)",
  1419: "Kvindeliga (DK)",
  39: "Premier League",
  140: "La Liga",
  135: "Serie A",
  78: "Bundesliga",
  61: "Ligue 1",
  88: "Eredivisie",
  94: "Primeira Liga",
  144: "Belgian Pro League",
  203: "Süper Lig",
  179: "Scottish Premiership",
  207: "Swiss Super League",
  218: "Austrian Bundesliga",
  235: "Russian Premier League",
  236: "Ukrainian Premier League",
  71: "Brasileirão Série A",
  128: "Liga Profesional (ARG)",
  253: "MLS",
  262: "Liga MX",
  307: "Saudi Pro League",
  197: "Super League 1 (GRE)",
  10: "Friendlies (World)",
  22: "CONCACAF Gold Cup",
  858: "CONCACAF Gold Cup Qualification",
  6: "Africa Cup of Nations",
  1083: "UEFA Women's Euro Qual.",
  1040: "UEFA Nations League Women",
  525: "UEFA Women's Champions League",
};
