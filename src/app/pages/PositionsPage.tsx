import { useState, useMemo } from "react";
import React from "react";
import {
  Plus, Search, Filter, Settings, ChevronDown, ChevronLeft, ChevronRight,
  Pencil, Trash2, MoreVertical, GripVertical, Info, AlertTriangle, EyeOff,
  Layers, Image,
} from "lucide-react";
import {
  positions as initialPositions, categories, cities, Position, CHANNELS,
  propertySets as globalSets, PropertySet, PositionVariant,
} from "../data/mockData";
import { PositionEditPanel } from "../components/PositionEditPanel";
import { Toggle } from "../components/shared/Toggle";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { toast } from "../components/shared/Toast";
import { getVariantLabel } from "../components/VariantsTab";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function PositionLocations({ pos }: { pos: Position }) {
  if (pos.availability.everywhere) return <span className="text-[12px] text-gray-500">Везде</span>;
  const locCount = pos.availability.cities
    .flatMap((ca) => ca.locations.filter((la) => la.enabled)).length;
  const cityCount = pos.availability.cities.length;
  if (locCount === 0) return <span className="text-[12px] text-red-400">Нигде</span>;
  return (
    <div>
      <div className="text-[12px] text-gray-700">
        {cityCount === 1
          ? cities.find((c) => c.id === pos.availability.cities[0]?.cityId)?.name
          : `${cityCount} городах`}
      </div>
      <div className="text-[11px] text-gray-400">{locCount} точек</div>
    </div>
  );
}

function ChannelBadges({ pos }: { pos: Position }) {
  const allLocs = pos.availability.everywhere
    ? CHANNELS.map((c) => c.key)
    : pos.availability.cities
        .flatMap((ca) => ca.locations.filter((la) => la.enabled))
        .flatMap((la) => Object.entries(la.channels).filter(([, v]) => v).map(([k]) => k));
  const activeSet = new Set(allLocs);
  const active = CHANNELS.filter((c) => activeSet.has(c.key));
  const isInherited = pos.availability.inheritFromCategory;

  return (
    <div className="space-y-1">
      {active.length === CHANNELS.length ? (
        <span className="text-[11px] text-gray-400 italic">Все каналы</span>
      ) : active.length === 0 ? (
        <span className="text-[11px] text-red-400 italic">Нет каналов</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {active.map((c) => (
            <span key={c.key} title={c.label} className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.color}`}>
              {c.shortLabel}
            </span>
          ))}
        </div>
      )}
      <div>
        {isInherited ? (
          <span className="text-[10px] text-gray-400 italic">от категории</span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-200">
            кастом
          </span>
        )}
      </div>
    </div>
  );
}

function PriceBadge({ pos }: { pos: Position }) {
  if (pos.priceType === "variants" && pos.variants && pos.variants.length > 0) {
    const enabled = pos.variants.filter((v) => v.enabled);
    const min = Math.min(...enabled.map((v) => v.price));
    const max = Math.max(...enabled.map((v) => v.price));
    return (
      <div className="text-right">
        <div className="text-[13px] font-semibold text-gray-900">
          {min === max ? `${min} ₽` : `${min}–${max} ₽`}
        </div>
        <div className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
          {enabled.length} вар.
        </div>
      </div>
    );
  }
  return (
    <div className="text-right">
      <div className="text-[13px] font-semibold text-gray-900">
        {pos.priceType === "from" ? `от ${pos.price} ₽` : `${pos.price} ₽`}
      </div>
    </div>
  );
}

// ─── Category Sidebar ─────────────────────────────────────────────────────────
function CategorySidebar({
  collapsed,
  onToggle,
  selectedCatId,
  onSelect,
  positionCounts,
  totalCount,
}: {
  collapsed: boolean;
  onToggle: () => void;
  selectedCatId: string | null;
  onSelect: (id: string | null) => void;
  positionCounts: Record<string, number>;
  totalCount: number;
}) {
  const rootCats = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["cat-1"]));

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className={`${collapsed ? "w-10" : "w-52"} border-r border-gray-200 bg-white flex flex-col transition-all shrink-0`}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
        {!collapsed && (
          <span className="text-[12px] font-semibold text-gray-600">Категории</span>
        )}
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded ml-auto"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="overflow-y-auto flex-1 py-2 px-2">
          {/* All */}
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] mb-1 transition-colors ${
              !selectedCatId ? "bg-orange-100 text-orange-700 font-medium" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Все позиции
            <span className="ml-auto text-gray-400">{totalCount}</span>
          </button>

          {/* Tree */}
          {rootCats.map((cat) => {
            const children = childrenOf(cat.id);
            const isExpanded = expandedCats.has(cat.id);
            const count = positionCounts[cat.id] ?? 0;

            return (
              <div key={cat.id}>
                <div className="flex items-center">
                  {children.length > 0 && (
                    <button
                      onClick={() => toggleCat(cat.id)}
                      className="p-0.5 mr-0.5 hover:bg-gray-100 rounded"
                    >
                      {isExpanded
                        ? <ChevronDown size={12} className="text-gray-400" />
                        : <ChevronRight size={12} className="text-gray-400" />}
                    </button>
                  )}
                  <button
                    onClick={() => onSelect(cat.id)}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] mb-0.5 transition-colors ${
                      selectedCatId === cat.id ? "bg-orange-100 text-orange-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                    } ${children.length === 0 ? "ml-4" : ""}`}
                  >
                    {!cat.enabled && <EyeOff size={11} className="text-gray-300 shrink-0" />}
                    <span className="flex-1 text-left truncate">{cat.name}</span>
                    <span className="text-gray-400 shrink-0 text-[11px]">{count}</span>
                  </button>
                </div>

                {isExpanded && children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSelect(child.id)}
                    className={`w-full flex items-center gap-2 pl-8 pr-2 py-1.5 rounded-lg text-[12px] mb-0.5 transition-colors ${
                      selectedCatId === child.id ? "bg-orange-100 text-orange-700 font-medium" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-gray-300 shrink-0">└</span>
                    {!child.enabled && <EyeOff size={10} className="text-gray-300 shrink-0" />}
                    <span className="flex-1 text-left truncate">{child.name}</span>
                    <span className="text-gray-400 shrink-0 text-[11px]">{positionCounts[child.id] ?? 0}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function PositionsPage() {
  const [positions, setPositions] = useState(initialPositions);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set(["pos-3"]));

  const positionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    positions.forEach((p) => { p.categoryIds.forEach((cid) => { map[cid] = (map[cid] ?? 0) + 1; }); });
    return map;
  }, [positions]);

  const filtered = positions.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCatId) return p.categoryIds.includes(selectedCatId);
    return true;
  });

  const enabledCount = filtered.filter((p) => p.enabled).length;
  const someSelected = selectedIds.size > 0;
  const allSelected = filtered.every((p) => selectedIds.has(p.id));

  const handleToggleEnabled = (id: string, v: boolean) => {
    setPositions((prev) => prev.map((p) => p.id === id ? { ...p, enabled: v } : p));
    const pos = positions.find((p) => p.id === id);
    toast(`«${pos?.name}» ${v ? "включена" : "выключена"}`, v ? "success" : "warning");
  };

  const handleDelete = (pos: Position) => setDeleteTarget(pos);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setPositions((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    toast(`«${deleteTarget.name}» удалена`, "warning");
    setDeleteTarget(null);
  };

  const handleQuickStoplist = (pos: Position) => toast(`«${pos.name}» добавлена в стоп-лист`, "warning");

  const toggleVariantExpand = (posId: string) => {
    setExpandedVariants((prev) => {
      const next = new Set(prev);
      next.has(posId) ? next.delete(posId) : next.add(posId);
      return next;
    });
  };

  const getSetsForPos = (pos: Position): PropertySet[] => {
    if (!pos.variantPropertySetIds) return globalSets.slice(0, 2);
    return pos.variantPropertySetIds.map((id) => globalSets.find((s) => s.id === id)).filter(Boolean) as PropertySet[];
  };

  // ── Full-page editor mode ─────────────────────────────
  if (editingPos) {
    return (
      <PositionEditPanel
        position={editingPos}
        onClose={() => setEditingPos(null)}
        isNew={editingPos.id === "new"}
        onSave={(saved) => {
          setPositions((prev) =>
            prev.some((p) => p.id === saved.id)
              ? prev.map((p) => (p.id === saved.id ? saved : p))
              : [...prev, saved]
          );
          setEditingPos(null);
        }}
      />
    );
  }

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

        <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none hover:bg-gray-50">
          <option>Все города</option>
          {cities.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
        <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none hover:bg-gray-50">
          <option>Все точки</option>
          {cities.flatMap((c) => c.locations.map((l) => <option key={l.id}>{l.name}</option>))}
        </select>

        {someSelected && (
          <button className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-[13px] text-orange-700 font-medium">
            {selectedIds.size} выбрано <ChevronDown size={14} />
          </button>
        )}

        <div className="flex-1" />
        <span className="text-[12px] text-gray-400">{enabledCount} из {filtered.length} активных</span>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск позиций"
            className="pl-8 pr-4 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-52"
          />
        </div>

        <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-[13px] hover:bg-gray-50">
          <Filter size={14} /> Фильтр
        </button>
        <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <Settings size={16} className="text-gray-500" />
        </button>
        <button
          onClick={() => setEditingPos({ id: "new", name: "", categoryIds: [], optionGroupIds: [], price: 0, priceType: "fixed", enabled: true, availability: { inheritFromCategory: true, everywhere: false, schedule: { type: "daily", allDay: true }, cities: [] } })}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium">
          <Plus size={16} /> Создать
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar
          collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          selectedCatId={selectedCatId} onSelect={setSelectedCatId}
          positionCounts={positionCounts} totalCount={positions.length} />

        <div className="flex-1 overflow-auto">
          {showInfo && (
            <div className="mx-5 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
              <Info size={15} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="text-[12px] text-blue-900 flex-1">
                <span className="font-semibold">Доступность позиций:</span> По умолчанию позиция наследует настройки категории.
                Товары с вариантами раскрываются стрелкой.
              </div>
              <button onClick={() => setShowInfo(false)} className="text-blue-400 hover:text-blue-600 text-[11px]">Закрыть</button>
            </div>
          )}

          <div className="px-5 py-4">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="w-8 pb-3 text-left">
                    <input type="checkbox" checked={allSelected && filtered.length > 0}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={(e) => setSelectedIds(e.target.checked ? new Set(filtered.map((p) => p.id)) : new Set())}
                      className="w-4 h-4 rounded accent-orange-500" />
                  </th>
                  <th className="w-12 pb-3 text-left">Фото</th>
                  <th className="pb-3 text-left">Название</th>
                  <th className="pb-3 text-left w-28">Опции</th>
                  <th className="pb-3 text-left w-28">Точки</th>
                  <th className="pb-3 text-left w-44">Каналы</th>
                  <th className="pb-3 text-left w-24">Артикул</th>
                  <th className="pb-3 text-right w-24">Цена</th>
                  <th className="pb-3 text-right w-28">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pos) => {
                  const catNames = pos.categoryIds.map((cid) => categories.find((c) => c.id === cid)?.name).filter(Boolean);
                  const hasVariants = pos.priceType === "variants" && pos.variants && pos.variants.length > 0;
                  const isExpanded = expandedVariants.has(pos.id);
                  const variantSets = hasVariants ? getSetsForPos(pos) : [];

                  return (
                    <React.Fragment key={pos.id}>
                      {/* ─── Main position row ─────────────────── */}
                      <tr
                        className={`border-b border-gray-100 hover:bg-gray-50/60 group transition-colors ${!pos.enabled ? "opacity-50" : ""} ${hasVariants && isExpanded ? "border-b-0 bg-orange-50/20" : ""}`}
                      >
                        <td className="py-3 pl-1">
                          <div className="flex items-center gap-1">
                            <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                            <input type="checkbox" checked={selectedIds.has(pos.id)}
                              onChange={(e) => setSelectedIds((prev) => { const next = new Set(prev); e.target.checked ? next.add(pos.id) : next.delete(pos.id); return next; })}
                              className="w-4 h-4 rounded accent-orange-500" />
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 overflow-hidden flex items-center justify-center">
                            {pos.photo ? <img src={pos.photo} className="w-full h-full object-cover" /> : <span className="text-[16px]">🍽️</span>}
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="flex items-start gap-2">
                            {/* Expand toggle for variants */}
                            {hasVariants ? (
                              <button onClick={() => toggleVariantExpand(pos.id)}
                                className="mt-0.5 p-0.5 hover:bg-orange-100 rounded transition-colors shrink-0">
                                {isExpanded
                                  ? <ChevronDown size={14} className="text-orange-500" />
                                  : <ChevronRight size={14} className="text-orange-400" />}
                              </button>
                            ) : <div className="w-5" />}
                            <div>
                              <div className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5">
                                {pos.name}
                                {!pos.enabled && <EyeOff size={12} className="text-gray-400" />}
                                {hasVariants && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-0.5">
                                    <Layers size={9} /> {pos.variants!.length} вар.
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {catNames.map((c) => (
                                  <span key={c} className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-full">{c}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          {pos.optionGroupIds.length > 0 ? (
                            <span className="text-[11px] px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full">
                              {pos.optionGroupIds.length} групп
                            </span>
                          ) : (
                            <button onClick={() => setEditingPos(pos)}
                              className="w-7 h-7 flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-orange-400 hover:text-orange-500">
                              <Plus size={12} />
                            </button>
                          )}
                        </td>

                        <td className="py-3"><PositionLocations pos={pos} /></td>
                        <td className="py-3"><ChannelBadges pos={pos} /></td>

                        <td className="py-3 text-[12px] font-mono text-gray-500">
                          {pos.sku ?? <span className="text-gray-300">—</span>}
                        </td>

                        <td className="py-3"><PriceBadge pos={pos} /></td>

                        <td className="py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Toggle checked={pos.enabled} onChange={(v) => handleToggleEnabled(pos.id, v)} size="sm" />
                            <button onClick={() => setEditingPos(pos)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Редактировать">
                              <Pencil size={14} className="text-gray-400 hover:text-gray-600" />
                            </button>
                            <button onClick={() => handleQuickStoplist(pos)} className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors" title="В стоп-лист">
                              <AlertTriangle size={14} className="text-gray-300 hover:text-amber-500" />
                            </button>
                            <button onClick={() => handleDelete(pos)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Удалить">
                              <Trash2 size={14} className="text-gray-300 hover:text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ─── Variant sub-rows ───────────────────── */}
                      {hasVariants && isExpanded && pos.variants!.map((variant, vIdx) => {
                        const label = getVariantLabel(variant, variantSets);
                        const isLast = vIdx === pos.variants!.length - 1;
                        return (
                          <tr key={`${pos.id}-v-${variant.id}`}
                            className={`bg-orange-50/10 hover:bg-orange-50/30 transition-colors ${isLast ? "border-b border-gray-200" : "border-b border-orange-100/60"} ${!variant.enabled ? "opacity-50" : ""}`}>
                            {/* Indent + checkbox */}
                            <td className="py-2 pl-1">
                              <div className="flex items-center gap-1 pl-3">
                                <div className="w-3 border-l-2 border-b-2 border-orange-200 h-4 rounded-bl" />
                              </div>
                            </td>

                            {/* Photo */}
                            <td className="py-2">
                              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 border border-gray-100 ml-1">
                                {variant.photo
                                  ? <img src={variant.photo} className="w-full h-full object-cover" />
                                  : <Image size={12} className="text-gray-300" />}
                              </div>
                            </td>

                            {/* Name */}
                            <td className="py-2 pl-2">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="text-[12px] font-medium text-gray-700 flex items-center gap-1.5">
                                    {label}
                                    {variant.isDefault && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">основной</span>
                                    )}
                                  </div>
                                  {(variant.weight || variant.sku) && (
                                    <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                                      {variant.weight && <span>{variant.weight} {variant.weightUnit ?? "г"}</span>}
                                      {variant.sku && <span className="font-mono">{variant.sku}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Empty cols */}
                            <td /><td /><td />

                            {/* SKU */}
                            <td className="py-2 text-[11px] font-mono text-gray-400">
                              {variant.sku ?? <span className="text-gray-200">—</span>}
                            </td>

                            {/* Price */}
                            <td className="py-2 text-right">
                              <span className={`text-[13px] font-semibold ${variant.price === 0 ? "text-red-400" : "text-gray-800"}`}>
                                {variant.price === 0 ? "—" : `${variant.price} ₽`}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-2">
                              <div className="flex items-center gap-1 justify-end">
                                <Toggle checked={variant.enabled}
                                  onChange={(v) => setPositions((prev) => prev.map((p) => p.id === pos.id ? {
                                    ...p,
                                    variants: p.variants?.map((vt) => vt.id === variant.id ? { ...vt, enabled: v } : vt),
                                  } : p))}
                                  size="xs" />
                                <button onClick={() => setEditingPos(pos)}
                                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors" title="Редактировать вариант">
                                  <Pencil size={12} className="text-gray-300 hover:text-gray-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-20 text-gray-400">
                <div className="text-[32px] mb-3">🍽️</div>
                <div className="text-[14px] font-medium text-gray-500">Позиций не найдено</div>
                <button
                  onClick={() => setEditingPos({
                    id: "new", name: "", categoryIds: selectedCatId ? [selectedCatId] : [],
                    optionGroupIds: [], price: 0, priceType: "fixed", enabled: true,
                    availability: { inheritFromCategory: true, everywhere: false, schedule: { type: "daily", allDay: true }, cities: [] },
                  })}
                  className="mt-4 flex items-center gap-2 px-4 py-2 border border-dashed border-green-300 text-green-600 rounded-lg text-[13px] hover:bg-green-50"
                >
                  <Plus size={14} />
                  Создать первую позицию
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={`Удалить «${deleteTarget.name}»?`}
          description="Позиция будет удалена. Это действие нельзя отменить."
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}