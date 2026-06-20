/* ============================================================
   EBROSTAY — BILINGUAL COPY (ES/EN)
   Ported from the conversational design handoff. Two string sets that
   share the account/header vocabulary: GUEST and HOST.
   ============================================================ */
(function () {
  "use strict";

  // Amenity labels (keys come from the inventory `amen` arrays).
  var AMEN = {
    en: { wifi: "Fast Wi-Fi", desk: "Workspace", ac: "Air conditioning", parking: "Parking",
          washer: "Washer", lift: "Lift", heating: "Heating", kitchen: "Equipped kitchen",
          terrace: "Terrace", balcony: "Balcony", dishwasher: "Dishwasher", tv: "TV",
          microwave: "Microwave", oven: "Oven" },
    es: { wifi: "Wifi rápido", desk: "Zona de trabajo", ac: "Aire acondicionado", parking: "Parking",
          washer: "Lavadora", lift: "Ascensor", heating: "Calefacción", kitchen: "Cocina equipada",
          terrace: "Terraza", balcony: "Balcón", dishwasher: "Lavavajillas", tv: "TV",
          microwave: "Microondas", oven: "Horno" }
  };

  var GUEST = {
    en: {
      amen: AMEN.en,
      newSearch: "new search", signIn: "Sign in", modeGuest: "Guest", modeHost: "Host",
      acctPhoneTitle: "Your stays, by number",
      acctPhoneBlurb: "No account, no password — just your phone. Enter it to see and manage your stays.",
      acctSendCode: "Send me a code", acctNoPassword: "We text you a 6-digit code. That’s the whole login.",
      acctCodeTitle: "Enter the code", acctVerify: "Verify", acctChangeNumber: "Change number",
      acctMyStays: "Your stays", acctMessageStay: "Message us about this →",
      acctNoStays: "No stays yet. When you reserve a home, it shows up here — tied to your number, on any device.",
      acctSignOut: "Sign out",
      acctCodeBlurb: function (p) { return "We sent a 6-digit code to +34 " + p + "."; },
      acctDemoHint: function (c) { return "Demo: your code is " + c + " (any 6 digits work)."; },
      greeting: "Where to in Zaragoza?",
      sub: "Tell me the stay you need, in plain words.",
      placeholderEmpty: "e.g. 3 of us in Movera, July to October, under €1,400…",
      placeholderRefine: "Refine it — cheaper, near the university, add a bedroom…",
      whatsInside: "WHAT'S INSIDE", reserve: "Reserve →", allInShort: "all-in",
      allInLong: "all-in · deposit refundable", freeCancel: "Free cancellation up to 48h before check-in",
      photosWord: "photos", months: "1–12 months", guests: "guests", bedOne: "bedroom", bedMany: "bedrooms", studio: "studio",
      examples: ["3 of us in Movera, under €1,400", "A furnished 3-bed, room by room", "Team move-in for July"],
      chips: ["Cheaper", "3 bedrooms", "Room by room", "Available in July"],
      ownerChips: ["What's your fee?", "How fast can it list?", "Which neighbourhoods?"],
      reserveChips: ["Book a viewing first", "See the contract", "Start another search"],
      fallbackChips: ["Raise budget to €1,600", "Any neighbourhood", "Start over"],
      amenVerified: "Verified home", amenDeposit: "Refundable deposit",
      ownerSummary: "Here's a no-obligation estimate. Hand over the keys; we list, fill, collect and pay you after each stay.",
      ownerTitle: "Your flat · zero-touch management", ownerNet: "net to your IBAN",
      ownerBlurb: "We photograph, list, price, vet guests, sign the season contract, collect rent and deposit, run check-in and cleaning — then transfer your share. Your effort: zero.",
      ownerCta: "Request full offer →",
      fallbackSummary: "Nothing matches that exactly — here are the two closest. Loosen the budget or area and I'll widen it.",
      reserveConfirm: function (ref) { return "Reserved · " + ref + ". Confirmation and invoice are on the way to your email. Your deposit is fully refundable up to 48h before check-in."; },
      contactWa: "Confirm on WhatsApp", contactEmail: "Email us",
      waReserve: function (ref, title) { return "Hi Ebrostay, I'd like to confirm my reservation " + ref + (title ? " (" + title + ")" : "") + "."; },
      mailSubject: function (ref) { return "Ebrostay reservation " + ref; },
      searchSummary: function (n, b) { return n + (n === 1 ? " home" : " homes") + " match" + (b ? (" under €" + b) : "") + " · all-in pricing, deposit refundable · reserve in one tap."; }
    },
    es: {
      amen: AMEN.es,
      newSearch: "nueva búsqueda", signIn: "Iniciar sesión", modeGuest: "Huésped", modeHost: "Anfitrión",
      acctPhoneTitle: "Tus estancias, por número",
      acctPhoneBlurb: "Sin cuenta, sin contraseña — solo tu teléfono. Introdúcelo para ver y gestionar tus estancias.",
      acctSendCode: "Envíame un código", acctNoPassword: "Te enviamos un código de 6 dígitos. Ese es todo el acceso.",
      acctCodeTitle: "Introduce el código", acctVerify: "Verificar", acctChangeNumber: "Cambiar número",
      acctMyStays: "Tus estancias", acctMessageStay: "Escríbenos sobre esto →",
      acctNoStays: "Aún no hay estancias. Cuando reserves una vivienda, aparecerá aquí — ligada a tu número, en cualquier dispositivo.",
      acctSignOut: "Cerrar sesión",
      acctCodeBlurb: function (p) { return "Enviamos un código de 6 dígitos al +34 " + p + "."; },
      acctDemoHint: function (c) { return "Demo: tu código es " + c + " (cualquier 6 dígitos vale)."; },
      greeting: "¿A qué zona de Zaragoza?",
      sub: "Cuéntame la estancia que necesitas, con tus palabras.",
      placeholderEmpty: "p. ej. 3 personas en Movera, de julio a octubre, menos de 1.400 €…",
      placeholderRefine: "Ajusta — más barato, cerca de la universidad, con otra habitación…",
      whatsInside: "QUÉ INCLUYE", reserve: "Reservar →", allInShort: "todo incl.",
      allInLong: "todo incluido · fianza reembolsable", freeCancel: "Cancelación gratis hasta 48 h antes de la entrada",
      photosWord: "fotos", months: "1–12 meses", guests: "huéspedes", bedOne: "dormitorio", bedMany: "dormitorios", studio: "estudio",
      examples: ["3 personas en Movera, menos de 1.400 €", "Un 3 dormitorios amueblado, por habitaciones", "Entrada de equipo para julio"],
      chips: ["Más barato", "3 dormitorios", "Por habitaciones", "Disponible en julio"],
      ownerChips: ["¿Cuál es vuestra comisión?", "¿Cuánto tarda en publicarse?", "¿En qué barrios?"],
      reserveChips: ["Ver primero una visita", "Ver el contrato", "Empezar otra búsqueda"],
      fallbackChips: ["Subir a 1.600 €", "Cualquier barrio", "Empezar de nuevo"],
      amenVerified: "Vivienda verificada", amenDeposit: "Fianza reembolsable",
      ownerSummary: "Aquí tienes una estimación sin compromiso. Tú nos das las llaves; nosotros publicamos, llenamos, cobramos y te pagamos tras cada estancia.",
      ownerTitle: "Tu vivienda · gestión sin esfuerzo", ownerNet: "neto a tu IBAN",
      ownerBlurb: "Hacemos fotos, publicamos, fijamos el precio, verificamos huéspedes, firmamos el contrato de temporada, cobramos renta y fianza, gestionamos la entrada y la limpieza, y te transferimos tu parte. Tu esfuerzo: cero.",
      ownerCta: "Pedir propuesta →",
      fallbackSummary: "Nada coincide exactamente — estas son las dos más cercanas. Amplía el presupuesto o la zona y busco de nuevo.",
      reserveConfirm: function (ref) { return "Reservado · " + ref + ". Te enviamos confirmación y factura por email. La fianza es reembolsable hasta 48 h antes de la entrada."; },
      contactWa: "Confirmar por WhatsApp", contactEmail: "Escríbenos",
      waReserve: function (ref, title) { return "Hola Ebrostay, quiero confirmar mi reserva " + ref + (title ? " (" + title + ")" : "") + "."; },
      mailSubject: function (ref) { return "Reserva Ebrostay " + ref; },
      searchSummary: function (n, b) { return n + (n === 1 ? " vivienda" : " viviendas") + (n === 1 ? " coincide" : " coinciden") + (b ? (" por debajo de " + b + " €") : "") + " · precio todo incluido, fianza reembolsable · reserva en un toque."; }
    }
  };

  var HOST = {
    en: {
      hostsBadge: "FOR HOSTS", newEstimate: "new estimate", modeGuest: "Guest", modeHost: "Host",
      hostLogin: "Host log in",
      acctPhoneTitle: "Your listings, by number",
      acctPhoneBlurb: "No account, no password — just your phone. Enter it to see your listings and payouts.",
      acctSendCode: "Send me a code", acctNoPassword: "We text you a 6-digit code. That’s the whole login.",
      acctCodeTitle: "Enter the code", acctVerify: "Verify", acctChangeNumber: "Change number",
      acctMyListings: "Your listings",
      acctNoListings: "No listings yet. Ask for an estimate and tap “Start hosting” — it shows up here, tied to your number.",
      acctSignOut: "Sign out",
      acctCodeBlurb: function (p) { return "We sent a 6-digit code to +34 " + p + "."; },
      acctDemoHint: function (c) { return "Demo: your code is " + c + " (any 6 digits work)."; },
      listingNetLabel: "/mo to your IBAN", listingStatus: "Onboarding",
      greeting: "What could your flat earn?",
      sub: "Tell us about your place. We handle everything; you just get paid.",
      placeholderEmpty: "e.g. furnished 2-bed near the university, with a lift…",
      placeholderRefine: "Refine it — add another flat, ask about the fee or timeline…",
      examples: ["Furnished 2-bed near the university", "3-bed in Movera, room by room", "Studio in Centro"],
      estTail: "Here's what zero-touch hosting could pay you — you just add your IBAN once.",
      estLabel: "ESTIMATED NET PAYOUT", per: "/ mo", iban: "paid to your IBAN after each stay",
      occL: "occupancy", effortL: "your effort", handleL: "WE HANDLE EVERYTHING",
      handles: ["Photos & listing", "Dynamic pricing", "Guest vetting", "Season contract", "Rent & deposit", "Check-in & keys", "Cleaning & turnover", "Support", "Payouts to your IBAN"],
      startLabel: "Start hosting →", note: "A team member contacts you within 24h. No commitment.",
      estSummary: function (net, area) { return "Based on a " + area + " like yours, here’s what zero-touch hosting could pay you. We take it from here — you just add your IBAN once."; },
      chips: ["What’s your fee?", "How fast can it list?", "Estimate another flat"],
      stepsSummary: "Done. Here’s exactly what happens next — three steps, then you just get paid.",
      steps: [
        { n: "1", t: "Tell us about your flat", d: "Five-minute form. We evaluate it and propose terms, no commitment." },
        { n: "2", t: "We prepare and publish", d: "Photos, copy in two languages, pricing and channels. Live as soon as it’s ready." },
        { n: "3", t: "You get paid", d: "Add your IBAN once and receive your share after every stay. Zero management." }
      ],
      startedChips: ["How is the deposit handled?", "Can I block my own dates?", "Talk to the team"],
      contactWa: "Start on WhatsApp", contactEmail: "Email the team",
      waHost: "Hi Ebrostay, I'd like to list my property for zero-touch hosting.",
      mailSubjectHost: "Ebrostay — list my property",
      feeReply: "Simple and all-in: one management fee per booking, taken only when you earn. No setup cost, no monthly fee, no lock-in. You see every euro in your host portal.",
      timelineReply: "Fast. We shoot photos and write the listing within a few days of seeing the flat, then it goes live across our channels. Most homes are earning inside two weeks.",
      genericReply: "Got it. Tell us the neighbourhood and size and I’ll estimate the payout — or hit \"Start hosting\" and a team member will tailor everything with you.",
      areaWords: { studio: "studio", one: "1-bed", two: "2-bed", three: "3-bed", flat: "flat" }
    },
    es: {
      hostsBadge: "PROPIETARIOS", newEstimate: "nueva estimación", modeGuest: "Huésped", modeHost: "Anfitrión",
      hostLogin: "Acceso propietarios",
      acctPhoneTitle: "Tus viviendas, por número",
      acctPhoneBlurb: "Sin cuenta, sin contraseña — solo tu teléfono. Introdúcelo para ver tus viviendas y pagos.",
      acctSendCode: "Envíame un código", acctNoPassword: "Te enviamos un código de 6 dígitos. Ese es todo el acceso.",
      acctCodeTitle: "Introduce el código", acctVerify: "Verificar", acctChangeNumber: "Cambiar número",
      acctMyListings: "Tus viviendas",
      acctNoListings: "Aún no hay viviendas. Pide una estimación y pulsa «Empezar» — aparecerá aquí, ligada a tu número.",
      acctSignOut: "Cerrar sesión",
      acctCodeBlurb: function (p) { return "Enviamos un código de 6 dígitos al +34 " + p + "."; },
      acctDemoHint: function (c) { return "Demo: tu código es " + c + " (cualquier 6 dígitos vale)."; },
      listingNetLabel: "/mes a tu IBAN", listingStatus: "En alta",
      greeting: "¿Cuánto podría ganar tu piso?",
      sub: "Cuéntanos cómo es tu vivienda. Nosotros nos encargamos de todo; tú cobras.",
      placeholderEmpty: "p. ej. piso de 2 dormitorios amueblado cerca de la universidad, con ascensor…",
      placeholderRefine: "Ajusta — añade otra vivienda, pregunta por la comisión o los plazos…",
      examples: ["2 dormitorios amueblado cerca de la universidad", "3 dormitorios en Movera, por habitaciones", "Estudio en el Centro"],
      estTail: "Esto es lo que podría pagarte la gestión sin esfuerzo — solo añades tu IBAN una vez.",
      estLabel: "PAGO NETO ESTIMADO", per: "/ mes", iban: "a tu IBAN tras cada estancia",
      occL: "ocupación", effortL: "tu esfuerzo", handleL: "NOS ENCARGAMOS DE TODO",
      handles: ["Fotos y anuncio", "Precio dinámico", "Verificación de huéspedes", "Contrato de temporada", "Renta y fianza", "Entrada y llaves", "Limpieza y turnover", "Soporte", "Pagos a tu IBAN"],
      startLabel: "Empezar →", note: "Un miembro del equipo te contacta en menos de 24 h. Sin compromiso.",
      estSummary: function (net, area) { return "Para una vivienda como la tuya (" + area + "), esto es lo que podría pagarte la gestión sin esfuerzo. A partir de aquí nos encargamos nosotros — tú solo añades tu IBAN una vez."; },
      chips: ["¿Cuál es la comisión?", "¿Cuánto tarda en publicarse?", "Estimar otra vivienda"],
      stepsSummary: "Hecho. Esto es exactamente lo que pasa ahora — tres pasos y solo cobras.",
      steps: [
        { n: "1", t: "Cuéntanos tu vivienda", d: "Formulario de cinco minutos. La evaluamos y te proponemos condiciones, sin compromiso." },
        { n: "2", t: "La preparamos y publicamos", d: "Fotos, textos en dos idiomas, precio y canales. Activa en cuanto esté lista." },
        { n: "3", t: "Cobras", d: "Añades tu IBAN una vez y recibes tu parte tras cada estancia. Cero gestión." }
      ],
      startedChips: ["¿Cómo se gestiona la fianza?", "¿Puedo bloquear mis fechas?", "Hablar con el equipo"],
      contactWa: "Empezar por WhatsApp", contactEmail: "Escríbenos",
      waHost: "Hola Ebrostay, quiero poner mi vivienda en gestión sin esfuerzo.",
      mailSubjectHost: "Ebrostay — gestionar mi vivienda",
      feeReply: "Sencillo y todo incluido: una comisión de gestión por reserva, solo cuando ganas. Sin coste de alta, sin cuota mensual, sin permanencia. Ves cada euro en tu portal.",
      timelineReply: "Rápido. Hacemos fotos y redactamos el anuncio pocos días después de ver el piso, y se publica en todos nuestros canales. La mayoría empieza a generar en menos de dos semanas.",
      genericReply: "Entendido. Dinos el barrio y el tamaño y te estimo el pago — o pulsa \"Empezar\" y un miembro del equipo lo prepara todo contigo.",
      areaWords: { studio: "estudio", one: "1 dormitorio", two: "2 dormitorios", three: "3 dormitorios", flat: "vivienda" }
    }
  };

  window.EBR_I18N = { GUEST: GUEST, HOST: HOST };
  window.EBR_CONTACT = { whatsapp: "34678715418", email: "info@ebrostay.com" };
})();
