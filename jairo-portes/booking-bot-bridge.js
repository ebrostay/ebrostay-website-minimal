(function () {
  function field(id) {
    var element = document.querySelector("#" + id);
    return element ? String(element.value || "").trim() : "";
  }

  function text(id) {
    var element = document.querySelector("#" + id);
    return element ? String(element.textContent || "").trim() : "";
  }

  function number(value, fallback) {
    var parsed = Number.parseFloat(String(value || "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function joinAddress(address, city) {
    if (!address) return city || "por confirmar";
    if (!city || address.toLocaleLowerCase("es-ES").includes(city.toLocaleLowerCase("es-ES"))) return address;
    return address + ", " + city;
  }

  function machineDateTime(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    var pad = function (part) { return String(part).padStart(2, "0"); };
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function bookingMessage(quote) {
    quote = quote || {};
    var serviceAt = quote.serviceAt || field("serviceAt");
    var volumeM3 = quote.volumeM3 || number(field("volume"), 3);
    var weightKg = quote.weightKg || number(field("weight"), 0);
    var pickupFloors = quote.pickupFloors !== undefined ? quote.pickupFloors : number(field("pickupFloors"), 0);
    var deliveryFloors = quote.deliveryFloors !== undefined ? quote.deliveryFloors : number(field("deliveryFloors"), 0);
    var emptyKm = quote.emptyKm !== undefined ? quote.emptyKm : number(field("emptyKm"), 0);
    var loadedKm = quote.loadedKm !== undefined ? quote.loadedKm : number(field("loadedKm"), 0);
    var total = quote.total !== undefined ? quote.total : text("totalPrice");

    return [
      "RESERVA_EBROMOVE",
      "Fecha: " + machineDateTime(serviceAt),
      "Recogida: " + joinAddress(field("pickupAddress"), field("pickupCity")),
      "Entrega: " + joinAddress(field("deliveryAddress"), field("deliveryCity")),
      "Volumen: " + volumeM3 + " m3",
      "Peso: " + weightKg + " kg",
      "Plantas recogida: " + pickupFloors,
      "Plantas entrega: " + deliveryFloors,
      "Km hasta recogida: " + Number(emptyKm).toFixed(1),
      "Km con carga: " + Number(loadedKm).toFixed(1),
      "Precio estimado: " + total,
      "",
      "Hola, quiero reservar este porte."
    ].join("\n");
  }

  window.ebromoveBookingMessage = bookingMessage;

  if (typeof window.message === "function") {
    window.message = function (quote) {
      return bookingMessage(quote);
    };

    if (typeof window.render === "function" && typeof window.calc === "function" && typeof window.read === "function") {
      window.render(window.calc(window.read()), "manual");
    }
  }
}());
