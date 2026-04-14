import { Availability, CHANNELS, cities } from "../../data/mockData";

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatSchedule(av: Availability): string {
  const s = av.schedule;
  let dayPart = "Каждый день";
  if (s.type === "weekdays") {
    const days = (s.weekdays ?? [0, 1, 2, 3, 4, 5, 6]).slice().sort((a, b) => a - b);
    if (days.length === 7) dayPart = "Каждый день";
    else if (days.length === 5 && days.every((d) => d <= 4)) dayPart = "Пн–Пт";
    else if (days.length === 2 && days.includes(5) && days.includes(6)) dayPart = "Сб–Вс";
    else dayPart = days.map((d) => WEEKDAYS_SHORT[d]).join(", ");
  } else if (s.type === "dates") {
    if (s.dateRange?.from && s.dateRange?.to) {
      dayPart = `${formatDate(s.dateRange.from)}–${formatDate(s.dateRange.to)}`;
    } else {
      dayPart = "По датам";
    }
  }

  const timePart = s.allDay
    ? "весь день"
    : s.periods && s.periods.length > 0
      ? `${s.periods[0].from}–${s.periods[0].to}`
      : "весь день";

  return `${dayPart}, ${timePart}`;
}

function formatGeo(av: Availability): string {
  if (av.everywhere) return "Везде";
  if (!av.cities || av.cities.length === 0) return "Нигде";

  const enabledCityNames: string[] = [];
  let totalEnabledLocs = 0;
  let totalLocs = 0;

  for (const ca of av.cities) {
    const city = cities.find((c) => c.id === ca.cityId);
    if (!city) continue;
    const enabledLocs = ca.locations.filter((la) => la.enabled);
    if (enabledLocs.length === 0) continue;
    enabledCityNames.push(city.name);
    totalEnabledLocs += enabledLocs.length;
    totalLocs += city.locations.length;
  }

  if (enabledCityNames.length === 0) return "Нигде";
  if (enabledCityNames.length === 1) {
    return `${enabledCityNames[0]} (${totalEnabledLocs} ${plural(totalEnabledLocs, "точка", "точки", "точек")})`;
  }
  return `${enabledCityNames.length} ${plural(enabledCityNames.length, "город", "города", "городов")} • ${totalEnabledLocs} ${plural(totalEnabledLocs, "точка", "точки", "точек")}`;
}

function formatChannels(av: Availability): string {
  if (av.everywhere) return "Все каналы";
  // Determine which channels are enabled in at least one location
  const enabledChannels = new Set<string>();
  for (const ca of av.cities) {
    for (const la of ca.locations) {
      if (!la.enabled) continue;
      for (const ch of CHANNELS) {
        if (la.channels[ch.key]) enabledChannels.add(ch.key);
      }
    }
  }
  if (enabledChannels.size === 0) return "—";
  if (enabledChannels.size === CHANNELS.length) return "Все каналы";
  return CHANNELS.filter((c) => enabledChannels.has(c.key)).map((c) => c.shortLabel.toLowerCase()).join(", ");
}

export function formatAvailability(av: Availability): string {
  return [formatGeo(av), formatSchedule(av), formatChannels(av)].join(" • ");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
