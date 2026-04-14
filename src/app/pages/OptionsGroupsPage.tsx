import { useMemo, useState, useEffect } from "react";
import {
  Plus, Search, ChevronDown, ChevronUp, GripVertical,
  Trash2, X, Image as ImageIcon,
  Puzzle, Layers, List, Grid2x2, LayoutGrid,
  MoreHorizontal, Copy, Save, ChevronRight, MapPin,
} from "lucide-react";
import {
  optionGroups as initialGroups,
  allOptionsRegistry as initialOptions,
  OptionGroup,
  OptionBlock,
  Option,
  CHANNELS,
  cities,
} from "../data/mockData";
import { ChannelIcon } from "../components/shared/ChannelIcon";
import { Switch } from "@/components/ui/switch";
import { toast } from "../components/shared/Toast";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { AllOptionsView, OptionDetailPanel } from "../components/AllOptionsView";

// ─── Option picker dropdown ──────────────────────────────────────────
function OptionPickerDropdown({
  options,
  usedIds,
  onSelect,
  onCreateNew,
  onClose,
}: {
  options: Option[];
  usedIds: string[];
  onSelect: (optId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const available = options.filter(
    (o) =>
      !usedIds.includes(o.id) &&
      (!query || o.name.toLowerCase().includes(query.toLowerCase()) || (o.techName ?? "").toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-12 z-20 bg-white border border-gray-200 rounded-2xl shadow-xl w-80 overflow-hidden">
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти опцию..."
              className="w-full pl-8 pr-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {available.length === 0 && (
            <div className="py-6 text-center text-[12px] text-gray-400">
              {query ? "Не найдено" : "Все опции уже добавлены"}
            </div>
          )}
          {available.map((o) => (
            <button
              key={o.id}
              onClick={() => { onSelect(o.id); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 text-left transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                {o.photo ? (
                  <img src={o.photo} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={13} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-gray-800 truncate">{o.techName || o.name}</div>
                {o.price > 0 && <div className="text-[10px] text-gray-400">{o.price} ₽</div>}
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-gray-100 p-2">
          <button
            onClick={() => { onCreateNew(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-orange-600 font-medium hover:bg-orange-50 rounded-xl transition-colors"
          >
            <Plus size={14} /> Создать новую опцию
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Display type segmented icons ──────────────────────────────────────
const DISPLAY_TYPES: { value: OptionBlock["displayType"]; label: string; icon: React.ReactNode }[] = [
  { value: "list", label: "Список", icon: <List size={13} /> },
  { value: "small-tiles", label: "Мелкие плитки", icon: <Grid2x2 size={13} /> },
  { value: "large-tiles", label: "Крупные плитки", icon: <LayoutGrid size={13} /> },
];

// ─── 3-dot dropdown menu ──────────────────────────────────────────────
function DropdownMenu({ items, onClose }: {
  items: { label: string; icon: React.ReactNode; danger?: boolean; onClick: () => void }[];
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-44 overflow-hidden">
        {items.map((item, i) => (
          <button key={i} onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors ${item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}>
            {item.icon}{item.label}
          </button>
        ))}
      </div>
    </>
  );
}

function BlockMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen(!open)} className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <MoreHorizontal size={14} />
      </button>
      {open && <DropdownMenu onClose={() => setOpen(false)} items={[
        { label: "Дублировать блок", icon: <Copy size={13} className="text-gray-400" />, onClick: onDuplicate },
        { label: "Удалить блок", icon: <Trash2 size={13} />, danger: true, onClick: onDelete },
      ]} />}
    </div>
  );
}

function GroupMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen(!open)} className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <MoreHorizontal size={15} />
      </button>
      {open && <DropdownMenu onClose={() => setOpen(false)} items={[
        { label: "Дублировать группу", icon: <Copy size={13} className="text-gray-400" />, onClick: onDuplicate },
        { label: "Удалить группу", icon: <Trash2 size={13} />, danger: true, onClick: onDelete },
      ]} />}
    </div>
  );
}

// ─── BlockCard (uses optionIds + lookup) ──────────────────────────────
function BlockCard({
  block,
  optionsMap,
  allOptionsList,
  onChange,
  onDelete,
  onDuplicate,
  onEditOption,
}: {
  block: OptionBlock;
  optionsMap: Map<string, Option>;
  allOptionsList: Option[];
  onChange: (patch: Partial<OptionBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditOption: (optionId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const blockOptions = block.optionIds.map((id) => optionsMap.get(id)).filter(Boolean) as Option[];

  const addOptionToBlock = (optId: string) => {
    if (!block.optionIds.includes(optId)) {
      onChange({ optionIds: [...block.optionIds, optId] });
      const opt = optionsMap.get(optId);
      if (opt) toast(`Опция «${opt.name}» добавлена`, "success");
    }
  };

  const removeFromBlock = (optId: string) => {
    onChange({ optionIds: block.optionIds.filter((id) => id !== optId) });
  };

  const ruleText =
    block.min === 0 && block.max === 0 ? "Свободный выбор"
      : block.min === block.max ? `Выбрать ровно ${block.min}`
      : block.max === 0 ? `Выбрать от ${block.min}`
      : `Выбрать от ${block.min} до ${block.max}`;

  return (
    <div className="border border-gray-200 rounded-2xl bg-white mb-3">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 rounded-t-2xl">
        <GripVertical size={14} className="text-gray-300 cursor-grab shrink-0" />
        <input value={block.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Название блока"
          className="flex-1 min-w-0 text-[14px] font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-orange-400 focus:outline-none px-1 -mx-1" />
        <span className="text-[11px] text-gray-400 shrink-0 hidden sm:block">{blockOptions.length} оп. · {ruleText}</span>
        <BlockMenu onDuplicate={onDuplicate} onDelete={onDelete} />
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg shrink-0">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50/60 border-b border-gray-100 text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Вид:</span>
              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
                {DISPLAY_TYPES.map((dt) => (
                  <button key={dt.value} type="button" onClick={() => onChange({ displayType: dt.value })}
                    className={`p-1.5 rounded-md transition-colors ${block.displayType === dt.value ? "bg-orange-50 text-orange-600" : "text-gray-400 hover:text-gray-600"}`} title={dt.label}>
                    {dt.icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Выбрать от</span>
              <input type="number" value={block.min} onChange={(e) => onChange({ min: parseInt(e.target.value) || 0 })}
                className="w-11 px-1.5 py-1 text-[11px] text-center border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-300 bg-white" />
              <span className="text-gray-400">до</span>
              <input type="number" value={block.max} onChange={(e) => onChange({ max: parseInt(e.target.value) || 0 })} placeholder="∞"
                className="w-11 px-1.5 py-1 text-[11px] text-center border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-300 bg-white" />
              <span className="text-gray-400">опций</span>
            </div>
          </div>

          <div className="p-3">
            {blockOptions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30 mb-2">
                <div className="text-[22px] mb-1">🧩</div>
                <div className="text-[12px] text-gray-400 mb-3">В блоке пока нет опций</div>
              </div>
            ) : (
              <div className="space-y-0.5 mb-2">
                {blockOptions.map((opt) => {
                  const hasAvail = opt.availability && !opt.availability.everywhere;
                  const activeChannelKeys = opt.channels
                    ? CHANNELS.filter((c) => opt.channels![c.key]).map((c) => c.key)
                    : null;
                  const hasChannels = activeChannelKeys && activeChannelKeys.length < CHANNELS.length;
                  const parts: string[] = [opt.techName || opt.name];
                  if (opt.price > 0) parts.push(`${opt.price} ₽`);
                  if (opt.weight) parts.push(`${opt.weight} ${opt.weightUnit ?? "гр"}`);

                  return (
                    <div key={opt.id} className="flex items-center gap-3 pl-2 pr-2 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => onEditOption(opt.id)}>
                      <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                        {opt.photo ? <img src={opt.photo} className="w-full h-full object-cover" /> : <ImageIcon size={13} className="text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0 text-[13px] text-gray-800 truncate">{parts.join(", ")}</div>
                      {(hasAvail || hasChannels) && (
                        <div className="flex items-center gap-1 shrink-0">
                          {hasAvail && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-medium"><MapPin size={9} /> Ограничено</span>}
                          {hasChannels && activeChannelKeys && (
                            <span className="inline-flex items-center gap-0.5">
                              {activeChannelKeys.map((key) => <ChannelIcon key={key} channel={key} size={12} />)}
                            </span>
                          )}
                        </div>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch checked={opt.enabled} onCheckedChange={() => {}} size="sm" />
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFromBlock(opt.id); }}
                        className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Убрать из блока">
                        <X size={13} />
                      </button>
                      <ChevronRight size={13} className="text-gray-300 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <button onClick={() => setShowPicker(!showPicker)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-colors">
                <Plus size={13} /> Добавить опцию
              </button>
              {showPicker && (
                <OptionPickerDropdown
                  options={allOptionsList}
                  usedIds={block.optionIds}
                  onSelect={addOptionToBlock}
                  onCreateNew={() => {
                    // Will be handled at page level
                  }}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GroupPanel ────────────────────────────────────────────────────────
function GroupPanel({
  group,
  optionsMap,
  allOptionsList,
  onSave,
  onDelete,
  onDuplicate,
  onUpdateOption,
  onCreateOption,
  onDeleteOption,
  onDuplicateOption,
}: {
  group: OptionGroup;
  optionsMap: Map<string, Option>;
  allOptionsList: Option[];
  onSave: (patch: Partial<OptionGroup>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdateOption: (optionId: string, patch: Partial<Option>) => void;
  onCreateOption: () => string; // returns new option id
  onDeleteOption: (optionId: string) => void;
  onDuplicateOption: (optionId: string) => void;
}) {
  const [draft, setDraft] = useState<Partial<OptionGroup>>({});
  const merged = { ...group, ...draft } as OptionGroup;
  const isDirty = Object.keys(draft).length > 0;

  const update = (patch: Partial<OptionGroup>) => setDraft((prev) => ({ ...prev, ...patch }));
  const handleSave = () => { onSave(draft); setDraft({}); };

  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  const editingOption = editingOptionId ? optionsMap.get(editingOptionId) ?? null : null;
  const editingBlockId = editingOptionId
    ? merged.blocks.find((b) => b.optionIds.includes(editingOptionId))?.id ?? null
    : null;

  const updateBlock = (blockId: string, patch: Partial<OptionBlock>) => {
    update({ blocks: merged.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) });
  };

  const addBlock = () => {
    const newBlock: OptionBlock = { id: `block-${Date.now()}`, name: "Новый блок", displayType: "list", min: 0, max: 1, optionIds: [] };
    update({ blocks: [...merged.blocks, newBlock] });
    toast("Блок создан", "success");
  };

  const duplicateBlock = (blockId: string) => {
    const src = merged.blocks.find((b) => b.id === blockId);
    if (!src) return;
    const cloned: OptionBlock = { ...src, id: `block-${Date.now()}`, name: `${src.name} (копия)` };
    const idx = merged.blocks.findIndex((b) => b.id === blockId);
    const blocks = [...merged.blocks];
    blocks.splice(idx + 1, 0, cloned);
    update({ blocks });
    toast(`Блок «${src.name}» дублирован`, "success");
  };

  const deleteBlock = (blockId: string) => {
    const b = merged.blocks.find((bl) => bl.id === blockId);
    update({ blocks: merged.blocks.filter((bl) => bl.id !== blockId) });
    if (b) toast(`Блок «${b.name}» удалён`, "success");
    setDeleteBlockId(null);
  };

  // Find all groups/blocks where the editing option is used
  const getOptionUsage = (optId: string): string => {
    // This is a simplified version — full usage info comes from page level
    const blockName = merged.blocks.find((b) => b.optionIds.includes(optId))?.name;
    return `${merged.name}${blockName ? ` · ${blockName}` : ""}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <input value={merged.name} onChange={(e) => update({ name: e.target.value })} placeholder="Название группы"
              className="flex-1 text-[22px] font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-orange-400 focus:outline-none px-1 -mx-1" />
            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
              <span className="text-[12px] text-gray-500">{merged.enabled ? "Включена" : "Выключена"}</span>
              <Switch checked={merged.enabled} onCheckedChange={(v) => update({ enabled: v })} />
            </label>
            <GroupMenu onDuplicate={onDuplicate} onDelete={() => setShowDeleteGroup(true)} />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 pb-5">
          {merged.blocks.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <div className="text-[36px] mb-2">📦</div>
              <div className="text-[14px] font-medium text-gray-700 mb-1">Нет блоков опций</div>
              <div className="text-[12px] text-gray-400 mb-4 max-w-xs mx-auto">Блок — это набор опций с общим правилом.</div>
              <button onClick={addBlock} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-[13px] font-medium hover:bg-orange-600 transition-colors">
                <Plus size={14} /> Создать первый блок
              </button>
            </div>
          ) : (
            <>
              {merged.blocks.map((block) => (
                <BlockCard key={block.id} block={block} optionsMap={optionsMap} allOptionsList={allOptionsList}
                  onChange={(patch) => updateBlock(block.id, patch)}
                  onDelete={() => setDeleteBlockId(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onEditOption={(optId) => setEditingOptionId(optId)} />
              ))}
              <button onClick={addBlock}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-[13px] font-medium hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/30 transition-colors mt-2">
                <Plus size={14} /> Добавить блок
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer with Save */}
      <div className="shrink-0 border-t border-gray-200 px-6 py-3 flex items-center justify-between bg-white">
        {isDirty ? <span className="text-[11px] text-amber-600 font-medium">Есть несохранённые изменения</span>
          : <span className="text-[11px] text-gray-400">Нет изменений</span>}
        <button onClick={handleSave} disabled={!isDirty}
          className={`inline-flex items-center gap-2 px-5 py-2 text-[13px] font-medium rounded-xl transition-colors ${isDirty ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
          <Save size={14} /> Сохранить
        </button>
      </div>

      {deleteBlockId && (
        <ConfirmDialog title="Удалить блок?" description="Опции останутся, только уберутся из блока."
          onConfirm={() => deleteBlock(deleteBlockId)} onCancel={() => setDeleteBlockId(null)} />
      )}
      {showDeleteGroup && (
        <ConfirmDialog title={`Удалить группу «${group.name}»?`} description="Группа и все её блоки будут удалены. Опции останутся."
          onConfirm={() => { onDelete(); setShowDeleteGroup(false); }} onCancel={() => setShowDeleteGroup(false)} />
      )}

      {editingOption && (
        <OptionDetailPanel key={editingOption.id} opt={editingOption}
          subtitle={getOptionUsage(editingOption.id)}
          onSave={(patch) => { onUpdateOption(editingOption.id, patch); setEditingOptionId(null); }}
          onDuplicate={() => { onDuplicateOption(editingOption.id); setEditingOptionId(null); }}
          onDelete={() => { onDeleteOption(editingOption.id); setEditingOptionId(null); }}
          onClose={() => setEditingOptionId(null)} />
      )}
    </div>
  );
}

// ─── LocalStorage persistence ─────────────────────────────────────────
const GROUPS_KEY = "restomenu_option_groups_v2";
const OPTIONS_KEY = "restomenu_options_registry";

function loadGroups(): OptionGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return initialGroups;
}

function loadOptions(): Option[] {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return initialOptions;
}

function persist(groups: OptionGroup[], options: Option[]) {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  } catch { /* ignore */ }
}

// ─── Main Page ─────────────────────────────────────────────────────────
export function OptionsGroupsPage() {
  const [groups, setGroups] = useState(loadGroups);
  const [options, setOptions] = useState(loadOptions);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => loadGroups()[0]?.id ?? "");
  const [view, setView] = useState<"groups" | "all">("groups");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");

  // Persist on every change
  useEffect(() => { persist(groups, options); }, [groups, options]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];

  // Options lookup map
  const optionsMap = useMemo(() => {
    const m = new Map<string, Option>();
    for (const o of options) m.set(o.id, o);
    return m;
  }, [options]);

  const filteredGroups = groups.filter(
    (g) => !sidebarSearch || g.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  // ── Option CRUD (global) ──
  const updateOption = (optionId: string, patch: Partial<Option>) => {
    setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, ...patch } : o)));
    toast("Опция сохранена", "success");
  };

  const createOption = (): string => {
    const id = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fresh: Option = { id, name: "Новая опция", price: 0, min: 0, max: null, enabled: true };
    setOptions((prev) => [...prev, fresh]);
    return id;
  };

  const deleteOption = (optionId: string) => {
    const opt = optionsMap.get(optionId);
    // Remove from all blocks
    setGroups((prev) => prev.map((g) => ({
      ...g,
      blocks: g.blocks.map((b) => ({ ...b, optionIds: b.optionIds.filter((id) => id !== optionId) })),
    })));
    setOptions((prev) => prev.filter((o) => o.id !== optionId));
    if (opt) toast(`Опция «${opt.name}» удалена`, "success");
  };

  const duplicateOption = (optionId: string) => {
    const src = optionsMap.get(optionId);
    if (!src) return;
    const id = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cloned: Option = { ...src, id, name: `${src.name} (копия)` };
    setOptions((prev) => [...prev, cloned]);
    toast(`Опция «${src.name}» дублирована`, "success");
  };

  // ── Group CRUD ──
  const saveGroup = (groupId: string, patch: Partial<OptionGroup>) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
    toast("Группа сохранена", "success");
  };

  const duplicateGroup = (groupId: string) => {
    const src = groups.find((g) => g.id === groupId);
    if (!src) return;
    const cloned: OptionGroup = {
      ...src,
      id: `og-${Date.now()}`,
      name: `${src.name} (копия)`,
      blocks: src.blocks.map((b) => ({ ...b, id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
    };
    setGroups((prev) => [...prev, cloned]);
    setSelectedGroupId(cloned.id);
    toast(`Группа «${src.name}» дублирована`, "success");
  };

  const addGroup = () => {
    const newGroup: OptionGroup = { id: `og-${Date.now()}`, name: "Новая группа", enabled: true, blocks: [] };
    setGroups((prev) => [...prev, newGroup]);
    setSelectedGroupId(newGroup.id);
    toast("Новая группа опций создана", "success");
  };

  const deleteGroup = (groupId: string) => {
    const g = groups.find((gr) => gr.id === groupId);
    const next = groups.filter((gr) => gr.id !== groupId);
    setGroups(next);
    if (selectedGroupId === groupId && next.length) setSelectedGroupId(next[0].id);
    if (g) toast(`Группа «${g.name}» удалена`, "success");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50">
          <div className="w-5 h-5 bg-red-600 rounded-sm flex items-center justify-center"><span className="text-white text-[8px] font-bold">R</span></div>
          Рыба и Мясо <ChevronDown size={14} className="text-gray-400" />
        </button>
        <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white focus:outline-none hover:bg-gray-50">
          <option value="all">Все города</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 ml-2">
          <button onClick={() => setView("groups")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${view === "groups" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Layers size={12} /> Группы опций
          </button>
          <button onClick={() => setView("all")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${view === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Puzzle size={12} /> Все опции
          </button>
        </div>
        <div className="flex-1" />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {view === "groups" && (
          <div className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-gray-200 space-y-2">
              <span className="text-[12px] font-semibold text-gray-600">Группы опций</span>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} placeholder="Поиск..."
                  className="w-full pl-7 pr-3 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1 px-1.5">
              {filteredGroups.map((g) => {
                const optCount = g.blocks.reduce((s, b) => s + b.optionIds.length, 0);
                const active = selectedGroup?.id === g.id;
                return (
                  <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition-colors ${active ? "bg-orange-50 text-orange-700" : "hover:bg-gray-50 text-gray-700"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.enabled ? "bg-green-400" : "bg-gray-300"}`} />
                    <span className={`flex-1 min-w-0 text-[13px] truncate ${active ? "font-semibold" : "font-medium"}`}>{g.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{optCount}</span>
                  </button>
                );
              })}
              {filteredGroups.length === 0 && <div className="text-center py-6 text-[12px] text-gray-400">Ничего не найдено</div>}
              <button onClick={addGroup} className="w-full flex items-center gap-2 px-2.5 py-1.5 mt-1 text-gray-500 text-[13px] hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors">
                <Plus size={13} /> Новая группа
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {view === "groups" ? (
            selectedGroup ? (
              <GroupPanel key={selectedGroup.id} group={selectedGroup} optionsMap={optionsMap} allOptionsList={options}
                onSave={(patch) => saveGroup(selectedGroup.id, patch)}
                onDelete={() => deleteGroup(selectedGroup.id)}
                onDuplicate={() => duplicateGroup(selectedGroup.id)}
                onUpdateOption={updateOption}
                onCreateOption={createOption}
                onDeleteOption={deleteOption}
                onDuplicateOption={duplicateOption} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="text-[48px] mb-3">🧩</div>
                <div className="text-[14px] font-medium text-gray-700 mb-1">Нет групп опций</div>
                <div className="text-[12px] text-gray-400 mb-4">Создайте первую группу, чтобы начать</div>
                <button onClick={addGroup} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-[13px] font-medium hover:bg-orange-600 transition-colors">
                  <Plus size={14} /> Создать группу
                </button>
              </div>
            )
          ) : (
            <AllOptionsView groups={groups} onGroupsChange={setGroups} options={options} onOptionsChange={setOptions} />
          )}
        </div>
      </div>
    </div>
  );
}
