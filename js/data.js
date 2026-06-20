/* ============================================================
   EBROSTAY — INVENTORY DATA
   Real Zaragoza mid-stay homes (source of truth: the live ebrostay.com
   catalogue / Supabase `properties` table). This file ships the catalogue
   as a static seed so the site is fully functional offline; when Supabase
   is reachable, loadLiveHomes() replaces the seed with live published rows.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Map projection -------------------------------------------------
     Project a Zaragoza lat/lng into the 0–100 coordinate space of the
     conversation mini-map (the same box the Ebro river curve is drawn in). */
  var BOUNDS = { wLng: -0.92, eLng: -0.80, nLat: 41.68, sLat: 41.63 };
  function project(lat, lng) {
    var x = ((lng - BOUNDS.wLng) / (BOUNDS.eLng - BOUNDS.wLng)) * 80 + 10;
    var y = ((BOUNDS.nLat - lat) / (BOUNDS.nLat - BOUNDS.sLat)) * 70 + 15;
    return {
      x: Math.max(6, Math.min(94, Math.round(x * 10) / 10)),
      y: Math.max(8, Math.min(92, Math.round(y * 10) / 10))
    };
  }

  /* ---- Static seed: the 4 real homes ---------------------------------
     Each home carries bilingual copy, real prices, amenity keys, search
     tags (neighbourhood keywords the matcher looks for) and real photos
     where we have them. `beds` and `tags` drive the conversational filter. */
  function home(o) {
    var p = project(o.lat, o.lng);
    o.x = p.x; o.y = p.y;
    o.priceLabel = "€" + o.priceN + "/mo";
    o.pinPrice = "€" + o.priceN.toLocaleString("en-US");
    return o;
  }

  var HOMES = [
    home({
      id: "pedro1", ref: "EBR-PED1-ZGZ",
      lat: 41.65393, lng: -0.90783,
      name: { es: "Pedro II el Católico 3 · 1º IZQ", en: "Pedro II el Católico 3 · 1st left" },
      hood: { es: "Universidad · Pedro II el Católico", en: "University · Pedro II el Católico" },
      priceN: 950, guests: 4, beds: 2, rating: 4.8,
      availableFrom: "2026-07-01",
      tags: "universidad pedro centro university",
      amen: ["wifi", "desk", "lift", "heating", "kitchen"],
      photos: [],
      blurb: {
        es: "Piso amueblado en Pedro II el Católico 3, preparado para estancias de media duración en Zaragoza.",
        en: "Furnished flat at Pedro II el Católico 3, prepared for medium-stay rentals in Zaragoza."
      },
      about: {
        es: "Primero izquierda en una ubicación urbana y bien comunicada, con cocina equipada, zona de trabajo y gestión local Ebrostay. A un paso de la Universidad y del centro.",
        en: "First-floor left in a connected urban location, with an equipped kitchen, a work area and local Ebrostay management. A short walk from the University and the centre."
      }
    }),
    home({
      id: "pedro2", ref: "EBR-PED2-ZGZ",
      lat: 41.65416, lng: -0.90756,
      name: { es: "Pedro II el Católico 3 · 2º IZQ", en: "Pedro II el Católico 3 · 2nd left" },
      hood: { es: "Universidad · Pedro II el Católico", en: "University · Pedro II el Católico" },
      priceN: 980, guests: 4, beds: 2, rating: 4.7,
      availableFrom: "2026-07-10",
      tags: "universidad pedro centro university",
      amen: ["wifi", "desk", "lift", "heating", "kitchen", "ac"],
      photos: [],
      blurb: {
        es: "Segundo izquierda en el mismo edificio, una opción práctica para profesionales, estudiantes o traslados temporales.",
        en: "Second-floor left in the same building, a practical option for professionals, students or temporary relocations."
      },
      about: {
        es: "Vivienda amueblada con distribución funcional, wifi, calefacción, aire acondicionado y soporte local para la llegada y la estancia.",
        en: "Furnished home with a functional layout, wifi, heating, air conditioning and local support for arrival and stay."
      }
    }),
    home({
      id: "movera0", ref: "EBR-MOV2-ZGZ",
      lat: 41.64929, lng: -0.82209,
      name: { es: "Movera 7 · Segunda Planta", en: "Movera 7 · Second Floor" },
      hood: { es: "Movera", en: "Movera" },
      priceN: 1350, guests: 3, beds: 3, rating: 4.9,
      priceNote: { es: "o 450 €/habitación", en: "or €450/room" },
      availableFrom: "2026-07-01",
      tags: "movera",
      amen: ["wifi", "desk", "heating", "kitchen"],
      photos: [
        "assets/photos/movera-second-hero.jpg",
        "assets/photos/movera-second-bedroom-1.jpg",
        "assets/photos/movera-second-bedroom-2.jpg",
        "assets/photos/movera-second-bedroom-3.jpg",
        "assets/photos/movera-second-bathroom.jpg"
      ],
      blurb: {
        es: "Piso de 3 habitaciones privadas en Movera 7 (segunda planta), ideal para equipos de empresa, técnicos y estancias por proyecto.",
        en: "Three private bedrooms at Movera 7 (second floor), ideal for company teams, technicians and project stays."
      },
      about: {
        es: "Tres dormitorios privados con salón, comedor y cocina equipada compartidos y baño completo. Gastos incluidos con suministros limitados a 50 € por habitación, autoentrada con lockbox y soporte 24/7. Piso completo o por habitaciones.",
        en: "Three private bedrooms with shared living room, dining area and equipped kitchen, plus a full bathroom. Bills included with utilities capped at €50 per room, self check-in by lockbox and 24/7 support. Whole flat or room by room."
      }
    }),
    home({
      id: "movera1", ref: "EBR-MOV1-ZGZ",
      lat: 41.64952, lng: -0.82182,
      name: { es: "Movera 7 · Primera Planta", en: "Movera 7 · First Floor" },
      hood: { es: "Movera", en: "Movera" },
      priceN: 1350, guests: 3, beds: 3, rating: 4.7,
      priceNote: { es: "o 450 €/habitación", en: "or €450/room" },
      availableFrom: "2026-07-01",
      tags: "movera",
      amen: ["wifi", "desk", "heating", "kitchen", "terrace"],
      photos: [
        "assets/photos/movera-first-hero.jpg",
        "assets/photos/movera-first-bedroom-1.jpg",
        "assets/photos/movera-first-bedroom-2.jpg",
        "assets/photos/movera-first-bathroom.jpg"
      ],
      blurb: {
        es: "Piso de 3 habitaciones privadas en Movera 7, ideal para equipos de empresa, técnicos y estancias por proyecto.",
        en: "Three private bedrooms at Movera 7, ideal for company teams, technicians and project stays."
      },
      about: {
        es: "Tres dormitorios privados con salón, comedor y cocina equipada compartidos, baño completo y terraza. Gastos incluidos con suministros limitados a 50 € por habitación, autoentrada con lockbox y soporte 24/7. Piso completo o por habitaciones.",
        en: "Three private bedrooms with shared living room, dining area and equipped kitchen, full bathroom and terrace. Bills included with utilities capped at €50 per room, self check-in by lockbox and 24/7 support. Whole flat or room by room."
      }
    })
  ];

  /* ---- Live enrichment from Supabase ---------------------------------
     Progressive enhancement: when supabase-js is present and the project is
     reachable, pull published rows and map them onto the same home shape.
     Any failure leaves the static seed in place. */
  function tagsFor(row) {
    var s = ((row.area_en || "") + " " + (row.area_es || "") + " " + (row.address_key || "")).toLowerCase();
    var t = [];
    if (/pedro|universidad|university/.test(s)) t.push("universidad", "pedro", "centro", "university");
    if (/movera/.test(s)) t.push("movera");
    if (/ebro|r[ií]o|river|arrabal/.test(s)) t.push("ebro", "river");
    if (/pilar/.test(s)) t.push("pilar");
    if (/tubo|casco/.test(s)) t.push("tubo", "casco");
    if (/fuentes/.test(s)) t.push("fuentes");
    if (/centro|gran ?v[ií]a/.test(s)) t.push("centro");
    return t.join(" ") || "zaragoza";
  }

  function loadLiveHomes() {
    return new Promise(function (resolve) {
      try {
        var url = window.EBR_SUPABASE_URL, key = window.EBR_SUPABASE_ANON_KEY;
        if (!url || !key || !window.supabase || !window.supabase.createClient) return resolve(null);
        var client = window.supabase.createClient(url, key);
        var timed = false;
        var to = setTimeout(function () { timed = true; resolve(null); }, 6000);
        client
          .from("properties")
          .select("id,name,area_es,area_en,address_key,lat,lng,guests,bedrooms,price_number,price_note_es,price_note_en,rating,available_from,amenities,copy_es,copy_en,details_es,details_en,is_published,property_photos(storage_path,sort_order)")
          .eq("is_published", true)
          .order("price_number", { ascending: true })
          .then(function (res) {
            if (timed) return;
            clearTimeout(to);
            if (res.error || !res.data || !res.data.length) return resolve(null);
            var mapped = res.data.map(function (row) {
              var photos = (row.property_photos || [])
                .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
                .map(function (ph) {
                  try { return client.storage.from("property-photos").getPublicUrl(ph.storage_path).data.publicUrl; }
                  catch (e) { return null; }
                })
                .filter(Boolean);
              var p = project(row.lat || BOUNDS.nLat, row.lng || BOUNDS.wLng);
              var priceN = row.price_number || 0;
              return {
                id: row.id, ref: "EBR-" + String(row.id).toUpperCase().slice(0, 4) + "-ZGZ",
                name: { es: row.name, en: row.name },
                hood: { es: row.area_es || row.area_en || "Zaragoza", en: row.area_en || row.area_es || "Zaragoza" },
                priceN: priceN, priceLabel: "€" + priceN + "/mo", pinPrice: "€" + priceN.toLocaleString("en-US"),
                priceNote: (row.price_note_es || row.price_note_en) ? { es: row.price_note_es || "", en: row.price_note_en || "" } : null,
                guests: row.guests || 2, beds: row.bedrooms || 1, rating: row.rating || null,
                availableFrom: row.available_from || null,
                tags: tagsFor(row), amen: row.amenities || ["wifi"],
                photos: photos, x: p.x, y: p.y,
                blurb: { es: row.copy_es || row.copy_en || "", en: row.copy_en || row.copy_es || "" },
                about: { es: row.details_es || row.copy_es || "", en: row.details_en || row.copy_en || "" }
              };
            }).filter(function (h) { return h.priceN > 0; });
            resolve(mapped.length ? mapped : null);
          }, function () { if (!timed) { clearTimeout(to); resolve(null); } });
      } catch (e) { resolve(null); }
    });
  }

  window.EBR_DATA = { HOMES: HOMES, loadLiveHomes: loadLiveHomes, project: project };
})();
