import { useState, useMemo } from "react";
import {
  Plus, Search, Filter, Settings, ChevronDown, ChevronRight,
  Pencil, Trash2, GripVertical, Info, Clock, EyeOff,
} from "lucide-react";
import { categories as initialCategories, cities, Category, CHANNELS } from "../data/mockData";
import { CategoryEditPanel } from "../components/CategoryEditPanel";
import { Toggle } from "../components/shared/Toggle";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { toast } from "../components/shared/Toast";
import imgImage from "../../assets/a06546bfac7cc3617192c4e1fdddadb1edad4c60.png";
import imgImage1 from "../../assets/95375c1163166df906e46345aed4ed3df9dfae65.png";
import imgImage2 from "../../assets/1a4bd6c8a236dc61600f6d931401ac16343ca6d8.png";
import imgImage3 from "../../assets/b6909ca846f1fd2dc79130f71b7fdbfc68a01f77.png";
import imgImage4 from "../../assets/d69b32c9d541d433c7e74519445bfe5ff373d232.png";

const photoMap: Record<string, string> = {
  "figma:asset/a06546bfac7cc3617192c4e1fdddadb1edad4c60.png": imgImage,
  "figma:asset/95375c1163166df906e46345aed4ed3df9dfae65.png": imgImage1,
  "figma:asset/1a4bd6c8a236dc61600f6d931401ac16343ca6d8.png": imgImage2,
  "figma:asset/b6909ca846f1fd2dc79130f71b7fdbfc68a01f77.png": imgImage3,
  "figma:asset/d69b32c9d541d433c7e74519445bfe5ff373d232.png": imgImage4,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAvailabilitySummary(cat: Category) {
  if (cat.availability.everywhere) return { locLabel: "Везде", cityCount: null };
  const cityCount = cat.availability.cities.length;
  const locCount = cat.availability.cities.flatMap((ca) =>
    ca.locations.filter((la) => la.enabled)
  ).length;
  if (locCount === 0) return { locLabel: null, cityCount: null };
  const cityNames = cat.availability.cities
    .map((ca) => cities.find((c) => c.id === ca.cityId)?.name)
    .filter(Boolean);
  const locLabel =
    cityCount === 1 && cityNames[0]
      ? cityNames[0] as string
      : `${cityCount} ${cityCount === 1 ? "город" : cityCount < 5 ? "города" : "городов"}`;
  return { locLabel, cityCount, locCount };
}

function ScheduleBadge({ schedule }: { schedule: Category["availability"]["schedule"] }) {
  if (schedule.allDay && schedule.type === "daily") return null;
  let label = "";
  if (schedule.type === "weekdays") label = "По дням";
  else if (schedule.type === "dates") label = "По датам";
  else if (!schedule.allDay && schedule.periods?.length) {
    label = `${schedule.periods[0].from}–${schedule.periods[0].to}`;
  }
  return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
      <Clock size={9} />
      {label}
    </span>
  );
}

function ChannelChips({ cat }: { cat: Category }) {
  const activeLocs = cat.availability.everywhere
    ? null
    : cat.availability.cities.flatMap((ca) => ca.locations.filter((la) => la.enabled));

  const activeSet = new Set(
    cat.availability.everywhere
      ? CHANNELS.map((c) => c.key)
      : (activeLocs ?? []).flatMap((la) =>
          Object.entries(la.channels)
            .filter(([, v]) => v)
            .map(([k]) => k)
        )
  );

  const activeChannels = CHANNELS.filter((c) => activeSet.has(c.key));

  if (activeChannels.length === CHANNELS.length) {
    return <span className="text-[11px] text-gray-400 italic">Все каналы</span>;
  }
  if (activeChannels.length === 0) {
    return <span className="text-[11px] text-red-400 italic">Нет каналов</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {activeChannels.map((c) => (
        <span key={c.key} title={c.label} className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.color}`}>
          {c.shortLabel}
        </span>
      ))}
    </div>
  );
}

// ─── Row Component ────────────────────────────────────────────────────────────
function CategoryRow({
  cat,
  isChild,
  isExpanded,
  hasChildren,
  onToggleExpand,
  onToggleEnabled,
  onEdit,
  onDelete,
  selected,
  onSelect,
}: {
  cat: Category;
  isChild?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  onToggleExpand?: () => void;
  onToggleEnabled: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  selected: boolean;
  onSelect: (v: boolean) => void;
}) {
  const { locLabel, locCount } = getAvailabilitySummary(cat);
  const rowOpacity = cat.enabled ? "" : "opacity-50";

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50/60 group transition-colors ${rowOpacity}`}>
      {/* Checkbox + drag */}
      <td className="py-3 pl-2 w-8">
        <div className="flex items-center gap-1">
          <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="w-4 h-4 rounded accent-orange-500"
          />
        </div>
      </td>

      {/* Photo */}
      <td className={`py-3 ${isChild ? "pl-8" : ""}`}>
        {cat.photo ? (
          <img
            src={photoMap[cat.photo] ?? cat.photo}
            className={`rounded-lg object-cover ${isChild ? "w-9 h-9 border border-gray-200" : "w-10 h-10"}`}
          />
        ) : (
          <div className={`rounded-lg ${isChild ? "w-9 h-9 bg-gray-100 border border-gray-200" : "w-10 h-10 bg-gray-200"}`} />
        )}
      </td>

      {/* Name */}
      <td className="py-3">
        <div className="flex items-center gap-2">
          {isChild && <span className="text-gray-300 text-[11px] shrink-0">└</span>}
          <div>
            <div className={`flex items-center gap-2 ${isChild ? "text-[13px] text-gray-700" : "text-[13px] font-semibold text-gray-900"}`}>
              <span>{cat.name}</span>
              {!cat.enabled && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  <EyeOff size={9} />
                  Скрыта
                </span>
              )}
              <ScheduleBadge schedule={cat.availability.schedule} />
            </div>
            {hasChildren && !isChild && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 mt-0.5 text-[11px] text-orange-500 hover:text-orange-700 transition-colors"
              >
                {isExpanded ? (
                  <><ChevronDown size={11} /> Свернуть подкатегории</>
                ) : (
                  <><ChevronRight size={11} /> Показать подкатегории</>
                )}
              </button>
            )}
          </div>
        </div>
      </td>

      {/* Positions */}
      <td className="py-3 w-24">
        <button className="text-[13px] text-blue-600 hover:underline">
          {cat.positionsCount} поз.
        </button>
      </td>

      {/* Availability */}
      <td className="py-3 w-36">
        {locLabel ? (
          <div>
            <div className="text-[12px] text-gray-700">{locLabel}</div>
            {locCount !== undefined && !cat.availability.everywhere && (
              <div className="text-[11px] text-gray-400">{locCount} точек</div>
            )}
          </div>
        ) : (
          <span className="text-[12px] text-red-400">—</span>
        )}
      </td>

      {/* Channels */}
      <td className="py-3 w-52">
        <ChannelChips cat={cat} />
      </td>

      {/* Actions */}
      <td className="py-3 pr-2 w-28">
        <div className="flex items-center gap-1.5 justify-end">
          <Toggle checked={cat.enabled} onChange={onToggleEnabled} size="sm" />
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Редактировать"
          >
            <Pencil size={14} className="text-gray-400 hover:text-gray-600" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
            title="Удалить"
          >
            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function CategoriesPage() {
  const [cats, setCats] = useState(initialCategories);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isNewCat, setIsNewCat] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["cat-1"]));
  const [showInfo, setShowInfo] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const parentCats = useMemo(() =>
    cats.filter((c) => !c.parentId && (
      !search || c.name.toLowerCase().includes(search.toLowerCase())
    )),
    [cats, search]
  );

  const childrenOf = (id: string) =>
    cats.filter((c) => c.parentId === id && (
      !search || c.name.toLowerCase().includes(search.toLowerCase())
    ));

  const allIds = cats.map((c) => c.id);
  const allSelected = allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = (v: boolean) => {
    setSelectedIds(v ? new Set(allIds) : new Set());
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleEnabled = (id: string, v: boolean) => {
    setCats((prev) => prev.map((c) => c.id === id ? { ...c, enabled: v } : c));
    const cat = cats.find((c) => c.id === id);
    toast(`Категория «${cat?.name}» ${v ? "включена" : "выключена"}`, v ? "success" : "warning");
  };

  const handleDelete = (cat: Category) => {
    setDeleteTarget(cat);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setCats((prev) => prev.filter((c) => c.id !== deleteTarget.id && c.parentId !== deleteTarget.id));
    toast(`Категория «${deleteTarget.name}» удалена`, "warning");
    setDeleteTarget(null);
  };

  const handleBulkEnable = (v: boolean) => {
    setCats((prev) => prev.map((c) => selectedIds.has(c.id) ? { ...c, enabled: v } : c));
    toast(`${selectedIds.size} категорий ${v ? "включено" : "выключено"}`, "success");
    setSelectedIds(new Set());
    setShowBulkMenu(false);
  };

  const handleBulkDelete = () => {
    setCats((prev) => prev.filter((c) => !selectedIds.has(c.id) && !selectedIds.has(c.parentId ?? "")));
    toast(`${selectedIds.size} категорий удалено`, "warning");
    setSelectedIds(new Set());
    setShowBulkMenu(false);
  };

  const enabledCount = cats.filter((c) => c.enabled).length;

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
          onChange={(e) => setFilterCity(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none hover:bg-gray-50"
        >
          <option value="all">Все города</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Bulk actions */}
        {someSelected && (
          <div className="relative">
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-[13px] text-orange-700 font-medium hover:bg-orange-100"
            >
              {selectedIds.size} выбрано
              <ChevronDown size={14} />
            </button>
            {showBulkMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBulkMenu(false)} />
                <div className="absolute left-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                  <button onClick={() => handleBulkEnable(true)}
                    className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                    ✓ Включить все
                  </button>
                  <button onClick={() => handleBulkEnable(false)}
                    className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                    ✗ Выключить все
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button onClick={handleBulkDelete}
                    className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50">
                    Удалить выбранные
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Stats */}
        <span className="text-[12px] text-gray-400">
          {enabledCount} из {cats.length} активных
        </span>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по категориям"
            className="pl-8 pr-4 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-52"
          />
        </div>

        <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-700 hover:bg-gray-50">
          <Filter size={14} />
          Фильтр
        </button>
        <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Settings size={16} className="text-gray-500" />
        </button>
        <button
          onClick={() => { setIsNewCat(true); setEditingCat(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          <Plus size={16} />
          Создать
        </button>
      </div>

      {/* Info callout */}
      {showInfo && (
        <div className="mx-5 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
          <Info size={15} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-[12px] text-blue-900 flex-1">
            <span className="font-semibold">Доступность категорий:</span>{" "}
            Настройте города, точки и каналы заказа для каждой категории.
            Позиции наследуют эти настройки, но можно переопределить индивидуально.
            Расписание ({" "}
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
              <Clock size={9} /> По дням
            </span>{" "}) ограничивает время видимости категории в меню.
          </div>
          <button onClick={() => setShowInfo(false)} className="text-blue-400 hover:text-blue-600 text-[11px] shrink-0">
            Закрыть
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <th className="w-8 pb-3 text-left pl-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded accent-orange-500"
                />
              </th>
              <th className="w-12 pb-3 text-left">Фото</th>
              <th className="pb-3 text-left">Название</th>
              <th className="pb-3 text-left w-24">Позиции</th>
              <th className="pb-3 text-left w-36">Точки</th>
              <th className="pb-3 text-left w-52">Каналы заказа</th>
              <th className="pb-3 text-right w-28 pr-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {parentCats.flatMap((cat) => {
              const children = childrenOf(cat.id);
              const isExpanded = expandedIds.has(cat.id);

              return [
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  hasChildren={children.length > 0}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleExpanded(cat.id)}
                  onToggleEnabled={(v) => handleToggleEnabled(cat.id, v)}
                  onEdit={() => { setEditingCat(cat); setIsNewCat(false); }}
                  onDelete={() => handleDelete(cat)}
                  selected={selectedIds.has(cat.id)}
                  onSelect={(v) => setSelectedIds((prev) => {
                    const next = new Set(prev);
                    v ? next.add(cat.id) : next.delete(cat.id);
                    return next;
                  })}
                />,
                ...(isExpanded
                  ? children.map((child) => (
                      <CategoryRow
                        key={child.id}
                        cat={child}
                        isChild
                        onToggleEnabled={(v) => handleToggleEnabled(child.id, v)}
                        onEdit={() => { setEditingCat(child); setIsNewCat(false); }}
                        onDelete={() => handleDelete(child)}
                        selected={selectedIds.has(child.id)}
                        onSelect={(v) => setSelectedIds((prev) => {
                          const next = new Set(prev);
                          v ? next.add(child.id) : next.delete(child.id);
                          return next;
                        })}
                      />
                    ))
                  : []),
              ];
            })}
          </tbody>
        </table>

        {parentCats.length === 0 && (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Search size={32} className="text-gray-200 mb-3" />
            <div className="text-[14px] font-medium text-gray-500">Категории не найдены</div>
            <div className="text-[12px] mt-1">Попробуйте изменить поисковый запрос</div>
          </div>
        )}
      </div>

      {/* Edit panel */}
      {(editingCat || isNewCat) && (
        <CategoryEditPanel
          category={editingCat}
          isNew={isNewCat}
          onClose={() => { setEditingCat(null); setIsNewCat(false); }}
          onSave={(cat) => {
            setCats((prev) =>
              prev.some((c) => c.id === cat.id)
                ? prev.map((c) => (c.id === cat.id ? cat : c))
                : [...prev, cat]
            );
            setEditingCat(null);
            setIsNewCat(false);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Удалить «${deleteTarget.name}»?`}
          description={
            childrenOf(deleteTarget.id).length > 0
              ? `Также будут удалены ${childrenOf(deleteTarget.id).length} подкатегорий. Позиции останутся.`
              : "Позиции в этой категории останутся."
          }
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}