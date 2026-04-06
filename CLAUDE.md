# RESTOMENU-AI — Admin Panel

я дизайнер, отвечай на русском.

## Запуск
```bash
pnpm install
pnpm dev    # http://localhost:5173
pnpm build
```

## Структура файлов

```
src/app/
  pages/          # страницы: Categories, Positions, OptionsGroups, StopList, GoList, Gifts, Ingredients
  components/
    PositionEditPanel.tsx   # full-page редактор (НЕ модалка, заменяет контент страницы)
    CategoryEditPanel.tsx   # слайд-панель 500px справа
    AvailabilitySection.tsx # расписание + города + каналы
    VariantsTab.tsx         # варианты товара (PropertySet-комбинации)
    PricesTab.tsx           # гео-ценообразование Город→Точка
    shared/
      Toggle.tsx        # пропы: checked, onChange, size (xs|sm|md)
      ConfirmDialog.tsx
      Toast.tsx         # toast("текст", "success"|"error"|"warning")
  data/mockData.ts    # все TypeScript-типы и моковые данные
styles/
  theme.css           # CSS-переменные и тема
  fonts.css           # шрифты (только здесь)
```

## Соглашения по коду
- Шрифты: `text-[12px]`, `text-[13px]` (не именованные Tailwind-классы)
- Скругления: `rounded-lg` (8px) / `rounded-xl` (12px) / `rounded-2xl` (16px)
- Цвета: `orange-*` — акцент, `green-600` — сохранение/вкл, `red-*` — удаление, `amber-*` — предупреждения
- Экспорт страниц: `export function PositionsPage()`
- Новые `.tsx` — только в `src/app/`
- Иконки — только `lucide-react`
- Уведомления: `import { toast } from "./shared/Toast"` → `toast("текст", "success")`
- React Router: пакет `react-router` (не `react-router-dom`)

## Obsidian Knowledge Vault
Хранилище знаний: `/Users/anton/Yandex.Disk.localized/Cursor/Obsidian/restomenu`

### При старте сессии
Прочитай `00-home/index.md` и `текущие приоритеты.md`.
Если задача касается модуля — прочитай заметку из `knowledge/`.

### При завершении (пользователь: "сохрани сессию")
1. Создай заметку в `sessions/` с датой
2. Обнови `текущие приоритеты.md`
3. Если решение — создай в `knowledge/decisions/`
4. Если баг — создай в `knowledge/debugging/`
