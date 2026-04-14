import { Outlet, NavLink, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart2,
  BookOpen,
  LayoutGrid,
  Package,
  Users,
  Settings,
  CreditCard,
  Bell,
  HelpCircle,
  AlertTriangle,
  Star,
} from "lucide-react";
import imgAvatar from "../../assets/08a3b47613f2d0f6aced2c3c467602e3aa1638f1.png";
import { stopList, OptionGroup, OptionBlock } from "../data/mockData";
import { Toaster } from "./shared/Toast";

const activeStopCount = stopList.filter((e) => e.active).length;

function hasBlockConflict(block: OptionBlock): boolean {
  const bMax = block.max, bMin = block.min;
  if (bMax > 0 && bMin > bMax) return true;
  let sumMins = 0, sumMaxes = 0, allBounded = true;
  for (const optId of block.optionIds) {
    const s = block.optionSettings?.[optId];
    const oMin = s?.min ?? 0, oMax = s?.max ?? null;
    if (oMax !== null && oMin > oMax) return true;
    if (bMax > 0 && oMin > bMax) return true;
    if (bMax > 0 && oMax !== null && oMax > bMax) return true;
    sumMins += oMin;
    if (oMax !== null) sumMaxes += oMax; else allBounded = false;
  }
  if (bMax > 0 && sumMins > bMax) return true;
  if (bMin > 0 && allBounded && sumMaxes < bMin) return true;
  return false;
}

function useOptionConflictCount(): number {
  const [count, setCount] = useState(0);
  const check = useCallback(() => {
    try {
      const raw = localStorage.getItem("restomenu_option_groups_v2");
      if (!raw) { setCount(0); return; }
      const groups: OptionGroup[] = JSON.parse(raw);
      setCount(groups.filter((g) => g.blocks.some(hasBlockConflict)).length);
    } catch { setCount(0); }
  }, []);
  useEffect(() => {
    check();
    const onStorage = (e: StorageEvent) => { if (e.key === "restomenu_option_groups_v2") check(); };
    window.addEventListener("storage", onStorage);
    const interval = setInterval(check, 2000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(interval); };
  }, [check]);
  return count;
}

function SidebarIcon({
  icon,
  label,
  path,
  badge,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  path?: string;
  badge?: number;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-[3px] cursor-pointer relative ${active ? "" : "opacity-60 hover:opacity-80"}`}
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {icon}
        {badge !== undefined && (
          <div className="absolute -top-1 -right-1 bg-green-600 text-white text-[8px] font-semibold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
            {badge}
          </div>
        )}
      </div>
      <span className="text-[9px] font-medium text-[#a4a7ae] whitespace-nowrap">{label}</span>
    </div>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const optionConflictCount = useOptionConflictCount();

  const editorNavItems = [
    { label: "Категории", path: "/categories", icon: null, badge: null },
    { label: "Позиции", path: "/positions", icon: null, badge: null },
    { label: "Доп. опции", path: "/options", icon: null, badge: null, warning: optionConflictCount > 0 },
    { label: "Подарки", path: "/gifts", icon: null, badge: null },
    { label: "Фильтр по ингредиентам", path: "/ingredients", icon: null, badge: null },
    { label: "Стоп-лист", path: "/stoplist", icon: <AlertTriangle size={12} className="text-red-500" />, badge: activeStopCount > 0 ? activeStopCount : null },
    { label: "Гоу-лист", path: "/golist", icon: <Star size={12} className="text-amber-500" />, badge: null },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left sidebar - narrow icon bar */}
      <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-6 shrink-0">
        {/* Logo */}
        <div className="relative">
          <span className="absolute -top-2 left-7 text-[8px] text-gray-400 opacity-60">βeta</span>
          <div className="w-8 h-8 flex items-center justify-center">
            <svg width="28" height="30" viewBox="0 0 32 34.2148" fill="none">
              <path
                d="M26.8 0H5.2C2.3 0 0 2.3 0 5.2v23.8c0 2.9 2.3 5.2 5.2 5.2h21.6c2.9 0 5.2-2.3 5.2-5.2V5.2C32 2.3 29.7 0 26.8 0zM16 26c-5.5 0-10-4.5-10-10S10.5 6 16 6s10 4.5 10 10-4.5 10-10 10z"
                fill="#E7711D"
              />
            </svg>
          </div>
        </div>

        <div className="flex flex-col gap-5 items-center flex-1">
          <SidebarIcon icon={<BarChart2 size={20} className="text-[#414651]" />} label="Маркетинг" />
          <SidebarIcon icon={<BookOpen size={20} className="text-[#414651]" />} label="Меню" />
          <SidebarIcon icon={<LayoutGrid size={20} className="text-[#545a5a]" />} label="Заказы" badge={2} active />
          <SidebarIcon icon={<Package size={20} className="text-[#E7711D]" />} label="Редактор" active />
          <SidebarIcon icon={<Users size={20} className="text-[#414651]" />} label="Персонал" />
          <SidebarIcon icon={<Settings size={20} className="text-[#414651]" />} label="Настройки" />
          <SidebarIcon icon={<CreditCard size={20} className="text-[#414651]" />} label="Оплата" />
        </div>

        <div className="flex flex-col gap-3 items-center">
          <Bell size={18} className="text-gray-400 cursor-pointer hover:text-gray-600" />
          <HelpCircle size={18} className="text-gray-400 cursor-pointer hover:text-gray-600" />
          <img src={imgAvatar} className="w-8 h-8 rounded-full cursor-pointer" />
        </div>
      </div>

      {/* Secondary sidebar - editor menu */}
      <div className="w-40 bg-white border-r border-gray-200 flex flex-col py-4 shrink-0">
        <div className="px-3 mb-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Редактор</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-1">
          {editorNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] cursor-pointer transition-colors ${
                  isActive
                    ? "bg-orange-50 text-orange-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`
              }
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span className="flex-1 truncate">{item.label}</span>
              {"warning" in item && item.warning && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
              {item.badge !== null && item.badge !== undefined && (
                <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Stop list alert */}
        {activeStopCount > 0 && (
          <div className="mx-2 mt-auto mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-medium">
              <AlertTriangle size={10} />
              {activeStopCount} в стоп-листе
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}