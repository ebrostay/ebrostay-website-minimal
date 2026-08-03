const PRICING = {
  minTicket: 50,
  emptyKmRate: 1,
  baseLoadedKmRate: 1,
  maxLoadedKmRate: 2,
  maxVolumeM3: 15,
  maxWeightKg: 2000,
  includedVolumeM3: 5,
  includedWeightKg: 200,
  handlingUnitKg: 100,
  handlingUnitM3: 3,
  handlingUnitPrice: 20,
  handlingMaxPerOperation: 50,
  floorUnitPrice: 2.5,
  floorBlockSize: 3
};

const form = document.querySelector("#quoteForm");
const statusEl = document.querySelector("#formStatus");
const copyQuoteButton = document.querySelector("#copyQuote");
const whatsappLink = document.querySelector("#whatsappLink");

const fields = {
  baseAddress: document.querySelector("#baseAddress"),
  baseCity: document.querySelector("#baseCity"),
  pickupAddress: document.querySelector("#pickupAddress"),
  pickupCity: document.querySelector("#pickupCity"),
  deliveryAddress: document.querySelector("#deliveryAddress"),
  deliveryCity: document.querySelector("#deliveryCity"),
  serviceAt: document.querySelector("#serviceAt"),
  volume: document.querySelector("#volume"),
  weight: document.querySelector("#weight"),
  pickupFloors: document.querySelector("#pickupFloors"),
  deliveryFloors: document.querySelector("#deliveryFloors"),
  emptyKm: document.querySelector("#emptyKm"),
  loadedKm: document.querySelector("#loadedKm")
};

const output = {
  totalPrice: document.querySelector("#totalPrice"),
  routeSummary: document.querySelector("#routeSummary"),
  vehicleCount: document.querySelector("#vehicleCount"),
  serviceAtOutput: document.querySelector("#serviceAtOutput"),
  emptyCost: document.querySelector("#emptyCost"),
  loadedCost: document.querySelector("#loadedCost"),
  loadCost: document.querySelector("#loadCost"),
  unloadCost: document.querySelector("#unloadCost"),
  floorCost: document.querySelector("#floorCost"),
  kmRate: document.querySelector("#kmRate")
};

let lastQuote = null;
const addressCache = new Map();
const routeCache = new Map();

function toNumber(value, fallback = 0) {
  const number = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : fallback;
}

function money(value) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `${rounded.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
}

function km(value) {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`;
}

function rate(value) {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/km`;
}

function loadedRateLabel(quote) {
  const rates = quote.loadedKmRates || [quote.loadedKmRate];
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  return Math.abs(max - min) < 0.005 ? rate(max) : `${rate(min)} - ${rate(max)}`;
}

function clamp(value, min, max = Number.POSITIVE_INFINITY) {
  return Math.min(Math.max(value, min), max);
}

function formatDateTimeInput(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatServiceAt(value) {
  if (!value) {
    return "por confirmar";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "por confirmar";
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function setDefaultServiceAt() {
  if (!fields.serviceAt) {
    return;
  }

  const now = new Date();
  const defaultDate = new Date(now.getTime() + 60 * 60 * 1000);
  defaultDate.setMinutes(Math.ceil(defaultDate.getMinutes() / 30) * 30, 0, 0);

  fields.serviceAt.min = formatDateTimeInput(now);
  if (!fields.serviceAt.value) {
    fields.serviceAt.value = formatDateTimeInput(defaultDate);
  }
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES")
    .trim();
}

function canUseLocalApi() {
  const hostname = typeof window !== "undefined" ? window.location?.hostname : "";
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function joinAddress(address, city) {
  const cleanAddress = String(address || "").trim();
  const cleanCity = String(city || "").trim();

  if (!cleanAddress) {
    return cleanCity;
  }

  if (!cleanCity || normalizeText(cleanAddress).includes(normalizeText(cleanCity))) {
    return cleanAddress;
  }

  return `${cleanAddress}, ${cleanCity}`;
}

function getAddressLabel(address, city) {
  return joinAddress(address, city) || "por confirmar";
}

function hasValidMapPoint(result) {
  const lat = Number.parseFloat(result.lat);
  const lon = Number.parseFloat(result.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 27 && lat <= 44.5 && lon >= -19 && lon <= 5;
}

function filterAddressResults(results, city) {
  const expectedCity = normalizeText(city);
  return (Array.isArray(results) ? results : []).filter((result) => hasValidMapPoint(result) && (!expectedCity || resultMatchesCity(result, expectedCity)));
}

function getLoadShare(volumeM3, weightKg) {
  const chargeableVolume = Math.max(0, volumeM3 - PRICING.includedVolumeM3);
  const chargeableWeight = weightKg > 0 ? Math.max(0, weightKg - PRICING.includedWeightKg) : 0;
  const byVolume = clamp(chargeableVolume / (PRICING.maxVolumeM3 - PRICING.includedVolumeM3), 0, 1);
  const byWeight = weightKg > 0 ? clamp(chargeableWeight / (PRICING.maxWeightKg - PRICING.includedWeightKg), 0, 1) : 0;
  return Math.max(byVolume, byWeight);
}

function getHandlingUnits(volumeM3, weightKg) {
  const chargeableVolume = Math.max(0, volumeM3 - PRICING.includedVolumeM3);
  const chargeableWeight = weightKg > 0 ? Math.max(0, weightKg - PRICING.includedWeightKg) : 0;
  const volumeUnits = chargeableVolume > 0 ? Math.ceil(chargeableVolume / PRICING.handlingUnitM3) : 0;
  const weightUnits = chargeableWeight > 0 ? Math.ceil(chargeableWeight / PRICING.handlingUnitKg) : 0;
  return Math.max(volumeUnits, weightUnits);
}

function getOperationFee(units) {
  if (units <= 0) {
    return 0;
  }

  return Math.min(PRICING.handlingMaxPerOperation, Math.max(PRICING.handlingUnitPrice, units * PRICING.handlingUnitPrice));
}

function getVehicleCount(volumeM3, weightKg) {
  const byVolume = Math.ceil(Math.max(volumeM3, 0.1) / PRICING.maxVolumeM3);
  const byWeight = weightKg > 0 ? Math.ceil(weightKg / PRICING.maxWeightKg) : 1;
  return Math.max(1, byVolume, byWeight);
}

function getVehicleLoads(volumeM3, weightKg, vehicleCount) {
  let remainingVolume = Math.max(volumeM3, 0);
  let remainingWeight = Math.max(weightKg, 0);

  return Array.from({ length: vehicleCount }, () => {
    const vehicleVolume = Math.min(PRICING.maxVolumeM3, remainingVolume);
    const vehicleWeight = weightKg > 0 ? Math.min(PRICING.maxWeightKg, remainingWeight) : 0;
    remainingVolume = Math.max(0, remainingVolume - vehicleVolume);
    remainingWeight = Math.max(0, remainingWeight - vehicleWeight);
    return { volumeM3: vehicleVolume, weightKg: vehicleWeight };
  });
}

function getLoadedKmRate(volumeM3, weightKg) {
  const loadShare = getLoadShare(volumeM3, weightKg);
  return clamp(
    PRICING.baseLoadedKmRate * (1 + loadShare),
    PRICING.baseLoadedKmRate,
    PRICING.maxLoadedKmRate
  );
}

function getFloorExtra(volumeM3, weightKg, pickupFloors, deliveryFloors) {
  const estimatedWeight = weightKg > 0 ? weightKg : (volumeM3 / PRICING.maxVolumeM3) * PRICING.maxWeightKg;
  const weightUnits = Math.max(1, Math.ceil(estimatedWeight / PRICING.handlingUnitKg));
  const pickupBlocks = Math.ceil(Math.max(pickupFloors, 0) / PRICING.floorBlockSize);
  const deliveryBlocks = Math.ceil(Math.max(deliveryFloors, 0) / PRICING.floorBlockSize);
  return weightUnits * PRICING.floorUnitPrice * (pickupBlocks + deliveryBlocks);
}

function calculateQuote({ emptyKm, loadedKm, volumeM3, weightKg, pickupFloors, deliveryFloors, serviceAt }) {
  const vehicleCount = getVehicleCount(volumeM3, weightKg);
  const vehicleLoads = getVehicleLoads(volumeM3, weightKg, vehicleCount);
  const loadedKmRates = vehicleLoads.map((load) => getLoadedKmRate(load.volumeM3, load.weightKg));
  const loadedKmRateTotal = loadedKmRates.reduce((sum, rate) => sum + rate, 0);
  const loadedKmRate = loadedKmRateTotal / vehicleCount;
  const handlingFees = vehicleLoads.map((load) => getOperationFee(getHandlingUnits(load.volumeM3, load.weightKg)));
  const loadFee = handlingFees.reduce((sum, fee) => sum + fee, 0);
  const unloadFee = loadFee;
  const floorExtra = getFloorExtra(volumeM3, weightKg, pickupFloors, deliveryFloors);
  const emptyCost = emptyKm * PRICING.emptyKmRate * vehicleCount;
  const loadedCost = loadedKm * loadedKmRateTotal;
  const baseSubtotal = emptyCost + loadedCost + loadFee + unloadFee;
  const subtotal = baseSubtotal + floorExtra;
  const total = Math.max(PRICING.minTicket * vehicleCount, baseSubtotal) + floorExtra;

  return {
    emptyKm,
    loadedKm,
    volumeM3,
    weightKg,
    pickupFloors,
    deliveryFloors,
    serviceAt,
    vehicleCount,
    vehicleLoads,
    loadedKmRates,
    loadedKmRate,
    loadFee,
    unloadFee,
    floorExtra,
    emptyCost,
    loadedCost,
    baseSubtotal,
    subtotal,
    total
  };
}

function renderQuote(quote, routeSource = "manual") {
  lastQuote = quote;

  output.totalPrice.textContent = money(quote.total);
  output.vehicleCount.textContent = quote.vehicleCount === 1 ? "1 furgoneta" : `${quote.vehicleCount} furgonetas`;
  output.serviceAtOutput.textContent = formatServiceAt(quote.serviceAt);
  output.emptyCost.textContent = `${money(quote.emptyCost)} (${km(quote.emptyKm)})`;
  output.loadedCost.textContent = `${money(quote.loadedCost)} (${km(quote.loadedKm)})`;
  output.loadCost.textContent = money(quote.loadFee);
  output.unloadCost.textContent = money(quote.unloadFee);
  output.floorCost.textContent = money(quote.floorExtra);
  output.kmRate.textContent = loadedRateLabel(quote);

  const sourceText = routeSource === "map" ? "Ruta calculada por carretera" : "Kilómetros introducidos manualmente";
  const vehicleText = quote.vehicleCount === 1 ? "1 furgoneta/viaje" : `${quote.vehicleCount} furgonetas/viajes`;
  output.routeSummary.textContent =
    `${sourceText}: ${km(quote.emptyKm)} hasta la recogida y ${km(quote.loadedKm)} con carga. ` +
    `Volumen: ${quote.volumeM3.toLocaleString("es-ES")} m³` +
    `${quote.weightKg > 0 ? `, peso: ${quote.weightKg.toLocaleString("es-ES")} kg` : ""}. ` +
    `Se estiman ${vehicleText}. Fecha: ${formatServiceAt(quote.serviceAt)}.`;

  const message = buildQuoteMessage(quote);
  whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function buildQuoteMessage(quote) {
  return [
    "Hola Jairo, quiero confirmar este porte:",
    `Recogida: ${getAddressLabel(fields.pickupAddress.value, fields.pickupCity.value)}`,
    `Entrega: ${getAddressLabel(fields.deliveryAddress.value, fields.deliveryCity.value)}`,
    `Fecha y hora: ${formatServiceAt(quote.serviceAt)}`,
    `Volumen aproximado: ${quote.volumeM3} m³`,
    quote.weightKg > 0 ? `Peso aproximado: ${quote.weightKg} kg` : "Peso aproximado: por confirmar",
    `Furgonetas/viajes estimados: ${quote.vehicleCount}`,
    `Plantas recogida: ${quote.pickupFloors}`,
    `Plantas entrega: ${quote.deliveryFloors}`,
    `Km hasta recogida: ${quote.emptyKm.toFixed(1)}`,
    `Km con carga: ${quote.loadedKm.toFixed(1)}`,
    `Estimación: ${money(quote.total)}`
  ].join("\n");
}

async function geocode(address, city) {
  const normalized = normalizeKnownPlace(address, city);
  const addressLabel = joinAddress(normalized.address, normalized.city);

  if (!addressLabel) {
    throw new Error("Falta una dirección para calcular la ruta.");
  }

  const results = await fetchAddressCandidates(normalized.address, normalized.city);

  if (!results.length) {
    throw new Error(`No he encontrado ${addressLabel}. Añade municipio o código postal.`);
  }

  const bestResult = pickBestAddress(results, normalized.city);

  return {
    lat: Number.parseFloat(bestResult.lat),
    lon: Number.parseFloat(bestResult.lon),
    label: bestResult.display_name || addressLabel
  };
}

function normalizeKnownPlace(address, city) {
  const addressValue = String(address || "").trim();
  const cityValue = String(city || "").trim();
  const lower = normalizeText(joinAddress(addressValue, cityValue));

  if (lower.includes("zaragoza") && lower.includes("plaza del pilar")) {
    return { address: "Plaza de Nuestra Senora del Pilar", city: "Zaragoza" };
  }

  if (lower.includes("zaragoza") && lower.includes("delicias") && lower.includes("estaci")) {
    return { address: "Avenida Navarra 80", city: "Zaragoza" };
  }

  return { address: addressValue, city: cityValue };
}

async function requestJson(url, fallbackMessage) {
  let response;

  try {
    response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      // Keep the friendly fallback message.
    }
    throw new Error(message);
  }

  return response.json();
}

async function fetchAddressCandidates(address, city) {
  const addressLabel = joinAddress(address, city);
  const cacheKey = normalizeText(`${addressLabel}, España`);

  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey);
  }

  const sources = [];
  if (canUseLocalApi()) {
    sources.push(() => fetchLocalGeocode(address, city));
  }
  sources.push(() => fetchCartoCiudadCandidates(address, city));
  sources.push(() => fetchPhotonCandidates(addressLabel));
  sources.push(() => fetchNominatimCandidates(address, city));

  let lastError = null;
  let receivedResponse = false;
  for (const source of sources) {
    try {
      const sourceResults = await source();
      if (Array.isArray(sourceResults)) {
        receivedResponse = true;
      }
      const results = filterAddressResults(sourceResults, city);
      if (Array.isArray(results) && results.length) {
        addressCache.set(cacheKey, results);
        return results;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (receivedResponse) {
    throw new Error(`No he encontrado ${addressLabel}. Revisa calle, número y municipio.`);
  }

  throw lastError || new Error("No he podido consultar el mapa ahora mismo.");
}

async function fetchLocalGeocode(address, city) {
  const url = new URL("/api/geocode", window.location.origin);
  url.searchParams.set("q", address);
  if (city) {
    url.searchParams.set("city", city);
  }

  const payload = await requestJson(url, "No he podido consultar el mapa ahora mismo.");
  return payload.results || payload;
}

async function fetchCartoCiudadCandidates(address, city) {
  const url = new URL("https://www.cartociudad.es/geocoder/api/geocoder/candidates");
  url.searchParams.set("q", address || city);
  url.searchParams.set("limit", "8");
  if (city) {
    url.searchParams.set("municipio_filter", city);
  }

  const payload = await requestJson(url, "No he podido consultar el mapa ahora mismo.");
  return (Array.isArray(payload) ? payload : []).map(mapCartoCiudadCandidate);
}

function mapCartoCiudadCandidate(candidate) {
  return {
    lat: candidate.lat,
    lon: candidate.lng,
    display_name: candidate.address,
    importance: candidate.type === "portal" ? 1 : 0.75,
    address: {
      road: candidate.address,
      city: candidate.muni || candidate.poblacion,
      town: candidate.poblacion,
      municipality: candidate.muni,
      county: candidate.province,
      state: candidate.comunidadAutonoma,
      postcode: candidate.postalCode,
      country: "España",
      country_code: "es"
    }
  };
}

async function fetchPhotonCandidates(addressLabel) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${addressLabel}, España`);
  url.searchParams.set("limit", "6");

  const payload = await requestJson(url, "No he podido consultar el mapa ahora mismo.");
  return (payload.features || []).map(mapPhotonFeature);
}

function mapPhotonFeature(feature) {
  const properties = feature.properties || {};
  const [lon, lat] = feature.geometry?.coordinates || [];
  const streetLine = [properties.street, properties.housenumber].filter(Boolean).join(" ");
  const displayParts = [
    properties.name,
    streetLine,
    properties.postcode,
    properties.city || properties.county,
    properties.state,
    properties.country
  ].filter(Boolean);

  return {
    lat,
    lon,
    display_name: [...new Set(displayParts)].join(", "),
    importance: 0.5,
    address: {
      road: properties.street,
      house_number: properties.housenumber,
      city: properties.city,
      town: properties.city,
      village: properties.city,
      municipality: properties.city || properties.county,
      county: properties.county,
      state: properties.state,
      postcode: properties.postcode,
      country: properties.country,
      country_code: properties.countrycode
    }
  };
}

function makeNominatimUrl() {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "es");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "es");
  return url;
}

async function fetchNominatimCandidates(address, city) {
  const url = makeNominatimUrl();
  url.searchParams.set("q", `${joinAddress(address, city)}, España`);
  return requestJson(url, "No he podido consultar el mapa ahora mismo.");
}

function pickBestAddress(results, city) {
  const expectedCity = normalizeText(city);
  const validResults = results.filter(hasValidMapPoint);
  const cityMatchedResults = expectedCity ? validResults.filter((result) => resultMatchesCity(result, expectedCity)) : validResults;

  if (expectedCity && !cityMatchedResults.length) {
    throw new Error(`No he encontrado una dirección válida en ${city}. Revisa el municipio o añade código postal.`);
  }

  const scored = cityMatchedResults
    .filter((result) => Number.isFinite(Number.parseFloat(result.lat)) && Number.isFinite(Number.parseFloat(result.lon)))
    .map((result) => {
      const address = result.address || {};
      const lat = Number.parseFloat(result.lat);
      const lon = Number.parseFloat(result.lon);
      const addressText = normalizeText(`${result.display_name || ""} ${Object.values(address).join(" ")}`);
      const isExpectedCity = expectedCity ? addressText.includes(expectedCity) : false;
      const isSpain = address.country_code === "es" || address.countrycode === "ES" || addressText.includes("espana");
      const isNearZaragoza = lat >= 41.35 && lat <= 42.05 && lon >= -1.5 && lon <= -0.35;
      const hasStreet = Boolean(address.road || address.street || address.house_number || address.postcode);
      const score =
        (isExpectedCity ? 140 : 0) +
        (isSpain ? 45 : 0) +
        (hasStreet ? 30 : 0) +
        (!expectedCity && isNearZaragoza ? 20 : 0) +
        Number(result.importance || 0);

      return { result, score };
    });

  if (!scored.length) {
    throw new Error("No he encontrado una dirección válida.");
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0].result;
}

function resultMatchesCity(result, expectedCity) {
  const address = result.address || {};
  const text = normalizeText(`${address.city || ""} ${address.town || ""} ${address.village || ""} ${address.hamlet || ""} ${address.municipality || ""}`);
  return text.includes(expectedCity);
}

async function routeDistance(from, to) {
  const cacheKey = `${from.lon},${from.lat};${to.lon},${to.lat}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const sources = [];
  if (canUseLocalApi()) {
    sources.push(() => fetchLocalRoute(from, to));
  }
  sources.push(() => fetchOsrmRoute(from, to));

  let lastError = null;
  for (const source of sources) {
    try {
      const distance = await source();
      routeCache.set(cacheKey, distance);
      return distance;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No he podido calcular la ruta por carretera ahora mismo.");
}

async function fetchLocalRoute(from, to) {
  const url = new URL("/api/route", window.location.origin);
  url.searchParams.set("from", `${from.lon},${from.lat}`);
  url.searchParams.set("to", `${to.lon},${to.lat}`);

  const payload = await requestJson(url, "No he podido calcular la ruta por carretera ahora mismo.");
  return readRouteDistance(payload);
}

async function fetchOsrmRoute(from, to) {
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}`);
  url.searchParams.set("overview", "false");

  const payload = await requestJson(url, "No he podido calcular la ruta por carretera ahora mismo.");
  return readRouteDistance(payload);
}

function readRouteDistance(payload) {
  if (Number.isFinite(payload.distanceKm)) {
    return payload.distanceKm;
  }

  const route = payload.routes?.[0];
  if (!route) {
    throw new Error("No he encontrado una ruta por carretera.");
  }

  return route.distance / 1000;
}

function getFriendlyMapError(error) {
  const message = String(error?.message || "");
  if (!message || message === "Failed to fetch" || message.includes("NetworkError")) {
    return "No he podido conectar con el mapa ahora mismo.";
  }
  return message;
}

function readQuoteInputs() {
  return {
    emptyKm: Math.max(0, toNumber(fields.emptyKm.value)),
    loadedKm: Math.max(0, toNumber(fields.loadedKm.value)),
    volumeM3: Math.max(0.1, toNumber(fields.volume.value, 3)),
    weightKg: Math.max(0, toNumber(fields.weight.value)),
    pickupFloors: clamp(Math.round(toNumber(fields.pickupFloors.value)), 0, 12),
    deliveryFloors: clamp(Math.round(toNumber(fields.deliveryFloors.value)), 0, 12),
    serviceAt: fields.serviceAt.value
  };
}

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", type === "error");
}

async function calculateFromAddresses() {
  const pickup = fields.pickupAddress.value.trim();
  const pickupCity = fields.pickupCity.value.trim();
  const delivery = fields.deliveryAddress.value.trim();
  const deliveryCity = fields.deliveryCity.value.trim();
  const base = fields.baseAddress.value.trim();
  const baseCity = fields.baseCity.value.trim();

  if (!pickup || !delivery) {
    return { routeSource: "manual" };
  }

  setStatus("Calculando ruta...");
  const basePoint = await geocode(base || "Paseo Independencia 10", baseCity || "Zaragoza");
  const pickupPoint = await geocode(pickup, pickupCity);
  const deliveryPoint = await geocode(delivery, deliveryCity);
  const emptyKm = await routeDistance(basePoint, pickupPoint);
  const loadedKm = await routeDistance(pickupPoint, deliveryPoint);

  fields.emptyKm.value = emptyKm.toFixed(1);
  fields.loadedKm.value = loadedKm.toFixed(1);

  return { routeSource: "map" };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const { routeSource } = await calculateFromAddresses();
    const quote = calculateQuote(readQuoteInputs());
    renderQuote(quote, routeSource);
    setStatus(routeSource === "map" ? "Estimación calculada con ruta por carretera." : "Estimación calculada con kilómetros manuales.");
  } catch (error) {
    const quote = calculateQuote(readQuoteInputs());
    renderQuote(quote, "manual");
    setStatus(`${getFriendlyMapError(error)} He usado los kilómetros manuales.`, "error");
  }
});

copyQuoteButton.addEventListener("click", async () => {
  if (!lastQuote) {
    const quote = calculateQuote(readQuoteInputs());
    renderQuote(quote);
  }

  const text = buildQuoteMessage(lastQuote);
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Resumen copiado.");
  } catch {
    setStatus("No se pudo copiar automáticamente. Usa el botón de WhatsApp.", "error");
  }
});

function updateManualQuote() {
  const quote = calculateQuote(readQuoteInputs());
  renderQuote(quote, "manual");
}

setDefaultServiceAt();

document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", updateManualQuote);
  input.addEventListener("change", updateManualQuote);
});

renderQuote(calculateQuote(readQuoteInputs()), "manual");

if (window.lucide) {
  window.lucide.createIcons();
}
