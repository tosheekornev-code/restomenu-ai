import { useState, useMemo } from "react";
import {
  Plus, Search, AlertTriangle, Clock, RotateCcw, X,
  ChevronDown, Info, MapPin, ShoppingBag, LayoutGrid,
  History, Filter, Calendar,
} from "lucide-react";
import {
  stopList as initialStopList,
  StopListEntry, StopListDuration, StopListItemType,
  cities, positions, categories, CHANNELS,
  ChannelAvailability,
} from "../data/mockData";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} д назад`;
}

function formatUntil(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `до ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `до ${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
}

function getLocationInfo(locationId: string) {
  for (const city of cities) {
    const loc = city.locations.find((l) => l.id === locationId);
    if (loc) return { city: city.name, loc: loc.name, address: loc.address };
  }
  return { city: "—", loc: "—", address: "" };
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors cursor-pointer ${checked ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

// ─── Type Badges ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<StopListItemType, { label: string; color: string; icon: React.ReactNode }> = {
  position: { label: "Позиция", color: "bg-blue-100 text-blue-700", icon: <ShoppingBag size={11} /> },
  category: { label: "Категория", color: "bg-orange-100 text-orange-700", icon: <LayoutGrid size={11} /> },
  option: { label: "Опция", color: "bg-purple-100 text-purple-700", icon: <Filter size={11} /> },
};

const DURATION_LABELS: Record<StopListDuration, string> = {
  eod: "До конца дня",
  manual: "До ручного восстановления",
  custom: "До указанной даты",
};

function ChannelChips({ channels }: { channels: (keyof ChannelAvailability)[] | "all" }) {
  if (channels === "all") return <span className="text-[11px] text-gray-500 italic">Все каналы</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((key) => {
        const ch = CHANNELS.find((c) => c.key === key);
        return ch ? (
          <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded-full ${ch.color}`}>
            {ch.shortLabel}
          </span>
        ) : null;
      })}
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddStopModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (entry: StopListEntry) => void;
}) {
  const [itemType, setItemType] = useState<StopListItemType>("position");
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [durationType, setDurationType] = useState<StopListDuration>("eod");
  const [customDate, setCustomDate] = useState("");
  const [channelMode, setChannelMode] = useState<"all" | "custom">("all");
  const [channelKeys, setChannelKeys] = useState<Set<keyof ChannelAvailability>>(new Set());

  const itemOptions = itemType === "position" ? positions : itemType === "category" ? categories : [];

  const allLocations = cities.flatMap((c) => c.locations.map((l) => ({ ...l, cityName: c.name })));

  const toggleChannel = (key: keyof ChannelAvailability) => {
    setChannelKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!itemId || !locationId || !reason) return;
    const item = itemOptions.find((i) => i.id === itemId);
    const entry: StopListEntry = {
      id: `sl-${Date.now()}`,
      type: itemType,
      itemId,
      itemName: item?.name ?? itemId,
      locationId,
      reason,
      stoppedBy: "Текущий пользователь",
      stoppedAt: new Date().toISOString(),
      durationType,
      until: durationType === "eod"
        ? new Date(new Date().setHours(23, 59, 0, 0)).toISOString()
        : durationType === "custom" && customDate
        ? new Date(customDate).toISOString()
        : undefined,
      channels: channelMode === "all" ? "all" : Array.from(channelKeys),
      active: true,
    };
    onAdd(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="text-[16px] font-semibold text-gray-900">Добавить в стоп-лист</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Item type */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Тип объекта</label>
            <div className="flex gap-2">
              {(["position", "category", "option"] as StopListItemType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setItemType(t); setItemId(""); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] border transition-colors ${
                    itemType === t
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {TYPE_CONFIG[t].icon}
                  {TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Item selector */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">
              {itemType === "position" ? "Позиция" : itemType === "category" ? "Категория" : "Опция"} *
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
            >
              <option value="">— Выберите —</option>
              {itemOptions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Точка продаж *</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
            >
              <option value="">— Выберите точку —</option>
              {allLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.cityName} — {l.name}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Причина остановки *</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Нет ингредиентов / Техническая пауза / ..."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Длительность</label>
            <div className="space-y-2">
              {(["eod", "manual", "custom"] as StopListDuration[]).map((d) => (
                <label key={d} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    name="duration"
                    checked={durationType === d}
                    onChange={() => setDurationType(d)}
                    className="w-4 h-4 accent-red-500"
                  />
                  <span className="text-[13px] text-gray-700">{DURATION_LABELS[d]}</span>
                </label>
              ))}
              {durationType === "custom" && (
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="ml-7 px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              )}
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Каналы заказа</label>
            <div className="flex gap-2 mb-3">
              {(["all", "custom"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChannelMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${
                    channelMode === m
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {m === "all" ? "Все каналы" : "Выбрать каналы"}
                </button>
              ))}
            </div>
            {channelMode === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                {CHANNELS.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-gray-100">
                    <input
                      type="checkbox"
                      checked={channelKeys.has(c.key)}
                      onChange={() => toggleChannel(c.key)}
                      className="w-4 h-4 accent-red-500"
                    />
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${c.color}`}>{c.shortLabel}</span>
                    <span className="text-[11px] text-gray-600">{c.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!itemId || !locationId || !reason}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg text-[13px] font-medium transition-colors"
          >
            <AlertTriangle size={14} />
            Добавить в стоп-лист
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Entry Card ────────────────────────────────────────────────────────────────
function StopListCard({
  entry,
  onRestore,
}: {
  entry: StopListEntry;
  onRestore: (id: string) => void;
}) {
  const locInfo = getLocationInfo(entry.locationId);
  const typeConf = TYPE_CONFIG[entry.type];
  const untilLabel = formatUntil(entry.until);

  return (
    <div className={`border rounded-xl p-4 bg-white transition-all ${entry.active ? "border-red-200 shadow-sm" : "border-gray-200 opacity-60"}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${entry.active ? "bg-red-100" : "bg-gray-100"}`}>
          <AlertTriangle size={16} className={entry.active ? "text-red-500" : "text-gray-400"} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-gray-900">{entry.itemName}</span>
            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${typeConf.color}`}>
              {typeConf.icon}
              {typeConf.label}
            </span>
            {!entry.active && (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">Восстановлен</span>
            )}
          </div>

          {entry.categoryHint && (
            <div className="text-[11px] text-gray-400 mt-0.5">{entry.categoryHint}</div>
          )}

          <div className="flex items-center gap-1 mt-1.5">
            <MapPin size={11} className="text-gray-400 shrink-0" />
            <span className="text-[12px] text-gray-600">
              {locInfo.city} — <span className="font-medium">{locInfo.loc}</span>
              <span className="text-gray-400 ml-1">{locInfo.address}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {/* Reason */}
            <span className="text-[12px] text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
              {entry.reason}
            </span>

            {/* Channels */}
            <ChannelChips channels={entry.channels} />
          </div>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
            <span title={new Date(entry.stoppedAt).toLocaleString("ru")}>
              {entry.stoppedBy} · {formatRelative(entry.stoppedAt)}
            </span>
            {untilLabel && (
              <span className={`flex items-center gap-1 ${entry.active ? "text-red-500" : "text-gray-400"}`}>
                <Clock size={11} />
                {untilLabel}
              </span>
            )}
            {!entry.until && entry.durationType === "manual" && entry.active && (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock size={11} />
                До ручного восстановления
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {entry.active && (
          <button
            onClick={() => onRestore(entry.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-[12px] font-medium transition-colors shrink-0"
          >
            <RotateCcw size={12} />
            Восстановить
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function StopListPage() {
  const [entries, setEntries] = useState(initialStopList);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterType, setFilterType] = useState<"all" | StopListItemType>("all");
  const [showInfo, setShowInfo] = useState(true);

  const allLocations = useMemo(
    () =>
      filterCity === "all"
        ? cities.flatMap((c) => c.locations.map((l) => ({ ...l, cityName: c.name })))
        : (cities.find((c) => c.id === filterCity)?.locations ?? []).map((l) => ({
            ...l,
            cityName: cities.find((c) => c.id === filterCity)?.name ?? "",
          })),
    [filterCity]
  );

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!showHistory && !e.active) return false;
      if (search && !e.itemName.toLowerCase().includes(search.toLowerCase()) &&
          !e.reason.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterLocation !== "all" && e.locationId !== filterLocation) return false;
      if (filterCity !== "all") {
        const city = cities.find((c) => c.id === filterCity);
        if (!city?.locations.find((l) => l.id === e.locationId)) return false;
      }
      return true;
    });
  }, [entries, showHistory, search, filterType, filterLocation, filterCity]);

  const activeCount = entries.filter((e) => e.active).length;
  const restoredToday = entries.filter((e) => !e.active).length;

  // Stats by location
  const locationStats = useMemo(() => {
    const map: Record<string, number> = {};
    entries.filter((e) => e.active).forEach((e) => {
      map[e.locationId] = (map[e.locationId] ?? 0) + 1;
    });
    return map;
  }, [entries]);

  const handleRestore = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, active: false } : e)));
  };

  const handleAdd = (entry: StopListEntry) => {
    setEntries((prev) => [entry, ...prev]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white">
        <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50">
          <div className="w-5 h-5 bg-red-600 rounded-sm flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">R</span>
          </div>
          Рыба и Мясо
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {/* City filter */}
        <select
          value={filterCity}
          onChange={(e) => { setFilterCity(e.target.value); setFilterLocation("all"); }}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 hover:bg-gray-50"
        >
          <option value="all">Все города</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Location filter */}
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 hover:bg-gray-50"
        >
          <option value="all">Все точки</option>
          {allLocations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск в стоп-листе"
            className="pl-8 pr-4 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 w-52"
          />
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          <Plus size={16} />
          В стоп-лист
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 px-5 py-3 bg-red-50 border-b border-red-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[13px] font-semibold text-red-700">{activeCount} позиций в стоп-листе</span>
        </div>
        <span className="text-[12px] text-gray-400">|</span>
        <span className="text-[12px] text-gray-500">{restoredToday} восстановлено</span>

        {/* Top locations */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[12px] text-gray-500">Горячие точки:</span>
          {Object.entries(locationStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([locId, count]) => {
              const info = getLocationInfo(locId);
              return (
                <span key={locId} className="text-[11px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                  <MapPin size={10} />
                  {info.loc}: {count}
                </span>
              );
            })}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-5 py-4">

          {/* Info callout */}
          {showInfo && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-[12px] text-amber-900 flex-1">
                <span className="font-semibold">Стоп-лист — оперативные отключения:</span>{" "}
                Используйте для разовых и временных отключений позиций, категорий или опций
                в конкретных точках. Это не влияет на настройки доступности —
                только на текущую доступность для клиентов. Все изменения сохраняются в истории.
              </div>
              <button onClick={() => setShowInfo(false)} className="text-amber-400 hover:text-amber-600 text-[11px]">
                Закрыть
              </button>
            </div>
          )}

          {/* Filters + history toggle */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[12px] text-gray-500">Тип:</span>
            {(["all", "position", "category", "option"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full text-[12px] transition-colors ${
                  filterType === t
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t === "all" ? "Все" : TYPE_CONFIG[t].label}
              </button>
            ))}
            <div className="flex-1" />
            <label className="flex items-center gap-2 cursor-pointer text-[12px] text-gray-600">
              <input
                type="checkbox"
                checked={showHistory}
                onChange={(e) => setShowHistory(e.target.checked)}
                className="w-4 h-4 accent-gray-700 rounded"
              />
              <History size={14} className="text-gray-400" />
              Показать историю
            </label>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <ShoppingBag size={28} className="text-green-500" />
              </div>
              <div className="text-[15px] font-medium text-gray-600">Стоп-лист пуст</div>
              <div className="text-[12px] mt-1">Все позиции доступны для заказа</div>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 border border-dashed border-red-300 text-red-600 rounded-lg text-[13px] hover:bg-red-50"
              >
                <Plus size={14} />
                Добавить в стоп-лист
              </button>
            </div>
          )}

          {/* Location-grouped entries */}
          {filtered.length > 0 && (() => {
            const grouped: Record<string, StopListEntry[]> = {};
            filtered.forEach((e) => {
              if (!grouped[e.locationId]) grouped[e.locationId] = [];
              grouped[e.locationId].push(e);
            });

            return Object.entries(grouped).map(([locId, locEntries]) => {
              const info = getLocationInfo(locId);
              const activeInLoc = locEntries.filter((e) => e.active).length;
              return (
                <div key={locId} className="mb-6">
                  {/* Location header */}
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-gray-800">{info.loc}</span>
                      <span className="text-[12px] text-gray-400">{info.city} · {info.address}</span>
                    </div>
                    {activeInLoc > 0 && (
                      <span className="ml-auto text-[11px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                        {activeInLoc} активных
                      </span>
                    )}
                  </div>
                  <div className="space-y-2.5 pl-5">
                    {locEntries.map((entry) => (
                      <StopListCard key={entry.id} entry={entry} onRestore={handleRestore} />
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {showModal && (
        <AddStopModal onClose={() => setShowModal(false)} onAdd={handleAdd} />
      )}
    </div>
  );
}
