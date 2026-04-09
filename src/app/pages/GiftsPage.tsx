import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Gift, Tag, ShoppingCart, Hash,
  ChevronDown, Pencil, Trash2, Info, BarChart2,
  X, Save,
} from "lucide-react";
import {
  gifts as initialGifts,
  Gift as GiftType, GiftTrigger,
  cities, CHANNELS, ChannelAvailability,
} from "../data/mockData";

// ─── Config ───────────────────────────────────────────────────────────────────
const TRIGGER_CONFIG: Record<GiftTrigger, { label: string; valueLabel: string; icon: React.ReactNode; color: string }> = {
  order_amount: { label: "Сумма заказа", valueLabel: "От (₽)", icon: <ShoppingCart size={14} />, color: "bg-green-100 text-green-700" },
  item_count: { label: "Количество позиций", valueLabel: "Кол-во", icon: <Hash size={14} />, color: "bg-blue-100 text-blue-700" },
  specific_item: { label: "Конкретный товар", valueLabel: "Товар", icon: <Tag size={14} />, color: "bg-orange-100 text-orange-700" },
  promo_code: { label: "Промокод", valueLabel: "Код", icon: <Tag size={14} />, color: "bg-purple-100 text-purple-700" },
};


function ChannelChips({ channels }: { channels: (keyof ChannelAvailability)[] | "all" }) {
  if (channels === "all") return <span className="text-[11px] text-gray-400">Все каналы</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((key) => {
        const ch = CHANNELS.find((c) => c.key === key);
        return ch ? (
          <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded-full ${ch.color}`}>{ch.shortLabel}</span>
        ) : null;
      })}
    </div>
  );
}

function GiftCard({ gift, onToggle, onRemove }: {
  gift: GiftType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const trigConf = TRIGGER_CONFIG[gift.trigger];
  const locLabel = gift.locationIds === "all"
    ? "Все точки"
    : Array.isArray(gift.locationIds)
      ? `${gift.locationIds.length} точек`
      : "—";

  return (
    <div className={`border rounded-xl p-4 bg-white transition-all ${
      gift.active ? "border-green-200 shadow-sm" : "border-gray-200 opacity-60"
    }`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${gift.active ? "bg-green-50" : "bg-gray-100"}`}>
          <Gift size={20} className={gift.active ? "text-green-500" : "text-gray-400"} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-gray-900">{gift.name}</span>
            <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${trigConf.color}`}>
              {trigConf.icon}
              {trigConf.label}
            </span>
            {!gift.active && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">Неактивно</span>
            )}
          </div>

          {gift.description && (
            <p className="text-[12px] text-gray-500 mt-1">{gift.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-[12px] text-gray-600">
              <span className="font-medium">Триггер: </span>
              {gift.trigger === "order_amount" ? `от ${gift.triggerValue} ₽` :
               gift.trigger === "item_count" ? `${gift.triggerValue}+ позиций` :
               gift.trigger === "promo_code" ? `код «${gift.triggerValue}»` :
               gift.triggerValue}
            </span>
            {gift.giftPositionName && (
              <span className="flex items-center gap-1 text-[12px] text-gray-600">
                <Gift size={11} className="text-gray-400" />
                {gift.giftPositionName}
              </span>
            )}
            <span className="text-[12px] text-gray-500">{locLabel}</span>
            <ChannelChips channels={gift.channels} />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1.5 text-[12px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <BarChart2 size={11} />
              Использовано: {gift.usageCount} раз
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={gift.active} onCheckedChange={() => onToggle(gift.id)} />
          <button className="p-1.5 hover:bg-gray-100 rounded-lg">
            <Pencil size={13} className="text-gray-400" />
          </button>
          <button onClick={() => onRemove(gift.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
            <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddGiftModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (g: GiftType) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<GiftTrigger>("order_amount");
  const [triggerValue, setTriggerValue] = useState("");
  const [giftName, setGiftName] = useState("");
  const [channelMode, setChannelMode] = useState<"all" | "custom">("all");
  const [channelKeys, setChannelKeys] = useState<Set<keyof ChannelAvailability>>(new Set());
  const [locationMode, setLocationMode] = useState<"all" | "custom">("all");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const allLocations = cities.flatMap((c) => c.locations.map((l) => ({ ...l, cityName: c.name })));

  const handleSubmit = () => {
    if (!name || !triggerValue) return;
    onAdd({
      id: `gift-${Date.now()}`,
      name,
      description,
      trigger,
      triggerValue: trigger === "order_amount" || trigger === "item_count" ? Number(triggerValue) : triggerValue,
      giftPositionName: giftName,
      channels: channelMode === "all" ? "all" : Array.from(channelKeys),
      locationIds: locationMode === "all" ? "all" : locationIds,
      active: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-green-500" />
            <h2 className="text-[16px] font-semibold text-gray-900">Новый подарок</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Название *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Соусы в подарок от 1000₽"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Описание</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание условий..."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Условие выдачи</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TRIGGER_CONFIG) as [GiftTrigger, (typeof TRIGGER_CONFIG)[GiftTrigger]][]).map(([key, conf]) => (
                <button key={key} onClick={() => setTrigger(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border transition-colors ${
                    trigger === key ? conf.color + " border" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>
                  {conf.icon}{conf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">{TRIGGER_CONFIG[trigger].valueLabel} *</label>
              <input value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)}
                type={trigger === "order_amount" || trigger === "item_count" ? "number" : "text"}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">Что дарим</label>
              <input value={giftName} onChange={(e) => setGiftName(e.target.value)} placeholder="Название подарка"
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Каналы</label>
            <div className="flex gap-2">
              {(["all", "custom"] as const).map((m) => (
                <button key={m} onClick={() => setChannelMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] border ${channelMode === m ? "bg-gray-900 text-white" : "border-gray-200 text-gray-600"}`}>
                  {m === "all" ? "Все" : "Выбрать"}
                </button>
              ))}
            </div>
            {channelMode === "custom" && (
              <div className="flex flex-wrap gap-2 mt-2">
                {CHANNELS.map((c) => (
                  <label key={c.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer text-[11px] ${
                    channelKeys.has(c.key) ? c.color + " border" : "border-gray-200 text-gray-500"
                  }`}>
                    <input type="checkbox" checked={channelKeys.has(c.key)}
                      onChange={() => setChannelKeys((prev) => { const n = new Set(prev); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })}
                      className="sr-only" />
                    {c.shortLabel}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
          <button onClick={handleSubmit} disabled={!name || !triggerValue}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-[13px] font-medium">
            <Save size={14} />
            Создать подарок
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function GiftsPage() {
  const [gifts, setGifts] = useState(initialGifts);
  const [showModal, setShowModal] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const active = gifts.filter((g) => g.active);
  const inactive = gifts.filter((g) => !g.active);

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
        <div className="flex-1" />
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          <Plus size={16} />
          Создать подарок
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 px-5 py-2.5 bg-green-50 border-b border-green-100">
        <span className="text-[13px] text-green-700 font-semibold">{active.length} активных подарков</span>
        <span className="text-[12px] text-gray-500">{gifts.reduce((s, g) => s + g.usageCount, 0)} использований всего</span>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {showInfo && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-green-600 mt-0.5 shrink-0" />
            <div className="text-[12px] text-green-900 flex-1">
              <span className="font-semibold">Система подарков:</span>{" "}
              Настройте автоматическую выдачу подарков по условиям заказа. Поддерживаются условия:
              сумма заказа, количество позиций, к��нкретный товар в корзине или промокод.
              Настройте доступность по каналам и точкам.
            </div>
            <button onClick={() => setShowInfo(false)} className="text-green-400 hover:text-green-600 text-[11px]">Закрыть</button>
          </div>
        )}

        {active.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[13px] font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Gift size={14} className="text-green-500" />
              Активные ({active.length})
            </h3>
            <div className="space-y-3">
              {active.map((g) => (
                <GiftCard key={g.id} gift={g}
                  onToggle={(id) => setGifts((prev) => prev.map((x) => x.id === id ? { ...x, active: !x.active } : x))}
                  onRemove={(id) => setGifts((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          </div>
        )}

        {inactive.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-gray-400 mb-3">Неактивные ({inactive.length})</h3>
            <div className="space-y-3">
              {inactive.map((g) => (
                <GiftCard key={g.id} gift={g}
                  onToggle={(id) => setGifts((prev) => prev.map((x) => x.id === id ? { ...x, active: !x.active } : x))}
                  onRemove={(id) => setGifts((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          </div>
        )}

        {gifts.length === 0 && (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Gift size={40} className="text-green-200 mb-4" />
            <div className="text-[15px] font-medium text-gray-600">Нет подарков</div>
            <button onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 border border-dashed border-green-300 text-green-600 rounded-lg text-[13px] hover:bg-green-50">
              <Plus size={14} />
              Создать первый подарок
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AddGiftModal
          onClose={() => setShowModal(false)}
          onAdd={(g) => setGifts((prev) => [g, ...prev])}
        />
      )}
    </div>
  );
}
