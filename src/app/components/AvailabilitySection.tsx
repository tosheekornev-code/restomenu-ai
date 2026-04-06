import {
  Availability,
  ChannelAvailability,
  CHANNELS,
  cities,
  City,
} from "../data/mockData";
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  HelpCircle,
  Info,
} from "lucide-react";

function Toggle({
  checked,
  onChange,
  size = "sm",
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "xs";
  disabled?: boolean;
}) {
  const w = size === "xs" ? "w-7 h-4" : "w-9 h-5";
  const dot = size === "xs" ? "w-3 h-3 top-0.5" : "w-3.5 h-3.5 top-[3px]";
  const translate = size === "xs" ? "translate-x-3" : "translate-x-4";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex shrink-0 rounded-full transition-colors focus:outline-none ${w} ${
        checked ? "bg-green-500" : "bg-gray-300"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`${dot} absolute left-0.5 rounded-full bg-white shadow transition-transform ${
          checked ? translate : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ChannelBadges({ channels }: { channels: ChannelAvailability }) {
  const active = CHANNELS.filter((c) => channels[c.key]);
  const inactive = CHANNELS.filter((c) => !channels[c.key]);

  if (active.length === CHANNELS.length) {
    return (
      <span className="text-[11px] text-gray-500 italic">Все каналы</span>
    );
  }
  if (active.length === 0) {
    return <span className="text-[11px] text-red-400 italic">Недоступно</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((c) => (
        <span key={c.key} className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.color}`}>
          {c.shortLabel}
        </span>
      ))}
    </div>
  );
}

function ChannelToggles({
  channels,
  onChange,
  disabled,
}: {
  channels: ChannelAvailability;
  onChange: (ch: ChannelAvailability) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3 items-center">
      {CHANNELS.map((c) => (
        <div key={c.key} className="flex flex-col items-center gap-1">
          <Toggle
            size="xs"
            checked={channels[c.key]}
            onChange={(v) => onChange({ ...channels, [c.key]: v })}
            disabled={disabled}
          />
          <span className={`text-[9px] whitespace-nowrap ${channels[c.key] ? "text-gray-600" : "text-gray-300"}`}>
            {c.shortLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

// Summary: count enabled locations per channel across all cities
function getAvailabilitySummary(avail: Availability) {
  if (avail.everywhere) {
    const total = cities.reduce((s, c) => s + c.locations.length, 0);
    return { total, channels: Object.fromEntries(CHANNELS.map((c) => [c.key, total])) as Record<keyof ChannelAvailability, number> };
  }
  let total = 0;
  const chCount: Record<string, number> = {};
  CHANNELS.forEach((c) => (chCount[c.key] = 0));

  avail.cities.forEach((ca) => {
    ca.locations.forEach((la) => {
      if (!la.enabled) return;
      total++;
      CHANNELS.forEach((c) => {
        if (la.channels[c.key]) chCount[c.key]++;
      });
    });
  });

  return { total, channels: chCount as Record<keyof ChannelAvailability, number> };
}

interface AvailabilitySectionProps {
  availability: Availability;
  onChange: (a: Availability) => void;
  showInheritToggle?: boolean;
  inherited?: boolean;
  onInheritChange?: (v: boolean) => void;
  inheritedFromLabel?: string;
}

export function AvailabilitySection({
  availability,
  onChange,
  showInheritToggle,
  inherited,
  onInheritChange,
  inheritedFromLabel,
}: AvailabilitySectionProps) {
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>(
    Object.fromEntries(
      availability.cities.map((ca) => [ca.cityId, ca.expanded ?? false])
    )
  );
  const [search, setSearch] = useState("");

  const toggleCity = (cityId: string) =>
    setExpandedCities((prev) => ({ ...prev, [cityId]: !prev[cityId] }));

  const getCityAvail = (cityId: string) =>
    availability.cities.find((ca) => ca.cityId === cityId);

  const getLocationAvail = (cityId: string, locationId: string) =>
    getCityAvail(cityId)?.locations.find((la) => la.locationId === locationId);

  const updateLocationChannels = (
    cityId: string,
    locationId: string,
    channels: ChannelAvailability
  ) => {
    const updated = availability.cities.map((ca) => {
      if (ca.cityId !== cityId) return ca;
      return {
        ...ca,
        locations: ca.locations.map((la) =>
          la.locationId === locationId ? { ...la, channels } : la
        ),
      };
    });
    onChange({ ...availability, cities: updated });
  };

  const toggleLocationEnabled = (cityId: string, locationId: string, v: boolean) => {
    const newCities = availability.cities.map((ca) => {
      if (ca.cityId !== cityId) return ca;
      const existing = ca.locations.find((la) => la.locationId === locationId);
      const updatedLocs = existing
        ? ca.locations.map((la) =>
            la.locationId === locationId ? { ...la, enabled: v } : la
          )
        : [
            ...ca.locations,
            {
              locationId,
              enabled: v,
              channels: Object.fromEntries(CHANNELS.map((c) => [c.key, true])) as ChannelAvailability,
            },
          ];
      return { ...ca, locations: updatedLocs };
    });

    // If city not yet in list, add it
    const cityExists = availability.cities.find((ca) => ca.cityId === cityId);
    if (!cityExists) {
      onChange({
        ...availability,
        cities: [
          ...newCities,
          {
            cityId,
            locations: [
              {
                locationId,
                enabled: v,
                channels: Object.fromEntries(CHANNELS.map((c) => [c.key, true])) as ChannelAvailability,
              },
            ],
          },
        ],
      });
      return;
    }
    onChange({ ...availability, cities: newCities });
  };

  // Count enabled locations per city
  const getCityStats = (city: City) => {
    const ca = getCityAvail(city.id);
    if (!ca) return { enabled: 0, total: city.locations.length };
    const enabled = ca.locations.filter((la) => la.enabled).length;
    return { enabled, total: city.locations.length };
  };

  // Count channels active across enabled locations in city
  const getCityChanStats = (city: City, chanKey: keyof ChannelAvailability) => {
    const ca = getCityAvail(city.id);
    if (!ca) return { active: 0, total: city.locations.length };
    const enabled = ca.locations.filter((la) => la.enabled);
    const active = enabled.filter((la) => la.channels[chanKey]).length;
    return { active, total: enabled.length };
  };

  const isEverywhereChecked = availability.everywhere;

  const toggleEverywhere = (v: boolean) => {
    if (v) {
      onChange({
        ...availability,
        everywhere: true,
        cities: cities.map((city) => ({
          cityId: city.id,
          locations: city.locations.map((loc) => ({
            locationId: loc.id,
            enabled: true,
            channels: Object.fromEntries(CHANNELS.map((c) => [c.key, true])) as ChannelAvailability,
          })),
        })),
      });
    } else {
      onChange({ ...availability, everywhere: false });
    }
  };

  const filteredCities = cities.filter(
    (city) =>
      !search ||
      city.name.toLowerCase().includes(search.toLowerCase()) ||
      city.locations.some((loc) =>
        (loc.name + " " + loc.address).toLowerCase().includes(search.toLowerCase())
      )
  );

  const summary = getAvailabilitySummary(availability);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-[14px] font-semibold text-gray-800">Населённый пункт и точки</h3>
        <HelpCircle size={14} className="text-gray-400" />
      </div>

      {/* Inherit toggle */}
      {showInheritToggle && (
        <div
          className={`flex items-start gap-3 p-3 rounded-lg border ${inherited ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
        >
          <Toggle
            checked={inherited ?? false}
            onChange={(v) => onInheritChange?.(v)}
            size="sm"
          />
          <div>
            <div className="text-[13px] font-medium text-gray-800">
              Наследовать от категории
              {inheritedFromLabel && (
                <span className="ml-1 text-blue-600">«{inheritedFromLabel}»</span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              При изменении настроек категории — позиция обновится автоматически
            </div>
          </div>
        </div>
      )}

      {/* Summary badges */}
      {!inherited && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="text-gray-500">Активно в {summary.total} точках:</span>
          {CHANNELS.map((c) => (
            <span
              key={c.key}
              className={`px-2 py-0.5 rounded-full ${summary.channels[c.key] > 0 ? c.color : "bg-gray-100 text-gray-400"}`}
            >
              {c.shortLabel}: {summary.channels[c.key]}
            </span>
          ))}
        </div>
      )}

      {/* Content (disabled when inherited) */}
      <div className={inherited ? "opacity-50 pointer-events-none select-none" : ""}>
        {/* Channel legend */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-[11px] text-amber-800">
              <span className="font-semibold">Каналы заказа:</span>{" "}
              {CHANNELS.map((c, i) => (
                <span key={c.key}>
                  <span className={`inline-block px-1.5 py-0.5 rounded-full mr-0.5 ${c.color}`}>{c.shortLabel}</span>
                  — {c.description}
                  {i < CHANNELS.length - 1 ? "; " : ""}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Везде */}
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white mb-3">
          <input
            type="checkbox"
            checked={isEverywhereChecked}
            onChange={(e) => toggleEverywhere(e.target.checked)}
            className="w-4 h-4 rounded accent-orange-500"
            id="everywhere"
          />
          <label htmlFor="everywhere" className="text-[13px] font-medium text-gray-800 flex-1 cursor-pointer">
            Везде
          </label>
          {isEverywhereChecked && (
            <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Все города и точки
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск города или точки"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
          <div className="flex-1">Город / Точка</div>
          {CHANNELS.map((c) => (
            <div key={c.key} className="w-12 text-center" title={c.label}>
              {c.shortLabel}
            </div>
          ))}
          <div className="w-6" />
        </div>

        {/* City rows */}
        <div className="space-y-1">
          {filteredCities.map((city) => {
            const stats = getCityStats(city);
            const isExpanded = expandedCities[city.id] ?? false;

            const allCityEnabled = city.locations.every((loc) => {
              const la = getLocationAvail(city.id, loc.id);
              return la?.enabled ?? false;
            });
            const someCityEnabled = city.locations.some((loc) => {
              const la = getLocationAvail(city.id, loc.id);
              return la?.enabled ?? false;
            });

            return (
              <div key={city.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* City row */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allCityEnabled}
                    ref={(el) => {
                      if (el) el.indeterminate = !allCityEnabled && someCityEnabled;
                    }}
                    onChange={(e) => {
                      city.locations.forEach((loc) =>
                        toggleLocationEnabled(city.id, loc.id, e.target.checked)
                      );
                    }}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <button
                    className="flex items-center gap-1 flex-1 text-left"
                    onClick={() => toggleCity(city.id)}
                  >
                    <span className="text-[13px] font-semibold text-gray-800">{city.name}</span>
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}
                  </button>
                  <span className="text-[11px] text-gray-500">
                    {stats.enabled} из {stats.total}
                  </span>
                  {/* Per-channel city stats */}
                  {CHANNELS.map((c) => {
                    const s = getCityChanStats(city, c.key);
                    return (
                      <div key={c.key} className="w-12 text-center text-[10px] text-gray-500">
                        {s.active} из {s.total}
                      </div>
                    );
                  })}
                  <div className="w-6" />
                </div>

                {/* Location rows */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {city.locations.map((loc) => {
                      const la = getLocationAvail(city.id, loc.id);
                      const locEnabled = la?.enabled ?? false;
                      const locChannels = la?.channels ?? {
                        inHallWaiter: false,
                        inHallEmenu: false,
                        preorder: false,
                        delivery: false,
                        pickup: false,
                      };

                      return (
                        <div
                          key={loc.id}
                          className={`flex items-center gap-2 px-3 py-2 transition-colors ${locEnabled ? "bg-white" : "bg-gray-50 opacity-60"}`}
                        >
                          <div className="w-4" />
                          <input
                            type="checkbox"
                            checked={locEnabled}
                            onChange={(e) =>
                              toggleLocationEnabled(city.id, loc.id, e.target.checked)
                            }
                            className="w-4 h-4 rounded accent-orange-500"
                          />
                          <div className="flex-1">
                            <div className="text-[12px] font-medium text-gray-700">{loc.name}</div>
                            <div className="text-[10px] text-gray-400">{loc.address}</div>
                          </div>
                          {/* Per-channel toggles */}
                          {CHANNELS.map((c) => (
                            <div key={c.key} className="w-12 flex justify-center">
                              <Toggle
                                size="xs"
                                checked={locEnabled && locChannels[c.key]}
                                onChange={(v) =>
                                  updateLocationChannels(city.id, loc.id, {
                                    ...locChannels,
                                    [c.key]: v,
                                  })
                                }
                                disabled={!locEnabled}
                              />
                            </div>
                          ))}
                          <div className="w-6" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ChannelBadges };