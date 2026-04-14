import {
  Availability, ChannelAvailability, CHANNELS, cities, PriceOverride,
} from "../../data/mockData";

// All channels enabled in at least one location
export function getAvailableChannelKeys(av?: Availability): Set<string> {
  if (!av || av.everywhere) return new Set(CHANNELS.map((c) => c.key));
  const keys = new Set<string>();
  for (const ca of av.cities) {
    for (const la of ca.locations) {
      if (!la.enabled) continue;
      for (const ch of CHANNELS) {
        if (la.channels[ch.key]) keys.add(ch.key);
      }
    }
  }
  return keys;
}

// All city ids that have at least one enabled location
export function getAvailableCityIds(av?: Availability): Set<string> {
  if (!av || av.everywhere) return new Set(cities.map((c) => c.id));
  const ids = new Set<string>();
  for (const ca of av.cities) {
    if (ca.locations.some((la) => la.enabled)) ids.add(ca.cityId);
  }
  return ids;
}

// Enabled location ids inside a city
export function getAvailableLocationIds(av: Availability | undefined, cityId: string): Set<string> {
  if (!av || av.everywhere) {
    const city = cities.find((c) => c.id === cityId);
    return new Set(city?.locations.map((l) => l.id) ?? []);
  }
  const ca = av.cities.find((c) => c.cityId === cityId);
  if (!ca) return new Set();
  return new Set(ca.locations.filter((la) => la.enabled).map((la) => la.locationId));
}

export function isChannelAvailableAtLocation(
  av: Availability | undefined,
  cityId: string,
  locationId: string,
  channelKey: keyof ChannelAvailability,
): boolean {
  if (!av || av.everywhere) return true;
  const ca = av.cities.find((c) => c.cityId === cityId);
  const la = ca?.locations.find((l) => l.locationId === locationId);
  if (!la?.enabled) return false;
  return !!la.channels[channelKey];
}

export function isChannelAvailableInCity(
  av: Availability | undefined,
  cityId: string,
  channelKey: keyof ChannelAvailability,
): boolean {
  if (!av || av.everywhere) return true;
  const ca = av.cities.find((c) => c.cityId === cityId);
  if (!ca) return false;
  return ca.locations.some((la) => la.enabled && la.channels[channelKey]);
}

// ─── Conflict counter ────────────────────────────────────────────────────────
// Counts how many price entries reference channels/cities that are NOT
// available according to `av`. Used both for the badge in PricesTab header
// and for the "newly hidden" toast in PositionEditPanel.
export function countConflictsAgainst(
  priceOverrides: PriceOverride[],
  baseChannelPrices: Record<string, number> | undefined,
  av: Availability | undefined,
): number {
  if (!av) return 0;
  const availChannels = getAvailableChannelKeys(av);
  const availCities = getAvailableCityIds(av);
  let count = 0;

  // Base channel prices — keys are either "channelKey" or "variantId:channelKey"
  if (baseChannelPrices) {
    for (const key of Object.keys(baseChannelPrices)) {
      const ch = key.includes(":") ? key.split(":")[1] : key;
      if (!availChannels.has(ch)) count++;
    }
  }

  for (const ov of priceOverrides) {
    if (!availCities.has(ov.cityId)) {
      if (ov.price !== undefined) count++;
      if (ov.markup) count++;
      if (ov.variantPrices) count += Object.keys(ov.variantPrices).length;
      if (ov.variantMarkups) count += Object.keys(ov.variantMarkups).length;
      if (ov.channelPrices) count += Object.keys(ov.channelPrices).length;
      if (ov.channelMarkups) count += Object.keys(ov.channelMarkups).length;
      if (ov.channelVariantPrices) {
        for (const cvp of Object.values(ov.channelVariantPrices)) {
          count += Object.keys(cvp).length;
        }
      }
      if (ov.channelVariantMarkups) {
        for (const cvm of Object.values(ov.channelVariantMarkups)) {
          count += Object.keys(cvm).length;
        }
      }
      continue;
    }
    if (ov.channelPrices) {
      for (const ch of Object.keys(ov.channelPrices)) {
        if (!availChannels.has(ch)) count++;
      }
    }
    if (ov.channelMarkups) {
      for (const ch of Object.keys(ov.channelMarkups)) {
        if (!availChannels.has(ch)) count++;
      }
    }
    if (ov.channelVariantPrices) {
      for (const ch of Object.keys(ov.channelVariantPrices)) {
        if (!availChannels.has(ch)) {
          count += Object.keys(ov.channelVariantPrices[ch] ?? {}).length;
        }
      }
    }
    if (ov.channelVariantMarkups) {
      for (const ch of Object.keys(ov.channelVariantMarkups)) {
        if (!availChannels.has(ch)) {
          count += Object.keys(ov.channelVariantMarkups[ch] ?? {}).length;
        }
      }
    }
  }
  return count;
}
