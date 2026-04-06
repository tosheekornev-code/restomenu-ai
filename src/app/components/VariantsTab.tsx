import { useState, useRef, useEffect } from "react";
import {
  Plus, X, ChevronDown, GripVertical, Trash2, Zap, Eye,
  RefreshCw, Search, CheckCircle2, AlertCircle,
  ChevronRight, Layers, Image, MoreVertical, ArrowUpDown,
  Unlink, Link2, Copy, Pencil, DollarSign, Save, HelpCircle,
} from "lucide-react";
import {
  PropertySet, PropertyValue, PositionVariant, Position,
  propertySets as globalSets, positions as allPositions,
  Availability, CHANNELS, ChannelAvailability, cities,
} from "../data/mockData";
import { AvailabilitySection } from "./AvailabilitySection";
import { Toggle } from "./shared/Toggle";
import { toast } from "./shared/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface VariantsTabProps {
  positionName: string;
  positionId?: string;
  initialSets?: PropertySet[];
  initialVariants?: PositionVariant[];
  onChange?: (sets: PropertySet[], variants: PositionVariant[]) => void;
  onDetachVariant?: (variant: PositionVariant, label: string) => void;
  onGoToPrices?: () => void;
}

const WEIGHT_UNITS = ["г", "мл", "кг", "л", "шт", "порц"] as const;

// ─── Utils ────────────────────────────────────────────────────────────────────
function cartesian(arrays: PropertyValue[][]): PropertyValue[][] {
  if (arrays.length === 0) return [];
  return arrays.reduce<PropertyValue[][]>(
    (acc, cur) => acc.flatMap((a) => cur.map((b) => [...a, b])),
    [[]]
  );
}

function generateVariants(sets: PropertySet[], existing: PositionVariant[]): PositionVariant[] {
  const validSets = sets.filter((s) => s.values.length > 0);
  if (validSets.length === 0) return [];
  const combinations = cartesian(validSets.map((s) => s.values));
  return combinations.map((combo) => {
    const properties: Record<string, string> = {};
    validSets.forEach((s, i) => { properties[s.id] = combo[i].id; });
    const existingMatch = existing.find((v) =>
      Object.entries(properties).every(([k, val]) => v.properties[k] === val)
    );
    if (existingMatch) return { ...existingMatch, properties };
    return {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      properties, price: 0, sku: "", weight: "", weightUnit: "г" as const,
      enabled: true, isDefault: false, sortOrder: combinations.indexOf(combo),
    };
  });
}

export function getVariantLabel(variant: PositionVariant, sets: PropertySet[]): string {
  return sets
    .map((s) => s.values.find((v) => v.id === variant.properties[s.id])?.name ?? "?")
    .join(" / ");
}

function countVariants(sets: PropertySet[]): number {
  const valid = sets.filter((s) => s.values.length > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((acc, s) => acc * s.values.length, 1);
}

// ─── Display types ────────────────────────────────────────────────────────────
const DISPLAY_TYPES: { value: PropertySet["displayType"]; label: string; icon: string }[] = [
  { value: "chips", label: "Чипсы (кнопки)", icon: "⬭" },
  { value: "dropdown", label: "Выпадающий список", icon: "▾" },
  { value: "swatch", label: "Цветовые плитки", icon: "⬛" },
];

// ─── Customer Preview ─────────────────────────────────────────────────────────
function CustomerPreview({ set }: { set: PropertySet }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  if (set.values.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-1.5 mb-2">
        <Eye size={11} className="text-gray-400" />
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Предпросмотр для клиента</span>
      </div>
      {set.displayType === "chips" && (
        <div className="flex flex-wrap gap-1.5">
          {set.values.map((v, i) => (
            <button key={v.id} onClick={() => setSelectedIdx(i)}
              className={`px-3 py-1.5 rounded-full text-[12px] border-2 transition-colors ${
                selectedIdx === i ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>{v.name}</button>
          ))}
        </div>
      )}
      {set.displayType === "dropdown" && (
        <div className="relative w-40">
          <select className="w-full px-3 py-2 text-[12px] border-2 border-gray-200 rounded-xl bg-white appearance-none focus:outline-none">
            {set.values.map((v) => <option key={v.id}>{v.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      )}
      {set.displayType === "swatch" && (
        <div className="flex gap-2 flex-wrap">
          {set.values.map((v, i) => (
            <button key={v.id} onClick={() => setSelectedIdx(i)} title={v.name}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${selectedIdx === i ? "border-gray-800 scale-110" : "border-transparent hover:border-gray-300"}`}
              style={{ backgroundColor: v.color ?? "#e5e7eb" }}
            />
          ))}
          {set.values[selectedIdx] && (
            <span className="text-[12px] text-gray-600 self-center ml-1">{set.values[selectedIdx].name}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PropertySetCard ──────────────────────────────────────────────────────────
function PropertySetCard({ set, onChange, onRemove }: {
  set: PropertySet; onChange: (u: PropertySet) => void; onRemove: () => void;
}) {
  const [newValueName, setNewValueName] = useState("");
  const [newValueColor, setNewValueColor] = useState("#4ade80");
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingValueName, setEditingValueName] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [showDtMenu, setShowDtMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addValue = () => {
    const trimmed = newValueName.trim();
    if (!trimmed) return;
    onChange({ ...set, values: [...set.values, { id: `psv-${Date.now()}`, name: trimmed, color: set.displayType === "swatch" ? newValueColor : undefined }] });
    setNewValueName("");
  };
  const removeValue = (id: string) => onChange({ ...set, values: set.values.filter((v) => v.id !== id) });
  const confirmEditValue = () => {
    if (!editingValueId) return;
    onChange({ ...set, values: set.values.map((v) => v.id === editingValueId ? { ...v, name: editingValueName.trim() || v.name } : v) });
    setEditingValueId(null);
  };

  return (
    <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/60 border-b border-gray-100">
        <GripVertical size={14} className="text-gray-300 cursor-grab shrink-0" />
        <input value={set.name} onChange={(e) => onChange({ ...set, name: e.target.value })}
          className="flex-1 text-[13px] font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-400 focus:outline-none px-0.5 min-w-0"
          placeholder="Название набора..." />
        <div className="relative">
          <button onClick={() => setShowDtMenu(!showDtMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
            <span>{DISPLAY_TYPES.find(d => d.value === set.displayType)?.icon}</span>
            <span>{DISPLAY_TYPES.find(d => d.value === set.displayType)?.label}</span>
            <ChevronDown size={10} className="text-gray-400" />
          </button>
          {showDtMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDtMenu(false)} />
              <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[180px]">
                {DISPLAY_TYPES.map((dt) => (
                  <button key={dt.value} onClick={() => { onChange({ ...set, displayType: dt.value }); setShowDtMenu(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] hover:bg-orange-50 transition-colors ${set.displayType === dt.value ? "text-orange-700 font-medium" : "text-gray-700"}`}>
                    <span className="text-[16px]">{dt.icon}</span>
                    <span>{dt.label}</span>
                    {set.displayType === dt.value && <CheckCircle2 size={13} className="ml-auto text-orange-500" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setShowPreview(!showPreview)}
          className={`p-1.5 rounded-lg transition-colors ${showPreview ? "bg-orange-50 text-orange-500" : "hover:bg-gray-100 text-gray-400"}`}>
          <Eye size={14} />
        </button>
        <button onClick={onRemove} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {set.values.map((v) => (
            <span key={v.id} className="group flex items-center gap-1">
              {editingValueId === v.id ? (
                <input autoFocus value={editingValueName} onChange={(e) => setEditingValueName(e.target.value)}
                  onBlur={confirmEditValue}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmEditValue(); if (e.key === "Escape") setEditingValueId(null); }}
                  className="px-2 py-1 text-[12px] border border-orange-400 rounded-lg focus:outline-none w-24" />
              ) : (
                <span onDoubleClick={() => { setEditingValueId(v.id); setEditingValueName(v.name); }}
                  className="flex items-center gap-1 pl-2 pr-1 py-1 bg-gray-100 text-gray-700 rounded-lg text-[12px] cursor-pointer hover:bg-gray-200 transition-colors">
                  {set.displayType === "swatch" && v.color && <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: v.color }} />}
                  {v.name}
                  <button onClick={() => removeValue(v.id)} className="ml-0.5 text-gray-400 hover:text-red-500"><X size={10} /></button>
                </span>
              )}
            </span>
          ))}
          <div className="flex items-center gap-1">
            {set.displayType === "swatch" && (
              <input type="color" value={newValueColor} onChange={(e) => setNewValueColor(e.target.value)}
                className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
            )}
            <div className="flex items-center border border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-orange-400 transition-colors">
              <input ref={inputRef} value={newValueName} onChange={(e) => setNewValueName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addValue(); }}
                placeholder="+ Значение"
                className="px-2 py-1 text-[12px] text-gray-600 bg-transparent focus:outline-none w-24 placeholder:text-gray-400" />
              {newValueName && (
                <button onClick={addValue} className="px-2 py-1 bg-orange-500 text-white text-[11px] hover:bg-orange-600">↵</button>
              )}
            </div>
          </div>
        </div>
        {set.values.length === 0 && (
          <div className="text-[11px] text-amber-600 flex items-center gap-1 mb-1">
            <AlertCircle size={11} /> Добавьте хотя бы одно значение
          </div>
        )}
        <div className="text-[10px] text-gray-400">Двойной клик по значению — редактировать</div>
        {showPreview && <CustomerPreview set={set} />}
      </div>
    </div>
  );
}

// ─── Set Picker ───────────────────────────────────────────────────────────────
function SetPickerDropdown({ usedIds, onSelect, onCreateNew, onClose }: {
  usedIds: string[]; onSelect: (s: PropertySet) => void; onCreateNew: () => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const available = globalSets.filter(
    (s) => !usedIds.includes(s.id) && (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-12 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 w-72 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск наборов..."
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {available.length > 0 ? available.map((s) => (
            <button key={s.id} onClick={() => { onSelect(s); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-left transition-colors">
              <Layers size={14} className="text-orange-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-gray-800">{s.name}</div>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {s.values.slice(0, 4).map((v) => (
                    <span key={v.id} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md">{v.name}</span>
                  ))}
                </div>
              </div>
              <ChevronRight size={13} className="text-gray-300" />
            </button>
          )) : (
            <div className="px-4 py-6 text-center text-[12px] text-gray-400">
              {search ? "Не найдено" : "Все наборы уже добавлены"}
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 p-2">
          <button onClick={() => { onCreateNew(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-orange-600 font-medium hover:bg-orange-50 rounded-xl transition-colors">
            <Plus size={15} /> Создать новый набор
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Manage Properties Modal ─────────────────────────────────────────────────
type EditingSet = { id: string | null; name: string; internalName: string; showName: boolean; displayType: PropertySet["displayType"]; values: { id: string; name: string; color?: string }[] };

const EMPTY_FORM: EditingSet = { id: null, name: "", internalName: "", showName: true, displayType: "chips", values: [] };

function ManagePropertiesModal({ sets, onSetsChange, onClose }: {
  sets: PropertySet[];
  onSetsChange: (updated: PropertySet[]) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditingSet | null>(null);
  const [newValueName, setNewValueName] = useState("");

  const openCreate = () => setForm({ ...EMPTY_FORM });
  const openEdit = (set: PropertySet) => setForm({ id: set.id, name: set.name, internalName: set.name, showName: false, displayType: set.displayType, values: set.values.map((v) => ({ ...v })) });

  const addFormValue = () => {
    const t = newValueName.trim();
    if (!t || !form) return;
    setForm({ ...form, values: [...form.values, { id: `psv-${Date.now()}`, name: t }] });
    setNewValueName("");
  };

  const saveForm = () => {
    if (!form || !form.name.trim()) return;
    if (form.id) {
      onSetsChange(sets.map((s) => s.id === form.id ? { ...s, name: form.name, displayType: form.displayType, values: form.values } : s));
    } else {
      onSetsChange([...sets, { id: `ps-custom-${Date.now()}`, name: form.name, displayType: form.displayType, values: form.values }]);
    }
    setForm(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex" style={{ width: form ? 860 : 480, maxHeight: "85vh" }}>

          {/* ── Left: list ── */}
          <div className="flex flex-col w-[480px] shrink-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-[15px] font-semibold text-gray-900">Управление свойствами</h3>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {sets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <Layers size={32} className="text-gray-200 mb-3" />
                  <p className="text-[13px] text-gray-400 mb-1">Еще не создано свойств</p>
                  <p className="text-[12px] text-gray-400">Добавьте свойства товара, такие как<br />размер, начинка, количество, тесто...</p>
                  <div className="mt-4 border-t border-dashed border-gray-200 w-8 mx-auto" />
                  <div className="mt-1 text-[11px] text-gray-300">↓</div>
                </div>
              )}
              {sets.map((set, idx) => (
                <div key={set.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${form?.id === set.id ? "bg-orange-50/40" : ""}`}>
                  <span className="text-[11px] text-gray-400 font-mono mt-0.5 w-7 shrink-0">{String(idx + 1).padStart(3, "0")}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-medium text-gray-800">{set.name}</span>
                      <span className="text-[11px] text-gray-400">вид: {DISPLAY_TYPES.find(d => d.value === set.displayType)?.label.toLowerCase()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {set.values.map((v) => (
                        <span key={v.id} className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">{v.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(set)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors" title="Редактировать">
                      <Pencil size={13} className="text-gray-400" />
                    </button>
                    <button onClick={() => onSetsChange(sets.filter((s) => s.id !== set.id))} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Удалить">
                      <X size={13} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 shrink-0">
              <button onClick={openCreate}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] text-green-600 font-medium hover:bg-green-50 rounded-xl transition-colors">
                <Plus size={15} /> Создать свойство
              </button>
            </div>
          </div>

          {/* ── Right: form ── */}
          {form && (
            <div className="w-[380px] border-l border-gray-100 flex flex-col shrink-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <h3 className="text-[14px] font-semibold text-gray-900">
                  {form.id ? "Редактирование свойства" : "Создание свойства"}
                </h3>
                <button onClick={() => setForm(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={15} className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Название свойства <span className="text-red-500">*</span>
                    </label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Выберите размер"
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1 flex items-center gap-1">
                      Внутреннее название
                      <HelpCircle size={11} className="text-gray-400" />
                    </label>
                    <input value={form.internalName} onChange={(e) => setForm({ ...form, internalName: e.target.value })}
                      placeholder="Размер пицц"
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                </div>

                {/* Show name toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="text-[13px] font-medium text-gray-800">Показывать название</div>
                    <div className="text-[11px] text-gray-500">Если включить — клиент будет видеть название</div>
                  </div>
                  <Toggle checked={form.showName} onChange={(v) => setForm({ ...form, showName: v })} size="sm" />
                </div>

                {/* Display type */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Вид отображения <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={form.displayType} onChange={(e) => setForm({ ...form, displayType: e.target.value as PropertySet["displayType"] })}
                      className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-300 pr-8">
                      {DISPLAY_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Values */}
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-2 flex items-center gap-1">
                    Добавление значений
                    <HelpCircle size={11} className="text-gray-400" />
                  </label>
                  <p className="text-[11px] text-gray-400 mb-3">
                    При добавлении свойства к товару, варианты создадутся автоматически, на основе заданных значений.
                    Добавьте значения (пример: 25 см, 32 см ...)
                  </p>
                  <div className="space-y-2">
                    {form.values.map((v, i) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <GripVertical size={13} className="text-gray-300 shrink-0" />
                        <input value={v.name}
                          onChange={(e) => setForm({ ...form, values: form.values.map((fv, fi) => fi === i ? { ...fv, name: e.target.value } : fv) })}
                          className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                        <button onClick={() => setForm({ ...form, values: form.values.filter((_, fi) => fi !== i) })}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-3 py-2 hover:border-green-400 transition-colors">
                      <input value={newValueName} onChange={(e) => setNewValueName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addFormValue(); }}
                        placeholder="Добавить значение"
                        className="flex-1 text-[13px] text-gray-600 bg-transparent focus:outline-none placeholder:text-gray-400" />
                      {newValueName && (
                        <button onClick={addFormValue} className="text-green-600 hover:text-green-700 font-medium text-[12px]">↵</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 shrink-0">
                <button onClick={saveForm} disabled={!form.name.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors">
                  <Save size={15} /> Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Attach Existing Position Modal ──────────────────────────────────────────
function AttachPositionModal({ currentPositionId, sets, onAttach, onClose }: {
  currentPositionId?: string;
  sets: PropertySet[];
  onAttach: (pos: Position) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const available = allPositions.filter(
    (p) => p.id !== currentPositionId && p.priceType !== "variants" &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Прикрепить товар как вариант</h3>
              <p className="text-[12px] text-gray-500 mt-0.5">Товар будет добавлен как новый вариант</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-500" /></button>
          </div>
          {sets.length === 0 && (
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <AlertCircle size={13} className="text-amber-500" />
              <span className="text-[12px] text-amber-800">Сначала добавьте хотя бы один набор свойств</span>
            </div>
          )}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск товаров..."
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {available.length > 0 ? available.map((p) => (
              <button key={p.id} onClick={() => { onAttach(p); onClose(); }}
                disabled={sets.length === 0}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-orange-50 text-left transition-colors disabled:opacity-40 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                  {p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : <span className="text-[16px]">🍽️</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-800 truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-400">{p.price} ₽ {p.sku ? `· ${p.sku}` : ""}</div>
                </div>
                <Link2 size={14} className="text-gray-300 shrink-0" />
              </button>
            )) : (
              <div className="px-5 py-10 text-center text-[13px] text-gray-400">
                {search ? "Товар не найден" : "Нет доступных товаров"}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Bulk Price Editor ────────────────────────────────────────────────────────
function BulkPriceEditor({ variants, sets, onApply, onClose }: {
  variants: PositionVariant[]; sets: PropertySet[];
  onApply: (updated: PositionVariant[]) => void; onClose: () => void;
}) {
  const [mode, setMode] = useState<"flat" | "increment">("flat");
  const [basePrice, setBasePrice] = useState("0");
  const [incrementMode, setIncrementMode] = useState<"rub" | "pct">("rub");
  const [firstSetIncrements, setFirstSetIncrements] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sets[0]) {
      const init: Record<string, string> = {};
      sets[0].values.forEach((v, i) => { init[v.id] = String(i * 50); });
      setFirstSetIncrements(init);
    }
  }, [sets]);

  const computeIncrement = (valueId: string, base: number): number => {
    const raw = parseFloat(firstSetIncrements[valueId] ?? "0") || 0;
    return incrementMode === "pct" ? Math.round(base * raw / 100) : raw;
  };

  const applyFlat = () => {
    const price = parseFloat(basePrice) || 0;
    onApply(variants.map((v) => ({ ...v, price })));
    toast("Цена применена ко всем вариантам", "success");
    onClose();
  };

  const applyIncrement = () => {
    const base = parseFloat(basePrice) || 0;
    const updated = variants.map((v) => {
      const firstSetId = sets[0]?.id;
      const valueId = firstSetId ? v.properties[firstSetId] : undefined;
      const incr = valueId ? computeIncrement(valueId, base) : 0;
      return { ...v, price: base + incr };
    });
    onApply(updated);
    toast("Цены рассчитаны с надбавками", "success");
    onClose();
  };

  const base = parseFloat(basePrice) || 0;

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/20" onClick={onClose} />
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-[15px] font-semibold text-gray-900">Установить цены</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-500" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {(["flat", "increment"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-[12px] font-medium rounded-lg transition-colors ${mode === m ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                  {m === "flat" ? "Единая цена" : "С надбавками"}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">
                {mode === "flat" ? "Цена для всех вариантов" : "Базовая цена"}
              </label>
              <div className="relative">
                <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full px-3 py-2.5 pr-7 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₽</span>
              </div>
            </div>
            {mode === "increment" && sets[0] && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium text-gray-700">Надбавка по «{sets[0].name}»</label>
                  {/* Rub / Pct switcher */}
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                    {(["rub", "pct"] as const).map((m) => (
                      <button key={m} onClick={() => setIncrementMode(m)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${incrementMode === m ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
                        {m === "rub" ? "₽" : "%"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {sets[0].values.map((v) => {
                    const incr = computeIncrement(v.id, base);
                    return (
                      <div key={v.id} className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-600 w-20 truncate">{v.name}</span>
                        <div className="relative flex-1">
                          <input type="number" value={firstSetIncrements[v.id] ?? "0"}
                            onChange={(e) => setFirstSetIncrements((prev) => ({ ...prev, [v.id]: e.target.value }))}
                            className="w-full px-3 py-1.5 pr-8 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                            {incrementMode === "rub" ? "₽" : "%"}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 w-16 text-right font-medium">
                          = {base + incr} ₽
                        </span>
                      </div>
                    );
                  })}
                </div>
                {sets.length > 1 && (
                  <div className="mt-2 text-[11px] text-gray-400 italic">Надбавки других наборов одинаковы</div>
                )}
              </div>
            )}
          </div>
          <div className="px-5 pb-5 flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
            <button onClick={mode === "flat" ? applyFlat : applyIncrement}
              className="px-4 py-2 text-[13px] font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg">
              Применить к {variants.length} вар.
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Variant Detail Panel ─────────────────────────────────────────────────────

function VariantDetailPanel({ variant, sets, onUpdate, onClose }: {
  variant: PositionVariant;
  sets: PropertySet[];
  onUpdate: (v: PositionVariant) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"basic" | "availability" | "discount">("basic");
  const label = getVariantLabel(variant, sets);
  const channels = variant.channels ?? {};

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-30 w-[560px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-gray-900 truncate">{label}</div>
            <div className="text-[11px] text-gray-400">Вариант · {variant.sku ?? "без артикула"}</div>
          </div>
          <Toggle checked={variant.enabled} onChange={(v) => onUpdate({ ...variant, enabled: v })} size="sm" />
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 px-5">
          {([["basic", "Основное"], ["availability", "Доступность"], ["discount", "Скидки"]] as const).map(([key, title]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`py-3 px-3 text-[13px] font-medium border-b-2 -mb-px transition-colors ${tab === key ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {title}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "basic" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-[13px] font-medium text-gray-800">Вариант по умолчанию</div>
                  <div className="text-[11px] text-gray-500">Отображается первым для клиента</div>
                </div>
                <Toggle checked={!!variant.isDefault} onChange={(v) => onUpdate({ ...variant, isDefault: v })} size="sm" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Цена, ₽</label>
                <input type="number" defaultValue={variant.price}
                  onBlur={(e) => onUpdate({ ...variant, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Артикул (SKU)</label>
                <input defaultValue={variant.sku ?? ""} placeholder="Не указан"
                  onBlur={(e) => onUpdate({ ...variant, sku: e.target.value || undefined })}
                  className="w-full px-3 py-2.5 text-[13px] font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Вес / Объём</label>
                <div className="flex gap-2">
                  <input defaultValue={variant.weight ?? ""} placeholder="Значение"
                    onBlur={(e) => onUpdate({ ...variant, weight: e.target.value || undefined })}
                    className="flex-1 px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  <select value={variant.weightUnit ?? "г"}
                    onChange={(e) => onUpdate({ ...variant, weightUnit: e.target.value as PositionVariant["weightUnit"] })}
                    className="px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none bg-white cursor-pointer">
                    {WEIGHT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === "availability" && (
            <AvailabilitySection
              availability={variant.availability ?? {
                everywhere: true,
                cities: cities.map((city) => ({
                  cityId: city.id,
                  locations: city.locations.map((loc) => ({
                    locationId: loc.id,
                    enabled: true,
                    channels: Object.fromEntries(CHANNELS.map((c) => [c.key, true])) as ChannelAvailability,
                  })),
                })),
                schedule: { type: "daily", allDay: true },
              }}
              onChange={(avail) => onUpdate({ ...variant, availability: avail })}
            />
          )}

          {tab === "discount" && (
            <div className="space-y-4">
              <p className="text-[12px] text-gray-500">Скидка применяется к базовой цене варианта</p>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-2">Тип скидки</label>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  {([["none", "Нет"], ["pct", "% от цены"], ["rub", "₽ скидки"]] as const).map(([val, lbl]) => (
                    <button key={val}
                      onClick={() => onUpdate({ ...variant, discount: val === "none" ? undefined : { type: val, value: variant.discount?.value ?? 0 } })}
                      className={`flex-1 py-2 text-[12px] font-medium rounded-lg transition-colors ${
                        (val === "none" ? !variant.discount : variant.discount?.type === val)
                          ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              {variant.discount && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Размер {variant.discount.type === "pct" ? "(%)" : "(₽)"}
                  </label>
                  <div className="relative">
                    <input type="number" min="0" max={variant.discount.type === "pct" ? 100 : undefined}
                      defaultValue={variant.discount.value}
                      onBlur={(e) => onUpdate({ ...variant, discount: { ...variant.discount!, value: parseFloat(e.target.value) || 0 } })}
                      className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">
                      {variant.discount.type === "pct" ? "%" : "₽"}
                    </span>
                  </div>
                  {variant.price > 0 && (
                    <div className="mt-2 p-3 bg-green-50 rounded-xl text-[12px] text-gray-600">
                      Цена со скидкой:{" "}
                      <span className="font-semibold text-green-700">
                        {variant.discount.type === "pct"
                          ? Math.round(variant.price * (1 - variant.discount.value / 100))
                          : Math.max(0, variant.price - variant.discount.value)} ₽
                      </span>
                      {" "}вместо {variant.price} ₽
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Photo Cell ───────────────────────────────────────────────────────────────
function VariantPhotoCell({ photo, onSet }: { photo?: string; onSet: (url: string | undefined) => void }) {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState(photo ?? "");

  const apply = () => {
    onSet(url.trim() || undefined);
    setShowInput(false);
  };

  return (
    <div className="relative group">
      <div
        onClick={() => setShowInput(true)}
        className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer flex items-center justify-center hover:border-orange-400 transition-colors bg-gray-50"
      >
        {photo ? (
          <img src={photo} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <Image size={14} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
        )}
      </div>
      {photo && (
        <button
          onClick={(e) => { e.stopPropagation(); onSet(undefined); }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={8} />
        </button>
      )}
      {showInput && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowInput(false)} />
          <div className="absolute left-0 top-10 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-3 w-64">
            <div className="text-[12px] font-medium text-gray-700 mb-2">URL фото</div>
            <input
              autoFocus value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") apply(); if (e.key === "Escape") setShowInput(false); }}
              placeholder="https://..."
              className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2"
            />
            {url && (
              <div className="mb-2">
                <img src={url} className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowInput(false)} className="flex-1 py-1.5 text-[12px] text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
              <button onClick={apply} className="flex-1 py-1.5 text-[12px] font-medium bg-orange-500 text-white hover:bg-orange-600 rounded-lg">Применить</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Row Context Menu ─────────────────────────────────────────────────────────
function VariantRowMenu({ onDetach, onDuplicate, onDelete }: {
  onDetach: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
        <MoreVertical size={14} className="text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 min-w-[180px]">
            <button onClick={() => { onDuplicate(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 text-left">
              <Copy size={13} className="text-gray-400" /> Дублировать вариант
            </button>
            <button onClick={() => { onDetach(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-orange-700 hover:bg-orange-50 text-left">
              <Unlink size={13} className="text-orange-400" /> Открепить в отдельный товар
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button onClick={() => { onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 text-left">
              <Trash2 size={13} className="text-red-400" /> Удалить вариант
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Variants Table ───────────────────────────────────────────────────────────
function VariantsTable({ variants, sets, onChange, onDetachVariant, onEditVariant }: {
  variants: PositionVariant[];
  sets: PropertySet[];
  onChange: (updated: PositionVariant[]) => void;
  onDetachVariant?: (v: PositionVariant, label: string) => void;
  onEditVariant?: (v: PositionVariant) => void;
}) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: "price" | "sku" | "weight" } | null>(null);
  const [showBulkPricing, setShowBulkPricing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const updateVariant = (id: string, patch: Partial<PositionVariant>) =>
    onChange(variants.map((v) => v.id === id ? { ...v, ...patch } : v));

  const setDefault = (id: string) =>
    onChange(variants.map((v) => ({ ...v, isDefault: v.id === id })));

  const duplicateVariant = (id: string) => {
    const src = variants.find((v) => v.id === id);
    if (!src) return;
    const copy: PositionVariant = { ...src, id: `v-${Date.now()}`, isDefault: false, sku: src.sku ? `${src.sku}-copy` : undefined };
    const idx = variants.findIndex((v) => v.id === id);
    const next = [...variants];
    next.splice(idx + 1, 0, copy);
    onChange(next);
    toast("Вариант продублирован", "success");
  };

  const deleteVariant = (id: string) => onChange(variants.filter((v) => v.id !== id));

  const handleDrop = (overIndex: number) => {
    if (dragIdx === null || dragIdx === overIndex) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...variants];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIndex, 0, moved);
    onChange(reordered);
    setDragIdx(null); setDragOverIdx(null);
    toast("Порядок вариантов обновлён", "success");
  };

  const priceMin = Math.min(...variants.filter((v) => v.enabled).map((v) => v.price));
  const priceMax = Math.max(...variants.filter((v) => v.enabled).map((v) => v.price));
  const enabledCount = variants.filter((v) => v.enabled).length;
  const allSelected = variants.length > 0 && variants.every((v) => selectedIds.has(v.id));
  const someSelected = selectedIds.size > 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[13px] font-semibold text-gray-800">{variants.length} вариантов</span>
        <span className="text-[12px] text-gray-400">·</span>
        <span className="text-[12px] text-gray-500">{enabledCount} активных</span>
        {priceMin !== Infinity && (
          <>
            <span className="text-[12px] text-gray-400">·</span>
            <span className="text-[12px] text-gray-500">от {priceMin} до {priceMax} ₽</span>
          </>
        )}
        <div className="flex-1" />
        {someSelected && (
          <button onClick={() => onChange(variants.filter((v) => !selectedIds.has(v.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
            <Trash2 size={12} /> Удалить ({selectedIds.size})
          </button>
        )}
        <button onClick={() => setShowBulkPricing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-orange-600 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
          <Zap size={12} /> Установить цены
        </button>
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          <ArrowUpDown size={11} /> Перетащите строки для сортировки
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] text-gray-500 uppercase tracking-wide">
              <th className="w-6 px-2 py-2.5" />
              <th className="w-8 px-2 py-2.5 text-left">
                <input type="checkbox" checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={(e) => setSelectedIds(e.target.checked ? new Set(variants.map((v) => v.id)) : new Set())}
                  className="w-3.5 h-3.5 accent-orange-500" />
              </th>
              <th className="w-10 px-2 py-2.5">Фото</th>
              {sets.map((s) => <th key={s.id} className="px-3 py-2.5 text-left">{s.name}</th>)}
              <th className="px-3 py-2.5 text-left w-28">Цена, ₽</th>
              <th className="px-3 py-2.5 text-left w-24">Артикул</th>
              <th className="px-3 py-2.5 text-left w-36">Вес</th>
              <th className="px-3 py-2.5 text-center w-12" title="По умолчанию">По ум.</th>
              <th className="px-3 py-2.5 text-center w-14">Вкл.</th>
              <th className="w-8 px-2 py-2.5" />
              <th className="w-8 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {variants.map((variant, idx) => {
              const isEditing = (field: "price" | "sku" | "weight") =>
                editingCell?.id === variant.id && editingCell.field === field;
              const isDraggingOver = dragOverIdx === idx && dragIdx !== null && dragIdx !== idx;
              const label = getVariantLabel(variant, sets);

              return (
                <tr
                  key={variant.id}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  onDrop={() => handleDrop(idx)}
                  className={`border-b border-gray-100 last:border-b-0 transition-all select-none ${
                    dragIdx === idx ? "opacity-40 bg-orange-50" :
                    isDraggingOver ? "bg-blue-50 border-t-2 border-t-blue-400" :
                    !variant.enabled ? "opacity-40" : "hover:bg-orange-50/30"
                  } ${variant.isDefault ? "bg-green-50/30" : ""}`}
                >
                  {/* Drag handle */}
                  <td className="px-2 py-2 cursor-grab">
                    <GripVertical size={14} className="text-gray-300 hover:text-gray-500" />
                  </td>

                  {/* Checkbox */}
                  <td className="px-2 py-2">
                    <input type="checkbox" checked={selectedIds.has(variant.id)}
                      onChange={(e) => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        e.target.checked ? next.add(variant.id) : next.delete(variant.id);
                        return next;
                      })}
                      className="w-3.5 h-3.5 accent-orange-500" />
                  </td>

                  {/* Photo */}
                  <td className="px-2 py-2">
                    <VariantPhotoCell
                      photo={variant.photo}
                      onSet={(url) => updateVariant(variant.id, { photo: url })}
                    />
                  </td>

                  {/* Property value cells */}
                  {sets.map((s) => {
                    const val = s.values.find((v) => v.id === variant.properties[s.id]);
                    return (
                      <td key={s.id} className="px-3 py-2">
                        {val ? (
                          <span className="flex items-center gap-1.5">
                            {s.displayType === "swatch" && val.color && (
                              <span className="w-3 h-3 rounded-sm shrink-0 border border-gray-200" style={{ backgroundColor: val.color }} />
                            )}
                            <span className="text-[13px] text-gray-700">{val.name}</span>
                          </span>
                        ) : <span className="text-[12px] text-red-400">—</span>}
                      </td>
                    );
                  })}

                  {/* Price */}
                  <td className="px-3 py-2">
                    {isEditing("price") ? (
                      <input autoFocus type="number" defaultValue={variant.price}
                        onBlur={(e) => { updateVariant(variant.id, { price: parseFloat(e.target.value) || 0 }); setEditingCell(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Tab") { e.preventDefault(); updateVariant(variant.id, { price: parseFloat((e.target as HTMLInputElement).value) || 0 }); const next = variants[idx + 1]; if (next) setEditingCell({ id: next.id, field: "price" }); else setEditingCell(null); }
                        }}
                        className="w-20 px-2 py-1 text-[13px] border-2 border-orange-400 rounded-lg focus:outline-none" />
                    ) : (
                      <button onClick={() => setEditingCell({ id: variant.id, field: "price" })}
                        className={`px-2 py-1 text-[13px] rounded-lg hover:bg-orange-50 transition-colors group ${variant.price === 0 ? "text-red-400" : "text-gray-800 font-medium"}`}>
                        {variant.price === 0 ? "Укажите" : `${variant.price} ₽`}
                        <span className="ml-1 text-gray-300 opacity-0 group-hover:opacity-100 text-[10px]">✏</span>
                      </button>
                    )}
                  </td>

                  {/* SKU */}
                  <td className="px-3 py-2">
                    {isEditing("sku") ? (
                      <input autoFocus defaultValue={variant.sku ?? ""}
                        onBlur={(e) => { updateVariant(variant.id, { sku: e.target.value || undefined }); setEditingCell(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                        className="w-20 px-2 py-1 text-[12px] font-mono border-2 border-orange-400 rounded-lg focus:outline-none" placeholder="SKU" />
                    ) : (
                      <button onClick={() => setEditingCell({ id: variant.id, field: "sku" })}
                        className="px-2 py-1 text-[12px] font-mono text-gray-500 rounded-lg hover:bg-gray-100 transition-colors group">
                        {variant.sku || <span className="text-gray-300">SKU</span>}
                        <span className="ml-1 text-gray-300 opacity-0 group-hover:opacity-100 text-[10px]">✏</span>
                      </button>
                    )}
                  </td>

                  {/* Weight + unit */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {isEditing("weight") ? (
                        <input autoFocus defaultValue={variant.weight ?? ""}
                          onBlur={(e) => { updateVariant(variant.id, { weight: e.target.value || undefined }); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                          className="w-14 px-2 py-1 text-[12px] border-2 border-orange-400 rounded-lg focus:outline-none" />
                      ) : (
                        <button onClick={() => setEditingCell({ id: variant.id, field: "weight" })}
                          className="px-2 py-1 text-[12px] text-gray-500 rounded-lg hover:bg-gray-100 transition-colors group min-w-[40px]">
                          {variant.weight || <span className="text-gray-300">—</span>}
                          <span className="ml-0.5 text-gray-300 opacity-0 group-hover:opacity-100 text-[10px]">✏</span>
                        </button>
                      )}
                      {/* Weight unit selector */}
                      <select
                        value={variant.weightUnit ?? "г"}
                        onChange={(e) => updateVariant(variant.id, { weightUnit: e.target.value as PositionVariant["weightUnit"] })}
                        className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-1 py-0.5 focus:outline-none hover:bg-gray-100 cursor-pointer"
                      >
                        {WEIGHT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </td>

                  {/* Default radio */}
                  <td className="px-3 py-2 text-center">
                    <input type="radio" name="default-variant" checked={!!variant.isDefault}
                      onChange={() => setDefault(variant.id)}
                      className="w-4 h-4 accent-green-500 cursor-pointer" />
                  </td>

                  {/* Enabled */}
                  <td className="px-3 py-2 text-center">
                    <Toggle checked={variant.enabled} onChange={(v) => updateVariant(variant.id, { enabled: v })} size="xs" />
                  </td>

                  {/* Row menu */}
                  <td className="px-2 py-2">
                    <VariantRowMenu
                      onDetach={() => onDetachVariant?.(variant, label)}
                      onDuplicate={() => duplicateVariant(variant.id)}
                      onDelete={() => deleteVariant(variant.id)}
                    />
                  </td>

                  {/* Open detail */}
                  <td className="px-2 py-2">
                    <button onClick={() => onEditVariant?.(variant)}
                      className="p-1 hover:bg-orange-50 rounded-lg transition-colors group">
                      <ChevronRight size={15} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showBulkPricing && (
        <BulkPriceEditor variants={variants} sets={sets} onApply={onChange} onClose={() => setShowBulkPricing(false)} />
      )}
    </div>
  );
}

// ─── Main VariantsTab ─────────────────────────────────────────────────────────
export function VariantsTab({
  positionName, positionId,
  initialSets = [], initialVariants = [],
  onChange, onDetachVariant, onGoToPrices,
}: VariantsTabProps) {
  const [linkedSets, setLinkedSets] = useState<PropertySet[]>(initialSets);
  const [variants, setVariants] = useState<PositionVariant[]>(initialVariants);
  const [hasGenerated, setHasGenerated] = useState(initialVariants.length > 0);
  const [showSetPicker, setShowSetPicker] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<PositionVariant | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);

  const canGenerate = linkedSets.length > 0 && linkedSets.every((s) => s.values.length > 0);
  const expectedCount = countVariants(linkedSets);

  const handleSetsChange = (updated: PropertySet[]) => {
    setLinkedSets(updated);
    onChange?.(updated, variants);
  };

  const handleVariantsChange = (updated: PositionVariant[]) => {
    setVariants(updated);
    onChange?.(linkedSets, updated);
  };

  const handleAddSet = (set: PropertySet) => {
    const copy: PropertySet = { ...set, values: set.values.map((v) => ({ ...v })) };
    handleSetsChange([...linkedSets, copy]);
  };

  const handleCreateNew = () => {
    handleSetsChange([...linkedSets, { id: `ps-custom-${Date.now()}`, name: "Новый набор", displayType: "chips", values: [] }]);
  };

  const handleAttachPosition = (pos: Position) => {
    // Create a synthetic property set value from the position name
    // and add it as a new variant
    if (linkedSets.length === 0) return;
    const firstSet = linkedSets[0];
    const newValue: PropertyValue = { id: `psv-attach-${Date.now()}`, name: pos.name };
    const updatedSet = { ...firstSet, values: [...firstSet.values, newValue] };
    const updatedSets = linkedSets.map((s) => s.id === firstSet.id ? updatedSet : s);
    setLinkedSets(updatedSets);

    // Create a variant with this value
    const newVariant: PositionVariant = {
      id: `v-attach-${Date.now()}`,
      properties: { [firstSet.id]: newValue.id },
      price: pos.price,
      sku: pos.sku,
      photo: pos.photo,
      enabled: true,
      isDefault: false,
    };
    const newVariants = [...variants, newVariant];
    setVariants(newVariants);
    onChange?.(updatedSets, newVariants);
    toast(`«${pos.name}» прикреплён как вариант`, "success");
  };

  const handleGenerate = () => {
    const generated = generateVariants(linkedSets, variants);
    handleVariantsChange(generated);
    setHasGenerated(true);
    setJustGenerated(true);
    setTimeout(() => setJustGenerated(false), 2000);
    toast(`Сгенерировано ${generated.length} вариантов`, "success");
  };

  // ── Empty State ─────────────────────────────────────────
  if (linkedSets.length === 0 && !hasGenerated) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-8 py-12">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
          <Layers size={28} className="text-orange-400" />
        </div>
        <h3 className="text-[16px] font-semibold text-gray-800 mb-2">Варианты товара</h3>
        <p className="text-[13px] text-gray-500 max-w-sm mb-6 leading-relaxed">
          Преобразуйте «{positionName}» в товар с вариантами. Каждый вариант получит свою цену, фото и артикул.
        </p>
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left w-full max-w-xs">
          <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide">Пример: Пицца</div>
          {[["Размер", ["25 см", "30 см", "35 см"]], ["Тесто", ["Тонкое", "Традиц."]]] .map(([label, vals]) => (
            <div key={label as string} className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] text-gray-500 w-14">{label as string}</span>
              <div className="flex gap-1 flex-wrap">
                {(vals as string[]).map((v) => (
                  <span key={v} className="text-[11px] px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600">{v}</span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-1 mt-2 text-[11px] text-orange-600">
            <Zap size={11} /><span>= 6 вариантов с ценами</span>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <div className="relative">
            <button onClick={() => setShowSetPicker(true)}
              className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[13px] font-medium transition-colors shadow-sm">
              <Plus size={16} /> Добавить набор свойств
            </button>
            {showSetPicker && (
              <SetPickerDropdown usedIds={linkedSets.map((s) => s.id)} onSelect={handleAddSet} onCreateNew={handleCreateNew} onClose={() => setShowSetPicker(false)} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Property sets — compact tag view */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          {linkedSets.map((set) => (
            <span key={set.id}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-[12px] font-medium">
              <Layers size={12} className="text-orange-400 shrink-0" />
              {set.name}
              <span className="text-orange-400">·</span>
              <span className="text-orange-500">{set.values.length}</span>
              <button onClick={() => handleSetsChange(linkedSets.filter((s) => s.id !== set.id))}
                className="ml-0.5 p-0.5 hover:bg-orange-200 rounded transition-colors text-orange-400 hover:text-orange-700">
                <X size={10} />
              </button>
            </span>
          ))}
          <div className="relative">
            <button onClick={() => setShowSetPicker(!showSetPicker)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg text-[12px] hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50 transition-colors">
              <Plus size={13} /> Набор свойств
            </button>
            {showSetPicker && (
              <SetPickerDropdown usedIds={linkedSets.map((s) => s.id)} onSelect={handleAddSet} onCreateNew={handleCreateNew} onClose={() => setShowSetPicker(false)} />
            )}
          </div>
          <button onClick={() => setShowManageModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-[12px] hover:bg-gray-50 hover:border-gray-300 transition-colors">
            <Pencil size={13} className="text-gray-400" /> Управление свойствами
          </button>
        </div>
      </div>

      {/* Generate button */}
      {canGenerate && (
        <div className={`rounded-2xl border-2 p-4 transition-colors ${justGenerated ? "border-green-300 bg-green-50" : "border-orange-200 bg-orange-50"}`}>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-gray-800 mb-0.5">
                {hasGenerated ? "Пересгенерировать варианты" : "Сгенерировать варианты"}
              </div>
              <div className="text-[12px] text-gray-500 flex items-center gap-1 flex-wrap">
                {linkedSets.map((s, i) => (
                  <span key={s.id} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-300">×</span>}
                    <span className="px-1.5 py-0.5 bg-white rounded-md border border-gray-200 text-gray-600">{s.values.length} {s.name.toLowerCase()}</span>
                  </span>
                ))}
                <span className="text-gray-400 ml-1">= <span className="font-semibold text-orange-600">{expectedCount}</span> вар.</span>
              </div>
              {hasGenerated && variants.length !== expectedCount && (
                <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> Количество изменится: {variants.length} → {expectedCount}. Цены сохранятся.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAttachModal(true)}
                className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-[13px] hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap">
                <Link2 size={15} className="text-gray-400" /> Прикрепить товар
              </button>
              <button onClick={handleGenerate}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold text-white transition-all shadow-sm ${justGenerated ? "bg-green-500 scale-95" : "bg-orange-500 hover:bg-orange-600 hover:shadow"}`}>
                {justGenerated ? <><CheckCircle2 size={16} /> Готово!</> : hasGenerated ? <><RefreshCw size={15} /> Пересгенерировать</> : <><Zap size={15} /> Сгенерировать</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {!canGenerate && linkedSets.some((s) => s.values.length === 0) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800">
          <AlertCircle size={14} className="text-amber-500 shrink-0" />
          Добавьте значения в каждый набор, чтобы сгенерировать варианты
        </div>
      )}

      {/* Variants table */}
      {hasGenerated && variants.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-gray-800">Варианты</h3>
            <span className="text-[11px] text-gray-400">Клик по ячейке — редактировать · Потяните строку — изменить порядок</span>
          </div>
          <VariantsTable variants={variants} sets={linkedSets} onChange={handleVariantsChange} onDetachVariant={onDetachVariant} onEditVariant={setEditingVariant} />
          <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[12px] text-gray-500">
            <DollarSign size={13} className="text-gray-400 shrink-0" />
            Цены по городам, точкам и каналам настраиваются на вкладке{" "}
            {onGoToPrices ? (
              <button onClick={onGoToPrices} className="hover:text-gray-700 transition-colors">«Цены»</button>
            ) : (
              <span>«Цены»</span>
            )}
          </div>
        </div>
      )}

      {showAttachModal && (
        <AttachPositionModal
          currentPositionId={positionId}
          sets={linkedSets}
          onAttach={handleAttachPosition}
          onClose={() => setShowAttachModal(false)}
        />
      )}

      {showManageModal && (
        <ManagePropertiesModal
          sets={linkedSets}
          onSetsChange={handleSetsChange}
          onClose={() => setShowManageModal(false)}
        />
      )}

      {editingVariant && (
        <VariantDetailPanel
          variant={editingVariant}
          sets={linkedSets}
          onUpdate={(updated) => {
            handleVariantsChange(variants.map((v) => v.id === updated.id ? updated : v));
            setEditingVariant(updated);
          }}
          onClose={() => setEditingVariant(null)}
        />
      )}
    </div>
  );
}
