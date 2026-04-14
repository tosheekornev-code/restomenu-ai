import { useMemo, useRef, useState } from "react";
import {
  Search, ChevronRight, Image as ImageIcon, Trash2, X, Upload, Link,
  MapPin, DollarSign, Save, Plus, Globe, MoreHorizontal, Copy, Info, EyeOff,
} from "lucide-react";
import {
  OptionGroup, Option, Availability, PriceOverride, cities, CHANNELS,
} from "../data/mockData";
import { Switch } from "@/components/ui/switch";
import { toast } from "./shared/Toast";
import { ConfirmDialog } from "./shared/ConfirmDialog";
import { AvailabilitySection } from "./AvailabilitySection";
import { ChannelIcon } from "./shared/ChannelIcon";
import { PricesTab } from "./PricesTab";

interface Props {
  groups: OptionGroup[];
  onGroupsChange: (groups: OptionGroup[]) => void;
  options: Option[];
  onOptionsChange: (opts: Option[]) => void;
}

const defaultAvailability: Availability = {
  everywhere: true,
  cities: [],
  schedule: { type: "daily", allDay: true },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOptionGroups(optId: string, groups: OptionGroup[]): string[] {
  const names: string[] = [];
  for (const g of groups) {
    for (const b of g.blocks) {
      if (b.optionIds.includes(optId)) {
        names.push(`${g.name} → ${b.name}`);
      }
    }
  }
  return names;
}

function getAvailabilitySummary(av?: Availability): { label: string; restricted: boolean } {
  if (!av || av.everywhere) return { label: "Везде", restricted: false };
  const enabledCityCount = av.cities.filter((c) => c.locations.some((l) => l.enabled)).length;
  const totalCities = cities.length;
  if (enabledCityCount === 0) return { label: "Нигде", restricted: true };
  if (enabledCityCount === totalCities) return { label: "Везде", restricted: false };
  return { label: `${enabledCityCount} из ${totalCities}`, restricted: true };
}

function getActiveChannels(opt: Option): string[] | null {
  // Collect channels from availability locations
  if (opt.availability && !opt.availability.everywhere) {
    const enabled = new Set<string>();
    for (const ca of opt.availability.cities) {
      for (const la of ca.locations) {
        if (!la.enabled) continue;
        for (const ch of CHANNELS) {
          if (la.channels[ch.key]) enabled.add(ch.key);
        }
      }
    }
    if (enabled.size < CHANNELS.length) return Array.from(enabled);
  }
  // Check simple channels field
  if (opt.channels) {
    const active = CHANNELS.filter((c) => opt.channels![c.key]).map((c) => c.key);
    if (active.length < CHANNELS.length) return active;
  }
  return null; // all channels active
}

function getEffectiveMinPrice(opt: Option): { min: number; hasRange: boolean } {
  const allPrices = [opt.price];
  if (opt.channelPrices) for (const p of Object.values(opt.channelPrices)) if (typeof p === "number") allPrices.push(p);
  if (opt.priceOverrides) for (const ov of opt.priceOverrides) {
    if (ov.price !== undefined) allPrices.push(ov.price);
    if (ov.channelPrices) for (const p of Object.values(ov.channelPrices)) if (typeof p === "number") allPrices.push(p);
  }
  const min = Math.min(...allPrices);
  return { min, hasRange: min !== Math.max(...allPrices) };
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function AllOptionsView({ groups, onGroupsChange, options, onOptionsChange }: Props) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Option | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () => options.filter((o) =>
      !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.techName ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [options, search]
  );

  const editingOption = editingId ? options.find((o) => o.id === editingId) ?? null : null;

  const createOption = () => {
    const newOpt: Option = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "Новая опция", price: 0, min: 0, max: null, enabled: true,
    };
    onOptionsChange([...options, newOpt]);
    setEditingId(newOpt.id);
    toast("Новая опция создана", "success");
  };

  const saveOption = (optionId: string, patch: Partial<Option>) => {
    onOptionsChange(options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)));
    toast("Опция сохранена", "success");
  };

  const toggleEnabled = (optionId: string, enabled: boolean) => {
    onOptionsChange(options.map((o) => (o.id === optionId ? { ...o, enabled } : o)));
  };

  const duplicateOption = (opt: Option) => {
    const cloned: Option = {
      ...opt,
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${opt.name} (копия)`,
    };
    onOptionsChange([...options, cloned]);
    setEditingId(cloned.id);
    setMenuOpenId(null);
    toast(`Опция «${opt.name}» дублирована`, "success");
  };

  const deleteOption = (target: Option) => {
    // Remove from all blocks
    onGroupsChange(groups.map((g) => ({
      ...g,
      blocks: g.blocks.map((b) => ({ ...b, optionIds: b.optionIds.filter((id) => id !== target.id) })),
    })));
    onOptionsChange(options.filter((o) => o.id !== target.id));
    toast(`Опция «${target.name}» удалена`, "success");
    setDeleteTarget(null);
    if (editingId === target.id) setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
      {/* Header */}
      <div className="shrink-0">
        <div className="max-w-4xl mx-auto flex items-end gap-4 px-8 pt-6 pb-4">
          <div>
            <h2 className="text-[22px] font-semibold text-gray-900">Все опции</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">{options.length} {plural(options.length, "опция", "опции", "опций")}</p>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск опций"
              className="pl-9 pr-4 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-64 bg-white" />
          </div>
          <button onClick={createOption}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-[13px] font-medium hover:bg-orange-600 transition-colors shrink-0">
            <Plus size={14} /> Новая опция
          </button>
        </div>
      </div>

      {/* Flat list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 pb-10">
          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-[40px] mb-2">🔍</div>
              <div className="text-[13px]">Ничего не найдено</div>
            </div>
          )}

          <div>
            {filtered.map((opt) => {
              const groupNames = getOptionGroups(opt.id, groups);
              const avail = getAvailabilitySummary(opt.availability);
              const priceInfo = getEffectiveMinPrice(opt);
              return (
                <div key={opt.id}
                  className={`flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 last:border-0 transition-colors cursor-pointer rounded-lg ${editingId === opt.id ? "bg-orange-50/60" : "hover:bg-white"}`}
                  onClick={() => setEditingId(editingId === opt.id ? null : opt.id)}>
                  {/* Photo */}
                  <div className={`w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 ${!opt.enabled ? "opacity-40" : ""}`}>
                    {opt.photo ? <img src={opt.photo} className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-gray-300" />}
                  </div>

                  {/* Name + groups */}
                  <div className={`flex-1 min-w-0 ${!opt.enabled ? "opacity-40" : ""}`}>
                    <div className="flex items-center gap-1.5 text-[13px] text-gray-800 truncate">
                      {!opt.enabled && <EyeOff size={12} className="text-gray-400 shrink-0" />}
                      {opt.techName || opt.name}
                    </div>
                    {groupNames.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {groupNames.map((name, i) => (
                          <span key={i} className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{name}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-red-500 font-medium">Не используется</div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className={`flex items-center gap-1.5 shrink-0 ${!opt.enabled ? "opacity-40" : ""}`}>
                    {avail.restricted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">
                        <MapPin size={10} />{avail.label}
                      </span>
                    )}
                    {(() => {
                      const activeChannels = getActiveChannels(opt);
                      if (!activeChannels) return null; // all active, don't show
                      return (
                        <span className="inline-flex items-center gap-0.5">
                          {activeChannels.map((key) => (
                            <ChannelIcon key={key} channel={key} size={14} />
                          ))}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-1 shrink-0 text-[12px] text-gray-600 tabular-nums">
                    {priceInfo.hasRange ? <span>от {priceInfo.min} ₽</span> : <span>{opt.price > 0 ? `${opt.price} ₽` : "0 ₽"}</span>}
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch checked={opt.enabled} onCheckedChange={(v) => toggleEnabled(opt.id, v)} size="sm" />
                  </div>

                  {/* 3-dot menu */}
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMenuOpenId(menuOpenId === opt.id ? null : opt.id)}
                      className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                      <MoreHorizontal size={15} />
                    </button>
                    {menuOpenId === opt.id && (
                      <OptionRowMenu
                        onDuplicate={() => duplicateOption(opt)}
                        onDelete={() => { setDeleteTarget(opt); setMenuOpenId(null); }}
                        onClose={() => setMenuOpenId(null)}
                      />
                    )}
                  </div>

                  <ChevronRight size={14} className="text-gray-300 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {editingOption && (
        <OptionDetailPanel key={editingOption.id} opt={editingOption}
          subtitle={getOptionGroups(editingOption.id, groups).join(" · ") || "Не используется"}
          onSave={(patch) => { saveOption(editingOption.id, patch); setEditingId(null); }}
          onDuplicate={() => duplicateOption(editingOption)}
          onDelete={() => setDeleteTarget(editingOption)}
          onClose={() => setEditingId(null)} />
      )}

      {deleteTarget && (
        <ConfirmDialog title={`Удалить «${deleteTarget.name}»?`}
          description="Опция будет удалена из всех блоков."
          onConfirm={() => deleteOption(deleteTarget)}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

export function OptionDetailPanel({
  opt, subtitle, onSave, onDuplicate, onDelete, onClose,
}: {
  opt: Option;
  subtitle?: string;
  onSave: (patch: Partial<Option>) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"basic" | "availability" | "prices">("basic");
  const [showBaseChannels, setShowBaseChannels] = useState(false);
  const [showPanelMenu, setShowPanelMenu] = useState(false);
  const [draft, setDraft] = useState<Partial<Option>>({});
  const merged = { ...opt, ...draft } as Option;
  const isDirty = Object.keys(draft).length > 0;

  const update = (patch: Partial<Option>) => setDraft((prev) => ({ ...prev, ...patch }));
  const handleSave = () => { onSave(draft); setDraft({}); };
  const handleClose = () => onClose();

  const availability = merged.availability ?? defaultAvailability;
  const priceOverrides = merged.priceOverrides ?? [];
  const channelPrices = merged.channelPrices ?? {};

  const handleChannelPriceChange = (ch: string, price: number | undefined) => {
    const next = { ...channelPrices };
    if (price === undefined) delete next[ch]; else next[ch] = price;
    update({ channelPrices: Object.keys(next).length > 0 ? next : undefined });
  };

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/30" onClick={handleClose} />
      <div className="fixed right-0 top-0 bottom-0 z-30 w-[700px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><X size={16} /></button>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-gray-900 truncate">{merged.name}</div>
            {subtitle && <div className="text-[11px] text-gray-400">{subtitle}</div>}
          </div>
          <Switch checked={merged.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          {(onDuplicate || onDelete) && (
            <div className="relative shrink-0">
              <button onClick={() => setShowPanelMenu(!showPanelMenu)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                <MoreHorizontal size={16} />
              </button>
              {showPanelMenu && (
                <OptionRowMenu
                  onDuplicate={onDuplicate ? () => { onDuplicate(); setShowPanelMenu(false); } : undefined}
                  onDelete={onDelete ? () => { onDelete(); setShowPanelMenu(false); } : undefined}
                  onClose={() => setShowPanelMenu(false)} />
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 px-5">
          {([["basic", "Основное"], ["availability", "Доступность"], ["prices", "Цены"]] as const).map(([key, title]) => (
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Название для клиента</label>
                  <input value={merged.name} onChange={(e) => update({ name: e.target.value })}
                    className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Тех. название</label>
                  <input value={merged.techName ?? ""} onChange={(e) => update({ techName: e.target.value || undefined })} placeholder="опционально"
                    className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Базовая цена</label>
                  <div className="flex items-center gap-1">
                    <input type="number" value={merged.price} onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <span className="text-[12px] text-gray-400 px-1">₽</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Вес / объём</label>
                  <div className="flex gap-1">
                    <input type="number" value={merged.weight ?? ""} onChange={(e) => update({ weight: e.target.value === "" ? undefined : parseFloat(e.target.value) })} placeholder="—"
                      className="flex-1 min-w-0 px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <select value={merged.weightUnit ?? "гр"} onChange={(e) => update({ weightUnit: e.target.value || undefined })}
                      className="px-2 py-2.5 text-[13px] border border-gray-200 rounded-xl focus:outline-none bg-white">
                      <option value="гр">гр</option><option value="кг">кг</option><option value="мл">мл</option><option value="л">л</option><option value="шт">шт</option>
                    </select>
                  </div>
                </div>
              </div>
              <PhotoUploader photo={merged.photo} onChange={(url) => update({ photo: url || undefined })} />
            </div>
          )}

          {tab === "availability" && (
            <AvailabilitySection availability={availability} onChange={(avail) => update({ availability: avail })} />
          )}

          {tab === "prices" && (
            <PricesTab isVariants={false} positionName={merged.name} basePrice={merged.price}
              onBasePriceChange={(price) => update({ price })}
              baseChannelPrices={channelPrices} onBaseChannelPriceChange={handleChannelPriceChange}
              variants={[]} variantSets={[]} priceOverrides={priceOverrides}
              onChange={(overrides) => update({ priceOverrides: overrides })}
              availability={availability} showBaseChannels={showBaseChannels} onShowBaseChannelsChange={setShowBaseChannels} />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2 px-5 py-2 bg-amber-50/80 border-b border-amber-100">
            <Info size={13} className="text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-600">Опция — общая для всех групп. Изменения отразятся везде, где она используется.</p>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            {isDirty ? <span className="text-[11px] text-amber-600 font-medium">Есть несохранённые изменения</span>
              : <span className="text-[11px] text-gray-400">Нет изменений</span>}
            <div className="flex items-center gap-2">
              <button onClick={handleClose} className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Отмена</button>
              <button onClick={handleSave} disabled={!isDirty}
                className={`inline-flex items-center gap-2 px-5 py-2 text-[13px] font-medium rounded-xl transition-colors ${isDirty ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                <Save size={14} /> Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 3-dot menu ───────────────────────────────────────────────────────────────

function OptionRowMenu({ onDuplicate, onDelete, onClose }: {
  onDuplicate?: () => void; onDelete?: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-44 overflow-hidden">
        {onDuplicate && (
          <button onClick={onDuplicate} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors">
            <Copy size={13} className="text-gray-400" /> Дублировать
          </button>
        )}
        {onDuplicate && onDelete && <div className="border-t border-gray-100 my-0.5" />}
        {onDelete && (
          <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={13} /> Удалить
          </button>
        )}
      </div>
    </>
  );
}

// ─── Photo uploader ───────────────────────────────────────────────────────────

function PhotoUploader({ photo, onChange }: { photo?: string; onChange: (url: string | undefined) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") onChange(reader.result); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") onChange(reader.result); };
    reader.readAsDataURL(file);
  };

  const submitUrl = () => { const url = urlValue.trim(); if (url) { onChange(url); setUrlValue(""); setShowUrlInput(false); } };

  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 mb-2 uppercase tracking-wide">Фото</label>
      {photo ? (
        <div className="relative group w-40 h-40 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
          <img src={photo} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 bg-white/90 rounded-lg text-[12px] font-medium text-gray-700 hover:bg-white transition-colors">Заменить</button>
            <button onClick={() => onChange(undefined)} className="p-1.5 bg-red-500/90 rounded-lg text-white hover:bg-red-600 transition-colors"><Trash2 size={14} /></button>
          </div>
        </div>
      ) : (
        <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
          className="w-40 h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-300 transition-colors">
          <Upload size={18} className="text-gray-400" />
          <div className="flex flex-col items-center gap-1">
            <button onClick={() => fileRef.current?.click()} className="text-[11px] font-medium text-orange-600 hover:text-orange-700">Загрузить</button>
            <button onClick={() => setShowUrlInput(true)} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5"><Link size={9} /> по ссылке</button>
          </div>
        </div>
      )}
      {showUrlInput && !photo && (
        <div className="flex gap-2 mt-2" style={{ maxWidth: 400 }}>
          <input autoFocus value={urlValue} onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitUrl(); if (e.key === "Escape") { setShowUrlInput(false); setUrlValue(""); } }}
            placeholder="https://..." className="flex-1 px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          <button onClick={submitUrl} className="px-3 py-2 text-[12px] font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">Ок</button>
          <button onClick={() => { setShowUrlInput(false); setUrlValue(""); }} className="px-3 py-2 text-[12px] text-gray-500 hover:bg-gray-100 rounded-lg">Отмена</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
