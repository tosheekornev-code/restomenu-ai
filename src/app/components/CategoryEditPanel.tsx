import { useState } from "react";
import { X, MoreHorizontal, Save, HelpCircle, Plus, ChevronDown, Clock, Info } from "lucide-react";
import { Category, Availability, categories, cities, CHANNELS } from "../data/mockData";
import { AvailabilitySection } from "./AvailabilitySection";
import { Toggle } from "./shared/Toggle";
import { toast } from "./shared/Toast";
import { ConfirmDialog } from "./shared/ConfirmDialog";

interface Props {
  category: Category | null;
  onClose: () => void;
  onSave: (cat: Category) => void;
  isNew?: boolean;
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-orange-500 text-orange-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CategoryEditPanel({ category, onClose, onSave, isNew }: Props) {
  const [tab, setTab] = useState<"basic" | "availability">("basic");

  // Basic fields
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState("");
  const [urlCode, setUrlCode] = useState(category?.urlCode ?? "");
  const [enabled, setEnabled] = useState(category?.enabled ?? true);
  const [parentId, setParentId] = useState(category?.parentId ?? "");

  // Schedule fields
  const [scheduleType, setScheduleType] = useState(category?.availability.schedule.type ?? "daily");
  const [allDay, setAllDay] = useState(category?.availability.schedule.allDay ?? true);
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));
  const [timeFrom, setTimeFrom] = useState("10:00");
  const [timeTo, setTimeTo] = useState("22:00");

  // Availability
  const [availability, setAvailability] = useState<Availability>(
    category?.availability ?? {
      everywhere: false,
      schedule: { type: "daily", allDay: true },
      cities: [],
    }
  );

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!category && !isNew) return null;

  const isDirty = name !== (category?.name ?? "") || urlCode !== (category?.urlCode ?? "");

  const handleSave = () => {
    if (!name.trim()) {
      toast("Укажите название категории", "error");
      return;
    }
    if (!urlCode.trim()) {
      toast("Укажите URL-код категории", "error");
      return;
    }

    const saved: Category = {
      id: category?.id ?? `cat-${Date.now()}`,
      name: name.trim(),
      urlCode: urlCode.trim(),
      enabled,
      parentId: parentId || undefined,
      photo: category?.photo,
      positionsCount: category?.positionsCount ?? 0,
      availability: {
        ...availability,
        schedule: {
          type: scheduleType as "daily" | "weekdays" | "dates",
          allDay,
          periods: allDay ? undefined : [{ from: timeFrom, to: timeTo }],
        },
      },
    };

    onSave(saved);
    toast(`Категория «${saved.name}» сохранена`, "success");
  };

  const toggleDay = (idx: number) => {
    setActiveDays((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const parentOptions = categories.filter((c) => c.id !== category?.id && !c.parentId);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-[600px] bg-white shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[17px] font-semibold text-gray-900">
              {isNew ? "Новая категория" : category?.name}
            </h2>
            {!isNew && category && (
              <span className="text-[12px] text-gray-400 font-mono">{category.urlCode}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium transition-colors"
            >
              <Save size={14} />
              Сохранить
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal size={18} className="text-gray-500" />
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1">
                    <button className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                      Дублировать
                    </button>
                    <button className="w-full text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                      Экспорт
                    </button>
                    {!isNew && (
                      <>
                        <div className="h-px bg-gray-100 my-1" />
                        <button
                          onClick={() => { setShowMoreMenu(false); setShowDeleteConfirm(true); }}
                          className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50"
                        >
                          Удалить категорию
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4">
          <TabButton active={tab === "basic"} onClick={() => setTab("basic")}>
            Основная информация
          </TabButton>
          <TabButton active={tab === "availability"} onClick={() => setTab("availability")}>
            Доступность и расписание
          </TabButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── BASIC TAB ─────────────────────────────────────── */}
          {tab === "basic" && (
            <div className="space-y-5">
              {/* Enable toggle */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                enabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
              }`}>
                <Toggle checked={enabled} onChange={setEnabled} size="md" />
                <div>
                  <div className="text-[13px] font-medium text-gray-800">
                    {enabled ? "Отображается в меню" : "Скрыто для клиентов"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {enabled
                      ? "Категория видна клиентам в соответствии с настройками доступности"
                      : "Категория полностью скрыта, независимо от других настроек"}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Название категории <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Пицца"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Описание
                  <span className="text-gray-400 font-normal ml-1">(необязательно)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Краткое описание категории для клиентов..."
                  rows={2}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>

              {/* URL + Parent */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-[12px] font-medium text-gray-700 mb-1">
                    URL-код <span className="text-red-500">*</span>
                    <HelpCircle size={12} className="text-gray-400" />
                  </label>
                  <div className="flex">
                    <span className="px-2 py-2 text-[12px] text-gray-400 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg">/</span>
                    <input
                      value={urlCode.replace(/^\//, "")}
                      onChange={(e) => setUrlCode("/" + e.target.value.replace(/^\//, ""))}
                      placeholder="pizza"
                      className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-[12px] font-medium text-gray-700 mb-1">
                    Родительская категория
                    <HelpCircle size={12} className="text-gray-400" />
                  </label>
                  <div className="relative">
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 appearance-none bg-white"
                    >
                      <option value="">— Корневая категория</option>
                      {parentOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Cover photo */}
              <div>
                <label className="flex items-center gap-1 text-[12px] font-medium text-gray-700 mb-2">
                  Обложка категории
                  <HelpCircle size={12} className="text-gray-400" />
                </label>
                <div className="flex items-center gap-4">
                  {category?.photo ? (
                    <div className="relative group">
                      <img
                        src={category.photo}
                        className="w-20 h-20 rounded-xl object-cover border border-gray-200"
                      />
                      <button className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-[11px]">Заменить</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors bg-gray-50">
                      <Plus size={20} className="text-gray-400" />
                      <span className="text-[9px] text-gray-400 mt-0.5">Загрузить</span>
                    </div>
                  )}
                  <div className="text-[11px] text-gray-400 leading-relaxed">
                    JPG, JPEG, PNG до 10 МБ<br />
                    Рекомендуемый размер: 600×600px<br />
                    Соотношение сторон: 1:1
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AVAILABILITY + SCHEDULE TAB ──────────────────── */}
          {tab === "availability" && (
            <div className="space-y-6">
              {/* Schedule section */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} className="text-gray-500" />
                  <h3 className="text-[14px] font-semibold text-gray-800">Дни и время показа</h3>
                </div>

                {/* Schedule type */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
                  {(["daily", "weekdays", "dates"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setScheduleType(t)}
                      className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                        scheduleType === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {t === "daily" ? "Ежедневно" : t === "weekdays" ? "По дням недели" : "По датам"}
                    </button>
                  ))}
                </div>

                {/* Weekday picker */}
                {scheduleType === "weekdays" && (
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {WEEKDAYS.map((day, idx) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(idx)}
                        className={`py-2 text-[12px] font-medium rounded-lg border-2 transition-colors ${
                          activeDays.has(idx)
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}

                {/* Time */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule-time"
                      checked={allDay}
                      onChange={() => setAllDay(true)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-[13px] text-gray-700">Весь день</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule-time"
                      checked={!allDay}
                      onChange={() => setAllDay(false)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-[13px] text-gray-700">Задать период</span>
                  </label>
                  {!allDay && (
                    <div className="flex items-center gap-2 ml-2">
                      <input
                        type="time"
                        value={timeFrom}
                        onChange={(e) => setTimeFrom(e.target.value)}
                        className="px-2 py-1 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <span className="text-gray-400 text-[12px]">—</span>
                      <input
                        type="time"
                        value={timeTo}
                        onChange={(e) => setTimeTo(e.target.value)}
                        className="px-2 py-1 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Availability section */}
              <AvailabilitySection
                availability={availability}
                onChange={setAvailability}
              />
            </div>
          )}
        </div>

        {/* Unsaved indicator */}
        {isDirty && (
          <div className="px-6 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[12px] text-amber-700">Есть несохранённые изменения</span>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Удалить «${category?.name}»?`}
          description="Категория и все её подкатегории будут удалены. Позиции останутся."
          confirmLabel="Удалить"
          onConfirm={() => {
            setShowDeleteConfirm(false);
            toast(`Категория «${category?.name}» удалена`, "warning");
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
