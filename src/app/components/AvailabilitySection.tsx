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
import { Switch } from "@/components/ui/switch";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./ui/table";
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "./ui/tooltip";

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
          <h3 className="text-[15px] font-semibold text-foreground">Населённый пункт и точки</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle size={15} className="text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Выберите города и точки, где доступна категория</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 text-[13px] w-48 rounded-2xl bg-muted/50"
          />
        </div>
      </div>

      {/* Inherit toggle */}
      {showInheritToggle && (
        <div
          className={`flex items-start gap-3 p-3 rounded-2xl border ${inherited ? "bg-blue-50 border-blue-200" : "bg-muted border-border"}`}
        >
          <Switch
            checked={inherited ?? false}
            onCheckedChange={(v) => onInheritChange?.(v)}
          />
          <div>
            <div className="text-[13px] font-medium text-foreground">
              Наследовать от категории
              {inheritedFromLabel && (
                <span className="ml-1 text-blue-600">«{inheritedFromLabel}»</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              При изменении настроек категории — позиция обновится автоматически
            </div>
          </div>
        </div>
      )}

      {/* Content (disabled when inherited) */}
      <div className={inherited ? "opacity-50 pointer-events-none select-none" : ""}>
        <div className="border border-border rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4" />
                {CHANNELS.map((c) => (
                  <TableHead key={c.key} className="w-[90px] text-center text-[13px] font-medium">
                    {c.shortLabel}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Везде row */}
              <TableRow>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isEverywhereChecked}
                      onCheckedChange={(v) => toggleEverywhere(v === true)}
                    />
                    <span className="text-[14px] font-semibold text-foreground">Везде</span>
                  </div>
                </TableCell>
                {CHANNELS.map((c) => (
                  <TableCell key={c.key} className="w-[90px]" />
                ))}
              </TableRow>

              {/* Cities */}
              {filteredCities.map((city) => {
                const isExpanded = expandedCities[city.id] ?? false;

                const allCityEnabled = city.locations.every((loc) => {
                  const la = getLocationAvail(city.id, loc.id);
                  return la?.enabled ?? false;
                });
                const someCityEnabled = city.locations.some((loc) => {
                  const la = getLocationAvail(city.id, loc.id);
                  return la?.enabled ?? false;
                });

                const cityCheckState: boolean | "indeterminate" = allCityEnabled
                  ? true
                  : someCityEnabled
                    ? "indeterminate"
                    : false;

                return (
                  <TableRow key={city.id} className="[&>td]:p-0">
                    <TableCell colSpan={5} className="!p-0">
                      {/* City row */}
                      <div
                        className="flex items-center px-4 py-3.5 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleCity(city.id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={cityCheckState}
                            onCheckedChange={(v) => {
                              const enable = v === true;
                              city.locations.forEach((loc) =>
                                toggleLocationEnabled(city.id, loc.id, enable)
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-[14px] font-semibold text-foreground">{city.name}</span>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-muted-foreground" />
                          ) : (
                            <ChevronDown size={16} className="text-muted-foreground" />
                          )}
                        </div>
                        {CHANNELS.map((c) => {
                          const s = getCityChanStats(city, c.key);
                          return (
                            <div key={c.key} className="w-[90px] text-center text-[12px] text-muted-foreground">
                              {s.active} из {s.total}
                            </div>
                          );
                        })}
                      </div>

                      {/* Location rows */}
                      {isExpanded && city.locations.map((loc) => {
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
                            className="flex items-center pl-10 pr-4 py-3 border-t border-border"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Checkbox
                                checked={locEnabled}
                                onCheckedChange={(v) => toggleLocationEnabled(city.id, loc.id, v === true)}
                              />
                              <span className={`text-[13px] truncate ${locEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                                {loc.name}, {loc.address}
                              </span>
                            </div>
                            {CHANNELS.map((c) => (
                              <div key={c.key} className="w-[90px] flex justify-center">
                                <Switch
                                  size="sm"
                                  checked={locEnabled && locChannels[c.key]}
                                  onCheckedChange={(v) =>
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
