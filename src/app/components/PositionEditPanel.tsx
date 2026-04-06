import { useState } from "react";
import {
  X, Save, MoreHorizontal, HelpCircle, Plus, Info,
  AlertTriangle, ChevronDown, Tag, Scale, Layers,
  ArrowLeft, ChevronRight, LayoutGrid, DollarSign,
  Package, Puzzle, Globe2, Image, Copy, Trash2,
  Check, PenLine,
} from "lucide-react";
import {
  Position, Availability, categories, optionGroups,
  PropertySet, PositionVariant, PriceOverride,
  propertySets as globalSets, pizzaVariants, pizzaPriceOverrides, rollPriceOverrides,
} from "../data/mockData";
import { AvailabilitySection } from "./AvailabilitySection";
import { Toggle } from "./shared/Toggle";
import { toast } from "./shared/Toast";
import { ConfirmDialog } from "./shared/ConfirmDialog";
import { VariantsTab } from "./VariantsTab";
import { PricesTab } from "./PricesTab";

type TabKey = "basic" | "prices" | "variants" | "options" | "availability";

interface Props {
  position: Position | null;
  onClose: () => void;
  onSave?: (pos: Position) => void;
  isNew?: boolean;
}

const PRICE_TYPES = [
  { value: "fixed", label: "Фиксированная" },
  { value: "from", label: "От (мин.)" },
] as const;

const NAV_ITEMS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "basic", label: "Основное", icon: <LayoutGrid size={16} /> },
  { key: "prices", label: "Цены", icon: <DollarSign size={16} /> },
  { key: "variants", label: "Варианты", icon: <Package size={16} /> },
  { key: "options", label: "Доп. опции", icon: <Puzzle size={16} /> },
  { key: "availability", label: "Доступность", icon: <Globe2 size={16} /> },
];

export function PositionEditPanel({ position, onClose, onSave, isNew }: Props) {
  const [tab, setTab] = useState<TabKey>("basic");

  // ── State ──────────────────────────────────────────────
  const [name, setName] = useState(position?.name ?? "");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(position?.price?.toString() ?? "");
  const [priceType, setPriceType] = useState<"fixed" | "from" | "variants">(position?.priceType ?? "fixed");
  const [sku, setSku] = useState(position?.sku ?? "");
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [enabled, setEnabled] = useState(position?.enabled ?? true);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(position?.categoryIds ?? []);

  const defaultSets = position?.variantPropertySetIds
    ? position.variantPropertySetIds.map((id) => globalSets.find((s) => s.id === id)).filter(Boolean) as PropertySet[]
    : (position?.priceType === "variants" ? [globalSets[0], globalSets[1]] : []);
  const defaultVariants = position?.variants ?? (position?.priceType === "variants" ? pizzaVariants : []);
  const [variantSets, setVariantSets] = useState<PropertySet[]>(defaultSets);
  const [variantList, setVariantList] = useState<PositionVariant[]>(defaultVariants);

  const defaultOverrides = position?.priceOverrides
    ?? (position?.priceType === "variants" ? pizzaPriceOverrides
      : (position?.id === "pos-1" ? rollPriceOverrides : []));
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>(defaultOverrides);
  const [linkedGroupIds, setLinkedGroupIds] = useState<string[]>(position?.optionGroupIds ?? []);
  const [inheritFromCategory, setInheritFromCategory] = useState(position?.availability.inheritFromCategory ?? true);
  const [availability, setAvailability] = useState<Availability>(
    position?.availability ?? { everywhere: false, schedule: { type: "daily", allDay: true }, cities: [] }
  );

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const categoryName = selectedCatIds[0]
    ? categories.find((c) => c.id === selectedCatIds[0])?.name : undefined;
  const categoryAvailability = selectedCatIds[0]
    ? categories.find((c) => c.id === selectedCatIds[0])?.availability : undefined;

  const hasVariants = variantList.length > 0;
  const isDirty = name !== (position?.name ?? "");

  const handleSave = () => {
    if (!name.trim()) { toast("Укажите название позиции", "error"); return; }
    const saved: Position = {
      id: position?.id ?? `pos-${Date.now()}`,
      name: name.trim(),
      categoryIds: selectedCatIds,
      optionGroupIds: linkedGroupIds,
      sku: sku || undefined,
      price: parseFloat(price) || 0,
      priceType: variantList.length > 0 ? "variants" : priceType,
      enabled,
      photo: position?.photo,
      variantPropertySetIds: variantSets.map((s) => s.id),
      variants: variantList,
      priceOverrides,
      availability: { ...availability, inheritFromCategory },
    };
    onSave?.(saved);
    toast(`Позиция «${saved.name}» сохранена`, "success");
    onClose();
  };

  const toggleCategory = (id: string) =>
    setSelectedCatIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleGroup = (id: string) =>
    setLinkedGroupIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // ── Badges for nav ──────────────────────────────────────
  const priceBadge = priceOverrides.length > 0
    ? `${[...new Set(priceOverrides.map((o) => o.cityId))].length} гор.` : null;
  const variantBadge = hasVariants ? String(variantList.length) : null;
  const optionsBadge = linkedGroupIds.length > 0 ? String(linkedGroupIds.length) : null;
  const availBadge = !inheritFromCategory ? "кастом" : null;

  const badges: Record<TabKey, string | null> = {
    basic: null,
    prices: priceBadge,
    variants: variantBadge,
    options: optionsBadge,
    availability: availBadge,
  };

  // ── Full-page layout ────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">

      {/* ─── Breadcrumb header ──────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[13px]">Позиции</span>
        </button>
        <ChevronRight size={13} className="text-gray-300" />
        <span className="text-[13px] text-gray-500 max-w-[200px] truncate">
          {name || (isNew ? "Новая позиция" : position?.name ?? "—")}
        </span>

        <div className="flex-1" />

        {isDirty && (
          <span className="flex items-center gap-1.5 text-[12px] text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Несохранённые изменения
          </span>
        )}

        {/* Status toggle */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${enabled ? "bg-green-50 border-green-200" : "bg-gray-100 border-gray-200"}`}>
          <Toggle checked={enabled} onChange={setEnabled} size="sm" />
          <span className={`text-[12px] font-medium ${enabled ? "text-green-700" : "text-gray-500"}`}>
            {enabled ? "Активна" : "Скрыта"}
          </span>
        </div>

        {/* More menu */}
        <div className="relative">
          <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreHorizontal size={16} className="text-gray-500" />
          </button>
          {showMoreMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[190px] py-1">
                <button className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Copy size={13} className="text-gray-400" /> Дублировать
                </button>
                <button
                  onClick={() => { setShowMoreMenu(false); toast("Позиция добавлена в стоп-лист", "warning"); }}
                  className="w-full text-left px-4 py-2 text-[13px] text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                >
                  <AlertTriangle size={13} /> В стоп-лист
                </button>
                {!isNew && (
                  <>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }}
                      className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={13} /> Удалить позицию
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm"
        >
          <Save size={14} /> Сохранить
        </button>
      </div>

      {/* ─── Body ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar – nav */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">

          {/* Position card */}
          <div className="p-4 border-b border-gray-100">
            {/* Photo */}
            <div className="relative group mb-3 mx-auto w-fit">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                {position?.photo
                  ? <img src={position.photo} className="w-full h-full object-cover" />
                  : <span className="text-[30px]">🍽️</span>}
                <div className="absolute inset-0 rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Image size={18} className="text-white" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[13px] font-semibold text-gray-900 truncate">
                {name || (isNew ? "Новая позиция" : "—")}
              </div>
              {sku && <div className="text-[11px] text-gray-400 font-mono mt-0.5">{sku}</div>}
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                {hasVariants && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                    {variantList.length} вар.
                  </span>
                )}
                {!hasVariants && price && (
                  <span className="text-[11px] font-semibold text-gray-700">{price} ₽</span>
                )}
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 py-2 px-2">
            {NAV_ITEMS.map(({ key, label, icon }) => {
              const badge = badges[key];
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-0.5 transition-colors group ${
                    active
                      ? "bg-orange-50 text-orange-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className={active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"}>
                    {icon}
                  </span>
                  <span className="text-[13px] font-medium flex-1">{label}</span>
                  {badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                      key === "prices" ? "bg-blue-100 text-blue-700" :
                      key === "variants" ? "bg-amber-100 text-amber-700" :
                      key === "options" ? "bg-purple-100 text-purple-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>
                      {badge}
                    </span>
                  )}
                  {active && <div className="w-1 h-1 rounded-full bg-orange-500 shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* Categories quick view */}
          {selectedCatIds.length > 0 && (
            <div className="p-3 border-t border-gray-100">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Категории</div>
              <div className="flex flex-wrap gap-1">
                {selectedCatIds.slice(0, 3).map((cid) => {
                  const cat = categories.find((c) => c.id === cid);
                  return cat ? (
                    <span key={cid} className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                      {cat.name}
                    </span>
                  ) : null;
                })}
                {selectedCatIds.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{selectedCatIds.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Main content ────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 max-w-5xl mx-auto">

            {/* ── BASIC ──────────────────────────────── */}
            {tab === "basic" && (
              <div className="grid grid-cols-5 gap-8">

                {/* Left: main fields */}
                <div className="col-span-3 space-y-6">
                  <div>
                    <h2 className="text-[16px] font-semibold text-gray-900 mb-4">Основная информация</h2>

                    {/* Name */}
                    <div className="mb-4">
                      <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        Название <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Пицца Маргарита"
                        className="w-full px-4 py-2.5 text-[15px] border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
                      />
                    </div>

                    {/* SKU */}
                    <div className="mb-4">
                      <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        <Tag size={11} /> Артикул (SKU)
                      </label>
                      <input
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="SKU-001"
                        className="w-full px-4 py-2.5 text-[14px] border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 font-mono transition-colors"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                        Описание
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Состав, особенности приготовления..."
                        rows={3}
                        className="w-full px-4 py-3 text-[14px] border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                      Категории
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedCatIds.map((cid) => {
                        const cat = categories.find((c) => c.id === cid);
                        return cat ? (
                          <span key={cid} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-full text-[13px]">
                            {cat.name}
                            <button onClick={() => toggleCategory(cid)} className="text-orange-400 hover:text-orange-700 transition-colors">×</button>
                          </span>
                        ) : null;
                      })}
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) toggleCategory(e.target.value); }}
                        className="px-3 py-1.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-full text-[13px] bg-white cursor-pointer hover:border-orange-400 hover:text-orange-600 appearance-none pr-6 transition-colors"
                      >
                        <option value="">+ Категория</option>
                        {categories.filter((c) => !selectedCatIds.includes(c.id)).map((c) => (
                          <option key={c.id} value={c.id}>{c.parentId ? `  └ ${c.name}` : c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Price */}
                  {!hasVariants ? (
                    <div>
                      <label className="block text-[12px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Цена</label>
                      <div className="p-5 bg-white rounded-2xl border-2 border-gray-200">
                        <div className="flex gap-2 mb-4">
                          {PRICE_TYPES.map((pt) => (
                            <button
                              key={pt.value}
                              onClick={() => setPriceType(pt.value)}
                              className={`px-4 py-2 rounded-xl text-[13px] border-2 transition-colors font-medium ${
                                priceType === pt.value
                                  ? "bg-orange-50 border-orange-400 text-orange-700"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                              }`}
                            >
                              {pt.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              type="number"
                              placeholder="0"
                              className="w-32 px-4 py-2.5 pr-7 text-[16px] font-semibold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₽</span>
                          </div>
                          {priceType === "from" && (
                            <span className="text-[13px] text-gray-500">Отображается: «от {price || "0"} ₽»</span>
                          )}
                        </div>
                        <button onClick={() => setTab("variants")}
                          className="mt-3 flex items-center gap-1.5 text-[12px] text-orange-600 hover:text-orange-700 transition-colors">
                          <Layers size={12} /> Нужны варианты? → вкладка «Варианты»
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-start gap-3">
                      <Package size={18} className="text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[14px] font-semibold text-orange-800">Режим вариантов</div>
                        <div className="text-[13px] text-orange-700 mt-0.5">
                          {variantList.length} вариантов ·{" "}
                          от {Math.min(...variantList.map((v) => v.price))} до {Math.max(...variantList.map((v) => v.price))} ₽
                        </div>
                        <button onClick={() => setTab("variants")}
                          className="mt-2 text-[13px] text-orange-600 underline hover:no-underline">
                          Управление вариантами →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: photo + nutrition */}
                <div className="col-span-2 space-y-6">
                  {/* Photo */}
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-2 uppercase tracking-wide">Фото</label>
                    {position?.photo ? (
                      <div className="relative group w-full aspect-square rounded-2xl overflow-hidden border-2 border-gray-200 cursor-pointer">
                        <img src={position.photo} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl text-[12px] font-medium text-gray-800 hover:bg-gray-50">
                            <PenLine size={13} /> Заменить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 bg-gray-50 transition-colors group">
                        <Image size={32} className="text-gray-300 group-hover:text-orange-400 mb-2 transition-colors" />
                        <span className="text-[13px] text-gray-400 group-hover:text-orange-500 font-medium">Загрузить фото</span>
                        <span className="text-[11px] text-gray-300 mt-1">JPG, PNG до 5 МБ</span>
                      </div>
                    )}
                  </div>

                  {/* Nutrition */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                      <Scale size={12} /> КБЖУ и вес
                    </label>
                    <div className="p-4 bg-white rounded-2xl border-2 border-gray-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input value={weight} onChange={(e) => setWeight(e.target.value)}
                            placeholder="0" type="number"
                            className="w-full px-3 py-2 pr-7 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">г</span>
                        </div>
                        <span className="text-[12px] text-gray-500 w-16 shrink-0">вес</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input value={calories} onChange={(e) => setCalories(e.target.value)}
                            placeholder="0" type="number"
                            className="w-full px-3 py-2 pr-12 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">ккал</span>
                        </div>
                        <span className="text-[12px] text-gray-500 w-16 shrink-0">калории</span>
                      </div>
                      <button className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors">
                        + Белки / жиры / углеводы
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PRICES ─────────────────────────────── */}
            {tab === "prices" && (
              <>
                <h2 className="text-[16px] font-semibold text-gray-900 mb-5">Гео-ценообразование</h2>
                <PricesTab
                  isVariants={hasVariants}
                  basePrice={parseFloat(price) || 0}
                  onBasePriceChange={(p) => setPrice(String(p))}
                  variants={variantList}
                  variantSets={variantSets}
                  priceOverrides={priceOverrides}
                  onChange={setPriceOverrides}
                />
              </>
            )}

            {/* ── VARIANTS ───────────────────────────── */}
            {tab === "variants" && (
              <>
                <h2 className="text-[16px] font-semibold text-gray-900 mb-5">Варианты товара</h2>
                <VariantsTab
                  positionName={name || position?.name || "позиция"}
                  positionId={position?.id}
                  initialSets={variantSets}
                  initialVariants={variantList}
                  onChange={(sets, vars) => {
                    setVariantSets(sets);
                    setVariantList(vars);
                    if (vars.length > 0) setPriceType("variants");
                  }}
                  onDetachVariant={(variant, label) => {
                    const updated = variantList.filter((v) => v.id !== variant.id);
                    setVariantList(updated);
                    if (updated.length === 0) setPriceType("fixed");
                    toast(`Вариант «${label}» будет создан как отдельный товар`, "success");
                  }}
                />
              </>
            )}

            {/* ── OPTIONS ────────────────────────────── */}
            {tab === "options" && (
              <>
                <h2 className="text-[16px] font-semibold text-gray-900 mb-5">Группы дополнительных опций</h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <Info size={15} className="text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-[13px] text-blue-900">
                      <span className="font-semibold">Группы опций</span> — наборы модификаторов (топпинги, соусы, добавки), которые клиент выбирает при заказе.
                    </div>
                  </div>

                  {linkedGroupIds.length === 0 && (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                      <div className="text-[40px] mb-2">🧩</div>
                      <div className="text-[14px] font-medium text-gray-500">Нет привязанных групп опций</div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {linkedGroupIds.map((ogId) => {
                      const group = optionGroups.find((g) => g.id === ogId);
                      if (!group) return null;
                      return (
                        <div key={ogId} className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-2xl bg-white hover:border-orange-200 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                            <span className="text-[18px]">🧩</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-gray-800">{group.name}</div>
                            <div className="text-[12px] text-gray-400 mt-0.5">
                              {group.blocks.length} блоков · {group.blocks.reduce((s, b) => s + b.options.length, 0)} опций
                            </div>
                          </div>
                          <button onClick={() => toggleGroup(ogId)}
                            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
                            <X size={13} /> Отвязать
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowGroupPicker(!showGroupPicker)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-300 rounded-2xl text-[13px] text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/30 transition-colors"
                    >
                      <Plus size={16} /> Привязать группу опций
                    </button>
                    {showGroupPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowGroupPicker(false)} />
                        <div className="absolute bottom-14 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 py-1 max-h-64 overflow-y-auto">
                          {optionGroups.filter((g) => !linkedGroupIds.includes(g.id)).map((g) => (
                            <button
                              key={g.id}
                              onClick={() => { toggleGroup(g.id); setShowGroupPicker(false); }}
                              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-orange-50 text-left transition-colors border-b border-gray-50 last:border-0"
                            >
                              <span className="text-[20px]">🧩</span>
                              <div>
                                <div className="text-[13px] font-semibold text-gray-800">{g.name}</div>
                                <div className="text-[11px] text-gray-400">
                                  {g.blocks.length} блоков · {g.blocks.reduce((s, b) => s + b.options.length, 0)} опций
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── AVAILABILITY ───────────────────────── */}
            {tab === "availability" && (
              <>
                <h2 className="text-[16px] font-semibold text-gray-900 mb-5">Настройки доступности</h2>
                <div className="space-y-5">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                    <Info size={15} className="text-orange-600 mt-0.5 shrink-0" />
                    <div className="text-[13px] text-orange-900">
                      <span className="font-semibold">По умолчанию позиция наследует доступность категории.</span>
                      {" "}Отключите наследование, чтобы задать индивидуальные настройки для этого товара.
                    </div>
                  </div>
                  <AvailabilitySection
                    availability={inheritFromCategory && categoryAvailability ? categoryAvailability : availability}
                    onChange={setAvailability}
                    showInheritToggle
                    inherited={inheritFromCategory}
                    onInheritChange={setInheritFromCategory}
                    inheritedFromLabel={categoryName}
                  />
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Удалить «${position?.name}»?`}
          description="Позиция будет удалена. Это действие нельзя отменить."
          confirmLabel="Удалить"
          onConfirm={() => { setShowDeleteConfirm(false); toast(`«${position?.name}» удалена`, "warning"); onClose(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
