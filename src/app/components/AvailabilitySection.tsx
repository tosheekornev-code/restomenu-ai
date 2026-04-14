import { useMemo, useState } from "react";
import {
  Search, Clock, MapPin, Sparkles, Check, PenLine, Undo2, Flag,
} from "lucide-react";
import {
  Availability, ChannelAvailability, CHANNELS, cities, City, TimeSchedule,
} from "../data/mockData";
import { Switch } from "@/components/ui/switch";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { ConfirmDialog } from "./shared/ConfirmDialog";
import { toast } from "./shared/Toast";
import { formatAvailability } from "./shared/formatAvailability";
import { ChannelIcon } from "./shared/ChannelIcon";

interface AvailabilitySectionProps {
  availability: Availability;
  onChange: (a: Availability) => void;
  // Inheritance
  showInheritToggle?: boolean;
  inherited?: boolean;
  onInheritChange?: (v: boolean) => void;
  inheritedFromLabel?: string;       // e.g. "категории «Пицца»" or "позиции «Маргарита»"
  inheritedAvailability?: Availability;
  // Schedule (only shown for category & position)
  showSchedule?: boolean;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// ─── Default builders ────────────────────────────────────────────────────────
function buildEverywhere(schedule: TimeSchedule): Availability {
  return {
    everywhere: true,
    schedule,
    cities: cities.map((city) => ({
      cityId: city.id,
      locations: city.locations.map((loc) => ({
        locationId: loc.id,
        enabled: true,
        channels: Object.fromEntries(CHANNELS.map((c) => [c.key, true])) as ChannelAvailability,
      })),
    })),
  };
}

function buildEmpty(schedule: TimeSchedule): Availability {
  return {
    everywhere: false,
    schedule,
    cities: cities.map((city) => ({
      cityId: city.id,
      locations: city.locations.map((loc) => ({
        locationId: loc.id,
        enabled: false,
        channels: Object.fromEntries(CHANNELS.map((c) => [c.key, false])) as ChannelAvailability,
      })),
    })),
  };
}

// Detect if availability matches a "fully everywhere" state
function isEverywhere(av: Availability): boolean {
  if (!av.everywhere) {
    // Also detect implicit everywhere
    return cities.every((city) => {
      const ca = av.cities.find((c) => c.cityId === city.id);
      if (!ca) return false;
      return city.locations.every((loc) => {
        const la = ca.locations.find((l) => l.locationId === loc.id);
        return la?.enabled && CHANNELS.every((ch) => la.channels[ch.key]);
      });
    });
  }
  return true;
}

// ─── Main component ──────────────────────────────────────────────────────────
export function AvailabilitySection({
  availability,
  onChange,
  showInheritToggle,
  inherited,
  onInheritChange,
  inheritedFromLabel,
  inheritedAvailability,
  showSchedule,
}: AvailabilitySectionProps) {
  // ── Inherited (read-only) view ─────────────────────────────────────────────
  if (showInheritToggle && inherited) {
    const previewAv = inheritedAvailability ?? availability;
    return (
      <div className="space-y-4">
        <InheritedView
          availability={previewAv}
          fromLabel={inheritedFromLabel}
          onOverride={() => onInheritChange?.(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {showInheritToggle && (
        <button
          onClick={() => onInheritChange?.(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Undo2 size={12} /> Вернуть наследование от {inheritedFromLabel ?? "родителя"}
        </button>
      )}

      {showSchedule && (
        <ScheduleEditor
          schedule={availability.schedule}
          onChange={(s) => onChange({ ...availability, schedule: s })}
        />
      )}

      <GeoEditor availability={availability} onChange={onChange} />
    </div>
  );
}

// ─── Inherited (read-only) view ──────────────────────────────────────────────
function InheritedView({ availability, fromLabel, onOverride }: {
  availability: Availability;
  fromLabel?: string;
  onOverride: () => void;
}) {
  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <Sparkles size={15} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-gray-900">Наследуется</span>
            {fromLabel && <span className="text-[12px] text-blue-700">от {fromLabel}</span>}
          </div>
          <div className="text-[12px] text-gray-600 mt-1.5 leading-relaxed">
            {formatAvailability(availability)}
          </div>
          <div className="text-[11px] text-gray-400 mt-2">
            При изменении настроек {fromLabel ?? "родителя"} — обновится автоматически
          </div>
        </div>
        <button
          onClick={onOverride}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-orange-700 bg-white border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors shrink-0"
        >
          <PenLine size={12} /> Переопределить
        </button>
      </div>
    </div>
  );
}

// ─── Schedule editor ─────────────────────────────────────────────────────────
function ScheduleEditor({ schedule, onChange }: {
  schedule: TimeSchedule;
  onChange: (s: TimeSchedule) => void;
}) {
  const period = schedule.periods?.[0] ?? { from: "10:00", to: "22:00" };
  const weekdays = schedule.weekdays ?? [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-gray-500" />
        <h3 className="text-[13px] font-semibold text-gray-800">Когда доступно</h3>
      </div>

      <Tabs
        value={schedule.type}
        onValueChange={(v) => onChange({ ...schedule, type: v as TimeSchedule["type"] })}
        className="mb-4"
      >
        <TabsList className="rounded-lg">
          <TabsTrigger value="daily" className="text-[12px] rounded-md">Ежедневно</TabsTrigger>
          <TabsTrigger value="weekdays" className="text-[12px] rounded-md">По дням недели</TabsTrigger>
          <TabsTrigger value="dates" className="text-[12px] rounded-md">По датам</TabsTrigger>
        </TabsList>
      </Tabs>

      {schedule.type === "weekdays" && (
        <ToggleGroup
          type="multiple"
          value={weekdays.map(String)}
          onValueChange={(v) => onChange({ ...schedule, weekdays: v.map(Number).sort((a, b) => a - b) })}
          variant="outline"
          className="justify-start gap-1 mb-4"
        >
          {WEEKDAYS.map((day, idx) => (
            <ToggleGroupItem
              key={idx}
              value={String(idx)}
              className="h-9 w-10 text-[12px] font-medium data-[state=on]:bg-orange-50 data-[state=on]:text-orange-700 data-[state=on]:border-orange-300"
            >
              {day}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {schedule.type === "dates" && (
        <div className="flex items-center gap-2 mb-4">
          <Label className="text-[12px] text-gray-600">С</Label>
          <Input
            type="date"
            value={schedule.dateRange?.from ?? ""}
            onChange={(e) => onChange({
              ...schedule,
              dateRange: { from: e.target.value, to: schedule.dateRange?.to ?? e.target.value },
            })}
            className="w-40 text-[12px] h-8"
          />
          <Label className="text-[12px] text-gray-600 ml-2">по</Label>
          <Input
            type="date"
            value={schedule.dateRange?.to ?? ""}
            onChange={(e) => onChange({
              ...schedule,
              dateRange: { from: schedule.dateRange?.from ?? e.target.value, to: e.target.value },
            })}
            className="w-40 text-[12px] h-8"
          />
        </div>
      )}

      <RadioGroup
        value={schedule.allDay ? "allday" : "period"}
        onValueChange={(v) =>
          onChange({
            ...schedule,
            allDay: v === "allday",
            periods: v === "allday" ? undefined : [period],
          })
        }
        className="flex items-center gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="allday" id="sched-allday" className="border-gray-300" />
          <Label htmlFor="sched-allday" className="text-[13px] font-normal cursor-pointer">Весь день</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="period" id="sched-period" className="border-gray-300" />
          <Label htmlFor="sched-period" className="text-[13px] font-normal cursor-pointer">Задать период</Label>
        </div>
        {!schedule.allDay && (
          <div className="flex items-center gap-2 ml-2">
            <Input
              type="time"
              value={period.from}
              onChange={(e) => onChange({ ...schedule, periods: [{ ...period, from: e.target.value }] })}
              className="w-24 text-[12px] h-8"
            />
            <span className="text-gray-400 text-[12px]">—</span>
            <Input
              type="time"
              value={period.to}
              onChange={(e) => onChange({ ...schedule, periods: [{ ...period, to: e.target.value }] })}
              className="w-24 text-[12px] h-8"
            />
          </div>
        )}
      </RadioGroup>
    </div>
  );
}

// ─── Geo editor (presets + matrix) ───────────────────────────────────────────
type Preset = "everywhere" | "custom";

function GeoEditor({ availability, onChange }: {
  availability: Availability;
  onChange: (a: Availability) => void;
}) {
  const [search, setSearch] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const everywhereActive = isEverywhere(availability);
  const preset: Preset = everywhereActive ? "everywhere" : "custom";

  const filteredCities = useMemo(() => {
    if (!search) return cities;
    const q = search.toLowerCase();
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(q) ||
        city.locations.some((loc) => (loc.name + " " + loc.address).toLowerCase().includes(q))
    );
  }, [search]);

  // ── Helpers for state mutation ────────────────────────────────────────────
  const updateLocation = (
    cityId: string,
    locationId: string,
    patch: Partial<{ enabled: boolean; channels: ChannelAvailability }>
  ) => {
    let newCities = availability.cities.map((ca) => {
      if (ca.cityId !== cityId) return ca;
      const exists = ca.locations.some((la) => la.locationId === locationId);
      const locs = exists
        ? ca.locations.map((la) => (la.locationId === locationId ? { ...la, ...patch } : la))
        : [
            ...ca.locations,
            {
              locationId,
              enabled: patch.enabled ?? false,
              channels: patch.channels ?? defaultChannels(true),
            },
          ];
      return { ...ca, locations: locs };
    });
    if (!availability.cities.find((c) => c.cityId === cityId)) {
      newCities = [
        ...newCities,
        {
          cityId,
          locations: [
            {
              locationId,
              enabled: patch.enabled ?? false,
              channels: patch.channels ?? defaultChannels(true),
            },
          ],
        },
      ];
    }
    onChange({ ...availability, everywhere: false, cities: newCities });
  };

  const setLocationEnabled = (cityId: string, locationId: string, enabled: boolean) => {
    // When enabling, ensure all channels are on by default if not set
    const ca = availability.cities.find((c) => c.cityId === cityId);
    const la = ca?.locations.find((l) => l.locationId === locationId);
    const channels = la?.channels ?? defaultChannels(true);
    updateLocation(cityId, locationId, { enabled, channels: enabled ? channels : la?.channels ?? defaultChannels(false) });
  };

  const setLocationChannel = (
    cityId: string,
    locationId: string,
    channelKey: keyof ChannelAvailability,
    value: boolean
  ) => {
    const ca = availability.cities.find((c) => c.cityId === cityId);
    const la = ca?.locations.find((l) => l.locationId === locationId);
    const channels = { ...(la?.channels ?? defaultChannels(false)), [channelKey]: value };
    // If toggling on while location was off — also enable it
    const enabled = la?.enabled || value;
    updateLocation(cityId, locationId, { channels, enabled });
  };

  const setCityAllLocations = (city: City, enabled: boolean) => {
    let newCities = [...availability.cities];
    const idx = newCities.findIndex((c) => c.cityId === city.id);
    const locs = city.locations.map((loc) => ({
      locationId: loc.id,
      enabled,
      channels: defaultChannels(enabled),
    }));
    if (idx >= 0) {
      newCities[idx] = { ...newCities[idx], locations: locs };
    } else {
      newCities.push({ cityId: city.id, locations: locs });
    }
    onChange({ ...availability, everywhere: false, cities: newCities });
  };

  const setChannelEverywhere = (channelKey: keyof ChannelAvailability, value: boolean) => {
    const newCities = cities.map((city) => {
      const ca = availability.cities.find((c) => c.cityId === city.id);
      return {
        cityId: city.id,
        locations: city.locations.map((loc) => {
          const la = ca?.locations.find((l) => l.locationId === loc.id);
          const currentChannels = la?.channels ?? defaultChannels(false);
          const newChannels = { ...currentChannels, [channelKey]: value };
          // Enable location if turning on a channel; keep enabled state otherwise
          const enabled = value ? true : la?.enabled ?? false;
          return { locationId: loc.id, enabled, channels: newChannels };
        }),
      };
    });
    onChange({ ...availability, everywhere: false, cities: newCities });
  };

  const setOnlyChannel = (channelKey: keyof ChannelAvailability) => {
    const newCities = cities.map((city) => ({
      cityId: city.id,
      locations: city.locations.map((loc) => ({
        locationId: loc.id,
        enabled: true,
        channels: Object.fromEntries(
          CHANNELS.map((c) => [c.key, c.key === channelKey])
        ) as ChannelAvailability,
      })),
    }));
    onChange({ ...availability, everywhere: false, cities: newCities });
    toast(`Только ${CHANNELS.find((c) => c.key === channelKey)?.shortLabel.toLowerCase()} во всех точках`, "success");
  };

  const applyEverywhere = () => {
    onChange(buildEverywhere(availability.schedule));
    toast("Доступно везде", "success");
  };

  const applyEverywhereWithConfirm = () => {
    if (everywhereActive) return;
    const hasCustomData = availability.cities.some((ca) =>
      ca.locations.some((la) => la.enabled || Object.values(la.channels).some(Boolean))
    );
    if (hasCustomData) {
      setConfirmReset(true);
    } else {
      applyEverywhere();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 rounded-2xl">
      {/* Header with presets */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={14} className="text-gray-500" />
          <h3 className="text-[13px] font-semibold text-gray-800">Где доступно</h3>
        </div>

        {/* Mode switcher (Везде / Только выбранные) */}
        <Tabs
          value={preset}
          onValueChange={(v) => {
            if (v === "everywhere") applyEverywhereWithConfirm();
            else if (everywhereActive) onChange(buildEmpty(availability.schedule));
          }}
          className="mb-3"
        >
          <TabsList className="rounded-lg">
            <TabsTrigger value="everywhere" className="text-[12px] rounded-md">Везде</TabsTrigger>
            <TabsTrigger value="custom" className="text-[12px] rounded-md">Только выбранные</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Quick channel presets (dashed) */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-gray-400 self-center mr-1">Быстро:</span>
          {CHANNELS.map((ch) => (
            <PresetChip
              key={ch.key}
              label={`Только ${ch.shortLabel.toLowerCase()}`}
              onClick={() => setOnlyChannel(ch.key)}
            />
          ))}
        </div>
      </div>

      {/* Matrix (only when not "everywhere") */}
      {preset === "custom" && (
        <div className="p-5">
          {/* Search */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск города или точки..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 text-[12px] h-9 rounded-xl bg-gray-50/50"
            />
          </div>

          {/* Matrix table */}
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-[12px] border-collapse min-w-[600px]">
              <colgroup>
                <col />
                {CHANNELS.map((c) => (
                  <col key={c.key} className="w-[80px]" />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-gray-500">Точка</th>
                  {CHANNELS.map((ch) => {
                    // Master state for column
                    const allOn = filteredCities.every((city) =>
                      city.locations.every((loc) => {
                        const la = availability.cities
                          .find((c) => c.cityId === city.id)
                          ?.locations.find((l) => l.locationId === loc.id);
                        return la?.enabled && la.channels[ch.key];
                      })
                    );
                    return (
                      <th key={ch.key} className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-medium text-gray-700">{ch.shortLabel}</span>
                          <Checkbox
                            checked={allOn}
                            onCheckedChange={(v) => setChannelEverywhere(ch.key, v === true)}
                          />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredCities.map((city, cityIdx) => (
                  <CityGroup
                    key={city.id}
                    city={city}
                    availability={availability}
                    isFirst={cityIdx === 0}
                    onSetAll={(enabled) => setCityAllLocations(city, enabled)}
                    onSetLocationEnabled={(locId, en) => setLocationEnabled(city.id, locId, en)}
                    onSetLocationChannel={(locId, ch, v) => setLocationChannel(city.id, locId, ch, v)}
                  />
                ))}
                {filteredCities.length === 0 && (
                  <tr>
                    <td colSpan={CHANNELS.length + 1} className="px-4 py-8 text-center text-[12px] text-gray-400">
                      Ничего не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compact "everywhere" hint */}
      {preset === "everywhere" && (
        <div className="px-5 py-6 text-center">
          <div className="inline-flex items-center gap-2 text-[12px] text-gray-500">
            <Check size={14} className="text-green-600" />
            Доступно во всех городах и точках, во всех каналах
          </div>
        </div>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Сбросить детальные настройки?"
          description="Все ваши изменения по точкам и каналам будут заменены на «везде»."
          confirmLabel="Сбросить"
          cancelLabel="Отмена"
          danger
          onConfirm={() => {
            setConfirmReset(false);
            applyEverywhere();
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}

// ─── Preset chip (dashed quick action) ───────────────────────────────────────
function PresetChip({ label, onClick }: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-[11px] font-medium rounded-lg border border-dashed border-gray-300 text-gray-600 bg-white hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50/50 transition-colors"
    >
      {label}
    </button>
  );
}

// ─── City group with locations ───────────────────────────────────────────────
function CityGroup({ city, availability, isFirst, onSetAll, onSetLocationEnabled, onSetLocationChannel }: {
  city: City;
  availability: Availability;
  isFirst: boolean;
  onSetAll: (enabled: boolean) => void;
  onSetLocationEnabled: (locId: string, enabled: boolean) => void;
  onSetLocationChannel: (locId: string, ch: keyof ChannelAvailability, v: boolean) => void;
}) {
  const ca = availability.cities.find((c) => c.cityId === city.id);
  const enabledCount = city.locations.filter((loc) => {
    const la = ca?.locations.find((l) => l.locationId === loc.id);
    return la?.enabled;
  }).length;
  const total = city.locations.length;
  const allEnabled = enabledCount === total;
  const noneEnabled = enabledCount === 0;
  const cityCheck: boolean | "indeterminate" = allEnabled ? true : noneEnabled ? false : "indeterminate";

  return (
    <>
      {/* City group header */}
      <tr className={`bg-gray-50/60 ${isFirst ? "" : "border-t border-gray-200"}`}>
        <td className="px-4 py-2">
          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={cityCheck}
              onCheckedChange={(v) => onSetAll(v === true)}
            />
            <Flag size={11} className="text-blue-500" />
            <span className="text-[12px] font-semibold text-gray-700">{city.name}</span>
            <span className="text-[10px] text-gray-400">{enabledCount} из {total}</span>
          </div>
        </td>
        {CHANNELS.map((ch) => (
          <td key={ch.key} className="px-2 py-2 text-center" />
        ))}
      </tr>

      {/* Location rows */}
      {city.locations.map((loc) => {
        const la = ca?.locations.find((l) => l.locationId === loc.id);
        const locEnabled = la?.enabled ?? false;
        const channels = la?.channels ?? defaultChannels(false);

        return (
          <tr key={loc.id} className="border-t border-gray-100">
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2.5 pl-5">
                <Checkbox
                  checked={locEnabled}
                  onCheckedChange={(v) => onSetLocationEnabled(loc.id, v === true)}
                />
                <div className="min-w-0">
                  <div className={`text-[12px] truncate ${locEnabled ? "text-gray-800" : "text-gray-400"}`}>
                    {loc.name}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">{loc.address}</div>
                </div>
              </div>
            </td>
            {CHANNELS.map((ch) => (
              <td key={ch.key} className="px-2 py-2 text-center">
                {locEnabled ? (
                  <Switch
                    size="sm"
                    checked={channels[ch.key]}
                    onCheckedChange={(v) => onSetLocationChannel(loc.id, ch.key, v)}
                  />
                ) : (
                  <span className="text-[11px] text-gray-300">—</span>
                )}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function defaultChannels(value: boolean): ChannelAvailability {
  return Object.fromEntries(CHANNELS.map((c) => [c.key, value])) as ChannelAvailability;
}
