import { useState } from "react";
import {
  Plus, Search, Filter as FilterIcon, Leaf, X, Save,
  Info, Pencil, Trash2, ChevronDown, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AllergenType =
  | "gluten" | "dairy" | "nuts" | "eggs" | "fish" | "shellfish"
  | "soy" | "sesame" | "pork" | "alcohol";

export interface Allergen {
  key: AllergenType;
  label: string;
  emoji: string;
  color: string;
}

export interface IngredientFilter {
  id: string;
  name: string;
  allergens: AllergenType[];
  isVegan: boolean;
  isVegetarian: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  description?: string;
  linkedPositions: number;
  active: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ALLERGENS: Allergen[] = [
  { key: "gluten", label: "Глютен", emoji: "🌾", color: "bg-yellow-100 text-yellow-700" },
  { key: "dairy", label: "Молоко", emoji: "🥛", color: "bg-blue-100 text-blue-700" },
  { key: "nuts", label: "Орехи", emoji: "🥜", color: "bg-amber-100 text-amber-700" },
  { key: "eggs", label: "Яйца", emoji: "🥚", color: "bg-orange-100 text-orange-700" },
  { key: "fish", label: "Рыба", emoji: "🐟", color: "bg-cyan-100 text-cyan-700" },
  { key: "shellfish", label: "Моллюски", emoji: "🦐", color: "bg-red-100 text-red-700" },
  { key: "soy", label: "Соя", emoji: "🫘", color: "bg-green-100 text-green-700" },
  { key: "sesame", label: "Кунжут", emoji: "⬤", color: "bg-stone-100 text-stone-700" },
  { key: "pork", label: "Свинина", emoji: "🐷", color: "bg-pink-100 text-pink-700" },
  { key: "alcohol", label: "Алкоголь", emoji: "🍷", color: "bg-purple-100 text-purple-700" },
];

const mockFilters: IngredientFilter[] = [
  {
    id: "if-1",
    name: "Вегетарианское",
    allergens: ["fish", "shellfish", "pork"],
    isVegan: false,
    isVegetarian: true,
    isHalal: false,
    isGlutenFree: false,
    description: "Блюда без мяса и рыбы",
    linkedPositions: 8,
    active: true,
  },
  {
    id: "if-2",
    name: "Веганское",
    allergens: ["dairy", "eggs", "fish", "shellfish", "pork"],
    isVegan: true,
    isVegetarian: true,
    isHalal: false,
    isGlutenFree: false,
    description: "Блюда без любых животных продуктов",
    linkedPositions: 4,
    active: true,
  },
  {
    id: "if-3",
    name: "Халяль",
    allergens: ["pork", "alcohol"],
    isVegan: false,
    isVegetarian: false,
    isHalal: true,
    isGlutenFree: false,
    description: "Блюда, приготовленные по стандартам халяль",
    linkedPositions: 12,
    active: true,
  },
  {
    id: "if-4",
    name: "Без глютена",
    allergens: ["gluten"],
    isVegan: false,
    isVegetarian: false,
    isHalal: false,
    isGlutenFree: true,
    description: "Блюда без пшеницы, ржи и ячменя",
    linkedPositions: 6,
    active: true,
  },
  {
    id: "if-5",
    name: "Без лактозы",
    allergens: ["dairy"],
    isVegan: false,
    isVegetarian: false,
    isHalal: false,
    isGlutenFree: false,
    description: "Блюда без молочных продуктов",
    linkedPositions: 9,
    active: false,
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors cursor-pointer ${checked ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

// ─── Filter Card ──────────────────────────────────────────────────────────────
function FilterCard({ filter, onToggle, onRemove }: {
  filter: IngredientFilter;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const allergenItems = ALLERGENS.filter((a) => filter.allergens.includes(a.key));

  return (
    <div className={`border rounded-xl p-4 bg-white transition-all ${
      filter.active ? "border-green-200 shadow-sm" : "border-gray-200 opacity-60"
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${filter.active ? "bg-green-50" : "bg-gray-100"}`}>
          <Leaf size={20} className={filter.active ? "text-green-500" : "text-gray-400"} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-gray-900">{filter.name}</span>
            {filter.isVegan && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">🌱 Веган</span>}
            {filter.isVegetarian && !filter.isVegan && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">🥗 Вегетарианец</span>}
            {filter.isHalal && <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full">☪️ Халяль</span>}
            {filter.isGlutenFree && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">🌾 Без глютена</span>}
          </div>

          {filter.description && (
            <p className="text-[12px] text-gray-500 mt-1">{filter.description}</p>
          )}

          {allergenItems.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-gray-400">Исключает:</span>
              {allergenItems.map((a) => (
                <span key={a.key} className={`text-[11px] px-2 py-0.5 rounded-full ${a.color}`}>
                  {a.emoji} {a.label}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="text-[12px] text-gray-500">
              Привязано: <span className="font-medium text-gray-700">{filter.linkedPositions} позиций</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Toggle checked={filter.active} onChange={() => onToggle(filter.id)} />
          <button className="p-1.5 hover:bg-gray-100 rounded-lg">
            <Pencil size={13} className="text-gray-400" />
          </button>
          <button onClick={() => onRemove(filter.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
            <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddFilterModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (f: IngredientFilter) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<Set<AllergenType>>(new Set());
  const [isVegan, setIsVegan] = useState(false);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isHalal, setIsHalal] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);

  const toggleAllergen = (key: AllergenType) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!name) return;
    onAdd({
      id: `if-${Date.now()}`,
      name,
      description,
      allergens: Array.from(selectedAllergens),
      isVegan,
      isVegetarian: isVegetarian || isVegan,
      isHalal,
      isGlutenFree,
      linkedPositions: 0,
      active: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Leaf size={18} className="text-green-500" />
            <h2 className="text-[16px] font-semibold text-gray-900">Новый фильтр</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Название фильтра *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Без лактозы"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Описание</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание..."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Специальные метки</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "isVegan", label: "🌱 Веган", val: isVegan, set: setIsVegan },
                { key: "isVegetarian", label: "🥗 Вегетарианец", val: isVegetarian, set: setIsVegetarian },
                { key: "isHalal", label: "☪️ Халяль", val: isHalal, set: setIsHalal },
                { key: "isGlutenFree", label: "🌾 Без глютена", val: isGlutenFree, set: setIsGlutenFree },
              ].map((item) => (
                <button key={item.key} onClick={() => item.set(!item.val)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${
                    item.val ? "bg-green-100 border-green-300 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-2">
              Аллергены, которые исключает фильтр
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALLERGENS.map((a) => (
                <label key={a.key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[12px] transition-colors ${
                  selectedAllergens.has(a.key) ? a.color + " border" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                  <input type="checkbox" checked={selectedAllergens.has(a.key)}
                    onChange={() => toggleAllergen(a.key)} className="w-4 h-4 accent-green-500" />
                  <span>{a.emoji}</span>
                  <span>{a.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
          <button onClick={handleSubmit} disabled={!name}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-[13px] font-medium">
            <Save size={14} />
            Создать фильтр
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function IngredientsPage() {
  const [filters, setFilters] = useState(mockFilters);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [showInfo, setShowInfo] = useState(true);

  const filtered = filters.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white">
        <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50">
          <div className="w-5 h-5 bg-red-600 rounded-sm flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">R</span>
          </div>
          Рыба и Мясо
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск фильтров"
            className="pl-8 pr-4 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none w-44" />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          <Plus size={16} />
          Новый фильтр
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {showInfo && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-green-600 mt-0.5 shrink-0" />
            <div className="text-[12px] text-green-900 flex-1">
              <span className="font-semibold">Фильтры по ингредиентам:</span>{" "}
              Создайте фильтры (вегетарианское, халяль, без глютена и т.д.) и привяжите
              их к позициям меню. Клиенты смогут фильтровать меню по своим предпочтениям.
              Аллергены отображаются в карточке товара.
            </div>
            <button onClick={() => setShowInfo(false)} className="text-green-400 hover:text-green-600 text-[11px]">Закрыть</button>
          </div>
        )}

        {/* All allergens reference */}
        <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-gray-500" />
            <span className="text-[12px] font-semibold text-gray-700">Таблица аллергенов</span>
            <span className="text-[11px] text-gray-400">(EU Regulation 1169/2011)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => (
              <span key={a.key} className={`text-[11px] px-2 py-1 rounded-lg ${a.color}`}>
                {a.emoji} {a.label}
              </span>
            ))}
          </div>
        </div>

        {/* Filters list */}
        <div className="space-y-3">
          {filtered.map((f) => (
            <FilterCard key={f.id} filter={f}
              onToggle={(id) => setFilters((prev) => prev.map((x) => x.id === id ? { ...x, active: !x.active } : x))}
              onRemove={(id) => setFilters((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <Leaf size={40} className="text-green-200 mb-4" />
            <div className="text-[15px] font-medium text-gray-600">Нет фильтров</div>
            <button onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 border border-dashed border-green-300 text-green-600 rounded-lg text-[13px] hover:bg-green-50">
              <Plus size={14} />
              Создать фильтр
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AddFilterModal
          onClose={() => setShowModal(false)}
          onAdd={(f) => setFilters((prev) => [f, ...prev])}
        />
      )}
    </div>
  );
}
