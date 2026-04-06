import { useState, useRef } from "react";
import {
  Plus, X, ChevronDown, ChevronRight, MapPin, Building2,
  Zap, RotateCcw, TrendingUp, AlertCircle, Check,
  Copy, Search, Globe,
} from "lucide-react";
import { cities, City, Location, PropertySet, PositionVariant, PriceOverride } from "../data/mockData";
import { toast } from "./shared/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PricesTabProps {
  isVariants: boolean;
  basePrice: number;
  onBasePriceChange: (price: number) => void;
  variants: PositionVariant[];
  variantSets: PropertySet[];
  priceOverrides: PriceOverride[];
  onChange: (overrides: PriceOverride[]) => void;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function getVariantLabel(variant: PositionVariant, sets: PropertySet[]): string {
  return sets
    .map((s) => s.values.find((v) => v.id === variant.properties[s.id])?.name ?? "?")
    .join(" / ");
}

function getEffective(
  variantId: string | null, cityId: string, locationId: string | undefined,
  basePrice: number, variants: PositionVariant[], overrides: PriceOverride[]
): { price: number; source: "base" | "city" | "location" } {
  const base = variantId ? (variants.find((v) => v.id === variantId)?.price ?? basePrice) : basePrice;
  if (locationId) {
    const locOv = overrides.find((o) => o.cityId === cityId && o.locationId === locationId);
    if (locOv) {
      const p = variantId ? locOv.variantPrices?.[variantId] : locOv.price;
      if (p !== undefined) return { price: p, source: "location" };
    }
  }
  const cityOv = overrides.find((o) => o.cityId === cityId && !o.locationId);
  if (cityOv) {
    const p = variantId ? cityOv.variantPrices?.[variantId] : cityOv.price;
    if (p !== undefined) return { price: p, source: "city" };
  }
  return { price: base, source: "base" };
}

function fmt(n: number) { return n.toLocaleString("ru-RU") + " ₽"; }

function applyMarkup(base: number, type: "pct" | "rub", value: number): number {
  return type === "pct" ? Math.round(base * (1 + value / 100)) : Math.round(base + value);
}

// ─── Inline price input ───────────────────────────────────────────────────────
function InlinePriceInput({ value, inheritedPrice, inheritedLabel, onChange, onClear, isSet, compact = false }: {
  value: number | undefined; inheritedPrice: number; inheritedLabel: string;
  onChange: (v: number) => void; onClear: () => void; isSet: boolean; compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (!isSet) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-gray-400 ${compact ? "text-[11px]" : "text-[12px]"}`}>
          — {fmt(inheritedPrice)} <span className="text-gray-300">({inheritedLabel})</span>
        </span>
        <button onClick={() => { onChange(inheritedPrice); setEditing(true); }}
          className={`text-orange-500 hover:text-orange-700 hover:underline ${compact ? "text-[10px]" : "text-[11px]"} transition-colors`}>
          Задать
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="relative">
        <input autoFocus type="number" defaultValue={value}
          onBlur={(e) => { onChange(parseFloat(e.target.value) || 0); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(false); }}
          className={`pr-5 pl-2 py-1 border-2 border-orange-400 rounded-lg focus:outline-none ${compact ? "w-20 text-[12px]" : "w-24 text-[13px]"}`} />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">₽</span>
      </div>
    );
  }

  const diff = (value ?? 0) - inheritedPrice;
  const diffStr = diff === 0 ? "" : diff > 0 ? `+${diff}` : `${diff}`;

  return (
    <div className="flex items-center gap-1.5 group">
      <button onClick={() => setEditing(true)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors ${compact ? "text-[12px]" : "text-[13px] font-medium"}`}>
        {fmt(value!)}
        {diffStr && <span className={`text-[10px] ${diff > 0 ? "text-rose-500" : "text-green-600"}`}>{diffStr}</span>}
        <span className="text-orange-300 text-[10px] opacity-0 group-hover:opacity-100">✏</span>
      </button>
      <button onClick={onClear} title="Убрать переопределение"
        className="p-0.5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
        <X size={11} />
      </button>
    </div>
  );
}

// ─── Markup Panel ─────────────────────────────────────────────────────────────
function MarkupPanel({ parentLabel, onApply, onClose }: {
  parentLabel: string;
  onApply: (type: "pct" | "rub", value: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"pct" | "rub">("pct");
  const [custom, setCustom] = useState("");

  const quickPct = [5, 10, 15, 20];
  const quickRub = [50, 100, 200, 500];
  const negPct = [-5, -10];
  const negRub = [-50, -100];

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-3 min-w-[230px]">
        <div className="text-[12px] font-medium text-gray-700 mb-2">Корректировка цен</div>
        {/* Mode switcher */}
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg mb-3">
          {(["pct", "rub"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-colors ${mode === m ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              {m === "pct" ? "В процентах" : "В рублях"}
            </button>
          ))}
        </div>
        {/* Quick positive */}
        <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Наценка</div>
        <div className="flex gap-1 flex-wrap mb-2">
          {(mode === "pct" ? quickPct : quickRub).map((v) => (
            <button key={v} onClick={() => { onApply(mode, v); onClose(); }}
              className="px-2 py-1 text-[11px] bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
              +{v}{mode === "pct" ? "%" : "₽"}
            </button>
          ))}
        </div>
        {/* Quick negative */}
        <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Скидка</div>
        <div className="flex gap-1 flex-wrap mb-3">
          {(mode === "pct" ? negPct : negRub).map((v) => (
            <button key={v} onClick={() => { onApply(mode, v); onClose(); }}
              className="px-2 py-1 text-[11px] bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
              {v}{mode === "pct" ? "%" : "₽"}
            </button>
          ))}
        </div>
        {/* Custom input */}
        <div className="text-[10px] text-gray-400 mb-1">Своё значение</div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type="number" value={custom} onChange={(e) => setCustom(e.target.value)}
              placeholder="±0" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { const v = parseFloat(custom); if (!isNaN(v)) { onApply(mode, v); onClose(); } } }}
              className="w-full px-2 py-1.5 pr-7 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
              {mode === "pct" ? "%" : "₽"}
            </span>
          </div>
          <button
            onClick={() => { const v = parseFloat(custom); if (!isNaN(v)) { onApply(mode, v); onClose(); } }}
            className="px-2.5 py-1.5 bg-orange-500 text-white text-[11px] rounded-lg hover:bg-orange-600">
            ↵
          </button>
        </div>
        <div className="text-[10px] text-gray-400 mt-2">Применяется к ценам {parentLabel}</div>
      </div>
    </>
  );
}

// ─── Compact Variant Price Table ──────────────────────────────────────────────
function VariantPriceTable({ title, variants, sets, overrideValues, parentValues, parentLabel,
  onSet, onClear, onSetAll, onCopyParent, onAdjustAmount, compact = false,
}: {
  title?: string; variants: PositionVariant[]; sets: PropertySet[];
  overrideValues: Record<string, number | undefined>; parentValues: Record<string, number>;
  parentLabel: string; onSet: (vid: string, p: number) => void; onClear: (vid: string) => void;
  onSetAll?: (p: number) => void; onCopyParent?: () => void;
  onAdjustAmount?: (type: "pct" | "rub", value: number) => void; compact?: boolean;
}) {
  const [showBulk, setShowBulk] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [showMarkup, setShowMarkup] = useState(false);
  const overriddenCount = Object.values(overrideValues).filter((v) => v !== undefined).length;

  return (
    <div className={compact ? "" : "bg-white rounded-xl border border-gray-200 overflow-hidden"}>
      {!compact && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap">
          {title && <span className="text-[12px] font-semibold text-gray-700">{title}</span>}
          <span className="text-[11px] text-gray-400">
            {overriddenCount > 0 ? `${overriddenCount} из ${variants.length} переопр.` : "все наследуют"}
          </span>
          <div className="flex-1" />
          {onCopyParent && (
            <button onClick={onCopyParent}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Copy size={11} /> Скопировать {parentLabel}
            </button>
          )}
          {onAdjustAmount && (
            <div className="relative">
              <button onClick={() => setShowMarkup(!showMarkup)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TrendingUp size={11} /> Наценка <ChevronDown size={9} className="text-gray-400" />
              </button>
              {showMarkup && <MarkupPanel parentLabel={parentLabel} onApply={onAdjustAmount} onClose={() => setShowMarkup(false)} />}
            </div>
          )}
          {onSetAll && (
            <div className="relative">
              <button onClick={() => setShowBulk(!showBulk)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
                <Zap size={11} /> Задать всем
              </button>
              {showBulk && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowBulk(false)} />
                  <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-3 w-48">
                    <div className="text-[12px] font-medium text-gray-700 mb-2">Единая цена</div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)}
                          placeholder="0" autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") { onSetAll(parseFloat(bulkPrice) || 0); setShowBulk(false); setBulkPrice(""); } }}
                          className="w-full px-2 py-1.5 pr-5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">₽</span>
                      </div>
                      <button onClick={() => { onSetAll(parseFloat(bulkPrice) || 0); setShowBulk(false); setBulkPrice(""); }}
                        className="px-2 py-1.5 bg-orange-500 text-white text-[12px] rounded-lg hover:bg-orange-600">↵</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {/* Compact markup buttons */}
      {compact && onAdjustAmount && (
        <div className="flex items-center gap-1.5 mb-2">
          {([5, 10, -5] as const).map((v) => (
            <button key={v} onClick={() => onAdjustAmount("pct", v)}
              className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${v > 0 ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"}`}>
              {v > 0 ? "+" : ""}{v}%
            </button>
          ))}
          {([50, 100, -50] as const).map((v) => (
            <button key={v} onClick={() => onAdjustAmount("rub", v)}
              className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${v > 0 ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"}`}>
              {v > 0 ? "+" : ""}{v}₽
            </button>
          ))}
          {onCopyParent && (
            <button onClick={onCopyParent}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors ml-1">
              <Copy size={9} /> Из {parentLabel}
            </button>
          )}
        </div>
      )}
      <div className={compact ? "space-y-1.5" : ""}>
        {variants.map((v, idx) => {
          const label = getVariantLabel(v, sets);
          const overrideVal = overrideValues[v.id];
          const parentPrice = parentValues[v.id] ?? 0;
          const isSet = overrideVal !== undefined;
          return (
            <div key={v.id}
              className={compact
                ? "flex items-center gap-3 py-1"
                : `flex items-center gap-3 px-4 py-2.5 ${idx !== 0 ? "border-t border-gray-50" : ""} hover:bg-gray-50/50 transition-colors`}>
              <span className={`flex-1 min-w-0 truncate ${compact ? "text-[12px] text-gray-600" : "text-[13px] text-gray-700"}`}>{label}</span>
              <InlinePriceInput value={overrideVal} inheritedPrice={parentPrice} inheritedLabel={parentLabel}
                onChange={(p) => onSet(v.id, p)} onClear={() => onClear(v.id)} isSet={isSet} compact={compact} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Location Row ─────────────────────────────────────────────────────────────
function LocationRow({ location, cityId, isVariants, basePrice, variants, variantSets,
  overrides, cityOverride, onUpdateOverride, onRemoveOverride,
}: {
  location: Location; cityId: string; isVariants: boolean; basePrice: number;
  variants: PositionVariant[]; variantSets: PropertySet[]; overrides: PriceOverride[];
  cityOverride: PriceOverride | undefined;
  onUpdateOverride: (o: PriceOverride) => void; onRemoveOverride: (locationId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const locOverride = overrides.find((o) => o.cityId === cityId && o.locationId === location.id);
  const hasOverride = !!locOverride;

  const parentPrices: Record<string, number> = {};
  variants.forEach((v) => { parentPrices[v.id] = cityOverride?.variantPrices?.[v.id] ?? v.price; });
  const parentFixedPrice = cityOverride?.price ?? basePrice;
  const locFixed = locOverride?.price;
  const locParentLabel = cityOverride?.price !== undefined ? "из города" : "базовая";

  const applyAdjust = (type: "pct" | "rub", value: number) => {
    const currentVP = locOverride?.variantPrices ?? {};
    const updated: Record<string, number> = {};
    variants.forEach((v) => { updated[v.id] = applyMarkup(currentVP[v.id] ?? parentPrices[v.id], type, value); });
    onUpdateOverride({ ...(locOverride ?? { id: `po-loc-${Date.now()}`, cityId, locationId: location.id }), variantPrices: updated });
    toast(`${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : "₽"} для ${location.name}`, "success");
  };

  const copyFromParent = () => {
    if (!isVariants) {
      const existing = locOverride ?? { id: `po-loc-${Date.now()}`, cityId, locationId: location.id };
      onUpdateOverride({ ...existing, price: parentFixedPrice });
    } else {
      const vp: Record<string, number> = {};
      variants.forEach((v) => { vp[v.id] = parentPrices[v.id]; });
      onUpdateOverride({ ...(locOverride ?? { id: `po-loc-${Date.now()}`, cityId, locationId: location.id }), variantPrices: vp });
    }
    toast(`Цены скопированы из ${locParentLabel}`, "success");
  };

  const resetOverride = () => {
    onRemoveOverride(location.id);
    toast(`Переопределение для «${location.name}» сброшено`, "success");
  };

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden transition-colors ${hasOverride ? "border-orange-200" : ""}`}>
      <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${hasOverride ? "bg-orange-50/50 hover:bg-orange-50" : "bg-white hover:bg-gray-50"}`}
        onClick={() => isVariants && hasOverride ? setExpanded(!expanded) : undefined}>
        <Building2 size={14} className={hasOverride ? "text-orange-400" : "text-gray-300"} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-gray-800 truncate">{location.name}</div>
          <div className="text-[11px] text-gray-400">{location.address}</div>
        </div>

        {!isVariants ? (
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <InlinePriceInput value={locFixed} inheritedPrice={parentFixedPrice} inheritedLabel={locParentLabel}
              onChange={(p) => {
                const existing = locOverride ?? { id: `po-loc-${Date.now()}`, cityId, locationId: location.id };
                onUpdateOverride({ ...existing, price: p });
              }}
              onClear={resetOverride}
              isSet={hasOverride && locFixed !== undefined} />
            {hasOverride && (
              <div className="flex items-center gap-1 border-l border-gray-200 pl-1.5 ml-0.5">
                <button onClick={copyFromParent} title={`Скопировать ${locParentLabel}`}
                  className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                  <Copy size={12} />
                </button>
                <button onClick={resetOverride} title="Сбросить"
                  className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                  <RotateCcw size={12} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {hasOverride ? (
              <>
                <span className="text-[11px] text-orange-600">
                  {Object.keys(locOverride?.variantPrices ?? {}).length} вар.
                </span>
                {/* Quick markup chips */}
                <div className="flex gap-1 border-l border-gray-200 pl-1.5">
                  <button onClick={() => applyAdjust("pct", 5)}
                    className="px-1.5 py-0.5 text-[10px] bg-orange-50 text-orange-600 border border-orange-200 rounded hover:bg-orange-100 transition-colors">+5%</button>
                  <button onClick={() => applyAdjust("rub", 100)}
                    className="px-1.5 py-0.5 text-[10px] bg-orange-50 text-orange-600 border border-orange-200 rounded hover:bg-orange-100 transition-colors">+100₽</button>
                  <button onClick={copyFromParent} title="Скопировать из города"
                    className="p-0.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors">
                    <Copy size={12} />
                  </button>
                  <button onClick={resetOverride} title="Сбросить все переопределения"
                    className="p-0.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded transition-colors">
                    <RotateCcw size={12} />
                  </button>
                </div>
                <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-white rounded-lg">
                  {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </button>
              </>
            ) : (
              <button
                onClick={() => { onUpdateOverride({ id: `po-loc-${Date.now()}`, cityId, locationId: location.id, variantPrices: {} }); setExpanded(true); }}
                className="text-[11px] text-orange-500 hover:text-orange-700 border border-dashed border-orange-300 px-2.5 py-1 rounded-lg hover:bg-orange-50 transition-colors">
                + Особые цены
              </button>
            )}
          </div>
        )}
      </div>

      {isVariants && hasOverride && expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-white">
          <VariantPriceTable
            variants={variants} sets={variantSets}
            overrideValues={locOverride?.variantPrices ?? {}}
            parentValues={parentPrices}
            parentLabel={cityOverride?.variantPrices ? "из города" : "базовая"}
            onSet={(vid, p) => onUpdateOverride({ ...locOverride!, variantPrices: { ...(locOverride?.variantPrices ?? {}), [vid]: p } })}
            onClear={(vid) => { const u = { ...(locOverride?.variantPrices ?? {}) }; delete u[vid]; onUpdateOverride({ ...locOverride!, variantPrices: u }); }}
            onCopyParent={() => { const vp: Record<string, number> = {}; variants.forEach((v) => { vp[v.id] = parentPrices[v.id]; }); onUpdateOverride({ ...locOverride!, variantPrices: vp }); toast("Скопированы из города", "success"); }}
            onAdjustAmount={(type, value) => {
              const current = locOverride?.variantPrices ?? {};
              const vp: Record<string, number> = {};
              variants.forEach((v) => { vp[v.id] = applyMarkup(current[v.id] ?? parentPrices[v.id], type, value); });
              onUpdateOverride({ ...locOverride!, variantPrices: vp });
              toast(`${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : "₽"} для ${location.name}`, "success");
            }}
            compact
          />
        </div>
      )}
    </div>
  );
}

// ─── City Override Card ───────────────────────────────────────────────────────
function CityOverrideCard({ city, isVariants, basePrice, variants, variantSets, overrides, onUpdate, onRemoveCity }: {
  city: City; isVariants: boolean; basePrice: number; variants: PositionVariant[];
  variantSets: PropertySet[]; overrides: PriceOverride[];
  onUpdate: (updated: PriceOverride[]) => void; onRemoveCity: () => void;
}) {
  const [locExpanded, setLocExpanded] = useState(true);

  const cityOverride = overrides.find((o) => o.cityId === city.id && !o.locationId);
  const locationOverrides = overrides.filter((o) => o.cityId === city.id && !!o.locationId);
  const locOverrideCount = locationOverrides.length;
  const cityHasPrice = isVariants
    ? Object.keys(cityOverride?.variantPrices ?? {}).length > 0
    : cityOverride?.price !== undefined;

  const basePrices: Record<string, number> = {};
  variants.forEach((v) => { basePrices[v.id] = v.price; });

  const updateCityOverride = (patch: Partial<PriceOverride>) => {
    const existing = cityOverride ?? { id: `po-city-${Date.now()}`, cityId: city.id };
    onUpdate([...overrides.filter((o) => !(o.cityId === city.id && !o.locationId)), { ...existing, ...patch }]);
  };

  const updateLocOverride = (override: PriceOverride) => {
    onUpdate([...overrides.filter((o) => !(o.cityId === city.id && o.locationId === override.locationId)), override]);
  };

  const removeLocOverride = (locationId: string) => {
    onUpdate(overrides.filter((o) => !(o.cityId === city.id && o.locationId === locationId)));
  };

  const applyAdjustForCity = (type: "pct" | "rub", value: number) => {
    const vp: Record<string, number> = {};
    variants.forEach((v) => {
      const base = cityOverride?.variantPrices?.[v.id] ?? v.price;
      vp[v.id] = applyMarkup(base, type, value);
    });
    updateCityOverride({ variantPrices: vp });
    toast(`Цены скорректированы на ${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : "₽"}`, "success");
  };

  const cityVariantCount = Object.keys(cityOverride?.variantPrices ?? {}).length;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-50/60 to-transparent border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <MapPin size={14} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-gray-900">{city.name}</div>
          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            {cityHasPrice && <span className="text-orange-600">{isVariants ? `${cityVariantCount} вар. переопр.` : "особая цена"}</span>}
            {locOverrideCount > 0 && <span className="text-purple-600">{locOverrideCount} точки с особыми ценами</span>}
            {!cityHasPrice && locOverrideCount === 0 && <span className="text-gray-400">нет переопределений</span>}
          </div>
        </div>
        <button onClick={onRemoveCity}
          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors ml-1">
          <X size={14} />
        </button>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={13} className="text-gray-400" />
          <span className="text-[12px] font-medium text-gray-700">Для всех точек {city.name}</span>
          <span className="text-[11px] text-gray-400">(если нет особой цены для точки)</span>
        </div>

        {!isVariants ? (
          <div className="flex items-center gap-2 flex-wrap">
            <InlinePriceInput value={cityOverride?.price} inheritedPrice={basePrice} inheritedLabel="базовая"
              onChange={(p) => updateCityOverride({ price: p })}
              onClear={() => onUpdate(overrides.filter((o) => !(o.cityId === city.id && !o.locationId)))}
              isSet={cityOverride?.price !== undefined} />
            {cityOverride?.price !== undefined && (
              <>
                <button onClick={() => updateCityOverride({ price: basePrice })}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Copy size={11} /> Из базовой
                </button>
                <button onClick={() => onUpdate(overrides.filter((o) => !(o.cityId === city.id && !o.locationId)))}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                  <RotateCcw size={11} /> Сбросить
                </button>
              </>
            )}
          </div>
        ) : (
          <VariantPriceTable
            variants={variants} sets={variantSets}
            overrideValues={cityOverride?.variantPrices ?? {}} parentValues={basePrices} parentLabel="базовая"
            onSet={(vid, p) => updateCityOverride({ variantPrices: { ...(cityOverride?.variantPrices ?? {}), [vid]: p } })}
            onClear={(vid) => { const u = { ...(cityOverride?.variantPrices ?? {}) }; delete u[vid]; updateCityOverride({ variantPrices: u }); }}
            onSetAll={(p) => { const vp: Record<string, number> = {}; variants.forEach((v) => { vp[v.id] = p; }); updateCityOverride({ variantPrices: vp }); toast(`${fmt(p)} для всех в ${city.name}`, "success"); }}
            onCopyParent={() => { const vp: Record<string, number> = {}; variants.forEach((v) => { vp[v.id] = v.price; }); updateCityOverride({ variantPrices: vp }); toast("Базовые цены скопированы", "success"); }}
            onAdjustAmount={applyAdjustForCity}
          />
        )}
      </div>

      <div className="border-t border-gray-100">
        <button onClick={() => setLocExpanded(!locExpanded)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
          {locExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          <Building2 size={13} className="text-gray-400" />
          <span className="text-[12px] font-medium text-gray-700">Точки {city.name}</span>
          <span className="text-[11px] text-gray-400 ml-1">{city.locations.length} шт · {locOverrideCount} с особыми ценами</span>
        </button>
        {locExpanded && (
          <div className="px-4 pb-4 space-y-2">
            {city.locations.map((loc) => (
              <LocationRow key={loc.id} location={loc} cityId={city.id} isVariants={isVariants}
                basePrice={basePrice} variants={variants} variantSets={variantSets}
                overrides={overrides} cityOverride={cityOverride}
                onUpdateOverride={updateLocOverride} onRemoveOverride={removeLocOverride} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── City Picker ──────────────────────────────────────────────────────────────
function CityPicker({ usedCityIds, onSelect, onClose }: {
  usedCityIds: string[]; onSelect: (c: City) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const available = cities.filter((c) => !usedCityIds.includes(c.id) && (!search || c.name.toLowerCase().includes(search.toLowerCase())));
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-12 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 w-64 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск города..."
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto py-1">
          {available.length > 0 ? available.map((city) => (
            <button key={city.id} onClick={() => { onSelect(city); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-left transition-colors">
              <MapPin size={14} className="text-orange-400 shrink-0" />
              <div>
                <div className="text-[13px] font-medium text-gray-800">{city.name}</div>
                <div className="text-[11px] text-gray-400">{city.locations.length} точки</div>
              </div>
            </button>
          )) : (
            <div className="px-4 py-6 text-center text-[12px] text-gray-400">
              {search ? "Город не найден" : "Все города уже добавлены"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Summary Table ────────────────────────────────────────────────────────────
function SummaryTable({ isVariants, basePrice, variants, variantSets, overrides }: {
  isVariants: boolean; basePrice: number; variants: PositionVariant[];
  variantSets: PropertySet[]; overrides: PriceOverride[];
}) {
  const overrideCityIds = [...new Set(overrides.map((o) => o.cityId))];
  const overrideCities = cities.filter((c) => overrideCityIds.includes(c.id));
  if (overrideCities.length === 0) return null;
  const summaryVariants = variants.slice(0, 4);
  const moreCount = variants.length - summaryVariants.length;

  return (
    <div className="mt-2">
      <div className="text-[12px] font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <Globe size={13} className="text-gray-400" /> Сводка эффективных цен
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="text-left">
              <th className="text-gray-400 font-normal pb-2 pr-4">{isVariants ? "Вариант" : "Позиция"}</th>
              <th className="text-gray-600 font-medium pb-2 pr-4">Базовая</th>
              {overrideCities.map((c) => (
                <th key={c.id} className="text-blue-600 font-medium pb-2 pr-4">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isVariants ? summaryVariants.map((v) => (
              <tr key={v.id} className="border-t border-gray-100">
                <td className="py-1.5 pr-4 text-gray-500 max-w-[120px] truncate">{getVariantLabel(v, variantSets)}</td>
                <td className="py-1.5 pr-4 text-gray-700 font-medium">{fmt(v.price)}</td>
                {overrideCities.map((c) => {
                  const eff = getEffective(v.id, c.id, undefined, basePrice, variants, overrides);
                  return (
                    <td key={c.id} className="py-1.5 pr-4">
                      <span className={eff.source !== "base" ? "text-orange-600 font-medium" : "text-gray-400"}>
                        {fmt(eff.price)}
                        {eff.source !== "base" && (
                          <span className={`ml-1 text-[10px] ${eff.price > v.price ? "text-rose-400" : "text-green-500"}`}>
                            {eff.price > v.price ? "+" : ""}{eff.price - v.price}
                          </span>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            )) : (
              <tr className="border-t border-gray-100">
                <td className="py-1.5 pr-4 text-gray-500">Цена</td>
                <td className="py-1.5 pr-4 text-gray-700 font-medium">{fmt(basePrice)}</td>
                {overrideCities.map((c) => {
                  const eff = getEffective(null, c.id, undefined, basePrice, [], overrides);
                  return (
                    <td key={c.id} className="py-1.5 pr-4">
                      <span className={eff.source !== "base" ? "text-orange-600 font-medium" : "text-gray-400"}>
                        {fmt(eff.price)}
                        {eff.source !== "base" && (
                          <span className={`ml-1 text-[10px] ${eff.price > basePrice ? "text-rose-400" : "text-green-500"}`}>
                            {eff.price > basePrice ? "+" : ""}{eff.price - basePrice}
                          </span>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            )}
            {moreCount > 0 && (
              <tr><td colSpan={2 + overrideCities.length} className="py-1.5 text-gray-400 text-[11px]">+ ещё {moreCount} вариантов</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main PricesTab ───────────────────────────────────────────────────────────
export function PricesTab({ isVariants, basePrice, onBasePriceChange, variants, variantSets, priceOverrides, onChange }: PricesTabProps) {
  const [showCityPicker, setShowCityPicker] = useState(false);

  const usedCityIds = [...new Set(priceOverrides.map((o) => o.cityId))];
  const overrideCities = cities.filter((c) => usedCityIds.includes(c.id));
  const allCitiesCovered = cities.every((c) => usedCityIds.includes(c.id));

  const addCity = (city: City) => {
    onChange([...priceOverrides, { id: `po-city-${Date.now()}`, cityId: city.id, ...(isVariants ? { variantPrices: {} } : {}) }]);
  };

  const removeCity = (cityId: string) => onChange(priceOverrides.filter((o) => o.cityId !== cityId));

  const updateForCity = (cityId: string, updated: PriceOverride[]) => {
    const others = priceOverrides.filter((o) => o.cityId !== cityId);
    onChange([...others, ...updated]);
  };

  return (
    <div className="space-y-5">
      {/* Base prices */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Globe size={14} className="text-gray-400" />
          <span className="text-[13px] font-semibold text-gray-800">Базовые цены</span>
          <span className="text-[11px] text-gray-400 ml-1">· применяются везде без переопределения</span>
        </div>
        <div className="px-4 py-4">
          {!isVariants ? (
            <div>
              <label className="block text-[12px] text-gray-600 mb-2">Цена по умолчанию</label>
              <div className="relative inline-block">
                <input type="number" value={basePrice || ""} onChange={(e) => onBasePriceChange(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-32 pl-3 pr-7 py-2 text-[14px] font-semibold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
              </div>
              {overrideCities.length > 0 && (
                <div className="mt-3 flex items-start gap-2 text-[11px] text-gray-500">
                  <AlertCircle size={12} className="text-blue-400 mt-0.5 shrink-0" />
                  Изменение базовой цены не затрагивает переопределения по городам
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-[12px] text-gray-500 mb-3 flex items-center gap-1.5">
                <Check size={13} className="text-green-500" />
                Базовые цены задаются на вкладке «Варианты»
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-1">
                    <span className="text-[12px] text-gray-600">{getVariantLabel(v, variantSets)}</span>
                    <span className="text-[13px] font-semibold text-gray-800">{fmt(v.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
        <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-[12px] text-blue-800 leading-relaxed">
          <span className="font-semibold">Иерархия:</span> базовая → город → точка.
          Быстрые кнопки наценки <span className="font-medium">+%</span> и <span className="font-medium">+₽</span> доступны на каждом уровне.
        </div>
      </div>

      {/* City overrides */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[13px] font-semibold text-gray-800">Переопределения по городам</h3>
          {overrideCities.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{overrideCities.length}</span>
          )}
        </div>

        {overrideCities.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl">
            <MapPin size={28} className="text-gray-200 mx-auto mb-2" />
            <div className="text-[13px] font-medium text-gray-500">Все города используют базовые цены</div>
          </div>
        )}

        <div className="space-y-3">
          {overrideCities.map((city) => (
            <CityOverrideCard key={city.id} city={city} isVariants={isVariants}
              basePrice={basePrice} variants={variants} variantSets={variantSets}
              overrides={priceOverrides.filter((o) => o.cityId === city.id)}
              onUpdate={(updated) => updateForCity(city.id, updated)}
              onRemoveCity={() => removeCity(city.id)} />
          ))}
        </div>

        {!allCitiesCovered && (
          <div className="relative mt-3">
            <button onClick={() => setShowCityPicker(!showCityPicker)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-[13px] text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
              <Plus size={15} /> Добавить переопределение для города
            </button>
            {showCityPicker && (
              <CityPicker usedCityIds={usedCityIds} onSelect={addCity} onClose={() => setShowCityPicker(false)} />
            )}
          </div>
        )}
      </div>

      {overrideCities.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4">
          <SummaryTable isVariants={isVariants} basePrice={basePrice} variants={variants} variantSets={variantSets} overrides={priceOverrides} />
        </div>
      )}
    </div>
  );
}
