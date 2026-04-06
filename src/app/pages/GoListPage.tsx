import { useState, useMemo } from "react";
import {
  Plus, Star, TrendingUp, Sparkles, X, ChevronDown,
  Info, MapPin, Clock, GripVertical, Pencil,
  Trash2, Eye,
} from "lucide-react";
import {
  goList as initialGoList,
  GoListEntry, GoListBadge,
  cities, positions, categories, CHANNELS,
  ChannelAvailability,
} from "../data/mockData";

// ─── Badge Config ─────────────────────────────────────────────────────────────
const BADGE_CONFIG: Record<GoListBadge, { label: string; color: string; emoji: string }> = {
  hit: { label: "Хит продаж", color: "bg-red-100 text-red-700 border-red-200", emoji: "🔥" },
  new: { label: "Новинка", color: "bg-green-100 text-green-700 border-green-200", emoji: "✨" },
  special: { label: "Специальное", color: "bg-amber-100 text-amber-700 border-amber-200", emoji: "⭐" },
  recommendation: { label: "Рекомендуем", color: "bg-blue-100 text-blue-700 border-blue-200", emoji: "👍" },
  promo: { label: "Акция", color: "bg-purple-100 text-purple-700 border-purple-200", emoji: "🎉" },
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  return `${days} д назад`;
}

function formatUntil(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
}

function getLocationNames(locationIds: string[] | "all") {
  if (locationIds === "all") return "Все точки";
  const names = locationIds.map((id) => {
    for (const city of cities) {
      const loc = city.locations.find((l) => l.id === id);
      if (loc) return loc.name;
    }
    return id;
  });
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function ChannelChips({ channels }: { channels: (keyof ChannelAvailability)[] | "all" }) {
  if (channels === "all") return <span className="text-[11px] text-gray-400">Все каналы</span>;
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

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddGoModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (e: GoListEntry) => void;
}) {
  const [itemType, setItemType] = useState<"position" | "category">("position");
  const [itemId, setItemId] = useState("");
  const [badge, setBadge] = useState<GoListBadge>("hit");
  const [locationMode, setLocationMode] = useState<"all" | "custom">("all");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [channelMode, setChannelMode] = useState<"all" | "custom">("all");
  const [channelKeys, setChannelKeys] = useState<Set<keyof ChannelAvailability>>(new Set());
  const [until, setUntil] = useState("");

  const itemOptions = itemType === "position" ? positions : categories;
  const allLocations = cities.flatMap((c) =>
    c.locations.map((l) => ({ ...l, cityName: c.name }))
  );

  const toggleLocation = (id: string) => {
    setLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleChannel = (key: keyof ChannelAvailability) => {
    setChannelKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!itemId) return;
    const item = itemOptions.find((i) => i.id === itemId);
    onAdd({
      id: `gl-${Date.now()}`,
      itemId,
      itemName: item?.name ?? itemId,
      itemType,
      badge,
      locationIds: locationMode === "all" ? "all" : locationIds,
      channels: channelMode === "all" ? "all" : Array.from(channelKeys),
      priority: 99,
      addedBy: "Текущий пользователь",
      addedAt: new Date().toISOString(),
      until: until ? new Date(until).toISOString() : undefined,
      active: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[500px] max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-amber-500" />
            <h2 className="text-[16px] font-semibold text-gray-900">Добавить в гоу-лист</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Item type */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Тип</label>
            <div className="flex gap-2">
              {(["position", "category"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setItemType(t); setItemId(""); }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${
                    itemType === t ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {t === "position" ? "Позиция" : "Категория"}
                </button>
              ))}
            </div>
          </div>

          {/* Item */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Товар / Категория *</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300">
              <option value="">— Выберите —</option>
              {itemOptions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          {/* Badge */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Бейдж</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(BADGE_CONFIG) as [GoListBadge, typeof BADGE_CONFIG[GoListBadge]][]).map(([key, conf]) => (
                <button
                  key={key}
                  onClick={() => setBadge(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] border transition-colors ${
                    badge === key ? conf.color + " border" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{conf.emoji}</span>
                  {conf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Точки</label>
            <div className="flex gap-2 mb-2">
              {(["all", "custom"] as const).map((m) => (
                <button key={m} onClick={() => setLocationMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] border ${
                    locationMode === m ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"
                  }`}>
                  {m === "all" ? "Все точки" : "Выбрать"}
                </button>
              ))}
            </div>
            {locationMode === "custom" && (
              <div className="grid grid-cols-2 gap-1.5">
                {allLocations.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={locationIds.includes(l.id)}
                      onChange={() => toggleLocation(l.id)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-[11px] text-gray-600">{l.cityName} — {l.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Channels */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Каналы</label>
            <div className="flex gap-2 mb-2">
              {(["all", "custom"] as const).map((m) => (
                <button key={m} onClick={() => setChannelMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] border ${
                    channelMode === m ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600"
                  }`}>
                  {m === "all" ? "Все каналы" : "Выбрать"}
                </button>
              ))}
            </div>
            {channelMode === "custom" && (
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <label key={c.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer text-[11px] ${
                    channelKeys.has(c.key) ? c.color + " border" : "border-gray-200 text-gray-500"
                  }`}>
                    <input type="checkbox" checked={channelKeys.has(c.key)}
                      onChange={() => toggleChannel(c.key)} className="sr-only" />
                    {c.shortLabel}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Until */}
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Показывать до (необязательно)</label>
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)}
              className="px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
          <button onClick={handleSubmit} disabled={!itemId}
            className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-lg text-[13px] font-medium">
            <Star size={14} />
            Добавить в гоу-лист
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Entry Card ────────────────────────────────────────────────────────────────
function GoListCard({
  entry,
  index,
  onToggle,
  onRemove,
}: {
  entry: GoListEntry;
  index: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const conf = BADGE_CONFIG[entry.badge];
  const untilLabel = formatUntil(entry.until);

  return (
    <div className={`border rounded-xl p-4 bg-white flex items-center gap-4 transition-all ${
      entry.active ? "border-amber-200 shadow-sm" : "border-gray-200 opacity-50"
    }`}>
      {/* Drag handle + priority */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <GripVertical size={16} className="text-gray-300 cursor-grab" />
        <span className="text-[11px] text-gray-400 font-mono">#{index + 1}</span>
      </div>

      {/* Badge */}
      <div className={`px-3 py-1.5 rounded-lg text-[12px] border shrink-0 flex items-center gap-1.5 ${conf.color}`}>
        <span>{conf.emoji}</span>
        <span>{conf.label}</span>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-semibold text-gray-900">{entry.itemName}</span>
          <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
            {entry.itemType === "position" ? "Позиция" : "Категория"}
          </span>
        </div>
        {entry.categoryHint && (
          <div className="text-[11px] text-gray-400 mt-0.5">{entry.categoryHint}</div>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[12px] text-gray-500">
            <MapPin size={11} className="text-gray-400" />
            {getLocationNames(entry.locationIds)}
          </span>
          <ChannelChips channels={entry.channels} />
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
          <span>{entry.addedBy} · {formatRelative(entry.addedAt)}</span>
          {untilLabel && (
            <span className="flex items-center gap-1 text-amber-500">
              <Clock size={11} />
              до {untilLabel}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Toggle checked={entry.active} onChange={() => onToggle(entry.id)} />
        <button className="p-1.5 hover:bg-gray-100 rounded-lg">
          <Pencil size={13} className="text-gray-400" />
        </button>
        <button onClick={() => onRemove(entry.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
          <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function GoListPage() {
  const [entries, setEntries] = useState(initialGoList);
  const [showModal, setShowModal] = useState(false);
  const [filterCity, setFilterCity] = useState("all");
  const [filterBadge, setFilterBadge] = useState<"all" | GoListBadge>("all");
  const [showInfo, setShowInfo] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterBadge !== "all" && e.badge !== filterBadge) return false;
      return true;
    });
  }, [entries, filterBadge]);

  const active = filtered.filter((e) => e.active);
  const inactive = filtered.filter((e) => !e.active);

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

        <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none hover:bg-gray-50">
          <option value="all">Все города</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => setPreviewMode(!previewMode)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-[13px] transition-colors ${
            previewMode ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Eye size={14} />
          Превью меню
        </button>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-amber-50 border-b border-amber-100">
        {Object.entries(BADGE_CONFIG).map(([key, conf]) => {
          const count = entries.filter((e) => e.badge === key && e.active).length;
          return (
            <span key={key} className="flex items-center gap-1.5 text-[12px] text-gray-600">
              <span>{conf.emoji}</span>
              <span className="font-medium">{count}</span>
              <span className="text-gray-400">{conf.label}</span>
            </span>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">

        {showInfo && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-[12px] text-amber-900 flex-1">
              <span className="font-semibold">Гоу-лист — продвижение товаров:</span>{" "}
              Отмечайте позиции и категории специальными бейджами (хит, новинка, акция и др.).
              Порядок определяет приоритет отображения. Настройте для каких точек и каналов
              заказа показывать продвижение.
            </div>
            <button onClick={() => setShowInfo(false)} className="text-amber-400 hover:text-amber-600 text-[11px]">Закрыть</button>
          </div>
        )}

        {/* Badge filter */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setFilterBadge("all")}
            className={`px-3 py-1 rounded-full text-[12px] ${filterBadge === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            Все
          </button>
          {(Object.entries(BADGE_CONFIG) as [GoListBadge, typeof BADGE_CONFIG[GoListBadge]][]).map(([key, conf]) => (
            <button key={key} onClick={() => setFilterBadge(key)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[12px] transition-colors ${
                filterBadge === key ? conf.color + " border" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {conf.emoji} {conf.label}
            </button>
          ))}
        </div>

        {/* Preview mode */}
        {previewMode && (
          <div className="mb-6 p-4 bg-gray-900 rounded-xl">
            <div className="text-[11px] text-gray-400 mb-3 flex items-center gap-2">
              <Eye size={12} />
              Превью — как видит клиент
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {active.map((e) => {
                const conf = BADGE_CONFIG[e.badge];
                return (
                  <div key={e.id} className="shrink-0 w-32 bg-gray-800 rounded-xl p-3 text-white">
                    <div className={`text-[10px] px-1.5 py-0.5 rounded-full inline-block mb-2 ${conf.color}`}>
                      {conf.emoji} {conf.label}
                    </div>
                    <div className="text-[12px] font-medium">{e.itemName}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active entries */}
        {active.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-amber-500" />
              <h3 className="text-[13px] font-semibold text-gray-700">Активные ({active.length})</h3>
              <span className="text-[11px] text-gray-400 ml-1">— перетащите для изменения порядка</span>
            </div>
            <div className="space-y-2">
              {active.map((entry, i) => (
                <GoListCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onToggle={(id) => setEntries((prev) => prev.map((e) => e.id === id ? { ...e, active: !e.active } : e))}
                  onRemove={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive entries */}
        {inactive.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-[13px] font-semibold text-gray-400">Неактивные ({inactive.length})</h3>
            </div>
            <div className="space-y-2">
              {inactive.map((entry, i) => (
                <GoListCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onToggle={(id) => setEntries((prev) => prev.map((e) => e.id === id ? { ...e, active: !e.active } : e))}
                  onRemove={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
                />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <TrendingUp size={28} className="text-amber-400" />
            </div>
            <div className="text-[15px] font-medium text-gray-600">Гоу-лист пуст</div>
            <div className="text-[12px] mt-1">Добавьте позиции для продвижения</div>
            <button onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 border border-dashed border-amber-300 text-amber-600 rounded-lg text-[13px] hover:bg-amber-50">
              <Plus size={14} />
              Добавить в гоу-лист
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AddGoModal
          onClose={() => setShowModal(false)}
          onAdd={(entry) => setEntries((prev) => [entry, ...prev])}
        />
      )}
    </div>
  );
}
