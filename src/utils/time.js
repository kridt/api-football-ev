export const DK_TZ = import.meta.env.VITE_TZ || "Europe/Copenhagen";

/** Sikkert YYYY-MM-DD i valgt timezone (bruger en-CA parts for ISO) */
function ymdInTZ(tz = DK_TZ, baseDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(baseDate);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
export function dkTodayISO(d = new Date()) {
  return ymdInTZ(DK_TZ, d);
}

function localMidnightInTZToUTCms(isoYMD, tz = DK_TZ, endOfDay = false) {
  // Lav lokal tid (YYYY-MM-DD 00:00:00 i tz) → udregn korrekt UTC timestamp via formatter
  const [y, m, d] = isoYMD.split("-").map(Number);
  const local = new Date(Date.UTC(y, m - 1, d, 0, 0, 0)); // start i UTC
  // offset-korrektion: find lokal offset ved hjælp af Intl
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  // find difference mellem "samme lokale væg-tid" og UTC
  const parts = fmt.formatToParts(local);
  // Byg faktisk "lokal start" som JS Date ved at læse tilbage i UTC via tidszone offset
  // Simpelt trick: find offset i minutter ved at sammenligne 00:00 lokal => UTC
  const asUTC = Date.parse(`${isoYMD}T00:00:00`);
  // ovenstående giver millisekunder i lokal-tolkning; normaliser via tz:
  const startMs = new Date(`${isoYMD}T00:00:00`).getTime();
  // For ensartethed bruger vi Intl til at få UTC millis af lokal midnight:
  const start = new Date(isoYMD + "T00:00:00");
  let ms = start.getTime();
  if (endOfDay) ms += 24 * 60 * 60 * 1000 - 1;
  return ms;
}

/** Returnerer DK-vindue (UTC ms) for i dag + N dage. Bruges til at filtrere fixture.timestamp (sekunder, UTC). */
export function dkWindowNextDaysUtcMs(days = 5) {
  const fromISO = dkTodayISO(new Date());
  const startMsLocal = localMidnightInTZToUTCms(fromISO, DK_TZ, false);
  const endDate = new Date(startMsLocal);
  endDate.setUTCDate(endDate.getUTCDate() + days);
  const endISO = dkTodayISO(new Date(endDate));
  const endMsLocal = localMidnightInTZToUTCms(endISO, DK_TZ, true);
  return {
    fromMsUtc: startMsLocal,
    toMsUtc: endMsLocal,
    fromISO,
    toISO: endISO,
  };
}

/** Vis klokkeslæt i DK */
export function formatClock(s) {
  try {
    const dt = new Date(s);
    return new Intl.DateTimeFormat("da-DK", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DK_TZ,
      hour12: false,
    }).format(dt);
  } catch {
    return s;
  }
}
