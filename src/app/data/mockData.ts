export interface ChannelAvailability {
  dineIn: boolean;         // За стол (официант + э-меню)
  preorder: boolean;       // Предзаказ при брони
  delivery: boolean;       // Доставка
  pickup: boolean;         // Самовывоз
}

// Channel config — exported for use in UI
export const CHANNELS: {
  key: keyof ChannelAvailability;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}[] = [
  {
    key: "dineIn",
    label: "За стол",
    shortLabel: "За стол",
    color: "bg-blue-100 text-blue-700",
    description: "Заказ в зале — через официанта или э-меню",
  },
  {
    key: "preorder",
    label: "Предзаказ",
    shortLabel: "Предзаказ",
    color: "bg-amber-100 text-amber-700",
    description: "Клиент делает предзаказ заранее при онлайн-бронировании столика",
  },
  {
    key: "delivery",
    label: "Доставка",
    shortLabel: "Доставка",
    color: "bg-green-100 text-green-700",
    description: "Заказ оформляется через сайт/приложение с доставкой на адрес",
  },
  {
    key: "pickup",
    label: "Самовывоз",
    shortLabel: "Самовывоз",
    color: "bg-purple-100 text-purple-700",
    description: "Заказ оформляется через сайт/приложение, клиент забирает сам",
  },
];

export interface LocationAvailability {
  locationId: string;
  enabled: boolean;
  channels: ChannelAvailability;
}

export interface CityAvailability {
  cityId: string;
  expanded?: boolean;
  locations: LocationAvailability[];
}

export interface TimeSchedule {
  type: "daily" | "weekdays" | "dates";
  allDay: boolean;
  periods?: { from: string; to: string }[];
  weekdays?: number[]; // 0=Mon..6=Sun, used when type==="weekdays"
  dateRange?: { from: string; to: string }; // ISO date strings, used when type==="dates"
}

export interface Availability {
  everywhere: boolean;
  cities: CityAvailability[];
  schedule: TimeSchedule;
  inheritedFrom?: string; // category name if inherited
}

export interface Location {
  id: string;
  name: string;
  address: string;
}

export interface City {
  id: string;
  name: string;
  locations: Location[];
}

export interface Category {
  id: string;
  name: string;
  photo?: string;
  positionsCount: number;
  parentId?: string;
  urlCode: string;
  enabled: boolean;
  availability: Availability;
}

export interface OptionGroup {
  id: string;
  name: string;
  blocks: OptionBlock[];
  enabled: boolean;
}

export interface OptionBlock {
  id: string;
  name: string;
  displayType: "large-tiles" | "small-tiles" | "list";
  min: number;
  max: number;
  optionIds: string[];
}

export interface Option {
  id: string;
  name: string;
  techName?: string;
  price: number;
  weight?: number;
  weightUnit?: string;
  min: number;
  max: number | null;
  enabled: boolean;
  photo?: string;
  channels?: ChannelAvailability;
  availability?: Availability;
  priceOverrides?: PriceOverride[];
  channelPrices?: Record<string, number>;
}

export interface Position {
  id: string;
  name: string;
  categoryIds: string[];
  photo?: string;
  optionGroupIds: string[];
  sku?: string;
  price: number;
  priceType: "fixed" | "from" | "variants";
  enabled: boolean;
  availability: Availability & { inheritFromCategory: boolean };
  // Variants
  variantPropertySetIds?: string[];
  variants?: PositionVariant[];
  // Geo-pricing
  priceOverrides?: PriceOverride[];
}

// ─── PROPERTY SETS & VARIANTS ─────────────────────────────────────────────────
export interface PropertyValue {
  id: string;
  name: string;
  color?: string;        // For swatch display type
  description?: string;
}

export interface PropertySet {
  id: string;
  name: string;
  displayType: "chips" | "dropdown" | "swatch";
  values: PropertyValue[];
}

export interface PositionVariant {
  id: string;
  variantName?: string;    // custom display name for this variant
  positionName?: string;   // name of attached position (if variant was created from another product)
  properties: Record<string, string>; // { [propertySetId]: valueId }
  price: number;
  sku?: string;
  weight?: string;
  weightUnit?: "г" | "мл" | "кг" | "л" | "шт" | "порц";
  photo?: string;
  photos?: string[];       // additional photos for gallery
  enabled: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  channels?: {
    dineIn?: boolean;
    preorder?: boolean;
    delivery?: boolean;
    pickup?: boolean;
  };
  discount?: { type: "pct" | "rub"; value: number };
  availability?: Availability;
}

// ─── PRICING SURCHARGES ───────────────────────────────────────────────────────
export interface PricingSurcharge {
  target: string;           // propertyValueId (e.g. "psv-s2") or channelKey (e.g. "delivery")
  type: "rub" | "pct";
  value: number;
}

// ─── PRICE OVERRIDES (geo-pricing) ────────────────────────────────────────────
/**
 * Pricing hierarchy:
 *   base price
 *     → city override (applies to all locations in a city)
 *       → location override (applies to a specific location)
 *
 * For each level, only the explicitly set values override the parent.
 * Unset values inherit from the level above.
 */
export interface MarkupRule {
  type: "pct" | "rub";
  value: number;
}

export interface PriceOverride {
  id: string;
  cityId: string;
  locationId?: string;   // if absent → city-level override

  // --- Static mode (individual prices) ---
  price?: number;
  variantPrices?: Record<string, number>;
  channelPrices?: Record<string, number>;
  channelVariantPrices?: Record<string, Record<string, number>>;

  // --- Dynamic mode (blanket markup applied to parent prices) ---
  // When markup is set, static fields above are ignored;
  // effective price = applyMarkup(parentPrice, markup)
  markup?: MarkupRule;
  // Per-channel markups (optional, override blanket markup for specific channels)
  channelMarkups?: Record<string, MarkupRule>;
  // Personal markups: per-variant rule that overrides blanket markup for ONE variant
  variantMarkups?: Record<string, MarkupRule>;
  // Personal markups by channel: per-variant rule for a specific channel
  channelVariantMarkups?: Record<string, Record<string, MarkupRule>>;
  //                              ^channel    ^variantId    ^rule
}

// ─── STOP LIST ────────────────────────────────────────────────────────────────
export type StopListItemType = "position" | "category" | "option";
export type StopListDuration = "eod" | "manual" | "custom";

export interface StopListEntry {
  id: string;
  type: StopListItemType;
  itemId: string;
  itemName: string;
  categoryHint?: string; // for positions: category name
  locationId: string;
  reason: string;
  stoppedBy: string;
  stoppedAt: string; // ISO string
  until?: string;    // ISO string, undefined = manual restore
  durationType: StopListDuration;
  channels: (keyof ChannelAvailability)[] | "all";
  active: boolean;
}

// ─── GO LIST ──────────────────────────────────────────────────────────────────
export type GoListBadge = "hit" | "new" | "special" | "recommendation" | "promo";

export interface GoListEntry {
  id: string;
  itemId: string;
  itemName: string;
  itemType: "position" | "category";
  categoryHint?: string;
  badge: GoListBadge;
  locationIds: string[] | "all";
  channels: (keyof ChannelAvailability)[] | "all";
  priority: number; // 1 = highest
  addedBy: string;
  addedAt: string;
  until?: string;
  active: boolean;
}

// ─── GIFTS ────────────────────────────────────────────────────────────────────
export type GiftTrigger = "order_amount" | "item_count" | "specific_item" | "promo_code";

export interface Gift {
  id: string;
  name: string;
  description?: string;
  trigger: GiftTrigger;
  triggerValue: number | string;
  giftPositionId?: string;
  giftPositionName?: string;
  channels: (keyof ChannelAvailability)[] | "all";
  locationIds: string[] | "all";
  active: boolean;
  usageCount: number;
  createdAt: string;
}

// ─── CITIES & LOCATIONS ────────────────────────────────────────────────────────
export const cities: City[] = [
  {
    id: "moscow",
    name: "Москва",
    locations: [
      { id: "loc-1", name: "ТЦ «Мегамолл»", address: "Московский, 4" },
      { id: "loc-2", name: "пр. Сюбюмбике", address: "48" },
      { id: "loc-3", name: "пр. Мира", address: "25" },
    ],
  },
  {
    id: "kazan",
    name: "Казань",
    locations: [
      { id: "loc-4", name: "Красотища", address: "ул. Баумана, 12" },
      { id: "loc-5", name: "Красотища 2", address: "ул. Кремлёвская, 5" },
    ],
  },
  {
    id: "spb",
    name: "Санкт-Петербург",
    locations: [
      { id: "loc-6", name: "Nevsky Plaza", address: "Невский пр., 88" },
    ],
  },
];

const defaultChannels: ChannelAvailability = {
  dineIn: true,
  preorder: true,
  delivery: true,
  pickup: true,
};

const deliveryOnlyChannels: ChannelAvailability = {
  dineIn: false,
  preorder: false,
  delivery: true,
  pickup: true,
};

const inHallOnlyChannels: ChannelAvailability = {
  dineIn: true,
  preorder: false,
  delivery: false,
  pickup: false,
};

// ─── CATEGORIES ────────────────────────────────────────────────────────────────
export const categories: Category[] = [
  {
    id: "cat-1",
    name: "Сезонное меню",
    photo: "figma:asset/a06546bfac7cc3617192c4e1fdddadb1edad4c60.png",
    positionsCount: 5,
    urlCode: "/season",
    enabled: true,
    availability: {
      everywhere: true,
      schedule: { type: "daily", allDay: true },
      cities: cities.map((city) => ({
        cityId: city.id,
        expanded: city.id === "moscow",
        locations: city.locations.map((loc) => ({
          locationId: loc.id,
          enabled: true,
          channels: defaultChannels,
        })),
      })),
    },
  },
  {
    id: "cat-2",
    name: "Супы",
    photo: "figma:asset/95375c1163166df906e46345aed4ed3df9dfae65.png",
    positionsCount: 3,
    urlCode: "/season/soups",
    parentId: "cat-1",
    enabled: true,
    availability: {
      everywhere: false,
      schedule: { type: "weekdays", allDay: false, periods: [{ from: "11:00", to: "16:00" }] },
      cities: [
        {
          cityId: "moscow",
          expanded: true,
          locations: [
            { locationId: "loc-1", enabled: true, channels: defaultChannels },
            { locationId: "loc-2", enabled: true, channels: { ...defaultChannels, delivery: false } },
            { locationId: "loc-3", enabled: false, channels: defaultChannels },
          ],
        },
      ],
    },
  },
  {
    id: "cat-3",
    name: "Зкуски",
    photo: "figma:asset/1a4bd6c8a236dc61600f6d931401ac16343ca6d8.png",
    positionsCount: 11,
    urlCode: "/season/snacks",
    parentId: "cat-1",
    enabled: true,
    availability: {
      everywhere: false,
      schedule: { type: "daily", allDay: true },
      cities: [
        {
          cityId: "moscow",
          locations: cities[0].locations.map((loc) => ({
            locationId: loc.id,
            enabled: true,
            channels: defaultChannels,
          })),
        },
      ],
    },
  },
  {
    id: "cat-4",
    name: "Детское меню",
    photo: "figma:asset/b6909ca846f1fd2dc79130f71b7fdbfc68a01f77.png",
    positionsCount: 6,
    urlCode: "/season/kids-menu",
    parentId: "cat-1",
    enabled: true,
    availability: {
      everywhere: false,
      schedule: { type: "daily", allDay: true },
      cities: [
        {
          cityId: "moscow",
          locations: [
            { locationId: "loc-1", enabled: true, channels: inHallOnlyChannels },
            { locationId: "loc-2", enabled: true, channels: inHallOnlyChannels },
            { locationId: "loc-3", enabled: true, channels: inHallOnlyChannels },
          ],
        },
      ],
    },
  },
  {
    id: "cat-5",
    name: "Роллы",
    photo: "figma:asset/d69b32c9d541d433c7e74519445bfe5ff373d232.png",
    positionsCount: 12,
    urlCode: "/rolls",
    enabled: true,
    availability: {
      everywhere: true,
      schedule: { type: "daily", allDay: true },
      cities: cities.map((city) => ({
        cityId: city.id,
        locations: city.locations.map((loc) => ({
          locationId: loc.id,
          enabled: true,
          channels: defaultChannels,
        })),
      })),
    },
  },
  {
    id: "cat-6",
    name: "Пицца",
    positionsCount: 12,
    urlCode: "/pizza",
    enabled: true,
    availability: {
      everywhere: true,
      schedule: { type: "daily", allDay: true },
      cities: cities.map((city) => ({
        cityId: city.id,
        locations: city.locations.map((loc) => ({
          locationId: loc.id,
          enabled: true,
          channels: defaultChannels,
        })),
      })),
    },
  },
  {
    id: "cat-7",
    name: "Горячее",
    positionsCount: 8,
    urlCode: "/hot",
    enabled: false,
    availability: {
      everywhere: false,
      schedule: { type: "daily", allDay: true },
      cities: [
        {
          cityId: "moscow",
          locations: [
            { locationId: "loc-1", enabled: true, channels: deliveryOnlyChannels },
          ],
        },
      ],
    },
  },
];

// ─── OPTIONS (flat registry) ──────────────────────────────────────────────────
export const allOptionsRegistry: Option[] = [
  { id: "opt-1", name: "Грибы шампиньоны", price: 50, weight: 30, weightUnit: "гр", min: 0, max: 5, enabled: true },
  { id: "opt-2", name: "Корнишоны", price: 120, weight: 300, weightUnit: "кг", min: 1, max: 0, enabled: true },
  { id: "opt-3", name: "Маслины", price: 50, weight: 10, weightUnit: "мл", min: 0, max: 10, enabled: true },
  { id: "opt-4", name: "Бекон", price: 0, min: 0, max: 0, enabled: true },
  { id: "opt-5", name: "Томатный", price: 0, min: 0, max: 1, enabled: true },
  { id: "opt-6", name: "Сливочный", price: 0, min: 0, max: 1, enabled: true },
  { id: "opt-7", name: "Остры", price: 0, min: 0, max: 1, enabled: true },
  { id: "opt-8", name: "Соевый соус", price: 0, min: 0, max: 1, enabled: true },
  { id: "opt-9", name: "Унаги", price: 50, min: 0, max: 1, enabled: true },
  { id: "opt-10", name: "Спайси", price: 0, min: 0, max: 1, enabled: true },
  { id: "opt-11", name: "Приборы (комплект)", price: 0, min: 0, max: 5, enabled: true },
  { id: "opt-12", name: "Соус в контейнере", price: 30, min: 0, max: 3, enabled: true },
];

// ─── OPTION GROUPS (blocks reference options by ID) ───────────────────────────
export const optionGroups: OptionGroup[] = [
  {
    id: "og-1",
    name: "Для пиццы",
    enabled: true,
    blocks: [
      { id: "block-1", name: "Добавьте по вкусу", displayType: "large-tiles", min: 0, max: 10, optionIds: ["opt-1", "opt-2", "opt-3", "opt-4"] },
      { id: "block-2", name: "Выбор соуса", displayType: "small-tiles", min: 1, max: 1, optionIds: ["opt-5", "opt-6", "opt-7"] },
    ],
  },
  {
    id: "og-2",
    name: "Для роллов",
    enabled: true,
    blocks: [
      { id: "block-3", name: "Соус на выбор", displayType: "list", min: 0, max: 3, optionIds: ["opt-5", "opt-8", "opt-9", "opt-10"] },
    ],
  },
  {
    id: "og-3",
    name: "Упаковка и доставка",
    enabled: true,
    blocks: [
      { id: "block-4", name: "Добавьте к заказу", displayType: "list", min: 0, max: 5, optionIds: ["opt-11", "opt-12"] },
    ],
  },
];

// ─── POSITIONS ─────────────────────────────────────────────────────────────────
export const positions: Position[] = [
  {
    id: "pos-1",
    name: "Ролл дракон",
    categoryIds: ["cat-5"],
    optionGroupIds: ["og-2"],
    sku: "1as23-...45",
    price: 950,
    priceType: "fixed",
    enabled: true,
    availability: {
      inheritFromCategory: true,
      everywhere: false,
      schedule: { type: "daily", allDay: true },
      cities: [
        { cityId: "moscow", locations: [{ locationId: "loc-1", enabled: true, channels: defaultChannels }] },
        { cityId: "kazan", locations: [{ locationId: "loc-4", enabled: true, channels: defaultChannels }] },
      ],
    },
  },
  {
    id: "pos-2",
    name: "Запечёный с лососем",
    categoryIds: ["cat-5", "cat-1"],
    optionGroupIds: [],
    price: 450,
    priceType: "fixed",
    enabled: true,
    availability: {
      inheritFromCategory: true,
      everywhere: true,
      schedule: { type: "daily", allDay: true },
      cities: cities.map((city) => ({
        cityId: city.id,
        locations: city.locations.map((loc) => ({
          locationId: loc.id,
          enabled: true,
          channels: defaultChannels,
        })),
      })),
    },
  },
  {
    id: "pos-3",
    name: "Пицца с грибами",
    categoryIds: ["cat-6"],
    optionGroupIds: ["og-1"],
    sku: "123",
    price: 1350,
    priceType: "variants",
    enabled: true,
    availability: {
      inheritFromCategory: false,
      everywhere: false,
      schedule: { type: "daily", allDay: true },
      cities: [
        {
          cityId: "moscow",
          locations: [
            { locationId: "loc-1", enabled: true, channels: defaultChannels },
            { locationId: "loc-2", enabled: true, channels: { ...defaultChannels, preorder: false } },
          ],
        },
      ],
    },
  },
];

// ─── STOP LIST DATA ────────────────────────────────────────────────────────────
export const stopList: StopListEntry[] = [
  {
    id: "sl-1",
    type: "position",
    itemId: "pos-1",
    itemName: "Ролл дракон",
    categoryHint: "Роллы",
    locationId: "loc-2",
    reason: "Нет ингредиентов: лосось",
    stoppedBy: "Иванов А.",
    stoppedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    durationType: "eod",
    until: new Date(new Date().setHours(23, 59, 0, 0)).toISOString(),
    channels: "all",
    active: true,
  },
  {
    id: "sl-2",
    type: "position",
    itemId: "pos-3",
    itemName: "Пицца с грибами",
    categoryHint: "Пицца",
    locationId: "loc-1",
    reason: "Техническая пауза оборудования",
    stoppedBy: "Петрова М.",
    stoppedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    durationType: "manual",
    channels: ["delivery", "pickup"],
    active: true,
  },
  {
    id: "sl-3",
    type: "category",
    itemId: "cat-2",
    itemName: "Супы",
    locationId: "loc-3",
    reason: "Смена сезонного меню",
    stoppedBy: "Сидоров Д.",
    stoppedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    durationType: "custom",
    until: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    channels: "all",
    active: true,
  },
  {
    id: "sl-4",
    type: "position",
    itemId: "pos-2",
    itemName: "Запечёный с лососем",
    categoryHint: "Роллы / Сезонное меню",
    locationId: "loc-4",
    reason: "Нет рыбы (закончилась поставка)",
    stoppedBy: "Козлов В.",
    stoppedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    durationType: "manual",
    channels: "all",
    active: true,
  },
  {
    id: "sl-5",
    type: "position",
    itemId: "pos-1",
    itemName: "Ролл дракон",
    categoryHint: "Роллы",
    locationId: "loc-1",
    reason: "Временно снят с продажи",
    stoppedBy: "Иванов А.",
    stoppedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    durationType: "manual",
    channels: "all",
    active: false, // restored
  },
];

// ─── GO LIST DATA ──────────────────────────────────────────────────────────────
export const goList: GoListEntry[] = [
  {
    id: "gl-1",
    itemId: "pos-3",
    itemName: "Пицца с грибами",
    itemType: "position",
    categoryHint: "Пицца",
    badge: "hit",
    locationIds: "all",
    channels: "all",
    priority: 1,
    addedBy: "Маркетолог А.",
    addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
  {
    id: "gl-2",
    itemId: "pos-2",
    itemName: "Запечёный с лососем",
    itemType: "position",
    categoryHint: "Роллы",
    badge: "new",
    locationIds: ["loc-1", "loc-2"],
    channels: ["delivery", "pickup"],
    priority: 2,
    addedBy: "Менеджер Б.",
    addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
  {
    id: "gl-3",
    itemId: "cat-1",
    itemName: "Сезонное меню",
    itemType: "category",
    badge: "special",
    locationIds: "all",
    channels: "all",
    priority: 3,
    addedBy: "Директор В.",
    addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
  {
    id: "gl-4",
    itemId: "pos-1",
    itemName: "Ролл дракон",
    itemType: "position",
    categoryHint: "Роллы",
    badge: "recommendation",
    locationIds: ["loc-1"],
    channels: ["dineIn"],
    priority: 4,
    addedBy: "Шеф-повар Г.",
    addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    active: false,
  },
];

// ─── GIFTS DATA ────────────────────────────────────────────────────────────────
export const gifts: Gift[] = [
  {
    id: "gift-1",
    name: "Соусы в подарок от 1500 ₽",
    description: "При заказе от 1500 ₽ клиент получает 2 соуса на выбор бесплатно",
    trigger: "order_amount",
    triggerValue: 1500,
    giftPositionId: "pos-sauce",
    giftPositionName: "Соусы (набор 2шт)",
    channels: ["delivery", "pickup"],
    locationIds: "all",
    active: true,
    usageCount: 234,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "gift-2",
    name: "Ролл при заказе 3+ позиций",
    description: "Закажи 3 и более роллов — получи маленький ролл в подарок",
    trigger: "item_count",
    triggerValue: 3,
    giftPositionId: "pos-1",
    giftPositionName: "Ролл дракон (мини)",
    channels: "all",
    locationIds: ["loc-1", "loc-2", "loc-4"],
    active: true,
    usageCount: 89,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "gift-3",
    name: "Промокод PIZZA15",
    description: "Бесплатная пицца Маргарита при использовании промокода",
    trigger: "promo_code",
    triggerValue: "PIZZA15",
    giftPositionName: "Пицца Маргарита",
    channels: ["delivery"],
    locationIds: "all",
    active: false,
    usageCount: 12,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── PROPERTY SETS CATALOG ────────────────────────────────────────────────────
export const propertySets: PropertySet[] = [
  {
    id: "ps-size",
    name: "Размер пиццы",
    displayType: "chips",
    values: [
      { id: "psv-s1", name: "25 см" },
      { id: "psv-s2", name: "30 см" },
      { id: "psv-s3", name: "35 см" },
    ],
  },
  {
    id: "ps-dough",
    name: "Тип теста",
    displayType: "chips",
    values: [
      { id: "psv-d1", name: "Тонкое" },
      { id: "psv-d2", name: "Традиционное" },
      { id: "psv-d3", name: "На сыворотке" },
    ],
  },
  {
    id: "ps-roll-count",
    name: "Количество роллов",
    displayType: "chips",
    values: [
      { id: "psv-r1", name: "4 шт" },
      { id: "psv-r2", name: "8 шт" },
    ],
  },
  {
    id: "ps-spice",
    name: "Острота",
    displayType: "swatch",
    values: [
      { id: "psv-sp1", name: "Без перца", color: "#4ade80" },
      { id: "psv-sp2", name: "Слабоострая", color: "#fb923c" },
      { id: "psv-sp3", name: "Острая", color: "#ef4444" },
    ],
  },
  {
    id: "ps-volume",
    name: "Объём напитка",
    displayType: "chips",
    values: [
      { id: "psv-v1", name: "0,3 л" },
      { id: "psv-v2", name: "0,5 л" },
      { id: "psv-v3", name: "1,0 л" },
    ],
  },
];

// Default variants for "Пицца с грибами"
export const pizzaVariants: PositionVariant[] = [
  { id: "v-1", properties: { "ps-size": "psv-s1", "ps-dough": "psv-d1" }, price: 450, sku: "P25T",  enabled: true,  isDefault: false },
  { id: "v-2", properties: { "ps-size": "psv-s1", "ps-dough": "psv-d2" }, price: 490, sku: "P25TR", enabled: true,  isDefault: false },
  { id: "v-3", properties: { "ps-size": "psv-s2", "ps-dough": "psv-d1" }, price: 590, sku: "P30T",  enabled: true,  isDefault: true  },
  { id: "v-4", properties: { "ps-size": "psv-s2", "ps-dough": "psv-d2" }, price: 630, sku: "P30TR", enabled: true,  isDefault: false },
  { id: "v-5", properties: { "ps-size": "psv-s3", "ps-dough": "psv-d1" }, price: 750, sku: "P35T",  enabled: true,  isDefault: false },
  { id: "v-6", properties: { "ps-size": "psv-s3", "ps-dough": "psv-d2" }, price: 790, sku: "P35TR", enabled: false, isDefault: false },
];

// Sample price overrides: Moscow +10% (static), ТЦ «Мегамолл» additionally +5% (static)
export const pizzaPriceOverrides: PriceOverride[] = [
  {
    id: "po-1",
    cityId: "moscow",
    variantPrices: { "v-1": 495, "v-2": 540, "v-3": 650, "v-4": 695, "v-5": 825, "v-6": 870 },
  },
  {
    id: "po-2",
    cityId: "moscow",
    locationId: "loc-1", // ТЦ «Мегамолл» — prime location, +5% on top of Moscow
    variantPrices: { "v-1": 520, "v-2": 565, "v-3": 680, "v-4": 730 },
  },
];

// Simple price override for "Ролл дракон": cheaper in Kazan
export const rollPriceOverrides: PriceOverride[] = [
  {
    id: "po-3",
    cityId: "kazan",
    price: 820,
  },
  {
    id: "po-4",
    cityId: "spb",
    price: 990,
  },
];