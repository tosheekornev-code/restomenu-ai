import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus, X, ChevronDown, ChevronRight, MapPin, Trash2,
  RotateCcw, TrendingUp, AlertCircle, Check,
  Copy, Search, Layers, HelpCircle, Eye, EyeOff,
  Network, Store, Zap, Flag, DollarSign, Scale,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cities, City, Location, PropertySet, PositionVariant, PriceOverride, MarkupRule, PricingSurcharge, CHANNELS, Availability } from "../data/mockData";
import { toast } from "./shared/Toast";
import {
  getAvailableChannelKeys, getAvailableCityIds, getAvailableLocationIds, countConflictsAgainst,
} from "./shared/availabilityHelpers";
import { plural } from "./shared/formatAvailability";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PricesTabProps {
  isVariants: boolean;
  positionName?: string;
  basePrice: number;
  onBasePriceChange: (price: number) => void;
  // Base channel prices (optional, for per-channel base pricing)
  baseChannelPrices?: Record<string, number>;
  onBaseChannelPriceChange?: (ch: string, price: number | undefined) => void;
  variants: PositionVariant[];
  variantSets: PropertySet[];
  priceOverrides: PriceOverride[];
  onChange: (overrides: PriceOverride[]) => void;
  onVariantPriceChange?: (variantId: string, price: number) => void;
  surcharges?: PricingSurcharge[];
  onSurchargesChange?: (surcharges: PricingSurcharge[]) => void;
  // Effective availability — used to filter out unavailable channels/cities
  availability?: Availability;
  // Controlled "channels mode" toggle (lifted up so it persists across tab switches)
  showBaseChannels?: boolean;
  onShowBaseChannelsChange?: (v: boolean) => void;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function getVariantLabel(variant: PositionVariant, sets: PropertySet[]): string {
  return sets
    .map((s) => s.values.find((v) => v.id === variant.properties[s.id])?.name ?? "?")
    .join(" / ");
}

function resolveOverride(ov: PriceOverride, variantId: string | null, parentPrice: number): number | undefined {
  if (variantId) {
    // 1. Per-variant static price (highest priority)
    if (ov.variantPrices?.[variantId] !== undefined) return ov.variantPrices[variantId];
    // 2. Personal variant markup
    const vm = ov.variantMarkups?.[variantId];
    if (vm) return applyMarkup(parentPrice, vm.type, vm.value);
    // 3. Blanket markup
    if (ov.markup) return applyMarkup(parentPrice, ov.markup.type, ov.markup.value);
    return undefined;
  }
  // Single-product fallthrough
  if (ov.markup) return applyMarkup(parentPrice, ov.markup.type, ov.markup.value);
  return ov.price;
}

function getEffective(
  variantId: string | null, cityId: string, locationId: string | undefined,
  basePrice: number, variants: PositionVariant[], overrides: PriceOverride[]
): { price: number; source: "base" | "city" | "location" } {
  const base = variantId ? (variants.find((v) => v.id === variantId)?.price ?? basePrice) : basePrice;
  // City level first (needed as parent for location)
  const cityOv = overrides.find((o) => o.cityId === cityId && !o.locationId);
  const cityPrice = cityOv ? resolveOverride(cityOv, variantId, base) : undefined;

  if (locationId) {
    const locOv = overrides.find((o) => o.cityId === cityId && o.locationId === locationId);
    if (locOv) {
      const parentForLoc = cityPrice ?? base;
      const p = resolveOverride(locOv, variantId, parentForLoc);
      if (p !== undefined) return { price: p, source: "location" };
    }
  }
  if (cityPrice !== undefined) return { price: cityPrice, source: "city" };
  return { price: base, source: "base" };
}

function fmt(n: number) { return n.toLocaleString("ru-RU") + " ₽"; }

function BasePriceInput({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing && onChange) {
    return (
      <input autoFocus type="number" defaultValue={value}
        onBlur={(e) => { onChange(parseFloat(e.target.value) || 0); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(false); }}
        className="w-20 pl-2 pr-2 py-0.5 text-[13px] font-semibold border-2 border-orange-400 rounded-lg focus:outline-none text-right" />
    );
  }
  return (
    <button onClick={() => onChange && setEditing(true)}
      className={`text-[13px] font-semibold text-gray-800 ${onChange ? "hover:text-orange-600 cursor-pointer" : ""} transition-colors`}>
      {fmt(value)}
    </button>
  );
}

function applyMarkup(base: number, type: "pct" | "rub", value: number): number {
  return type === "pct" ? Math.round(base * (1 + value / 100)) : Math.round(base + value);
}

function computeVariantPrice(
  basePrice: number, variant: PositionVariant, surcharges: PricingSurcharge[], channelKey?: string
): number {
  let price = basePrice;
  // Property surcharges (additive)
  for (const valueId of Object.values(variant.properties)) {
    const s = surcharges.find((sc) => sc.target === valueId);
    if (s) price = s.type === "rub" ? price + s.value : Math.round(price * (1 + s.value / 100));
  }
  // Channel surcharge
  if (channelKey) {
    const s = surcharges.find((sc) => sc.target === channelKey);
    if (s) price = s.type === "rub" ? price + s.value : Math.round(price * (1 + s.value / 100));
  }
  return Math.round(price);
}

// ─── Inline price input ───────────────────────────────────────────────────────
function InlinePriceInput({ value, inheritedPrice, inheritedLabel, onChange, onClear, isSet, compact = false, markupRule, hasPersonalRule, onOpenMarkup }: {
  value: number | undefined; inheritedPrice: number; inheritedLabel: string;
  onChange: (v: number) => void; onClear: () => void; isSet: boolean; compact?: boolean;
  markupRule?: MarkupRule;
  hasPersonalRule?: boolean;       // shows orange dot to the LEFT of price when this cell has a personal markup
  onOpenMarkup?: (rect: DOMRect) => void;  // if provided, renders a square markup button next to the input while editing
}) {
  const [editing, setEditing] = useState(false);
  const displayPrice = isSet ? value! : inheritedPrice;
  const diff = isSet ? displayPrice - inheritedPrice : 0;
  const isModified = isSet && diff !== 0;

  const personalDot = hasPersonalRule ? (
    <span
      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_0_3px_white] pointer-events-none z-10"
      title="Своя наценка"
    />
  ) : null;

  if (editing) {
    return (
      <div className="inline-flex items-center gap-1.5 relative">
        {personalDot}
        <input autoFocus type="number" defaultValue={displayPrice}
          onBlur={(e) => {
            // Don't commit if blur was caused by clicking the markup button
            const next = e.relatedTarget as HTMLElement | null;
            if (next?.dataset?.inlineMarkupBtn === "true") return;
            onChange(parseFloat(e.target.value) || 0);
            setEditing(false);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(false); }}
          className={`pl-2 pr-2 py-1 border-2 border-orange-400 rounded-lg focus:outline-none ${compact ? "w-[80px] text-[12px]" : "w-24 text-[13px]"}`} />
        {onOpenMarkup && (
          <button
            type="button"
            data-inline-markup-btn="true"
            onMouseDown={(e) => e.preventDefault() /* prevent input blur */}
            onClick={(e) => {
              // Capture rect synchronously BEFORE re-render unmounts the button
              const rect = e.currentTarget.getBoundingClientRect();
              setEditing(false);
              onOpenMarkup(rect);
            }}
            title="Своя наценка для этого варианта"
            className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-orange-600 hover:border-orange-300 transition-colors"
          >
            <TrendingUp size={11} />
          </button>
        )}
      </div>
    );
  }

  // Markup rule label ("+10%") or rub diff ("+23")
  const ruleLabel = markupRule && markupRule.value !== 0
    ? `${markupRule.value > 0 ? "+" : ""}${markupRule.value}${markupRule.type === "pct" ? "%" : " ₽"}`
    : null;
  const diffStr = !ruleLabel && isModified ? (diff > 0 ? `+${diff}` : `${diff}`) : "";

  // Not modified — show as plain gray text, clickable to edit
  if (!isModified && !ruleLabel) {
    return (
      <div className="inline-flex items-center gap-1.5 group relative">
        {personalDot}
        <button onClick={() => setEditing(true)}
          className={`text-gray-400 hover:text-orange-600 transition-colors cursor-pointer ${compact ? "text-[11px]" : "text-[12px]"}`}>
          {fmt(displayPrice)}
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 group relative">
      {personalDot}
      <button onClick={() => setEditing(true)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors ${compact ? "text-[12px]" : "text-[13px] font-medium"}`}>
        {fmt(displayPrice)}
        {ruleLabel && <span className="text-[10px] text-orange-500">{ruleLabel}</span>}
        {diffStr && <span className={`text-[10px] ${diff > 0 ? "text-rose-500" : "text-green-600"}`}>{diffStr}</span>}
      </button>
      <button onClick={onClear} title="Убрать переопределение"
        className="p-0.5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
        <X size={11} />
      </button>
    </div>
  );
}

// ─── Markup Panel ─────────────────────────────────────────────────────────────
const CHANNEL_LABELS: Record<string, string> = {
  dineIn: "За стол", preorder: "На предзаказ", delivery: "На доставку", pickup: "На самовывоз",
};

// Channel column header label, with EyeOff icon if the channel is unavailable
function ChannelHeaderLabel({ channelKey, unavailable }: { channelKey: string; unavailable?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 ${unavailable ? "text-gray-400" : ""}`}>
      {unavailable && <EyeOff size={11} className="text-gray-400" />}
      {CHANNEL_LABELS[channelKey] ?? channelKey}
    </span>
  );
}

function MarkupPanel({ parentLabel, onApply, onClose, showChannelTargets = false, onApplyChannel, onApplyAllChannels, availableChannels, anchorRect }: {
  parentLabel: string;
  onApply: (type: "pct" | "rub", value: number) => void;
  onClose: () => void;
  showChannelTargets?: boolean;
  onApplyChannel?: (channelKey: string, type: "pct" | "rub", value: number) => void;
  onApplyAllChannels?: (type: "pct" | "rub", value: number) => void;
  availableChannels?: typeof CHANNELS;
  anchorRect?: { top: number; right: number; bottom: number; left: number };  // captured rect; when set, panel renders in a portal
}) {
  const [mode, setMode] = useState<"pct" | "rub">("pct");
  const [custom, setCustom] = useState("");
  // target: null = general only, "all" = all columns, or specific channel key
  const [target, setTarget] = useState<string | null>(showChannelTargets ? "all" : null);
  const renderedChannels = availableChannels ?? CHANNELS;

  const quickPct = [5, 10, 15, 20];
  const quickRub = [50, 100, 200, 500];
  const negPct = [-5, -10];
  const negRub = [-50, -100];

  const apply = (type: "pct" | "rub", value: number) => {
    if (!showChannelTargets || target === null) {
      // Only general
      onApply(type, value);
    } else if (target === "all") {
      // General + all channels in one batch
      onApply(type, value);
      onApplyAllChannels?.(type, value);
    } else {
      // Specific channel only
      onApplyChannel?.(target, type, value);
    }
    onClose();
  };

  // Compute portal position from captured anchor rect (rect is captured at click time
  // before any re-render that might unmount the trigger element).
  const portalStyle: React.CSSProperties | null = useMemo(() => {
    if (!anchorRect) return null;
    const panelWidth = 240;
    const left = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, anchorRect.right - panelWidth));
    const top = Math.min(window.innerHeight - 320, anchorRect.bottom + 4);
    return { position: "fixed", top, left, width: panelWidth, zIndex: 50 };
  }, [anchorRect]);

  const panelInner = (
    <>
      <div className="text-[12px] font-medium text-gray-700 mb-2">Корректировка цен</div>

      {/* Target selector — only when channels enabled */}
      {showChannelTargets && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-400 mb-1">Применить к</div>
          <div className="flex gap-1 flex-wrap">
            {([
              ["all", "Всем"],
              ...renderedChannels.map((ch) => [ch.key, CHANNEL_LABELS[ch.key] ?? ch.shortLabel] as [string, string]),
            ] as [string, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setTarget(key)}
                className={`px-2 py-1 text-[10px] rounded-md border transition-colors ${
                  target === key
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

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
      <div className="text-[10px] text-gray-400 mb-1">Наценка</div>
      <div className="flex gap-1 flex-wrap mb-2">
        {(mode === "pct" ? quickPct : quickRub).map((v) => (
          <button key={v} onClick={() => setCustom(String(v))}
            className={`px-2 py-1 text-[11px] rounded-lg border transition-colors ${
              custom === String(v) ? "bg-orange-100 text-orange-800 border-orange-300" : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
            }`}>
            +{v}{mode === "pct" ? "%" : "₽"}
          </button>
        ))}
      </div>
      {/* Quick negative */}
      <div className="text-[10px] text-gray-400 mb-1">Скидка</div>
      <div className="flex gap-1 flex-wrap mb-3">
        {(mode === "pct" ? negPct : negRub).map((v) => (
          <button key={v} onClick={() => setCustom(String(v))}
            className={`px-2 py-1 text-[11px] rounded-lg border transition-colors ${
              custom === String(v) ? "bg-green-100 text-green-800 border-green-300" : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            }`}>
            {v}{mode === "pct" ? "%" : "₽"}
          </button>
        ))}
      </div>
      {/* Value input + apply */}
      <div className="text-[10px] text-gray-400 mb-1">Своё значение</div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type="number" value={custom} onChange={(e) => setCustom(e.target.value)}
            placeholder="±0"
            onKeyDown={(e) => { if (e.key === "Enter") { const v = parseFloat(custom); if (!isNaN(v)) apply(mode, v); } }}
            className="w-full px-2 py-1.5 pr-7 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            {mode === "pct" ? "%" : "₽"}
          </span>
        </div>
        <button
          onClick={() => { const v = parseFloat(custom); if (!isNaN(v)) apply(mode, v); }}
          disabled={!custom || isNaN(parseFloat(custom))}
          className="px-3 py-1.5 bg-orange-500 text-white text-[11px] rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Применить
        </button>
      </div>
    </>
  );

  // Portal mode: anchored via fixed positioning, escapes overflow containers
  if (anchorRect) {
    if (!portalStyle) return null;
    return createPortal(
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div style={portalStyle} className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          {panelInner}
        </div>
      </>,
      document.body,
    );
  }

  // Inline mode (legacy): absolute relative to nearest positioned ancestor
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-3 min-w-[230px]">
        {panelInner}
      </div>
    </>
  );
}

// ─── Surcharges Modal ────────────────────────────────────────────────────────
function SurchargesPanel({ variantSets, surcharges, basePrice, variants, showChannels, onApply, onClose }: {
  variantSets: PropertySet[];
  surcharges: PricingSurcharge[];
  basePrice: number;
  variants: PositionVariant[];
  showChannels: boolean;
  onApply: (surcharges: PricingSurcharge[], newBasePrice: number) => void;
  onClose: () => void;
}) {
  const [base, setBase] = useState(String(basePrice));
  const [increments, setIncrements] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    surcharges.forEach((s) => { m[s.target] = String(s.value); });
    return m;
  });
  const [incrementModes, setIncrementModes] = useState<Record<string, "rub" | "pct">>(() => {
    const m: Record<string, "rub" | "pct"> = {};
    surcharges.forEach((s) => { m[s.target] = s.type; });
    return m;
  });

  const getMode = (setId: string) => incrementModes[setId] ?? "rub";
  const setMode = (setId: string, mode: "rub" | "pct") => setIncrementModes((prev) => ({ ...prev, [setId]: mode }));

  const getIncr = (target: string): number => parseFloat(increments[target] ?? "0") || 0;
  const baseNum = parseFloat(base) || 0;

  const apply = () => {
    const result: PricingSurcharge[] = [];
    for (const [target, valStr] of Object.entries(increments)) {
      const v = parseFloat(valStr);
      if (!isNaN(v) && v !== 0) {
        // Find which set this target belongs to for mode
        const isChannel = CHANNELS.some((ch) => ch.key === target);
        const setId = isChannel ? "_ch" : variantSets.find((s) => s.values.some((pv) => pv.id === target))?.id ?? "";
        result.push({ target, type: getMode(setId), value: v });
      }
    }
    onApply(result, baseNum);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/20" onClick={onClose} />
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-[460px] max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h3 className="text-[15px] font-semibold text-gray-900">Надбавки к базовой цене</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-500" /></button>
          </div>

          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {/* Base price */}
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">Базовая цена</label>
              <div className="relative w-40">
                <input type="number" value={base} onChange={(e) => setBase(e.target.value)}
                  className="w-full px-3 py-2.5 pr-7 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₽</span>
              </div>
            </div>

            {/* Property surcharges */}
            {variantSets.map((set) => (
              <div key={set.id}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium text-gray-700">Надбавка по «{set.name}»</label>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                    {(["rub", "pct"] as const).map((m) => (
                      <button key={m} onClick={() => setMode(set.id, m)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${getMode(set.id) === m ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
                        {m === "rub" ? "₽" : "%"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {set.values.map((val, idx) => (
                      <div key={val.id} className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-600 w-28 truncate">{val.name}</span>
                        <div className="relative flex-1">
                          <input type="number" value={increments[val.id] ?? (idx === 0 ? "0" : "")}
                            onChange={(e) => setIncrements((prev) => ({ ...prev, [val.id]: e.target.value }))}
                            placeholder="0"
                            className="w-full px-3 py-1.5 pr-8 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                            {getMode(set.id) === "rub" ? "₽" : "%"}
                          </span>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Channel surcharges */}
            {showChannels && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium text-gray-700">Надбавка по каналу</label>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                    {(["rub", "pct"] as const).map((m) => (
                      <button key={m} onClick={() => setMode("_ch", m)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${getMode("_ch") === m ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
                        {m === "rub" ? "₽" : "%"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {CHANNELS.map((ch) => (
                      <div key={ch.key} className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-600 w-28">{CHANNEL_LABELS[ch.key] ?? ch.shortLabel}</span>
                        <div className="relative flex-1">
                          <input type="number" value={increments[ch.key] ?? ""}
                            onChange={(e) => setIncrements((prev) => ({ ...prev, [ch.key]: e.target.value }))}
                            placeholder="0"
                            className="w-full px-3 py-1.5 pr-8 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                            {getMode("_ch") === "rub" ? "₽" : "%"}
                          </span>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-5 pb-5 pt-3 flex gap-3 justify-end border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
            <button onClick={apply}
              className="px-4 py-2 text-[13px] font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg">
              Применить к {variants.length} вар.
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Compact Variant Price Table ──────────────────────────────────────────────
function VariantPriceTable({ title, variants, sets, overrideValues, parentValues, parentLabel,
  onSet, onClear, onCopyParent, onAdjustAmount, compact = false, borderless = false,
  showChannels = false, channelVariantPrices, channelParentValues,
  onSetChannel, onClearChannel, onAdjustChannelAmount, onAdjustAllChannels,
  markupRule, channelMarkups,
  variantMarkups, channelVariantMarkups,
  onSetVariantMarkup, onClearVariantMarkup,
  onSetChannelVariantMarkup, onClearChannelVariantMarkup,
  availableChannels, unavailableChannelKeys,
  autoMarkup,
}: {
  title?: string; variants: PositionVariant[]; sets: PropertySet[];
  overrideValues: Record<string, number | undefined>; parentValues: Record<string, number>;
  parentLabel: string; onSet: (vid: string, p: number) => void; onClear: (vid: string) => void;
  onCopyParent?: () => void;
  onAdjustAmount?: (type: "pct" | "rub", value: number) => void; compact?: boolean; borderless?: boolean;
  // Per-channel parent values (base channel prices) — key: "variantId:channelKey"
  channelParentValues?: Record<string, number>;
  markupRule?: MarkupRule; // if set, shows rule label on all price cells
  channelMarkups?: Record<string, MarkupRule>; // per-channel markup rules
  // Personal markups (per-variant overrides for the blanket markup)
  variantMarkups?: Record<string, MarkupRule>;
  channelVariantMarkups?: Record<string, Record<string, MarkupRule>>;
  onSetVariantMarkup?: (vid: string, rule: MarkupRule) => void;
  onClearVariantMarkup?: (vid: string) => void;
  onSetChannelVariantMarkup?: (ch: string, vid: string, rule: MarkupRule) => void;
  onClearChannelVariantMarkup?: (ch: string, vid: string) => void;
  // Channel columns
  showChannels?: boolean;
  channelVariantPrices?: Record<string, Record<string, number>>;
  onSetChannel?: (channelKey: string, vid: string, price: number) => void;
  onClearChannel?: (channelKey: string, vid: string) => void;
  onAdjustChannelAmount?: (channelKey: string, type: "pct" | "rub", value: number) => void;
  onAdjustAllChannels?: (type: "pct" | "rub", value: number) => void;
  availableChannels?: typeof CHANNELS;
  unavailableChannelKeys?: Set<string>;
  autoMarkup?: { on: boolean; onToggle: (on: boolean) => void; tooltip?: string };
}) {
  const renderedChannels = availableChannels ?? CHANNELS;
  const unavail = unavailableChannelKeys ?? new Set<string>();
  const [showMarkup, setShowMarkup] = useState(false);
  // Per-cell personal markup popup. ch is undefined for non-channel column.
  const [activeMarkupCell, setActiveMarkupCell] = useState<{ vid: string; ch?: string; rect: DOMRect } | null>(null);
  // Count variants that have ANY personal data (price, markup, channel price, channel markup)
  // — i.e. that differ from the blanket/inherited rule applied to all variants.
  const overriddenCount = variants.filter((v) => {
    if (overrideValues[v.id] !== undefined && overrideValues[v.id] !== parentValues[v.id]) return true;
    if (variantMarkups?.[v.id]) return true;
    if (channelVariantPrices) {
      for (const ch of Object.keys(channelVariantPrices)) {
        if (channelVariantPrices[ch]?.[v.id] !== undefined) return true;
      }
    }
    if (channelVariantMarkups) {
      for (const ch of Object.keys(channelVariantMarkups)) {
        if (channelVariantMarkups[ch]?.[v.id]) return true;
      }
    }
    return false;
  }).length;

  return (
    <div className={compact ? "" : borderless ? "" : "bg-white rounded-xl border border-gray-200"}>
      {!compact && (
        <div className={`flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap ${borderless ? "" : "rounded-t-xl"}`}>
          {title && <span className="text-[12px] font-semibold text-gray-700">{title}</span>}
          <span className="text-[11px] text-gray-400">
            {overriddenCount > 0 ? `${overriddenCount} из ${variants.length} переопределено` : "0 с особыми ценами"}
          </span>
          <div className="flex-1" />
          {autoMarkup && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none relative group/tip mr-1">
              <Zap size={11} className={autoMarkup.on ? "text-orange-500" : "text-gray-300"} />
              <span className="text-[11px] text-gray-500">Авто-наценка</span>
              <span className="text-gray-300 hover:text-gray-500 transition-colors"><HelpCircle size={11} /></span>
              {autoMarkup.tooltip && (
                <div className="absolute right-0 top-6 z-20 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 w-[220px] shadow-lg opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all pointer-events-none">
                  {autoMarkup.tooltip}
                </div>
              )}
              <Switch checked={autoMarkup.on} onCheckedChange={autoMarkup.onToggle} size="sm" />
            </label>
          )}
          {onAdjustAmount && (
            <div className="relative">
              <button onClick={() => setShowMarkup(!showMarkup)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TrendingUp size={11} /> Наценка <ChevronDown size={9} className="text-gray-400" />
              </button>
              {showMarkup && <MarkupPanel parentLabel={parentLabel} onApply={onAdjustAmount}
                onClose={() => setShowMarkup(false)}
                showChannelTargets={showChannels && !!onAdjustChannelAmount}
                onApplyChannel={onAdjustChannelAmount}
                onApplyAllChannels={onAdjustAllChannels}
                availableChannels={renderedChannels}
              />}
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

      {/* Table with optional channel columns */}
      {showChannels && onSetChannel ? (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-[12px] border-collapse table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              {renderedChannels.map((ch) => <col key={ch.key} />)}
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] text-gray-400 font-normal">
                <th className="pb-2 pr-2 pl-3 font-normal">Вариант</th>
                {renderedChannels.map((ch) => (
                  <th key={ch.key} className="pb-2 pr-2 font-normal whitespace-nowrap">
                    <ChannelHeaderLabel channelKey={ch.key} unavailable={unavail.has(ch.key)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const label = getVariantLabel(v, sets);
                const parentPrice = parentValues[v.id] ?? 0;
                return (
                  <tr key={v.id} className="border-t border-gray-100">
                    <td className={`py-2 pr-2 pl-3 truncate ${compact ? "text-[11px] text-gray-500" : "text-[12px] text-gray-600"}`}>{label}</td>
                    {renderedChannels.map((ch) => {
                      const chPrice = channelVariantPrices?.[ch.key]?.[v.id];
                      const chMarkup = channelMarkups?.[ch.key];
                      const personalChannelRule = channelVariantMarkups?.[ch.key]?.[v.id];
                      const personalGeneralRule = variantMarkups?.[v.id];
                      const chParentPrice = channelParentValues?.[`${v.id}:${ch.key}`] ?? parentPrice;
                      // Priority for the rule shown / used:
                      //   channel static price → channel personal rule → channel blanket markup
                      //   → general personal rule → general blanket markup
                      const activeRule = chPrice !== undefined
                        ? undefined
                        : (personalChannelRule ?? chMarkup ?? personalGeneralRule ?? markupRule);
                      const hasPersonal = !!(personalChannelRule || (personalGeneralRule && !chMarkup));
                      const computedPrice = activeRule ? applyMarkup(chParentPrice, activeRule.type, activeRule.value) : undefined;
                      const effectivePrice = chPrice ?? computedPrice ?? (chParentPrice !== parentPrice ? chParentPrice : undefined);
                      const isSet = effectivePrice !== undefined;
                      return (
                        <td key={ch.key} className="py-2 pr-2 relative">
                          <InlinePriceInput
                            value={effectivePrice}
                            inheritedPrice={chParentPrice}
                            inheritedLabel={parentLabel}
                            onChange={(p) => onSetChannel(ch.key, v.id, p)}
                            onClear={() => {
                              if (chPrice !== undefined) onClearChannel?.(ch.key, v.id);
                              else if (personalChannelRule) onClearChannelVariantMarkup?.(ch.key, v.id);
                            }}
                            isSet={isSet}
                            compact
                            markupRule={activeRule}
                            hasPersonalRule={hasPersonal}
                            onOpenMarkup={onSetChannelVariantMarkup ? (rect) => setActiveMarkupCell({ vid: v.id, ch: ch.key, rect }) : undefined}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 font-normal">
                <th className="pb-2 pr-2 pl-3 font-normal">Вариант</th>
                <th className="pb-2 pr-2 font-normal w-[140px]">Цена</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const label = getVariantLabel(v, sets);
                const overrideVal = overrideValues[v.id];
                const parentPrice = parentValues[v.id] ?? 0;
                const personalRule = variantMarkups?.[v.id];
                // Static price wins; otherwise personal markup; otherwise inherited markup
                const activeRule = overrideVal !== undefined ? undefined : (personalRule ?? markupRule);
                const hasPersonal = !!personalRule;
                return (
                  <tr key={v.id} className="border-t border-gray-100">
                    <td className="py-2 pr-2 pl-3 text-[12px] text-gray-600 truncate">{label}</td>
                    <td className="py-2 pr-2 relative">
                      <InlinePriceInput value={overrideVal} inheritedPrice={parentPrice} inheritedLabel={parentLabel}
                        onChange={(p) => onSet(v.id, p)}
                        onClear={() => {
                          if (overrideVal !== undefined) onClear(v.id);
                          else if (personalRule) onClearVariantMarkup?.(v.id);
                        }}
                        isSet={overrideVal !== undefined}
                        compact
                        markupRule={activeRule}
                        hasPersonalRule={hasPersonal}
                        onOpenMarkup={onSetVariantMarkup ? (rect) => setActiveMarkupCell({ vid: v.id, rect }) : undefined}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Personal markup popup (rendered via portal, outside table overflow) */}
      {activeMarkupCell && (
        <MarkupPanel
          parentLabel={activeMarkupCell.ch
            ? `варианта в «${CHANNEL_LABELS[activeMarkupCell.ch] ?? activeMarkupCell.ch}»`
            : "варианта"}
          onApply={(type, value) => {
            if (activeMarkupCell.ch) {
              onSetChannelVariantMarkup?.(activeMarkupCell.ch, activeMarkupCell.vid, { type, value });
            } else {
              onSetVariantMarkup?.(activeMarkupCell.vid, { type, value });
            }
          }}
          onClose={() => setActiveMarkupCell(null)}
          anchorRect={activeMarkupCell.rect}
        />
      )}
    </div>
  );
}


// ─── Channel Prices Row (for non-variant fixed price) ────────────────────────
function ChannelFixedPriceRow({ generalPrice, channelPrices, onChange, onClear }: {
  generalPrice: number;
  channelPrices: Record<string, number>;
  onChange: (ch: string, price: number) => void;
  onClear: (ch: string) => void;
}) {
  return (
    <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
      <div className="divide-y divide-gray-50">
        {CHANNELS.map((ch) => {
          const chPrice = channelPrices[ch.key];
          return (
            <div key={ch.key} className="flex items-center gap-3 px-3 py-2">
              <span className="text-[12px] text-gray-500 min-w-[100px]">{CHANNEL_LABELS[ch.key] ?? ch.shortLabel}</span>
              <InlinePriceInput
                value={chPrice}
                inheritedPrice={generalPrice}
                inheritedLabel="общая"
                onChange={(p) => onChange(ch.key, p)}
                onClear={() => onClear(ch.key)}
                isSet={chPrice !== undefined}
                compact
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Location Row ─────────────────────────────────────────────────────────────
function LocationRow({ location, cityId, isVariants, positionName, basePrice, variants, variantSets,
  overrides, cityOverride, onUpdateOverride, onRemoveOverride, showChannels: effectiveShowChannels, baseChannelPrices,
  availableChannels, unavailableChannelKeys, locationUnavailable,
}: {
  location: Location; cityId: string; isVariants: boolean; positionName?: string; basePrice: number;
  showChannels: boolean; baseChannelPrices?: Record<string, number>;
  variants: PositionVariant[]; variantSets: PropertySet[]; overrides: PriceOverride[];
  cityOverride: PriceOverride | undefined;
  onUpdateOverride: (o: PriceOverride) => void; onRemoveOverride: (locationId: string) => void;
  availableChannels?: typeof CHANNELS;
  unavailableChannelKeys?: Set<string>;
  locationUnavailable?: boolean;
}) {
  const renderedChannels = availableChannels ?? CHANNELS;
  // If the whole location is unavailable, all its channels are effectively unavailable
  const baseUnavail = unavailableChannelKeys ?? new Set<string>();
  const unavail = locationUnavailable
    ? new Set(CHANNELS.map((c) => c.key))
    : baseUnavail;
  const [showLocFixedMarkup, setShowLocFixedMarkup] = useState(false);
  const [showLocRemoveConfirm, setShowLocRemoveConfirm] = useState(false);
  const locOverride = overrides.find((o) => o.cityId === cityId && o.locationId === location.id);
  const hasOverride = !!locOverride;

  // Parent prices: account for city markup
  const parentPrices: Record<string, number> = {};
  variants.forEach((v) => {
    const vm = cityOverride?.variantMarkups?.[v.id];
    parentPrices[v.id] = cityOverride?.variantPrices?.[v.id]
      ?? (vm ? applyMarkup(v.price, vm.type, vm.value)
        : cityOverride?.markup ? applyMarkup(v.price, cityOverride.markup.type, cityOverride.markup.value)
        : v.price);
  });
  const parentFixedPrice = cityOverride?.markup
    ? applyMarkup(basePrice, cityOverride.markup.type, cityOverride.markup.value)
    : (cityOverride?.price ?? basePrice);
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

  // Status text for badge (unified with city format)
  const locGeneralLabel = locOverride?.markup && locOverride.markup.value !== 0
    ? `авто ${locOverride.markup.value > 0 ? "+" : ""}${locOverride.markup.value}${locOverride.markup.type === "pct" ? "%" : " ₽"}`
    : null;
  const locHasChannelMarkups = Object.values(locOverride?.channelMarkups ?? {}).some((r) => r.value !== 0);
  const locDiffCount = Object.entries(locOverride?.variantPrices ?? {}).filter(([vid, p]) => p !== parentPrices[vid]).length;
  const locStatusText = locGeneralLabel ?? (locDiffCount > 0 ? `${locDiffCount} вар. переопределено` : (hasOverride && !locHasChannelMarkups ? "особые цены" : ""));

  return (
    <div className={`rounded-xl transition-colors ${hasOverride ? "border border-orange-200" : "border border-dashed border-gray-300 hover:border-orange-300 hover:bg-orange-50/50 overflow-hidden"}`}>
      {/* Header — compact for inactive, rich for active */}
      {!hasOverride ? (
        <button onClick={() => { onUpdateOverride({ id: `po-loc-${Date.now()}`, cityId, locationId: location.id, variantPrices: {} }); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors rounded-xl text-left">
          <Store size={13} className="text-gray-300" />
          <span className={`text-[13px] truncate flex items-center gap-1.5 ${locationUnavailable ? "text-gray-400" : "text-gray-500"}`}>
            {locationUnavailable && <EyeOff size={11} className="text-gray-400" />}
            {location.name}, {location.address}
            {locationUnavailable && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">выключена</span>}
          </span>
          <div className="flex-1" />
          <span className="text-[11px] text-orange-500 shrink-0">+ Добавить переопределение</span>
        </button>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50/50 rounded-t-xl">
            <Store size={14} className="text-orange-400" />
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-medium truncate flex items-center gap-1.5 ${locationUnavailable ? "text-gray-400" : "text-gray-800"}`}>
                {locationUnavailable && <EyeOff size={11} className="text-gray-400" />}
                {location.name}
                {locationUnavailable && <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">выключена</span>}
              </div>
              <div className="text-[11px] text-gray-400 flex items-center gap-2">
                {locStatusText && <span className="text-orange-600">{locStatusText}</span>}
                {locHasChannelMarkups && <span className="text-amber-600">наценки каналов</span>}
                {effectiveShowChannels && <span className="text-amber-600">цены по каналам</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const variantPricesDiffer = Object.entries(locOverride?.variantPrices ?? {}).some(([vid, p]) => p !== parentPrices[vid]);
                const locMarkupHasEffect = !!locOverride?.markup && locOverride.markup.value !== 0;
                const locVariantMarkupsHaveEffect = Object.values(locOverride?.variantMarkups ?? {}).some((r) => r.value !== 0);
                const locChannelMarkupsHaveEffect = Object.values(locOverride?.channelMarkups ?? {}).some((r) => r.value !== 0);
                const locChannelVariantMarkupsHaveEffect = Object.values(locOverride?.channelVariantMarkups ?? {}).some((m) => Object.values(m).some((r) => r.value !== 0));
                const locDiffersFromCity = locMarkupHasEffect
                  || (locOverride?.price !== undefined && locOverride.price !== parentFixedPrice)
                  || variantPricesDiffer
                  || locVariantMarkupsHaveEffect
                  || !!locOverride?.channelPrices
                  || locChannelMarkupsHaveEffect
                  || !!locOverride?.channelVariantPrices
                  || locChannelVariantMarkupsHaveEffect;
                return (
                  <button disabled={!locDiffersFromCity}
                    onClick={() => {
                      const existing = locOverride ?? { id: `po-loc-${Date.now()}`, cityId, locationId: location.id };
                      if (locOverride?.markup) {
                        onUpdateOverride({ ...existing, markup: { type: "pct", value: 0 }, variantPrices: undefined, price: undefined, variantMarkups: undefined, channelVariantMarkups: undefined, channelPrices: undefined, channelMarkups: undefined, channelVariantPrices: undefined });
                      } else if (isVariants) {
                        const vp: Record<string, number> = {};
                        variants.forEach((v) => { vp[v.id] = parentPrices[v.id]; });
                        onUpdateOverride({ ...existing, variantPrices: vp, channelVariantPrices: undefined, channelPrices: undefined, channelMarkups: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
                      } else {
                        onUpdateOverride({ ...existing, price: parentFixedPrice, channelPrices: undefined, channelMarkups: undefined });
                      }
                      toast("Сброшено к цене города", "success");
                    }}
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] border rounded-lg transition-colors ${locDiffersFromCity ? "text-red-500 hover:bg-red-50 border-red-200" : "text-gray-300 border-gray-200 cursor-not-allowed"}`}>
                    <RotateCcw size={10} /> Сброс к цене города
                  </button>
                );
              })()}
              <button onClick={() => {
                  const hasAnyChange = !!locOverride?.markup
                    || !!locOverride?.price
                    || Object.keys(locOverride?.variantPrices ?? {}).length > 0
                    || !!locOverride?.variantMarkups
                    || !!locOverride?.channelPrices
                    || !!locOverride?.channelMarkups
                    || !!locOverride?.channelVariantPrices
                    || !!locOverride?.channelVariantMarkups;
                  if (hasAnyChange) setShowLocRemoveConfirm(true); else resetOverride();
                }}
                className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {showLocRemoveConfirm && (
            <>
              <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setShowLocRemoveConfirm(false)} />
              <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-[380px] p-5">
                  <div className="text-[15px] font-semibold text-gray-900 mb-2">Удалить переопределение?</div>
                  <div className="text-[13px] text-gray-500 mb-4 leading-relaxed">
                    Для точки «{location.name}» заданы особые цены. Все настройки будут удалены.
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowLocRemoveConfirm(false)}
                      className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                      Отмена
                    </button>
                    <button onClick={() => { setShowLocRemoveConfirm(false); resetOverride(); }}
                      className="px-4 py-2 text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {(() => {
            const locIsDynamic = !!locOverride?.markup;
            const locToggleDynamic = (on: boolean) => {
              if (on) {
                onUpdateOverride({ ...locOverride!, markup: { type: "pct", value: 0 }, variantPrices: undefined, price: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
              } else if (locOverride?.markup) {
                if (isVariants) {
                  const vp: Record<string, number> = {};
                  variants.forEach((v) => { vp[v.id] = applyMarkup(parentPrices[v.id], locOverride.markup!.type, locOverride.markup!.value); });
                  onUpdateOverride({ ...locOverride!, variantPrices: vp, markup: undefined, variantMarkups: undefined });
                } else {
                  onUpdateOverride({ ...locOverride!, price: applyMarkup(parentFixedPrice, locOverride.markup!.type, locOverride.markup!.value), markup: undefined });
                }
              }
            };
            const locApplyAdjust = (type: "pct" | "rub", value: number) => {
              if (locIsDynamic) {
                onUpdateOverride({ ...locOverride!, markup: { type, value }, variantPrices: undefined, price: undefined, variantMarkups: undefined });
              } else {
                const current = locOverride?.variantPrices ?? {};
                const vp: Record<string, number> = {};
                variants.forEach((v) => { vp[v.id] = applyMarkup(current[v.id] ?? parentPrices[v.id], type, value); });
                onUpdateOverride({ ...locOverride!, variantPrices: vp, variantMarkups: undefined });
              }
              toast(`${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : "₽"} для ${location.name}`, "success");
            };
            return (
            <div className="border-t border-orange-200">

          {isVariants ? (
            <VariantPriceTable borderless
              variants={variants} sets={variantSets}
              availableChannels={renderedChannels}
              unavailableChannelKeys={unavail}
              autoMarkup={{ on: locIsDynamic, onToggle: locToggleDynamic, tooltip: "Цены пересчитаются автоматически при изменении цен города." }}
              overrideValues={locOverride?.variantPrices ?? {}}
              parentValues={parentPrices}
              parentLabel="из города"
              channelParentValues={baseChannelPrices}
              markupRule={locOverride?.markup}
              channelMarkups={locOverride?.channelMarkups}
              variantMarkups={locOverride?.variantMarkups}
              channelVariantMarkups={locOverride?.channelVariantMarkups}
              onSetVariantMarkup={(vid, rule) => onUpdateOverride({ ...locOverride!, variantMarkups: { ...(locOverride?.variantMarkups ?? {}), [vid]: rule } })}
              onClearVariantMarkup={(vid) => { const m = { ...(locOverride?.variantMarkups ?? {}) }; delete m[vid]; onUpdateOverride({ ...locOverride!, variantMarkups: Object.keys(m).length > 0 ? m : undefined }); }}
              onSetChannelVariantMarkup={(ch, vid, rule) => {
                const cvm = { ...(locOverride?.channelVariantMarkups ?? {}) };
                cvm[ch] = { ...(cvm[ch] ?? {}), [vid]: rule };
                onUpdateOverride({ ...locOverride!, channelVariantMarkups: cvm });
              }}
              onClearChannelVariantMarkup={(ch, vid) => {
                const cvm = { ...(locOverride?.channelVariantMarkups ?? {}) };
                const inner = { ...(cvm[ch] ?? {}) }; delete inner[vid];
                if (Object.keys(inner).length > 0) cvm[ch] = inner; else delete cvm[ch];
                onUpdateOverride({ ...locOverride!, channelVariantMarkups: Object.keys(cvm).length > 0 ? cvm : undefined });
              }}
              onSet={(vid, p) => onUpdateOverride({ ...locOverride!, variantPrices: { ...(locOverride?.variantPrices ?? {}), [vid]: p } })}
              onClear={(vid) => { const u = { ...(locOverride?.variantPrices ?? {}) }; delete u[vid]; onUpdateOverride({ ...locOverride!, variantPrices: u }); }}
              onCopyParent={() => {
                if (locIsDynamic) {
                  onUpdateOverride({ ...locOverride!, markup: { type: "pct", value: 0 }, channelMarkups: undefined, channelVariantPrices: undefined, channelPrices: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
                } else {
                  const vp: Record<string, number> = {}; variants.forEach((v) => { vp[v.id] = parentPrices[v.id]; });
                  onUpdateOverride({ ...locOverride!, variantPrices: vp, channelVariantPrices: undefined, channelPrices: undefined, channelMarkups: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
                }
                toast("Скопированы из города", "success");
              }}
              onAdjustAmount={locApplyAdjust}
              showChannels={effectiveShowChannels}
              channelVariantPrices={locOverride?.channelVariantPrices}
              onSetChannel={(ch, vid, p) => {
                const chVP = { ...(locOverride?.channelVariantPrices ?? {}) };
                chVP[ch] = { ...(chVP[ch] ?? {}), [vid]: p };
                onUpdateOverride({ ...locOverride!, channelVariantPrices: chVP });
              }}
              onClearChannel={(ch, vid) => {
                const chVP = { ...(locOverride?.channelVariantPrices ?? {}) };
                const inner = { ...(chVP[ch] ?? {}) }; delete inner[vid];
                if (Object.keys(inner).length > 0) chVP[ch] = inner; else delete chVP[ch];
                onUpdateOverride({ ...locOverride!, channelVariantPrices: Object.keys(chVP).length > 0 ? chVP : undefined });
              }}
              onAdjustChannelAmount={(ch, type, value) => {
                if (locIsDynamic) {
                  onUpdateOverride({ ...locOverride!, channelMarkups: { ...(locOverride?.channelMarkups ?? {}), [ch]: { type, value } } });
                } else {
                  const current = locOverride?.channelVariantPrices?.[ch] ?? {};
                  const parent = locOverride?.variantPrices ?? parentPrices;
                  const vp: Record<string, number> = {};
                  variants.forEach((v) => { vp[v.id] = applyMarkup(current[v.id] ?? parent[v.id] ?? parentPrices[v.id], type, value); });
                  const chVP = { ...(locOverride?.channelVariantPrices ?? {}), [ch]: vp };
                  onUpdateOverride({ ...locOverride!, channelVariantPrices: chVP });
                }
                toast(`${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : "₽"} для ${CHANNEL_LABELS[ch] ?? ch}`, "success");
              }}
              onAdjustAllChannels={(type, value) => {
                if (locIsDynamic) return; // markup rule already covers all channels
                const parent = locOverride?.variantPrices ?? parentPrices;
                const allChVP: Record<string, Record<string, number>> = {};
                CHANNELS.forEach((ch) => {
                  const current = locOverride?.channelVariantPrices?.[ch.key] ?? {};
                  const vp: Record<string, number> = {};
                  variants.forEach((v) => { vp[v.id] = applyMarkup(current[v.id] ?? parent[v.id] ?? parentPrices[v.id], type, value); });
                  allChVP[ch.key] = vp;
                });
                onUpdateOverride({ ...locOverride!, channelVariantPrices: allChVP });
                toast(`${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : "₽"} для всех каналов`, "success");
              }}
            />
          ) : (() => {
            const locEffPrice = locOverride?.markup ? applyMarkup(parentFixedPrice, locOverride.markup.type, locOverride.markup.value) : locFixed;
            const locFixedIsSet = locFixed !== undefined || !!locOverride?.markup;
            return (
              <div>
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap">
                  <span className="text-[11px] text-gray-400">
                    {locFixedIsSet && locEffPrice !== parentFixedPrice ? "цена переопределена" : "наследует из города"}
                  </span>
                  <div className="flex-1" />
                  <label className="flex items-center gap-1.5 cursor-pointer select-none relative group/tip mr-1">
                    <Zap size={11} className={locIsDynamic ? "text-orange-500" : "text-gray-300"} />
                    <span className="text-[11px] text-gray-500">Авто-наценка</span>
                    <span className="text-gray-300 hover:text-gray-500 transition-colors"><HelpCircle size={10} /></span>
                    <div className="absolute right-0 top-6 z-20 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 w-[200px] shadow-lg opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all pointer-events-none">
                      Цены пересчитаются автоматически при изменении цен города.
                    </div>
                    <Switch checked={locIsDynamic} onCheckedChange={locToggleDynamic} size="sm" />
                  </label>
                  <div className="relative">
                    <button onClick={() => setShowLocFixedMarkup(!showLocFixedMarkup)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <TrendingUp size={11} /> Наценка <ChevronDown size={9} className="text-gray-400" />
                    </button>
                    {showLocFixedMarkup && <MarkupPanel parentLabel="из города"
                      onApply={(type, value) => {
                        if (locIsDynamic) onUpdateOverride({ ...locOverride!, markup: { type, value }, price: undefined });
                        else onUpdateOverride({ ...locOverride!, price: applyMarkup(locOverride?.price ?? parentFixedPrice, type, value) });
                      }}
                      onClose={() => setShowLocFixedMarkup(false)}
                      showChannelTargets={effectiveShowChannels}
                      onApplyChannel={(ch, type, value) => {
                        const cp = { ...(locOverride?.channelPrices ?? {}) };
                        const base = cp[ch] ?? locOverride?.price ?? parentFixedPrice;
                        cp[ch] = applyMarkup(base, type, value);
                        onUpdateOverride({ ...locOverride!, channelPrices: cp });
                      }}
                      onApplyAllChannels={(type, value) => {
                        const cp: Record<string, number> = {};
                        CHANNELS.forEach((ch) => {
                          const base = locOverride?.channelPrices?.[ch.key] ?? locOverride?.price ?? parentFixedPrice;
                          cp[ch.key] = applyMarkup(base, type, value);
                        });
                        onUpdateOverride({ ...locOverride!, channelPrices: cp });
                      }}
                      availableChannels={renderedChannels}
                    />}
                  </div>
                </div>
                {/* Table */}
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-[12px] border-collapse table-fixed">
                    {effectiveShowChannels ? (
                      <colgroup>
                        <col className="w-[24%]" />
                        {renderedChannels.map((ch) => <col key={ch.key} />)}
                      </colgroup>
                    ) : (
                      <colgroup><col /><col className="w-[140px]" /></colgroup>
                    )}
                    <thead>
                      <tr className="text-left text-[11px] text-gray-400 font-normal">
                        <th className="pb-2 pr-2 pl-3 font-normal">Позиция</th>
                        {effectiveShowChannels ? renderedChannels.map((ch) => (
                          <th key={ch.key} className="pb-2 pr-2 font-normal whitespace-nowrap">
                            <ChannelHeaderLabel channelKey={ch.key} unavailable={unavail.has(ch.key)} />
                          </th>
                        )) : (
                          <th className="pb-2 pr-2 font-normal">Цена</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100">
                        <td className="py-2 pr-2 pl-3 text-[12px] text-gray-600">{positionName ?? "Цена"}</td>
                        {effectiveShowChannels ? renderedChannels.map((ch) => {
                          const chPrice = locOverride?.channelPrices?.[ch.key];
                          return (
                            <td key={ch.key} className="py-2 pr-2">
                              <InlinePriceInput
                                value={chPrice ?? locEffPrice}
                                inheritedPrice={parentFixedPrice}
                                inheritedLabel="из города"
                                onChange={(p) => onUpdateOverride({ ...locOverride!, channelPrices: { ...(locOverride?.channelPrices ?? {}), [ch.key]: p } })}
                                onClear={() => { const u = { ...(locOverride?.channelPrices ?? {}) }; delete u[ch.key]; onUpdateOverride({ ...locOverride!, channelPrices: Object.keys(u).length > 0 ? u : undefined }); }}
                                isSet={chPrice !== undefined || locFixedIsSet}
                                compact
                                markupRule={chPrice === undefined ? locOverride?.markup : undefined}
                              />
                            </td>
                          );
                        }) : (
                          <td className="py-2 pr-2">
                            <InlinePriceInput value={locEffPrice} inheritedPrice={parentFixedPrice} inheritedLabel="из города"
                              onChange={(p) => onUpdateOverride({ ...locOverride!, price: p, markup: undefined })}
                              onClear={resetOverride}
                              isSet={locFixedIsSet} compact markupRule={locOverride?.markup} />
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── City Override Card ───────────────────────────────────────────────────────
function CityOverrideCard({ city, isVariants, positionName, basePrice, variants, variantSets, overrides, onUpdate, onRemoveCity, showChannels: effectiveShowChannels, baseChannelPrices, availableChannels, unavailableChannelKeys, cityUnavailable, unavailableLocationIds, showUnavailable = true }: {
  city: City; isVariants: boolean; positionName?: string; basePrice: number; variants: PositionVariant[];
  showChannels: boolean; baseChannelPrices?: Record<string, number>;
  variantSets: PropertySet[]; overrides: PriceOverride[];
  onUpdate: (updated: PriceOverride[]) => void; onRemoveCity: () => void;
  availableChannels?: typeof CHANNELS;
  unavailableChannelKeys?: Set<string>;
  cityUnavailable?: boolean;
  unavailableLocationIds?: Set<string>;
  showUnavailable?: boolean;
}) {
  const renderedChannels = availableChannels ?? CHANNELS;
  // If the whole city is unavailable, all its channels are effectively unavailable
  const baseUnavail = unavailableChannelKeys ?? new Set<string>();
  const unavail = cityUnavailable
    ? new Set(CHANNELS.map((c) => c.key))
    : baseUnavail;
  const unavailLocs = unavailableLocationIds ?? new Set<string>();
  const [locExpanded, setLocExpanded] = useState(true);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showFixedMarkup, setShowFixedMarkup] = useState(false);

  const cityOverride = overrides.find((o) => o.cityId === city.id && !o.locationId);
  const locationOverrides = overrides.filter((o) => o.cityId === city.id && !!o.locationId);
  const locOverrideCount = locationOverrides.length;
  const cityDiffCount = isVariants
    ? Object.entries(cityOverride?.variantPrices ?? {}).filter(([vid, p]) => p !== (variants.find((v) => v.id === vid)?.price)).length
    : 0;
  const cityHasPrice = isVariants
    ? cityDiffCount > 0
    : (cityOverride?.price !== undefined && cityOverride.price !== basePrice);
  const cityHasChannelPrices = Object.keys(cityOverride?.channelPrices ?? {}).length > 0 ||
    Object.keys(cityOverride?.channelVariantPrices ?? {}).length > 0;

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

  const isDynamic = !!cityOverride?.markup;

  const applyAdjustForCity = (type: "pct" | "rub", value: number) => {
    if (isDynamic) {
      // Dynamic: store rule, prices auto-compute from base
      updateCityOverride({ markup: { type, value }, variantPrices: undefined, price: undefined, variantMarkups: undefined });
    } else {
      // Static: compute and store final prices
      if (isVariants) {
        const vp: Record<string, number> = {};
        variants.forEach((v) => {
          const base = cityOverride?.variantPrices?.[v.id] ?? v.price;
          vp[v.id] = applyMarkup(base, type, value);
        });
        updateCityOverride({ variantPrices: vp, variantMarkups: undefined });
      } else {
        const base = cityOverride?.price ?? basePrice;
        updateCityOverride({ price: applyMarkup(base, type, value) });
      }
    }
    toast(`${isDynamic ? "Наценка" : "Цены скорректированы"} ${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : " ₽"}`, "success");
  };

  const toggleDynamic = (on: boolean) => {
    if (on) {
      // Switch to dynamic — set 0% markup (= base prices), clear static + personal
      updateCityOverride({ markup: { type: "pct", value: 0 }, variantPrices: undefined, price: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
    } else if (cityOverride?.markup) {
      // Switch to static — materialize current markup into static prices
      if (isVariants) {
        const vp: Record<string, number> = {};
        variants.forEach((v) => { vp[v.id] = applyMarkup(v.price, cityOverride.markup!.type, cityOverride.markup!.value); });
        updateCityOverride({ variantPrices: vp, markup: undefined, variantMarkups: undefined });
      } else {
        updateCityOverride({ price: applyMarkup(basePrice, cityOverride.markup!.type, cityOverride.markup!.value), markup: undefined });
      }
    }
  };


  return (
    <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
      <div className={`flex items-center gap-3 px-4 py-3.5 ${cityUnavailable ? "bg-gray-50" : "bg-gradient-to-r from-blue-50/60 to-transparent"} border-b border-gray-100 rounded-t-2xl`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cityUnavailable ? "bg-gray-100" : "bg-blue-100"}`}>
          <Flag size={14} className={cityUnavailable ? "text-gray-400" : "text-blue-600"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[14px] font-semibold flex items-center gap-1.5 ${cityUnavailable ? "text-gray-400" : "text-gray-900"}`}>
            {cityUnavailable && <EyeOff size={12} className="text-gray-400" />}
            {city.name}
            {cityUnavailable && <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">город выключен</span>}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            {(() => {
              const mk = cityOverride?.markup;
              const generalLabel = mk && mk.value !== 0 ? `авто ${mk.value > 0 ? "+" : ""}${mk.value}${mk.type === "pct" ? "%" : " ₽"}` : null;
              const hasChannelMarkups = Object.values(cityOverride?.channelMarkups ?? {}).some((r) => r.value !== 0);
              return (
                <>
                  {generalLabel && <span className="text-orange-600">{generalLabel}</span>}
                  {!generalLabel && cityHasPrice && <span className="text-orange-600">{isVariants ? `${cityDiffCount} вар. переопределено` : "особая цена"}</span>}
                  {hasChannelMarkups && <span className="text-amber-600">наценки каналов</span>}
                </>
              );
            })()}
            {cityHasChannelPrices && <span className="text-amber-600">цены по каналам</span>}
            {locOverrideCount > 0 && <span className="text-purple-600">{locOverrideCount} точки с особыми ценами</span>}
            {!cityOverride?.markup && !cityHasPrice && !cityHasChannelPrices && locOverrideCount === 0 && <span className="text-gray-400">нет переопределений</span>}
          </div>
        </div>
        <button onClick={() => {
            const hasAnyOverride = cityHasPrice || cityHasChannelPrices || !!cityOverride?.markup || !!cityOverride?.channelMarkups || locOverrideCount > 0;
            if (hasAnyOverride) setShowRemoveConfirm(true); else onRemoveCity();
          }}
          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors ml-1">
          <Trash2 size={14} />
        </button>
      </div>

      {showRemoveConfirm && (
        <>
          <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setShowRemoveConfirm(false)} />
          <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-[380px] p-5">
              <div className="text-[15px] font-semibold text-gray-900 mb-2">Удалить переопределение?</div>
              <div className="text-[13px] text-gray-500 mb-4 leading-relaxed">
                Для {city.name} заданы особые цены{locOverrideCount > 0 ? ` и ${locOverrideCount} точки с переопределениями` : ""}. Все настройки цен для этого города будут удалены.
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowRemoveConfirm(false)}
                  className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                  Отмена
                </button>
                <button onClick={() => { setShowRemoveConfirm(false); onRemoveCity(); }}
                  className="px-4 py-2 text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Network size={13} className="text-gray-400" />
          <span className="text-[12px] font-medium text-gray-700">
            {city.locations.length === 1 ? `${city.name} — ${city.locations[0].name}` : `Для всех точек ${city.name}`}
          </span>
          <div className="flex-1" />
          {(() => {
            const markupHasEffect = !!cityOverride?.markup && cityOverride.markup.value !== 0;
            const channelMarkupsHaveEffect = Object.values(cityOverride?.channelMarkups ?? {}).some((r) => r.value !== 0);
            const variantMarkupsHaveEffect = Object.values(cityOverride?.variantMarkups ?? {}).some((r) => r.value !== 0);
            const channelVariantMarkupsHaveEffect = Object.values(cityOverride?.channelVariantMarkups ?? {}).some((m) => Object.values(m).some((r) => r.value !== 0));
            const cityDiffersFromBase = cityHasPrice || cityHasChannelPrices || markupHasEffect || channelMarkupsHaveEffect || variantMarkupsHaveEffect || channelVariantMarkupsHaveEffect;
            return (
              <button disabled={!cityDiffersFromBase}
                onClick={() => {
                  if (isDynamic) updateCityOverride({ markup: { type: "pct", value: 0 }, channelMarkups: undefined, channelPrices: undefined, channelVariantPrices: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
                  else updateCityOverride({ price: basePrice, variantPrices: isVariants ? Object.fromEntries(variants.map((v) => [v.id, v.price])) : undefined, channelPrices: undefined, channelMarkups: undefined, channelVariantPrices: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
                  toast("Сброшено к базовой цене", "success");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] border rounded-lg transition-colors ${cityDiffersFromBase ? "text-red-500 hover:bg-red-50 border-red-200" : "text-gray-300 border-gray-200 cursor-not-allowed"}`}>
                <RotateCcw size={11} /> Сброс к базовой цене
              </button>
            );
          })()}
        </div>

        {!isVariants ? (() => {
          const fixedPrice = cityOverride?.markup ? applyMarkup(basePrice, cityOverride.markup.type, cityOverride.markup.value) : cityOverride?.price;
          const fixedIsSet = cityOverride?.price !== undefined || !!cityOverride?.markup;
          const effectivePrice = fixedPrice ?? basePrice;
          return (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap rounded-t-xl">
                <span className="text-[11px] text-gray-400">
                  {fixedIsSet && fixedPrice !== basePrice ? "цена переопределена" : "наследует базовую"}
                </span>
                <div className="flex-1" />
                <label className="flex items-center gap-1.5 cursor-pointer select-none relative group/tip mr-1">
                  <Zap size={11} className={isDynamic ? "text-orange-500" : "text-gray-300"} />
                  <span className="text-[11px] text-gray-500">Авто-наценка</span>
                  <span className="text-gray-300 hover:text-gray-500 transition-colors"><HelpCircle size={11} /></span>
                  <div className="absolute right-0 top-6 z-20 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 w-[220px] shadow-lg opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all pointer-events-none">
                    При изменении базовой цены товара цены в этом городе пересчитаются автоматически по заданному правилу. Если выключено — цены фиксируются.
                  </div>
                  <Switch checked={isDynamic} onCheckedChange={toggleDynamic} size="sm" />
                </label>
                <div className="relative">
                  <button onClick={() => setShowFixedMarkup(!showFixedMarkup)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <TrendingUp size={11} /> Наценка <ChevronDown size={9} className="text-gray-400" />
                  </button>
                  {showFixedMarkup && <MarkupPanel parentLabel="базовая"
                    onApply={(type, value) => {
                      if (isDynamic) updateCityOverride({ markup: { type, value }, price: undefined });
                      else updateCityOverride({ price: applyMarkup(cityOverride?.price ?? basePrice, type, value) });
                    }}
                    onClose={() => setShowFixedMarkup(false)}
                    showChannelTargets={effectiveShowChannels}
                    onApplyChannel={(ch, type, value) => {
                      const cp = { ...(cityOverride?.channelPrices ?? {}) };
                      const base = cp[ch] ?? cityOverride?.price ?? basePrice;
                      cp[ch] = applyMarkup(base, type, value);
                      updateCityOverride({ channelPrices: cp });
                    }}
                    onApplyAllChannels={(type, value) => {
                      const cp: Record<string, number> = {};
                      CHANNELS.forEach((ch) => {
                        const base = cityOverride?.channelPrices?.[ch.key] ?? cityOverride?.price ?? basePrice;
                        cp[ch.key] = applyMarkup(base, type, value);
                      });
                      updateCityOverride({ channelPrices: cp });
                    }}
                    availableChannels={renderedChannels}
                  />}
                </div>
              </div>
              {/* Price table */}
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-[12px] border-collapse table-fixed">
                  {effectiveShowChannels ? (
                    <colgroup>
                      <col className="w-[24%]" />
                      {renderedChannels.map((ch) => <col key={ch.key} />)}
                    </colgroup>
                  ) : (
                    <colgroup>
                      <col />
                      <col className="w-[140px]" />
                    </colgroup>
                  )}
                  <thead>
                    <tr className="text-left text-[11px] text-gray-400 font-normal">
                      <th className="pb-2 pr-2 pl-3 font-normal">Позиция</th>
                      {effectiveShowChannels ? (
                        renderedChannels.map((ch) => (
                          <th key={ch.key} className="pb-2 pr-2 font-normal whitespace-nowrap">
                            <ChannelHeaderLabel channelKey={ch.key} unavailable={unavail.has(ch.key)} />
                          </th>
                        ))
                      ) : (
                        <th className="pb-2 pr-2 font-normal">Цена</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-100">
                      <td className="py-2 pr-2 pl-3 text-[12px] text-gray-600">{positionName ?? "Цена"}</td>
                      {effectiveShowChannels ? (
                        renderedChannels.map((ch) => {
                          const chPrice = cityOverride?.channelPrices?.[ch.key];
                          const chBasePrice = baseChannelPrices?.[ch.key] ?? basePrice;
                          return (
                            <td key={ch.key} className="py-2 pr-2">
                              <InlinePriceInput
                                value={chPrice ?? (fixedIsSet ? effectivePrice : undefined)}
                                inheritedPrice={chBasePrice}
                                inheritedLabel="базовая"
                                onChange={(p) => updateCityOverride({ channelPrices: { ...(cityOverride?.channelPrices ?? {}), [ch.key]: p } })}
                                onClear={() => { const u = { ...(cityOverride?.channelPrices ?? {}) }; delete u[ch.key]; updateCityOverride({ channelPrices: Object.keys(u).length > 0 ? u : undefined }); }}
                                isSet={chPrice !== undefined || fixedIsSet}
                                compact
                                markupRule={chPrice === undefined ? cityOverride?.markup : undefined}
                              />
                            </td>
                          );
                        })
                      ) : (
                        <td className="py-2 pr-2">
                          <InlinePriceInput
                            value={fixedPrice}
                            inheritedPrice={basePrice} inheritedLabel="базовая"
                            onChange={(p) => updateCityOverride({ price: p, markup: undefined })}
                            onClear={() => onUpdate(overrides.filter((o) => !(o.cityId === city.id && !o.locationId)))}
                            isSet={fixedIsSet}
                            compact
                            markupRule={cityOverride?.markup} />
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })() : (
          <VariantPriceTable
            variants={variants} sets={variantSets}
            availableChannels={renderedChannels}
            unavailableChannelKeys={unavail}
            autoMarkup={{ on: isDynamic, onToggle: toggleDynamic, tooltip: "При изменении базовой цены товара цены в этом городе пересчитаются автоматически по заданному правилу. Если выключено — цены фиксируются." }}
            overrideValues={cityOverride?.variantPrices ?? {}}
            parentValues={basePrices} parentLabel="базовая"
            channelParentValues={baseChannelPrices}
            markupRule={cityOverride?.markup}
            channelMarkups={cityOverride?.channelMarkups}
            variantMarkups={cityOverride?.variantMarkups}
            channelVariantMarkups={cityOverride?.channelVariantMarkups}
            onSetVariantMarkup={(vid, rule) => updateCityOverride({ variantMarkups: { ...(cityOverride?.variantMarkups ?? {}), [vid]: rule } })}
            onClearVariantMarkup={(vid) => { const m = { ...(cityOverride?.variantMarkups ?? {}) }; delete m[vid]; updateCityOverride({ variantMarkups: Object.keys(m).length > 0 ? m : undefined }); }}
            onSetChannelVariantMarkup={(ch, vid, rule) => {
              const cvm = { ...(cityOverride?.channelVariantMarkups ?? {}) };
              cvm[ch] = { ...(cvm[ch] ?? {}), [vid]: rule };
              updateCityOverride({ channelVariantMarkups: cvm });
            }}
            onClearChannelVariantMarkup={(ch, vid) => {
              const cvm = { ...(cityOverride?.channelVariantMarkups ?? {}) };
              const inner = { ...(cvm[ch] ?? {}) }; delete inner[vid];
              if (Object.keys(inner).length > 0) cvm[ch] = inner; else delete cvm[ch];
              updateCityOverride({ channelVariantMarkups: Object.keys(cvm).length > 0 ? cvm : undefined });
            }}
            onSet={(vid, p) => updateCityOverride({ variantPrices: { ...(cityOverride?.variantPrices ?? {}), [vid]: p } })}
            onClear={(vid) => { const u = { ...(cityOverride?.variantPrices ?? {}) }; delete u[vid]; updateCityOverride({ variantPrices: u }); }}
            onCopyParent={() => {
              if (isDynamic) {
                updateCityOverride({ markup: { type: "pct", value: 0 }, channelMarkups: undefined, channelVariantPrices: undefined, channelPrices: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
              } else {
                const vp: Record<string, number> = {}; variants.forEach((v) => { vp[v.id] = v.price; });
                updateCityOverride({ variantPrices: vp, channelVariantPrices: undefined, channelPrices: undefined, channelMarkups: undefined, variantMarkups: undefined, channelVariantMarkups: undefined });
              }
              toast("Базовые цены скопированы", "success");
            }}
            onAdjustAmount={applyAdjustForCity}
            showChannels={effectiveShowChannels}
            channelVariantPrices={cityOverride?.channelVariantPrices}
            onSetChannel={(ch, vid, p) => {
              const chVP = { ...(cityOverride?.channelVariantPrices ?? {}) };
              chVP[ch] = { ...(chVP[ch] ?? {}), [vid]: p };
              updateCityOverride({ channelVariantPrices: chVP });
            }}
            onClearChannel={(ch, vid) => {
              const chVP = { ...(cityOverride?.channelVariantPrices ?? {}) };
              const inner = { ...(chVP[ch] ?? {}) }; delete inner[vid];
              if (Object.keys(inner).length > 0) chVP[ch] = inner; else delete chVP[ch];
              updateCityOverride({ channelVariantPrices: Object.keys(chVP).length > 0 ? chVP : undefined });
            }}
            onAdjustChannelAmount={(ch, type, value) => {
              if (isDynamic) {
                // Store as channel-specific markup rule
                updateCityOverride({ channelMarkups: { ...(cityOverride?.channelMarkups ?? {}), [ch]: { type, value } } });
              } else {
                const current = cityOverride?.channelVariantPrices?.[ch] ?? {};
                const parentVP = cityOverride?.variantPrices ?? {};
                const vp: Record<string, number> = {};
                variants.forEach((v) => { vp[v.id] = applyMarkup(current[v.id] ?? parentVP[v.id] ?? v.price, type, value); });
                const chVP = { ...(cityOverride?.channelVariantPrices ?? {}), [ch]: vp };
                updateCityOverride({ channelVariantPrices: chVP });
              }
              toast(`${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : "₽"} для ${CHANNEL_LABELS[ch] ?? ch}`, "success");
            }}
            onAdjustAllChannels={(type, value) => {
              if (isDynamic) return; // markup already covers all channels
              const parentVP = cityOverride?.variantPrices ?? {};
              const allChVP: Record<string, Record<string, number>> = {};
              CHANNELS.forEach((ch) => {
                const current = cityOverride?.channelVariantPrices?.[ch.key] ?? {};
                const vp: Record<string, number> = {};
                variants.forEach((v) => { vp[v.id] = applyMarkup(current[v.id] ?? parentVP[v.id] ?? v.price, type, value); });
                allChVP[ch.key] = vp;
              });
              updateCityOverride({ channelVariantPrices: allChVP });
              toast(`${value > 0 ? "+" : ""}${value}${type === "pct" ? "%" : "₽"} для всех каналов`, "success");
            }}
          />
        )}
      </div>

      {city.locations.length > 1 && (
        <div className="border-t border-gray-100">
          <button onClick={() => setLocExpanded(!locExpanded)}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
            {locExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            <Store size={13} className="text-gray-400" />
            <span className="text-[12px] font-medium text-gray-700">Точки {city.name}</span>
            <span className="text-[11px] text-gray-400 ml-1">{city.locations.length} шт · {locOverrideCount} с особыми ценами</span>
          </button>
          {locExpanded && (
            <div className="px-4 pb-4 space-y-2">
              {city.locations.filter((loc) => showUnavailable || !unavailLocs.has(loc.id)).map((loc) => (
                <LocationRow key={loc.id} location={loc} cityId={city.id} isVariants={isVariants} positionName={positionName}
                  basePrice={basePrice} variants={variants} variantSets={variantSets}
                  overrides={overrides} cityOverride={cityOverride}
                  onUpdateOverride={updateLocOverride} onRemoveOverride={removeLocOverride}
                  showChannels={effectiveShowChannels} baseChannelPrices={baseChannelPrices}
                  availableChannels={renderedChannels}
                  unavailableChannelKeys={unavail}
                  locationUnavailable={unavailLocs.has(loc.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── City Picker ──────────────────────────────────────────────────────────────
function CityPicker({ usedCityIds, availableCityIds, unavailableCityIds, onSelect, onClose }: {
  usedCityIds: string[];
  availableCityIds?: Set<string>;
  unavailableCityIds?: Set<string>;
  onSelect: (c: City) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const available = cities.filter((c) =>
    !usedCityIds.includes(c.id)
    && (availableCityIds ? availableCityIds.has(c.id) : true)
    && (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  );
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
          {available.length > 0 ? available.map((city) => {
            const isUnavail = unavailableCityIds?.has(city.id);
            return (
            <button key={city.id} onClick={() => { onSelect(city); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-left transition-colors">
              <Flag size={14} className={isUnavail ? "text-gray-300 shrink-0" : "text-orange-400 shrink-0"} />
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] font-medium flex items-center gap-1.5 ${isUnavail ? "text-gray-400" : "text-gray-800"}`}>
                  {isUnavail && <EyeOff size={11} className="text-gray-400" />}
                  {city.name}
                </div>
                <div className="text-[11px] text-gray-400">{city.locations.length} точки</div>
              </div>
            </button>
            );
          }) : (
            <div className="px-4 py-6 text-center text-[12px] text-gray-400">
              {search ? "Город не найден" : "Все города уже добавлены"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Summary: City Block ─────────────────────────────────────────────────────
function SummaryCityBlock({ city, ruleLabel, prices, hasChannels, cityOv, locOverrides,
  isVariants, basePrice, variants, variantSets, overrides, availableChannels, unavailableChannelKeys,
}: {
  city: City; ruleLabel: string | null;
  prices: { id: string; label: string; base: number; city: number }[];
  hasChannels: boolean; cityOv: PriceOverride | undefined;
  locOverrides: PriceOverride[];
  isVariants: boolean; basePrice: number; variants: PositionVariant[];
  variantSets: PropertySet[]; overrides: PriceOverride[];
  availableChannels?: typeof CHANNELS;
  unavailableChannelKeys?: Set<string>;
}) {
  const renderedChannels = availableChannels ?? CHANNELS;
  const unavail = unavailableChannelKeys ?? new Set<string>();
  const [expanded, setExpanded] = useState(true);
  const [locsExpanded, setLocsExpanded] = useState(false);
  const locsWithOverrides = city.locations.filter((loc) =>
    locOverrides.some((o) => o.locationId === loc.id)
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* City header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        {expanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
        <Flag size={12} className="text-blue-500" />
        <span className="text-[12px] font-semibold text-gray-800">{city.name}</span>
        {ruleLabel && <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">авто {ruleLabel}</span>}
        {hasChannels && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">каналы</span>}
        {locsWithOverrides.length > 0 && (
          <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{locsWithOverrides.length} точки</span>
        )}
      </button>

      {expanded && (
        <div className="px-3 py-2">
          {/* City-level prices */}
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-1 pr-2 font-normal">{isVariants ? "Вариант" : ""}</th>
                <th className="pb-1 pr-2 font-normal">Базовая</th>
                <th className="pb-1 pr-2 font-normal">Город</th>
                {hasChannels && renderedChannels.map((ch) => (
                  <th key={ch.key} className="pb-1 pr-2 font-normal whitespace-nowrap">
                    <ChannelHeaderLabel channelKey={ch.key} unavailable={unavail.has(ch.key)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => {
                const personalGeneralRule = isVariants ? cityOv?.variantMarkups?.[p.id] : undefined;
                const cityCellRule = personalGeneralRule ?? cityOv?.markup;
                return (
                  <tr key={p.id} className="border-t border-gray-50">
                    <td className="py-1 pr-2 text-gray-500 truncate max-w-[120px]">{p.label}</td>
                    <td className="py-1 pr-2 text-gray-600">{fmt(p.base)}</td>
                    <td className="py-1 pr-2"><SummaryPriceCell price={p.city} basePrice={p.base} rule={cityCellRule} /></td>
                    {hasChannels && renderedChannels.map((ch) => {
                      const personalChRule = isVariants ? cityOv?.channelVariantMarkups?.[ch.key]?.[p.id] : undefined;
                      const chMarkup = cityOv?.channelMarkups?.[ch.key];
                      const chStaticPrice = isVariants
                        ? cityOv?.channelVariantPrices?.[ch.key]?.[p.id]
                        : cityOv?.channelPrices?.[ch.key];
                      const activeRule = chStaticPrice !== undefined
                        ? undefined
                        : (personalChRule ?? chMarkup ?? personalGeneralRule ?? cityOv?.markup);
                      const chPrice = chStaticPrice ?? (activeRule ? applyMarkup(p.base, activeRule.type, activeRule.value) : p.city);
                      const differsFromCity = chPrice !== p.city;
                      return (
                        <td key={ch.key} className={`py-1 pr-2 ${differsFromCity ? "" : "opacity-30"}`}>
                          <SummaryPriceCell price={chPrice} basePrice={p.base} rule={activeRule} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Location overrides */}
          {locsWithOverrides.length > 0 && (
            <div className="mt-2 border-t border-gray-100 pt-2">
              <button onClick={() => setLocsExpanded(!locsExpanded)}
                className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-700 transition-colors">
                {locsExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <Store size={10} />
                {locsWithOverrides.length} точки с особыми ценами
              </button>
              {locsExpanded && locsWithOverrides.map((loc) => {
                const locOv = locOverrides.find((o) => o.locationId === loc.id);
                if (!locOv) return null;
                const locHasChannels = Object.keys(locOv.channelVariantPrices ?? {}).length > 0 ||
                  Object.keys(locOv.channelPrices ?? {}).length > 0 ||
                  Object.keys(locOv.channelMarkups ?? {}).length > 0;
                const locRuleLabel = locOv.markup
                  ? `${locOv.markup.value > 0 ? "+" : ""}${locOv.markup.value}${locOv.markup.type === "pct" ? "%" : " ₽"}`
                  : null;

                return (
                  <div key={loc.id} className="mt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Store size={11} className="text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-700">{loc.name}</span>
                      {locRuleLabel && <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">авто {locRuleLabel}</span>}
                    </div>
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="text-left text-gray-400">
                          <th className="pb-1 pr-2 font-normal">{isVariants ? "Вариант" : ""}</th>
                          <th className="pb-1 pr-2 font-normal">Город</th>
                          <th className="pb-1 pr-2 font-normal">Точка</th>
                          {locHasChannels && renderedChannels.map((ch) => (
                            <th key={ch.key} className="pb-1 pr-2 font-normal whitespace-nowrap">
                              <ChannelHeaderLabel channelKey={ch.key} unavailable={unavail.has(ch.key)} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prices.map((p) => {
                          const cityPrice = p.city;
                          // Resolve via shared resolver — uses variantMarkups
                          const locPrice = isVariants
                            ? (resolveOverride(locOv, p.id, cityPrice) ?? cityPrice)
                            : (locOv.markup ? applyMarkup(cityPrice, locOv.markup.type, locOv.markup.value) : (locOv.price ?? cityPrice));
                          const personalGeneralRule = isVariants ? locOv.variantMarkups?.[p.id] : undefined;
                          const locCellRule = personalGeneralRule ?? locOv.markup;
                          return (
                            <tr key={p.id} className="border-t border-gray-50">
                              <td className="py-1 pr-2 text-gray-500 truncate max-w-[120px]">{p.label}</td>
                              <td className="py-1 pr-2 text-gray-400">{fmt(cityPrice)}</td>
                              <td className="py-1 pr-2"><SummaryPriceCell price={locPrice} basePrice={cityPrice} rule={locCellRule} /></td>
                              {locHasChannels && renderedChannels.map((ch) => {
                                const chStaticPrice = isVariants
                                  ? locOv.channelVariantPrices?.[ch.key]?.[p.id]
                                  : locOv.channelPrices?.[ch.key];
                                const personalChRule = isVariants ? locOv.channelVariantMarkups?.[ch.key]?.[p.id] : undefined;
                                const chMarkup = locOv.channelMarkups?.[ch.key];
                                const activeRule = chStaticPrice !== undefined
                                  ? undefined
                                  : (personalChRule ?? chMarkup ?? personalGeneralRule ?? locOv.markup);
                                const effChPrice = chStaticPrice ?? (activeRule ? applyMarkup(cityPrice, activeRule.type, activeRule.value) : locPrice);
                                const differsFromLoc = effChPrice !== locPrice;
                                return (
                                  <td key={ch.key} className={`py-1 pr-2 ${differsFromLoc ? "" : "opacity-30"}`}>
                                    <SummaryPriceCell price={effChPrice} basePrice={cityPrice} rule={activeRule} />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary: Price Cell ─────────────────────────────────────────────────────
function SummaryPriceCell({ price, basePrice, rule }: { price: number; basePrice: number; rule?: MarkupRule }) {
  const diff = price - basePrice;
  const isModified = diff !== 0;
  const ruleStr = rule && rule.value !== 0
    ? `${rule.value > 0 ? "+" : ""}${rule.value}${rule.type === "pct" ? "%" : " ₽"}`
    : null;
  return (
    <span className={isModified ? "text-orange-600 font-medium" : "text-gray-400"}>
      {fmt(price)}
      {ruleStr ? (
        <span className="ml-1 text-[10px] text-orange-500">{ruleStr}</span>
      ) : isModified ? (
        <span className={`ml-1 text-[10px] ${diff > 0 ? "text-rose-400" : "text-green-500"}`}>
          {diff > 0 ? "+" : ""}{diff}
        </span>
      ) : null}
    </span>
  );
}

// ─── Summary Table ────────────────────────────────────────────────────────────
function SummaryTable({ isVariants, basePrice, variants, variantSets, overrides, availableChannels, availableCityIds, unavailableChannelKeys }: {
  isVariants: boolean; basePrice: number; variants: PositionVariant[];
  variantSets: PropertySet[]; overrides: PriceOverride[];
  availableChannels?: typeof CHANNELS;
  availableCityIds?: Set<string>;
  unavailableChannelKeys?: Set<string>;
}) {
  const renderedChannels = availableChannels ?? CHANNELS;
  const overrideCityIds = [...new Set(overrides.map((o) => o.cityId))];
  const overrideCities = cities.filter((c) => overrideCityIds.includes(c.id) && (availableCityIds ? availableCityIds.has(c.id) : true));
  if (overrideCities.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-[12px] font-semibold text-gray-700 flex items-center gap-2">
        <Scale size={13} className="text-gray-400" /> Сводка эффективных цен
      </div>

      {overrideCities.map((city) => {
        const cityOv = overrides.find((o) => o.cityId === city.id && !o.locationId);
        const locOverrides = overrides.filter((o) => o.cityId === city.id && !!o.locationId);
        // Show channel columns only if there are actual per-channel differences
        const hasChannelDiffs = Object.keys(cityOv?.channelMarkups ?? {}).length > 0 ||
          Object.keys(cityOv?.channelVariantPrices ?? {}).length > 0 ||
          Object.keys(cityOv?.channelPrices ?? {}).length > 0 ||
          Object.keys(cityOv?.channelVariantMarkups ?? {}).length > 0 ||
          locOverrides.some((o) => Object.keys(o.channelMarkups ?? {}).length > 0 ||
            Object.keys(o.channelVariantPrices ?? {}).length > 0 ||
            Object.keys(o.channelPrices ?? {}).length > 0 ||
            Object.keys(o.channelVariantMarkups ?? {}).length > 0);
        const hasChannels = hasChannelDiffs;

        // Resolve city-level prices (honors variantMarkups)
        const cityPrices = isVariants
          ? variants.map((v) => {
              const base = v.price;
              const eff = cityOv ? (resolveOverride(cityOv, v.id, base) ?? base) : base;
              return { id: v.id, label: getVariantLabel(v, variantSets), base, city: eff };
            })
          : [{ id: "_", label: "Цена", base: basePrice, city: cityOv?.markup ? applyMarkup(basePrice, cityOv.markup.type, cityOv.markup.value) : (cityOv?.price ?? basePrice) }];

        const ruleLabel = cityOv?.markup
          ? `${cityOv.markup.value > 0 ? "+" : ""}${cityOv.markup.value}${cityOv.markup.type === "pct" ? "%" : " ₽"}`
          : null;

        return (
          <SummaryCityBlock key={city.id}
            city={city} ruleLabel={ruleLabel} prices={cityPrices}
            hasChannels={hasChannels} cityOv={cityOv} locOverrides={locOverrides}
            isVariants={isVariants} basePrice={basePrice} variants={variants} variantSets={variantSets}
            overrides={overrides}
            availableChannels={renderedChannels}
            unavailableChannelKeys={unavailableChannelKeys}
          />
        );
      })}
    </div>
  );
}

// ─── Main PricesTab ───────────────────────────────────────────────────────────
export function PricesTab({ isVariants, positionName, basePrice, onBasePriceChange, baseChannelPrices, onBaseChannelPriceChange, variants, variantSets, priceOverrides, onChange, onVariantPriceChange, surcharges, onSurchargesChange, availability, showBaseChannels: controlledShowBaseChannels, onShowBaseChannelsChange }: PricesTabProps) {
  const [uncontrolledShowBaseChannels, setUncontrolledShowBaseChannels] = useState(Object.keys(baseChannelPrices ?? {}).length > 0);
  const showBaseChannels = controlledShowBaseChannels ?? uncontrolledShowBaseChannels;
  const setShowBaseChannels = onShowBaseChannelsChange ?? setUncontrolledShowBaseChannels;
  const [showSurcharges, setShowSurcharges] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // ── Effective availability filters ────────────────────────────────────────
  // Channels actually available right now (used for "is unavailable" check, regardless of showAll)
  const availableChannelKeys = useMemo(
    () => getAvailableChannelKeys(availability),
    [availability]
  );
  const effectiveChannelKeys = useMemo(
    () => showAll ? new Set(CHANNELS.map((c) => c.key)) : availableChannelKeys,
    [availableChannelKeys, showAll]
  );
  const effectiveChannels = useMemo(
    () => CHANNELS.filter((c) => effectiveChannelKeys.has(c.key)),
    [effectiveChannelKeys]
  );
  const unavailableChannelKeys = useMemo(
    () => new Set(CHANNELS.filter((c) => !availableChannelKeys.has(c.key)).map((c) => c.key)),
    [availableChannelKeys]
  );
  const availableCityIdsSet = useMemo(
    () => getAvailableCityIds(availability),
    [availability]
  );
  const effectiveCityIds = useMemo(
    () => showAll ? new Set(cities.map((c) => c.id)) : availableCityIdsSet,
    [availableCityIdsSet, showAll]
  );
  const unavailableCityIds = useMemo(
    () => new Set(cities.filter((c) => !availableCityIdsSet.has(c.id)).map((c) => c.id)),
    [availableCityIdsSet]
  );
  // Map of cityId → set of unavailable locationIds in that city
  const unavailableLocationIdsByCity = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const city of cities) {
      const avail = getAvailableLocationIds(availability, city.id);
      const unavail = new Set<string>();
      for (const loc of city.locations) {
        if (!avail.has(loc.id)) unavail.add(loc.id);
      }
      map[city.id] = unavail;
    }
    return map;
  }, [availability]);
  const conflictCount = useMemo(
    () => countConflictsAgainst(priceOverrides, baseChannelPrices, availability),
    [priceOverrides, baseChannelPrices, availability]
  );
  const hasHiddenScope = useMemo(
    () => {
      if (!availability) return false;
      const ach = getAvailableChannelKeys(availability);
      const aci = getAvailableCityIds(availability);
      return ach.size < CHANNELS.length || aci.size < cities.length;
    },
    [availability]
  );

  const usedCityIds = [...new Set(priceOverrides.map((o) => o.cityId))];
  const overrideCities = cities.filter((c) => usedCityIds.includes(c.id) && effectiveCityIds.has(c.id));
  const allCitiesCovered = cities.every((c) => usedCityIds.includes(c.id) || !effectiveCityIds.has(c.id));

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
      {/* Header row: title + conflict badge + showAll toggle */}
      <div className="flex items-center gap-3">
        <h2 className="text-[20px] font-semibold text-gray-900">Управление ценами</h2>
        <div className="flex-1" />
        {hasHiddenScope && (
          <>
            {conflictCount > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <AlertCircle size={12} />
                {conflictCount} {plural(conflictCount, "цена скрыта", "цены скрыто", "цен скрыто")} в недоступных
              </button>
            )}
            <label className="flex items-center gap-1.5 cursor-pointer select-none relative group/tip">
              <Eye size={12} className={showAll ? "text-orange-500" : "text-gray-300"} />
              <span className="text-[11px] text-gray-500">Показать недоступные</span>
              <span className="text-gray-300 hover:text-gray-500 transition-colors"><HelpCircle size={11} /></span>
              <div className="absolute right-0 top-6 z-20 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 w-[260px] shadow-lg opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all pointer-events-none">
                Если город или каналы выключены в «Доступности», их здесь не видно. Включите, чтобы проставить цены заранее — например, перед запуском точки / канала.
              </div>
              <Switch checked={showAll} onCheckedChange={setShowAll} size="sm" />
            </label>
          </>
        )}
      </div>

      {/* Base prices */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <DollarSign size={14} className="text-gray-400" />
          <span className="text-[13px] font-semibold text-gray-800">Базовые цены</span>
          <div className="flex-1" />
          {isVariants && onSurchargesChange && (
            <div className="relative">
              <button onClick={() => setShowSurcharges(!showSurcharges)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Plus size={11} /> Надбавки
              </button>
              {showSurcharges && (
                <SurchargesPanel
                  variantSets={variantSets}
                  surcharges={surcharges ?? []}
                  basePrice={basePrice}
                  variants={variants}
                  showChannels={showBaseChannels}
                  onApply={(s, newBase) => {
                    onSurchargesChange!(s);
                    if (newBase !== basePrice) onBasePriceChange(newBase);
                    // Recalculate variant prices from surcharges
                    if (onVariantPriceChange) {
                      variants.forEach((v) => {
                        const computed = computeVariantPrice(newBase, v, s);
                        onVariantPriceChange(v.id, computed);
                      });
                    }
                    // Recalculate channel prices from surcharges
                    if (onBaseChannelPriceChange && showBaseChannels) {
                      variants.forEach((v) => {
                        CHANNELS.forEach((ch) => {
                          const computed = computeVariantPrice(newBase, v, s, ch.key);
                          const base = computeVariantPrice(newBase, v, s);
                          onBaseChannelPriceChange(`${v.id}:${ch.key}`, computed !== base ? computed : undefined);
                        });
                      });
                    }
                  }}
                  onClose={() => setShowSurcharges(false)}
                />
              )}
            </div>
          )}
          {onBaseChannelPriceChange && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Layers size={12} className={showBaseChannels ? "text-orange-500" : "text-gray-300"} />
              <span className="text-[11px] text-gray-500">По каналам</span>
              <Switch checked={showBaseChannels} onCheckedChange={setShowBaseChannels} size="sm" />
            </label>
          )}
        </div>
        <div className="px-4 py-4">
          {!isVariants ? (
            <div>
              {!showBaseChannels && (
                <div className="flex items-center gap-3 mb-3">
                  <label className="block text-[12px] text-gray-600">Цена по умолчанию</label>
                  <div className="relative">
                    <input type="number" value={basePrice || ""} onChange={(e) => onBasePriceChange(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-32 pl-3 pr-7 py-2 text-[14px] font-semibold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">₽</span>
                  </div>
                </div>
              )}
              {showBaseChannels && onBaseChannelPriceChange && (
                <div>
                  <table className="w-full text-[12px] border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[24%]" />
                      {effectiveChannels.map((ch) => <col key={ch.key} />)}
                    </colgroup>
                    <thead>
                      <tr className="text-left text-[11px] text-gray-400 font-normal">
                        <th className="pb-2 pr-2 pl-1 font-normal">Позиция</th>
                        {effectiveChannels.map((ch) => (
                          <th key={ch.key} className="pb-2 pr-2 font-normal whitespace-nowrap">
                            <ChannelHeaderLabel channelKey={ch.key} unavailable={unavailableChannelKeys.has(ch.key)} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100">
                        <td className="py-2 pr-2 pl-1 text-[12px] text-gray-600">{positionName ?? "Цена"}</td>
                        {effectiveChannels.map((ch) => (
                          <td key={ch.key} className="py-2 pr-2">
                            <BasePriceInput value={baseChannelPrices?.[ch.key] ?? basePrice}
                              onChange={(p) => onBaseChannelPriceChange(ch.key, p === basePrice ? undefined : p)} />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div>
              {showBaseChannels && onBaseChannelPriceChange ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px] border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[24%]" />
                      {effectiveChannels.map((ch) => <col key={ch.key} />)}
                    </colgroup>
                    <thead>
                      <tr className="text-left text-[11px] text-gray-400 font-normal">
                        <th className="pb-2 pr-2 pl-1 font-normal">Вариант</th>
                        {effectiveChannels.map((ch) => (
                          <th key={ch.key} className="pb-2 pr-2 font-normal whitespace-nowrap">
                            <ChannelHeaderLabel channelKey={ch.key} unavailable={unavailableChannelKeys.has(ch.key)} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr key={v.id} className="border-t border-gray-100">
                          <td className="py-1.5 pr-2 pl-1 text-[12px] text-gray-600">{getVariantLabel(v, variantSets)}</td>
                          {effectiveChannels.map((ch) => (
                            <td key={ch.key} className="py-1.5 pr-2">
                              <BasePriceInput value={baseChannelPrices?.[`${v.id}:${ch.key}`] ?? v.price}
                                onChange={(p) => onBaseChannelPriceChange(`${v.id}:${ch.key}`, p === v.price ? undefined : p)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-1">
                  {variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-[12px] text-gray-600">{getVariantLabel(v, variantSets)}</span>
                      <BasePriceInput value={v.price} onChange={onVariantPriceChange ? (p) => onVariantPriceChange(v.id, p) : undefined} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* City overrides */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[18px] font-semibold text-gray-900">Переопределения цен по городам</h2>
          {overrideCities.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{overrideCities.length}</span>
          )}
        </div>
        <div className="flex items-start gap-2 text-[12px] text-gray-500 mb-4">
          <AlertCircle size={13} className="text-gray-400 mt-0.5 shrink-0" />
          Иерархия: базовая → город → точка → канал. На каждом уровне можно задать отдельные цены для доставки, самовывоза и других каналов.
        </div>

        {overrideCities.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl">
            <Flag size={28} className="text-gray-200 mx-auto mb-2" />
            <div className="text-[13px] font-medium text-gray-500">Все города используют базовые цены</div>
          </div>
        )}

        <div className="space-y-3">
          {overrideCities.map((city) => (
            <CityOverrideCard key={city.id} city={city} isVariants={isVariants} positionName={positionName}
              basePrice={basePrice} variants={variants} variantSets={variantSets}
              overrides={priceOverrides.filter((o) => o.cityId === city.id)}
              onUpdate={(updated) => updateForCity(city.id, updated)}
              onRemoveCity={() => removeCity(city.id)}
              showChannels={showBaseChannels}
              baseChannelPrices={baseChannelPrices}
              availableChannels={effectiveChannels}
              unavailableChannelKeys={unavailableChannelKeys}
              cityUnavailable={unavailableCityIds.has(city.id)}
              unavailableLocationIds={unavailableLocationIdsByCity[city.id]}
              showUnavailable={showAll} />
          ))}
        </div>

        {!allCitiesCovered && (
          <div className="relative mt-3">
            <button onClick={() => setShowCityPicker(!showCityPicker)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-[13px] text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
              <Plus size={15} /> Добавить переопределение для города
            </button>
            {showCityPicker && (
              <CityPicker usedCityIds={usedCityIds} availableCityIds={effectiveCityIds} unavailableCityIds={unavailableCityIds} onSelect={addCity} onClose={() => setShowCityPicker(false)} />
            )}
          </div>
        )}
      </div>

      {overrideCities.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4">
          <SummaryTable isVariants={isVariants} basePrice={basePrice} variants={variants} variantSets={variantSets} overrides={priceOverrides} availableChannels={effectiveChannels} availableCityIds={effectiveCityIds} unavailableChannelKeys={unavailableChannelKeys} />
        </div>
      )}
    </div>
  );
}
