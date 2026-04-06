import { useState } from "react";
import {
  Plus, Search, ChevronDown, ChevronUp, GripVertical, Pencil,
  Trash2, MoreVertical, Info, Save, X, HelpCircle,
} from "lucide-react";
import { optionGroups as initialGroups, OptionGroup, OptionBlock, CHANNELS, ChannelAvailability } from "../data/mockData";
import { Toggle } from "../components/shared/Toggle";
import { toast } from "../components/shared/Toast";

function ChannelAvailabilitySelector({
  channels,
  onChange,
}: {
  channels: ChannelAvailability;
  onChange: (c: ChannelAvailability) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[12px] font-medium text-gray-700">
        <HelpCircle size={12} className="text-gray-400" />
        Доступность по каналам заказа
      </div>
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        {CHANNELS.map((c) => (
          <label key={c.key} className="flex items-center gap-3 cursor-pointer">
            <Toggle
              size="sm"
              checked={channels[c.key]}
              onChange={(v) => onChange({ ...channels, [c.key]: v })}
            />
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.color}`}>{c.shortLabel}</span>
            <span className="text-[12px] text-gray-600 flex-1">{c.label}</span>
            <span className="text-[11px] text-gray-400">{c.description}</span>
          </label>
        ))}
      </div>
      <div className="text-[11px] text-gray-400 italic">
        * Группа опций будет показана клиенту только при заказе через выбранные каналы
      </div>
    </div>
  );
}

function BlockCard({ block, groupChannels }: { block: OptionBlock; groupChannels: ChannelAvailability }) {
  const [expanded, setExpanded] = useState(true);

  const displayLabels: Record<string, string> = {
    "large-tiles": "Крупные плитки",
    "small-tiles": "Мелкие плитки",
    "list": "Список",
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 bg-white">
      {/* Block header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <GripVertical size={14} className="text-gray-400 cursor-grab" />
        <div className="flex-1">
          <span className="text-[13px] font-semibold text-gray-800">{block.name}</span>
          <span className="ml-2 text-[11px] text-gray-500">
            {block.options.length} &nbsp; min: {block.min} &nbsp; max: {block.max} &nbsp; Вид: {displayLabels[block.displayType]}
          </span>
        </div>
        <Toggle checked={true} onChange={() => {}} size="sm" />
        <button className="p-1.5 hover:bg-gray-200 rounded-lg">
          <Trash2 size={14} className="text-gray-400" />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 hover:bg-gray-200 rounded-lg">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="p-4">
          {/* Block settings row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Название блока *</label>
              <input defaultValue={block.name} className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Вид отображения</label>
              <select className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none bg-white">
                <option>Крупные плитки</option>
                <option>Мелкие плитки</option>
                <option>Список</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Мин.</label>
                <input defaultValue={block.min} type="number" className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Макс.</label>
                <input defaultValue={block.max} type="number" className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            </div>
          </div>

          {/* Options in block + all options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-gray-700">Опции в блоке {block.options.length}</span>
                <span className="text-[11px] text-blue-500 cursor-pointer">Выберите опции справа →</span>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-1 text-left">Фото</th>
                    <th className="pb-1 text-left">Название</th>
                    <th className="pb-1 text-right">Цена</th>
                    <th className="pb-1 text-right">Мин</th>
                    <th className="pb-1 text-right">Макс</th>
                    <th className="pb-1 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {block.options.map((opt) => (
                    <tr key={opt.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                      <td className="py-1.5">
                        <div className="w-7 h-7 rounded-lg bg-gray-200 overflow-hidden">
                          {opt.photo && <img src={opt.photo} className="w-full h-full object-cover" />}
                        </div>
                      </td>
                      <td className="py-1.5 font-medium text-gray-700">{opt.name}</td>
                      <td className="py-1.5 text-right text-gray-600">{opt.price || "–"}</td>
                      <td className="py-1.5 text-right text-gray-600">{opt.min}</td>
                      <td className="py-1.5 text-right text-gray-600">{opt.max || "∞"}</td>
                      <td className="py-1.5">
                        <Toggle checked={opt.enabled} onChange={() => {}} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-l border-gray-100 pl-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-gray-700">Все опции</span>
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input placeholder="Поиск" className="pl-6 pr-2 py-1 text-[11px] border border-gray-200 rounded-lg w-28" />
                </div>
              </div>
              <div className="space-y-1.5">
                {block.options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-1">
                    <span className="text-green-500 text-[12px]">✓</span>
                    <span className="text-[12px] text-gray-700 flex-1">{opt.name}</span>
                    <Pencil size={11} className="text-gray-300 hover:text-gray-500 cursor-pointer" />
                  </div>
                ))}
                <button className="flex items-center gap-1.5 text-[11px] text-green-600 hover:text-green-700 font-medium mt-2">
                  <Plus size={12} /> Создать опцию
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupPanel({ group, onSave, onClose }: { group: OptionGroup; onSave: (updated: OptionGroup) => void; onClose: () => void }) {
  const [channels, setChannels] = useState<ChannelAvailability>(group.channels);
  const [name, setName] = useState(group.name);
  const [enabled, setEnabled] = useState(group.enabled);

  const handleSave = () => {
    onSave({ ...group, name, channels, enabled });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Group header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-[17px] font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-orange-400 focus:outline-none px-1 -mx-1 rounded"
          />
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <MoreVertical size={16} className="text-gray-500" />
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] font-medium hover:bg-green-700"
        >
          <Save size={14} /> Сохранить
        </button>
      </div>

      {/* Description */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-[12px] text-gray-500">
        Группа опций (для пицц, для горячего и т.п.) добавляется к товару и содержит в себе блоки,
        которые клиенты будут видеть в карточке товара (топпинги, добавки, выбор соуса и т.п.). В блоки добавляются опции.
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Channel availability — KEY SECTION */}
        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <ChannelAvailabilitySelector channels={channels} onChange={setChannels} />
        </div>

        {/* Blocks */}
        <div>
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-green-500 text-green-600 rounded-xl text-[13px] font-medium hover:bg-green-50 mb-4 w-full justify-center transition-colors">
            <Plus size={16} /> Создать блок опций
          </button>

          {group.blocks.map((block) => (
            <BlockCard key={block.id} block={block} groupChannels={channels} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OptionsGroupsPage() {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedGroup, setSelectedGroup] = useState<OptionGroup>(groups[0]);
  const [showInfo, setShowInfo] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const filteredGroups = groups.filter((g) =>
    !sidebarSearch || g.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Left: groups list */}
      <div className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0">
        {/* Top bar */}
        <div className="px-4 py-3 border-b border-gray-200 space-y-2">
          <span className="text-[12px] font-semibold text-gray-600">Группы опций</span>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-7 pr-3 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {filteredGroups.map((g) => {
            const optCount = g.blocks.reduce((s, b) => s + b.options.length, 0);
            const activeChannels = Object.values(g.channels).filter(Boolean).length;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g)}
                className={`w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-left mb-1 transition-colors ${
                  selectedGroup.id === g.id ? "bg-orange-100 text-orange-700" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{g.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {g.blocks.length} блоков · {optCount} опций
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {CHANNELS.filter((c) => g.channels[c.key]).map((c) => (
                      <span key={c.key} className={`text-[9px] px-1 py-0.5 rounded-full ${c.color}`}>
                        {c.shortLabel}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Status dot */}
                <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${g.enabled ? "bg-green-400" : "bg-gray-300"}`} />
              </button>
            );
          })}

          {filteredGroups.length === 0 && (
            <div className="text-center py-6 text-[12px] text-gray-400">
              Ничего не найдено
            </div>
          )}

          <button
            onClick={() => {
              const newGroup: OptionGroup = {
                id: `og-${Date.now()}`,
                name: "Новая группа",
                enabled: true,
                channels: { dineIn: true, preorder: true, delivery: true, pickup: true },
                blocks: [],
              };
              setGroups((prev) => [...prev, newGroup]);
              setSelectedGroup(newGroup);
              toast("Новая группа опций создана", "success");
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-green-600 text-[13px] font-medium hover:bg-green-50 rounded-lg"
          >
            <Plus size={14} /> Новая группа
          </button>
        </div>
      </div>

      {/* Right: group detail */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white shrink-0">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700">
            <div className="w-5 h-5 bg-red-600 rounded-sm flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">R</span>
            </div>
            Рыба и Мясо <ChevronDown size={14} className="text-gray-400" />
          </button>
          <div className="flex-1" />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Поиск опций" className="pl-8 pr-4 py-2 text-[13px] border border-gray-200 rounded-lg w-44 focus:outline-none" />
          </div>
        </div>

        {/* Info callout */}
        {showInfo && (
          <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 shrink-0">
            <Info size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-[12px] text-amber-900 flex-1">
              <span className="font-semibold">Доступность групп опций:</span>{" "}
              Города и точки не нужны — группа доступна там, где доступен товар.
              Ограничивайте только <span className="font-semibold">каналы заказа</span>:
              например, «Упаковка» — только для Доставки и Самовывоза.
            </div>
            <button onClick={() => setShowInfo(false)} className="text-amber-400 hover:text-amber-600 text-[11px] shrink-0">Закрыть</button>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <GroupPanel
            key={selectedGroup.id}
            group={selectedGroup}
            onSave={(updated) => {
              setGroups((prev) => prev.map((g) => g.id === updated.id ? updated : g));
              setSelectedGroup(updated);
              toast(`Группа «${updated.name}» сохранена`, "success");
            }}
            onClose={() => {}}
          />
        </div>
      </div>
    </div>
  );
}