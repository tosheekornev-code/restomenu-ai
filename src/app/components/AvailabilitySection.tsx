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
  ChevronUp,
  Search,
  HelpCircle,
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

function GreenCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
}) {
  const isPartial = !checked && indeterminate;
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? "bg-green-500 border-green-500"
          : isPartial
            ? "bg-green-500 border-green-500"
            : "bg-white border-gray-300 hover:border-gray-400"
      }`}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {isPartial && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="2" y="4.25" width="6" height="1.5" rx="0.75" fill="white" />
        </svg>
      )}
    </button>
  );
}

function ChannelBadges({ channels }: { channels: ChannelAvailability }) {
  const active = CHANNELS.filter((c) => channels[c.key]);
  if (active.length === CHANNELS.length) {
    return <span className="text-[11px] text-gray-500 italic">Все каналы</span>;
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

  const getCityStats = (city: City) => {
    const ca = getCityAvail(city.id);
    if (!ca) return { enabled: 0, total: city.locations.length };
    const enabled = ca.locations.filter((la) => la.enabled).length;
    return { enabled, total: city.locations.length };
  };

  const getCityChanStats = (city: City, chanKey: keyof ChannelAvailability) => {
    const ca = getCityAvail(city.id);
    if (!ca) return { active: 0, total: city.locations.length };
    const enabledLocs = ca.locations.filter((la) => la.enabled);
    const active = enabledLocs.filter((la) => la.channels[chanKey]).length;
    return { active, total: city.locations.length };
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

  return (
    <div className="space-y-4">
      {/* Header + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-gray-800">Населённый пункт и точки</h3>
          <HelpCircle size={15} className="text-gray-400" />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-300 w-48 bg-gray-50"
          />
        </div>
      </div>

      {/* Inherit toggle */}
      {showInheritToggle && (
        <div
          className={`flex items-start gap-3 p-3 rounded-2xl border ${inherited ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
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

      {/* Content (disabled when inherited) */}
      <div className={inherited ? "opacity-50 pointer-events-none select-none" : ""}>
        {/* Table */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center px-4 py-3 border-b border-gray-100">
            <div className="flex-1" />
            {CHANNELS.map((c) => (
              <div key={c.key} className="w-[90px] text-center text-[13px] text-gray-500 font-medium">
                {c.shortLabel}
              </div>
            ))}
          </div>

          {/* Везде row */}
          <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-1">
              <GreenCheckbox checked={isEverywhereChecked} onChange={toggleEverywhere} />
              <span className="text-[14px] font-semibold text-gray-800">Везде</span>
            </div>
            {CHANNELS.map((c) => (
              <div key={c.key} className="w-[90px]" />
            ))}
          </div>

          {/* Cities */}
          {filteredCities.map((city, cityIdx) => {
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
              <div key={city.id}>
                {/* City row */}
                <div
                  className={`flex items-center px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors ${
                    cityIdx < filteredCities.length - 1 || isExpanded ? "border-b border-gray-100" : ""
                  }`}
                  onClick={() => toggleCity(city.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <GreenCheckbox
                      checked={allCityEnabled}
                      indeterminate={someCityEnabled}
                      onChange={(v) => {
                        city.locations.forEach((loc) =>
                          toggleLocationEnabled(city.id, loc.id, v)
                        );
                      }}
                    />
                    <span className="text-[14px] font-semibold text-gray-800">{city.name}</span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                  {/* Per-channel city stats */}
                  {CHANNELS.map((c) => {
                    const s = getCityChanStats(city, c.key);
                    return (
                      <div key={c.key} className="w-[90px] text-center text-[12px] text-gray-400">
                        {s.active} из {s.total}
                      </div>
                    );
                  })}
                </div>

                {/* Location rows */}
                {isExpanded && (
                  <div>
                    {city.locations.map((loc, locIdx) => {
                      const la = getLocationAvail(city.id, loc.id);
                      const locEnabled = la?.enabled ?? false;
                      const locChannels = la?.channels ?? {
                        dineIn: false,
                        preorder: false,
                        delivery: false,
                        pickup: false,
                      };

                      return (
                        <div
                          key={loc.id}
                          className={`flex items-center pl-8 pr-4 py-3 transition-colors ${
                            locIdx < city.locations.length - 1 || cityIdx < filteredCities.length - 1
                              ? "border-b border-gray-100"
                              : ""
                          } ${locEnabled ? "bg-white" : "bg-white"}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <GreenCheckbox
                              checked={locEnabled}
                              onChange={(v) => toggleLocationEnabled(city.id, loc.id, v)}
                            />
                            <span className={`text-[13px] truncate ${locEnabled ? "text-gray-700" : "text-gray-400"}`}>
                              {loc.name}, {loc.address}
                            </span>
                          </div>
                          {CHANNELS.map((c) => (
                            <div key={c.key} className="w-[90px] flex justify-center">
                              <Toggle
                                size="sm"
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
