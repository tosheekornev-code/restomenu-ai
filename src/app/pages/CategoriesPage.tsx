import { useState, useMemo } from "react";
import {
  Plus, Search, Filter, Settings, ChevronDown, ChevronRight,
  Pencil, Trash2, GripVertical, Info, Clock, EyeOff,
} from "lucide-react";
import { categories as initialCategories, cities, Category, CHANNELS } from "../data/mockData";
import { CategoryEditPanel } from "../components/CategoryEditPanel";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { toast } from "../components/shared/Toast";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "../components/ui/tooltip";
import imgImage from "../../assets/a06546bfac7cc3617192c4e1fdddadb1edad4c60.png";
import imgImage1 from "../../assets/95375c1163166df906e46345aed4ed3df9dfae65.png";
import imgImage2 from "../../assets/1a4bd6c8a236dc61600f6d931401ac16343ca6d8.png";
import imgImage3 from "../../assets/b6909ca846f1fd2dc79130f71b7fdbfc68a01f77.png";
import imgImage4 from "../../assets/d69b32c9d541d433c7e74519445bfe5ff373d232.png";

const photoMap: Record<string, string> = {
  "figma:asset/a06546bfac7cc3617192c4e1fdddadb1edad4c60.png": imgImage,
  "figma:asset/95375c1163166df906e46345aed4ed3df9dfae65.png": imgImage1,
  "figma:asset/1a4bd6c8a236dc61600f6d931401ac16343ca6d8.png": imgImage2,
  "figma:asset/b6909ca846f1fd2dc79130f71b7fdbfc68a01f77.png": imgImage3,
  "figma:asset/d69b32c9d541d433c7e74519445bfe5ff373d232.png": imgImage4,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAvailabilitySummary(cat: Category) {
  if (cat.availability.everywhere) return { locLabel: "Везде", cityCount: null };
  const cityCount = cat.availability.cities.length;
  const locCount = cat.availability.cities.flatMap((ca) =>
    ca.locations.filter((la) => la.enabled)
  ).length;
  if (locCount === 0) return { locLabel: null, cityCount: null };
  const cityNames = cat.availability.cities
    .map((ca) => cities.find((c) => c.id === ca.cityId)?.name)
    .filter(Boolean);
  const locLabel =
    cityCount === 1 && cityNames[0]
      ? cityNames[0] as string
      : `${cityCount} ${cityCount === 1 ? "город" : cityCount < 5 ? "города" : "городов"}`;
  return { locLabel, cityCount, locCount };
}

function ScheduleBadge({ schedule }: { schedule: Category["availability"]["schedule"] }) {
  if (schedule.allDay && schedule.type === "daily") return null;
  let label = "";
  if (schedule.type === "weekdays") label = "По дням";
  else if (schedule.type === "dates") label = "По датам";
  else if (!schedule.allDay && schedule.periods?.length) {
    label = `${schedule.periods[0].from}–${schedule.periods[0].to}`;
  }
  return (
    <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border-blue-100 rounded-full font-normal">
      <Clock size={9} />
      {label}
    </Badge>
  );
}

function ChannelChips({ cat }: { cat: Category }) {
  const activeLocs = cat.availability.everywhere
    ? null
    : cat.availability.cities.flatMap((ca) => ca.locations.filter((la) => la.enabled));

  const activeSet = new Set(
    cat.availability.everywhere
      ? CHANNELS.map((c) => c.key)
      : (activeLocs ?? []).flatMap((la) =>
          Object.entries(la.channels)
            .filter(([, v]) => v)
            .map(([k]) => k)
        )
  );

  const activeChannels = CHANNELS.filter((c) => activeSet.has(c.key));

  if (activeChannels.length === CHANNELS.length) {
    return <span className="text-[11px] text-muted-foreground italic">Все каналы</span>;
  }
  if (activeChannels.length === 0) {
    return <span className="text-[11px] text-destructive italic">Нет каналов</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {activeChannels.map((c) => (
        <Badge key={c.key} variant="outline" className={`text-[9px] px-1.5 py-0.5 rounded-full font-normal ${c.color}`}>
          {c.shortLabel}
        </Badge>
      ))}
    </div>
  );
}

// ─── Row Component ────────────────────────────────────────────────────────────
function CategoryRow({
  cat,
  isChild,
  isExpanded,
  hasChildren,
  onToggleExpand,
  onToggleEnabled,
  onEdit,
  onDelete,
  selected,
  onSelect,
}: {
  cat: Category;
  isChild?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  onToggleExpand?: () => void;
  onToggleEnabled: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  selected: boolean;
  onSelect: (v: boolean) => void;
}) {
  const { locLabel, locCount } = getAvailabilitySummary(cat);
  const rowOpacity = cat.enabled ? "" : "opacity-50";

  return (
    <TableRow className={`group ${rowOpacity}`}>
      {/* Checkbox + drag */}
      <TableCell className="w-8 pl-2">
        <div className="flex items-center gap-1">
          <GripVertical size={14} className="text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelect(v === true)}
            className="accent-orange-500"
          />
        </div>
      </TableCell>

      {/* Photo */}
      <TableCell className={isChild ? "pl-8" : ""}>
        {cat.photo ? (
          <img
            src={photoMap[cat.photo] ?? cat.photo}
            className={`rounded-lg object-cover ${isChild ? "w-9 h-9 border border-border" : "w-10 h-10"}`}
          />
        ) : (
          <div className={`rounded-lg ${isChild ? "w-9 h-9 bg-muted border border-border" : "w-10 h-10 bg-muted"}`} />
        )}
      </TableCell>

      {/* Name */}
      <TableCell>
        <div className="flex items-center gap-2">
          {isChild && <span className="text-muted-foreground/40 text-[11px] shrink-0">└</span>}
          <div>
            <div className={`flex items-center gap-2 ${isChild ? "text-[13px] text-muted-foreground" : "text-[13px] font-semibold text-foreground"}`}>
              <span>{cat.name}</span>
              {!cat.enabled && (
                <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-normal">
                  <EyeOff size={9} />
                  Скрыта
                </Badge>
              )}
              <ScheduleBadge schedule={cat.availability.schedule} />
            </div>
            {hasChildren && !isChild && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 mt-0.5 text-[11px] text-orange-500 hover:text-orange-700 transition-colors"
              >
                {isExpanded ? (
                  <><ChevronDown size={11} /> Свернуть подкатегории</>
                ) : (
                  <><ChevronRight size={11} /> Показать подкатегории</>
                )}
              </button>
            )}
          </div>
        </div>
      </TableCell>

      {/* Positions */}
      <TableCell className="w-24">
        <Button variant="link" className="text-[13px] h-auto p-0">
          {cat.positionsCount} поз.
        </Button>
      </TableCell>

      {/* Availability */}
      <TableCell className="w-36">
        {locLabel ? (
          <div>
            <div className="text-[12px] text-foreground">{locLabel}</div>
            {locCount !== undefined && !cat.availability.everywhere && (
              <div className="text-[11px] text-muted-foreground">{locCount} точек</div>
            )}
          </div>
        ) : (
          <span className="text-[12px] text-destructive">—</span>
        )}
      </TableCell>

      {/* Channels */}
      <TableCell className="w-52">
        <ChannelChips cat={cat} />
      </TableCell>

      {/* Actions */}
      <TableCell className="w-28 pr-2">
        <div className="flex items-center gap-1.5 justify-end">
          <Switch checked={cat.enabled} onCheckedChange={onToggleEnabled} size="sm" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
                <Pencil size={14} className="text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Редактировать</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 hover:bg-destructive/10" onClick={onDelete}>
                <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Удалить</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function CategoriesPage() {
  const [cats, setCats] = useState(initialCategories);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isNewCat, setIsNewCat] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["cat-1"]));
  const [showInfo, setShowInfo] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const parentCats = useMemo(() =>
    cats.filter((c) => !c.parentId && (
      !search || c.name.toLowerCase().includes(search.toLowerCase())
    )),
    [cats, search]
  );

  const childrenOf = (id: string) =>
    cats.filter((c) => c.parentId === id && (
      !search || c.name.toLowerCase().includes(search.toLowerCase())
    ));

  const allIds = cats.map((c) => c.id);
  const allSelected = allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = (v: boolean) => {
    setSelectedIds(v ? new Set(allIds) : new Set());
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleEnabled = (id: string, v: boolean) => {
    setCats((prev) => prev.map((c) => c.id === id ? { ...c, enabled: v } : c));
    const cat = cats.find((c) => c.id === id);
    toast(`Категория «${cat?.name}» ${v ? "включена" : "выключена"}`, v ? "success" : "warning");
  };

  const handleDelete = (cat: Category) => {
    setDeleteTarget(cat);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setCats((prev) => prev.filter((c) => c.id !== deleteTarget.id && c.parentId !== deleteTarget.id));
    toast(`Категория «${deleteTarget.name}» удалена`, "warning");
    setDeleteTarget(null);
  };

  const handleBulkEnable = (v: boolean) => {
    setCats((prev) => prev.map((c) => selectedIds.has(c.id) ? { ...c, enabled: v } : c));
    toast(`${selectedIds.size} категорий ${v ? "включено" : "выключено"}`, "success");
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    setCats((prev) => prev.filter((c) => !selectedIds.has(c.id) && !selectedIds.has(c.parentId ?? "")));
    toast(`${selectedIds.size} категорий удалено`, "warning");
    setSelectedIds(new Set());
  };

  const enabledCount = cats.filter((c) => c.enabled).length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background">
        <Button variant="outline" className="gap-2 text-[13px] font-medium">
          <div className="w-5 h-5 bg-red-600 rounded-sm flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">R</span>
          </div>
          Рыба и Мясо
          <ChevronDown size={14} className="text-muted-foreground" />
        </Button>

        {/* City filter */}
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[160px] text-[13px]">
            <SelectValue placeholder="Все города" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все города</SelectItem>
            {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Bulk actions */}
        {someSelected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 text-[13px] font-medium bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-700">
                {selectedIds.size} выбрано
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => handleBulkEnable(true)}>
                Включить все
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkEnable(false)}>
                Выключить все
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleBulkDelete}>
                Удалить выбранные
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex-1" />

        {/* Stats */}
        <span className="text-[12px] text-muted-foreground">
          {enabledCount} из {cats.length} активных
        </span>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по категориям"
            className="pl-8 pr-4 text-[13px] w-52"
          />
        </div>

        <Button variant="outline" className="gap-2 text-[13px]">
          <Filter size={14} />
          Фильтр
        </Button>
        <Button variant="outline" size="icon">
          <Settings size={16} />
        </Button>
        <Button
          onClick={() => { setIsNewCat(true); setEditingCat(null); }}
          className="gap-2 text-[13px] font-medium bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus size={16} />
          Создать
        </Button>
      </div>

      {/* Info callout */}
      {showInfo && (
        <div className="mx-5 mt-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Info size={15} className="text-blue-600" />
            <AlertTitle className="text-[12px] text-blue-900 font-semibold">Доступность категорий</AlertTitle>
            <AlertDescription className="text-[12px] text-blue-900 [&_p]:inline">
              <span>Настройте города, точки и каналы заказа для каждой категории. Позиции наследуют эти настройки, но можно переопределить индивидуально. Расписание (</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-600 border-blue-200 rounded-full font-normal inline-flex align-middle mx-0.5">
                <Clock size={9} /> По дням
              </Badge>
              <span>) ограничивает время видимости категории в меню.</span>
              <Button variant="link" onClick={() => setShowInfo(false)} className="text-blue-400 hover:text-blue-600 text-[11px] h-auto p-0 ml-2">
                Закрыть
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <Table>
          <TableHeader>
            <TableRow className="text-[11px] text-muted-foreground uppercase tracking-wide">
              <TableHead className="w-8 pl-2">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                />
              </TableHead>
              <TableHead className="w-12">Фото</TableHead>
              <TableHead>Название</TableHead>
              <TableHead className="w-24">Позиции</TableHead>
              <TableHead className="w-36">Точки</TableHead>
              <TableHead className="w-52">Каналы заказа</TableHead>
              <TableHead className="w-28 text-right pr-2">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parentCats.flatMap((cat) => {
              const children = childrenOf(cat.id);
              const isExpanded = expandedIds.has(cat.id);

              return [
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  hasChildren={children.length > 0}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleExpanded(cat.id)}
                  onToggleEnabled={(v) => handleToggleEnabled(cat.id, v)}
                  onEdit={() => { setEditingCat(cat); setIsNewCat(false); }}
                  onDelete={() => handleDelete(cat)}
                  selected={selectedIds.has(cat.id)}
                  onSelect={(v) => setSelectedIds((prev) => {
                    const next = new Set(prev);
                    v ? next.add(cat.id) : next.delete(cat.id);
                    return next;
                  })}
                />,
                ...(isExpanded
                  ? children.map((child) => (
                      <CategoryRow
                        key={child.id}
                        cat={child}
                        isChild
                        onToggleEnabled={(v) => handleToggleEnabled(child.id, v)}
                        onEdit={() => { setEditingCat(child); setIsNewCat(false); }}
                        onDelete={() => handleDelete(child)}
                        selected={selectedIds.has(child.id)}
                        onSelect={(v) => setSelectedIds((prev) => {
                          const next = new Set(prev);
                          v ? next.add(child.id) : next.delete(child.id);
                          return next;
                        })}
                      />
                    ))
                  : []),
              ];
            })}
          </TableBody>
        </Table>

        {parentCats.length === 0 && (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <Search size={32} className="text-muted-foreground/30 mb-3" />
            <div className="text-[14px] font-medium">Категории не найдены</div>
            <div className="text-[12px] mt-1">Попробуйте изменить поисковый запрос</div>
          </div>
        )}
      </div>

      {/* Edit panel */}
      {(editingCat || isNewCat) && (
        <CategoryEditPanel
          category={editingCat}
          isNew={isNewCat}
          onClose={() => { setEditingCat(null); setIsNewCat(false); }}
          onSave={(cat) => {
            setCats((prev) =>
              prev.some((c) => c.id === cat.id)
                ? prev.map((c) => (c.id === cat.id ? cat : c))
                : [...prev, cat]
            );
            setEditingCat(null);
            setIsNewCat(false);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Удалить «${deleteTarget.name}»?`}
          description={
            childrenOf(deleteTarget.id).length > 0
              ? `Также будут удалены ${childrenOf(deleteTarget.id).length} подкатегорий. Позиции останутся.`
              : "Позиции в этой категории останутся."
          }
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
