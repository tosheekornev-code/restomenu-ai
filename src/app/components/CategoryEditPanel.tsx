import { useState } from "react";
import { X, Save, MoreHorizontal, HelpCircle, Plus, Clock } from "lucide-react";
import { Category, Availability, categories } from "../data/mockData";
import { AvailabilitySection } from "./AvailabilitySection";
import { Switch } from "@/components/ui/switch";
import { toast } from "./shared/Toast";
import { ConfirmDialog } from "./shared/ConfirmDialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "./ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "./ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "./ui/tooltip";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { cn } from "./ui/utils";

interface Props {
  category: Category | null;
  onClose: () => void;
  onSave: (cat: Category) => void;
  isNew?: boolean;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CategoryEditPanel({ category, onClose, onSave, isNew }: Props) {
  const [tab, setTab] = useState<"basic" | "availability">("basic");
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState("");
  const [urlCode, setUrlCode] = useState(category?.urlCode ?? "");
  const [enabled, setEnabled] = useState(category?.enabled ?? true);
  const [parentId, setParentId] = useState(category?.parentId ?? "none");
  const [scheduleType, setScheduleType] = useState(category?.availability.schedule.type ?? "daily");
  const [allDay, setAllDay] = useState(category?.availability.schedule.allDay ?? true);
  const [activeDays, setActiveDays] = useState<string[]>(["0", "1", "2", "3", "4", "5", "6"]);
  const [timeFrom, setTimeFrom] = useState("10:00");
  const [timeTo, setTimeTo] = useState("22:00");
  const [availability, setAvailability] = useState<Availability>(
    category?.availability ?? { everywhere: false, schedule: { type: "daily", allDay: true }, cities: [] }
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOpen = !!(category || isNew);
  if (!isOpen) return null;

  const isDirty = name !== (category?.name ?? "") || urlCode !== (category?.urlCode ?? "");

  const handleSave = () => {
    if (!name.trim()) { toast("Укажите название категории", "error"); return; }
    if (!urlCode.trim()) { toast("Укажите URL-код категории", "error"); return; }
    const saved: Category = {
      id: category?.id ?? `cat-${Date.now()}`,
      name: name.trim(),
      urlCode: urlCode.trim(),
      enabled,
      parentId: parentId === "none" ? undefined : parentId,
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

  const parentOptions = categories.filter((c) => c.id !== category?.id && !c.parentId);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="right"
          className="w-[600px] sm:max-w-[600px] p-0 flex flex-col gap-0 [&>button:last-child]:hidden"
        >
          {/* ── Header ─────────────────────────────────────────── */}
          <SheetHeader className="px-6 py-4 border-b border-border space-y-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-[17px]">
                  {isNew ? "Новая категория" : category?.name}
                </SheetTitle>
                {!isNew && category && (
                  <SheetDescription className="text-[12px] font-mono mt-0.5">
                    {category.urlCode}
                  </SheetDescription>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={handleSave} className="gap-2 text-[13px] font-medium bg-green-600 hover:bg-green-700 text-white">
                  <Save size={14} />
                  Сохранить
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="size-9">
                      <MoreHorizontal size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    <DropdownMenuItem>Дублировать</DropdownMenuItem>
                    <DropdownMenuItem>Экспорт</DropdownMenuItem>
                    {!isNew && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                          Удалить категорию
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="size-9" onClick={onClose}>
                  <X size={18} />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* ── Tab nav — простые кнопки underline ─────────────── */}
          <div className="flex border-b border-border px-2 shrink-0">
            {(["basic", "availability"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  tab === t
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "basic" ? "Основная информация" : "Доступность и расписание"}
              </button>
            ))}
          </div>

          {/* ── BASIC TAB ──────────────────────────────────────── */}
          {tab === "basic" && (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                {/* Enable toggle */}
                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border transition-colors",
                  enabled ? "bg-green-50 border-green-200" : "bg-muted border-border"
                )}>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                  <div>
                    <div className="text-[13px] font-medium text-foreground">
                      {enabled ? "Отображается в меню" : "Скрыто для клиентов"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {enabled
                        ? "Категория видна клиентам в соответствии с настройками доступности"
                        : "Категория полностью скрыта, независимо от других настроек"}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-[12px]">
                    Название категории <span className="text-destructive">*</span>
                  </Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Пицца" className="text-[13px]" />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-[12px]">
                    Описание
                    <span className="text-muted-foreground font-normal ml-1">(необязательно)</span>
                  </Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание для клиентов..." rows={2} className="text-[13px]" />
                </div>

                {/* URL + Parent */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">
                      URL-код <span className="text-destructive">*</span>
                      <Tooltip>
                        <TooltipTrigger asChild><HelpCircle size={12} className="text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent>Латиница, используется в ссылке</TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="flex">
                      <span className="px-2 text-[12px] text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md flex items-center">/</span>
                      <Input
                        value={urlCode.replace(/^\//, "")}
                        onChange={(e) => setUrlCode("/" + e.target.value.replace(/^\//, ""))}
                        placeholder="pizza"
                        className="text-[13px] rounded-l-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Родительская категория</Label>
                    <Select value={parentId} onValueChange={setParentId}>
                      <SelectTrigger className="text-[13px]">
                        <SelectValue placeholder="Корневая категория" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Корневая категория</SelectItem>
                        {parentOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cover photo */}
                <div className="space-y-2">
                  <Label className="text-[12px]">Обложка категории</Label>
                  <div className="flex items-center gap-4">
                    {category?.photo ? (
                      <div className="relative group">
                        <img src={category.photo} className="w-20 h-20 rounded-xl object-cover border border-border" />
                        <button className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-[11px]">Заменить</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors bg-muted">
                        <Plus size={20} className="text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground mt-0.5">Загрузить</span>
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      JPG, JPEG, PNG до 10 МБ<br />
                      Рекомендуемый размер: 600×600px<br />
                      Соотношение сторон: 1:1
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── AVAILABILITY TAB ──────────────────────────────── */}
          {tab === "availability" && (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-6">
                {/* Schedule section */}
                <div className="border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={15} className="text-muted-foreground" />
                    <h3 className="text-[14px] font-semibold text-foreground">Дни и время показа</h3>
                  </div>

                  {/* Schedule type — shadcn Tabs (пилюльный контрол) */}
                  <Tabs value={scheduleType} onValueChange={setScheduleType} className="mb-4">
                    <TabsList>
                      <TabsTrigger value="daily" className="text-[12px]">Ежедневно</TabsTrigger>
                      <TabsTrigger value="weekdays" className="text-[12px]">По дням недели</TabsTrigger>
                      <TabsTrigger value="dates" className="text-[12px]">По датам</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Weekday picker — shadcn ToggleGroup outline */}
                  {scheduleType === "weekdays" && (
                    <ToggleGroup
                      type="multiple"
                      value={activeDays}
                      onValueChange={setActiveDays}
                      variant="outline"
                      className="justify-start gap-1 mb-4"
                    >
                      {WEEKDAYS.map((day, idx) => (
                        <ToggleGroupItem
                          key={idx}
                          value={String(idx)}
                          className="h-9 w-10 text-[12px] font-medium data-[state=on]:bg-orange-50 data-[state=on]:text-orange-700 data-[state=on]:border-orange-300"
                        >
                          {day}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  )}

                  {/* Time — shadcn RadioGroup */}
                  <RadioGroup
                    value={allDay ? "allday" : "period"}
                    onValueChange={(v) => setAllDay(v === "allday")}
                    className="flex items-center gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="allday" id="sched-allday" />
                      <Label htmlFor="sched-allday" className="text-[13px] font-normal cursor-pointer">Весь день</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="period" id="sched-period" />
                      <Label htmlFor="sched-period" className="text-[13px] font-normal cursor-pointer">Задать период</Label>
                    </div>
                    {!allDay && (
                      <div className="flex items-center gap-2 ml-2">
                        <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="w-24 text-[12px] h-8" />
                        <span className="text-muted-foreground text-[12px]">—</span>
                        <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="w-24 text-[12px] h-8" />
                      </div>
                    )}
                  </RadioGroup>
                </div>

                <AvailabilitySection availability={availability} onChange={setAvailability} />
              </div>
            </div>
          )}

          {/* Unsaved indicator */}
          {isDirty && (
            <div className="px-6 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[12px] text-amber-700">Есть несохранённые изменения</span>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
    </>
  );
}
