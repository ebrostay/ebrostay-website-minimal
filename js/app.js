/* ============================================================
   EBROSTAY — CONVERSATIONAL APP ENGINE (vanilla, no framework)
   One stateful screen with two macro-states (entry / conversation),
   driven by `started`. Runs in two modes — guest & host — selected by
   window.EBR_MODE. Faithful port of the design handoff's DCLogic class.
   ============================================================ */
(function () {
  "use strict";

  var I18N = window.EBR_I18N;
  var CONTACT = window.EBR_CONTACT;
  var DATA = window.EBR_DATA;

  /* ---------- tiny DOM helper ---------- */
  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!attrs.hasOwnProperty(k) || attrs[k] == null) continue;
        var v = attrs[k];
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "onclick") node.addEventListener("click", v);
        else if (k === "oninput") node.addEventListener("input", v);
        else if (k === "onkeydown") node.addEventListener("keydown", v);
        else node.setAttribute(k, v);
      }
    }
    if (kids != null) {
      if (!Array.isArray(kids)) kids = [kids];
      kids.forEach(function (c) { if (c != null && c !== false) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    }
    return node;
  }

  /* ---------- inline icons ---------- */
  var IC = {
    logo: '<svg width="SZ" height="SZ" viewBox="0 0 48 48" aria-label="Ebrostay"><g transform="translate(0,7)"><path fill="#1f8a57" d="M7 30 L7 21 A17 17 0 0 1 41 21 L41 30 L35 30 L35 22 A11 11 0 0 0 13 22 L13 30 Z"></path><path fill="#9cc4f0" d="M13 30 L13 26.5 C16.5 25.1 19.5 27.4 24 26.3 C28.5 25.2 31.5 27.4 35 26.3 L35 30 Z"></path></g></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4-4"></path></svg>',
    house: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path></svg>',
    houseBig: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path></svg>',
    sun: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"></path></svg>',
    moon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"></path></svg>',
    user: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    wa: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1 1 21 11.5z"></path></svg>',
    mail: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>'
  };

  /* ================= App ================= */
  function App(mode) {
    this.mode = mode;                       // 'guest' | 'host'
    this.STR = I18N[mode === "host" ? "HOST" : "GUEST"];
    this.K = mode === "host"
      ? { convo: "ebrostay-host-convo", draft: "ebrostay-host-draft", user: "ebrostay-host-user", db: "ebrostay-hostdb-" }
      : { convo: "ebrostay-guest-convo", draft: "ebrostay-guest-draft", user: "ebrostay-guest-user", db: "ebrostay-db-" };
    this.state = {
      lang: "en", theme: "light", started: false, messages: [],
      accountOpen: false, acctStage: "phone", acctPhone: "", acctCode: "", acctGenCode: "",
      user: null, stays: [], openHome: null, activePhoto: 0
    };
    this.draft = "";                        // uncontrolled (no re-render on type)
    this.context = "";
    this.homes = DATA.HOMES.slice();
    this.timers = [];
    this._lastCount = 0;
    this._needEntryFocus = false;
    this._needDockFocus = false;
  }

  App.prototype.t = function () { return this.STR[this.state.lang]; };
  App.prototype.L = function (obj) { return obj ? (obj[this.state.lang] || obj.en || obj.es || "") : ""; };

  /* ---------- lifecycle ---------- */
  App.prototype.mount = function (root) {
    this.root = root;
    this.restore();
    var self = this;
    // live inventory enrichment (guest only relies on it; harmless for host)
    if (DATA.loadLiveHomes) {
      DATA.loadLiveHomes().then(function (live) { if (live && live.length) self.homes = live; });
    }
    this._needEntryFocus = !this.state.started;
    this.render();
    document.documentElement.setAttribute("data-theme", this.state.theme);
  };

  App.prototype.restore = function () {
    try {
      var th = localStorage.getItem("ebrostay-theme");
      var lg = localStorage.getItem("ebrostay-lang");
      if (th === "dark" || th === "light") this.state.theme = th;
      if (lg === "en" || lg === "es") this.state.lang = lg;
      var raw = localStorage.getItem(this.K.convo);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.messages && d.messages.length) {
          this.context = d.context || "";
          this.state.messages = d.messages;
          this.state.started = !!d.started;
          this._lastCount = d.messages.length;
        }
      }
      var dr = localStorage.getItem(this.K.draft);
      if (dr) this.draft = dr;
      var u = localStorage.getItem(this.K.user);
      if (u) { this.state.user = u; this.state.acctStage = "in"; this.state.stays = this.loadStays(u); }
    } catch (e) {}
  };

  App.prototype.set = function (patch) {
    for (var k in patch) this.state[k] = patch[k];
    this.render();
  };

  App.prototype.saveConvo = function () {
    try {
      var msgs = this.state.messages;
      var last = msgs[msgs.length - 1];
      if (last && last.thinking) return;
      localStorage.setItem(this.K.convo, JSON.stringify({ messages: msgs, context: this.context, started: this.state.started }));
    } catch (e) {}
  };

  /* ---------- phone-as-identity (localStorage demo; swap for Twilio + DB) ---------- */
  App.prototype.cleanPhone = function (v) { return (v || "").replace(/[^0-9]/g, ""); };
  App.prototype.loadStays = function (phone) {
    try { var r = localStorage.getItem(this.K.db + phone); return r ? JSON.parse(r) : []; } catch (e) { return []; }
  };
  App.prototype.saveStay = function (phone, stay) {
    try {
      var list = this.loadStays(phone);
      if (list.some(function (s) { return s.ref === stay.ref; })) return list;
      var next = [stay].concat(list);
      localStorage.setItem(this.K.db + phone, JSON.stringify(next));
      return next;
    } catch (e) { return this.loadStays(phone); }
  };
  App.prototype.sendCode = function () {
    var p = this.cleanPhone(this.state.acctPhone);
    if (p.length < 6) return;
    var code = String(Math.floor(100000 + Math.random() * 900000));
    this.set({ acctStage: "code", acctGenCode: code, acctCode: "" });
  };
  App.prototype.verify = function () {
    var entered = this.cleanPhone(this.state.acctCode);
    if (entered.length !== 6) return;        // accept the generated code OR any 6 digits (demo)
    var phone = this.cleanPhone(this.state.acctPhone);
    try { localStorage.setItem(this.K.user, phone); } catch (e) {}
    this.set({ user: phone, acctStage: "in", stays: this.loadStays(phone), acctCode: "", acctGenCode: "" });
  };
  App.prototype.signOut = function () {
    try { localStorage.removeItem(this.K.user); } catch (e) {}
    this.set({ user: null, acctStage: "phone", acctPhone: "", acctCode: "", acctGenCode: "", stays: [] });
  };

  /* ---------- theme & language (shared keys across both apps) ---------- */
  App.prototype.setLang = function (l) { try { localStorage.setItem("ebrostay-lang", l); } catch (e) {} this.set({ lang: l }); };
  App.prototype.toggleTheme = function () {
    var nt = this.state.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("ebrostay-theme", nt); } catch (e) {}
    document.documentElement.setAttribute("data-theme", nt);
    this.set({ theme: nt });
  };

  /* ---------- send loop ---------- */
  App.prototype.send = function (text) {
    var v = (text != null ? text : this.draft).trim();
    if (!v) return;
    if (this.mode !== "host") this.context = this.context ? this.context + " " + v : v;
    var msgs = this.state.messages.concat([{ role: "user", text: v }, { role: "system", thinking: true }]);
    this.draft = "";
    try { localStorage.removeItem(this.K.draft); } catch (e) {}
    this._needDockFocus = true;
    this.set({ messages: msgs, started: true });
    var res = this.mode === "host" ? this.buildReply(v) : this.buildResults(this.context);
    var self = this;
    this.timers.push(setTimeout(function () {
      var m2 = self.state.messages.slice();
      if (self.mode === "host") m2[m2.length - 1] = { role: "system", summary: res.summary, est: res.est || null, chips: res.chips };
      else m2[m2.length - 1] = { role: "system", summary: res.summary, results: res.results, chips: res.chips };
      self.set({ messages: m2 });
    }, 950));
  };

  App.prototype.reset = function () {
    this.context = "";
    try { localStorage.removeItem(this.K.convo); localStorage.removeItem(this.K.draft); } catch (e) {}
    this.draft = "";
    this._needEntryFocus = true;
    this.set({ messages: [], started: false });
  };

  /* ================= GUEST logic ================= */
  App.prototype.metaShort = function (h) {
    var t = this.t();
    return h.guests + " " + t.guests + " · " + (h.beds ? h.beds + " " + (h.beds > 1 ? t.bedMany : t.bedOne) : t.studio);
  };
  App.prototype.amenitiesFor = function (h) {
    var t = this.t();
    return [t.amenVerified].concat((h.amen || []).map(function (k) { return t.amen[k]; }).filter(Boolean)).concat([t.amenDeposit]);
  };
  App.prototype.card = function (h) {
    var t = this.t();
    var photos = h.photos || [];
    return {
      title: this.L(h.name), hood: this.L(h.hood), price: h.priceLabel, meta: this.metaShort(h),
      ref: h.ref, blurb: this.L(h.about) || this.L(h.blurb), cta: t.reserve, allIn: t.allInShort,
      hasImg: photos.length > 0, img: photos[0] || null, photos: photos, photoCount: photos.length + " " + t.photosWord,
      mapX: h.x, mapY: h.y, pinPrice: h.pinPrice, home: h,
      priceNote: h.priceNote ? this.L(h.priceNote) : null
    };
  };
  App.prototype.buildResults = function (q) {
    var t = this.t();
    var s = q.toLowerCase().replace(/(\d)[.,  ](\d{3})/g, "$1$2");
    if (/(own|owner|landlord|my (flat|home|apartment|piso)|rent out|list my|i have a (flat|piso|place)|tengo un piso|propietario|soy due|alquilar mi|mi vivienda)/.test(s)) {
      return {
        summary: t.ownerSummary,
        results: [{ title: t.ownerTitle, hood: "Zaragoza", price: "~€1,150/mo", meta: t.ownerNet, ref: "EST-ZGZ-01", blurb: t.ownerBlurb, cta: t.ownerCta, hasImg: false }],
        chips: t.ownerChips
      };
    }
    var pool = this.homes.slice();
    var budget = null;
    var bud = s.match(/(?:under|max|below|menos de|máximo|maximo|hasta|up to|<)\s*€?\s*(\d{3,4})/) || s.match(/€\s*(\d{3,4})/) || s.match(/(\d{3,4})\s*(?:€|eur|\/?\s*mo|a month|month|mes)/);
    if (bud) budget = parseInt(bud[1], 10);
    if (/cheap|cheaper|lower|less|budget|afford|barat|económic|economic/.test(s)) budget = budget ? Math.min(budget, 1200) : 1200;
    if (budget) pool = pool.filter(function (h) { return h.priceN <= budget; });
    var g = s.match(/(\d+)\s*(?:of us|people|guests|adults|persons|personas|huéspedes|huespedes)/) || s.match(/(?:team of|equipo de)\s*(\d+)/);
    if (g) { var n = parseInt(g[1], 10); pool = pool.filter(function (h) { return h.guests >= n; }); }
    if (/2 ?-?bed|two ?-?bed|bedrooms|2 bedroom|2 dormitorio|dos dormitorio|dormitorios|3 ?-?bed|three ?-?bed/.test(s)) pool = pool.filter(function (h) { return h.beds >= 2; });
    if (/movera/.test(s)) pool = pool.filter(function (h) { return /movera/.test(h.tags); });
    if (/universi|pedro|university/.test(s)) pool = pool.filter(function (h) { return /universidad|pedro|university/.test(h.tags); });
    if (/ebro|river|r[ií]o|riverside|junto al r/.test(s)) pool = pool.filter(function (h) { return /ebro|river/.test(h.tags); });
    if (/pilar|bas[ií]lica/.test(s)) pool = pool.filter(function (h) { return /pilar|centro/.test(h.tags); });
    if (/tubo|old ?town|casco/.test(s)) pool = pool.filter(function (h) { return /tubo|casco/.test(h.tags); });
    if (/fuentes/.test(s)) pool = pool.filter(function (h) { return /fuentes/.test(h.tags); });
    if (/parking|car|garage|coche|aparcamiento/.test(s)) pool = pool.filter(function (h) { return (h.amen || []).indexOf("parking") >= 0; });
    pool.sort(function (a, b) { return a.priceN - b.priceN; });
    var self = this;
    if (!pool.length) {
      return {
        summary: t.fallbackSummary,
        results: this.homes.slice().sort(function (a, b) { return a.priceN - b.priceN; }).slice(0, 2).map(function (h) { return self.card(h); }),
        chips: t.fallbackChips
      };
    }
    var top = pool.slice(0, 3);
    return { summary: t.searchSummary(top.length, budget), results: top.map(function (h) { return self.card(h); }), chips: t.chips };
  };
  App.prototype.reserve = function (r) {
    var t = this.t();
    var msgs = this.state.messages.concat([{ role: "system", summary: t.reserveConfirm(r.ref), results: [], chips: t.reserveChips, contact: { ref: r.ref, title: r.title } }]);
    var patch = { messages: msgs };
    if (this.state.user) patch.stays = this.saveStay(this.state.user, { ref: r.ref, title: r.title, price: r.price });
    this.set(patch);
  };
  App.prototype.waReserveUrl = function (c) { var t = this.t(); return "https://wa.me/" + CONTACT.whatsapp + "?text=" + encodeURIComponent(t.waReserve(c.ref, c.title)); };
  App.prototype.mailReserveUrl = function (c) { var t = this.t(); return "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent(t.mailSubject(c.ref)) + "&body=" + encodeURIComponent(t.waReserve(c.ref, c.title)); };

  /* ================= HOST logic ================= */
  App.prototype.estimate = function (q) {
    var t = this.t();
    var s = q.toLowerCase().replace(/(\d)[.,  ](\d{3})/g, "$1$2");
    var beds = 1, areaKey = "one";
    if (/studio|estudio/.test(s)) { beds = 0; areaKey = "studio"; }
    else if (/\b3\b|three|tres|3 ?-?bed|3 dormitorio/.test(s)) { beds = 3; areaKey = "three"; }
    else if (/\b2\b|two|dos|2 ?-?bed|2 dormitorio/.test(s)) { beds = 2; areaKey = "two"; }
    else if (/\b1\b|one|un |uno|1 ?-?bed|1 dormitorio/.test(s)) { beds = 1; areaKey = "one"; }
    var base = [900, 1150, 1450, 1750][beds] || 1150;
    var mult = 1.0, occ = 90;
    if (/centro|gran ?v[ií]a|pilar|tubo|casco|universi|pedro/.test(s)) { mult = 1.12; occ = 93; }
    else if (/ebro|river|r[ií]o|arrabal/.test(s)) { mult = 1.08; occ = 92; }
    else if (/movera|fuentes/.test(s)) { mult = 0.96; occ = 89; }
    var bonus = 0;
    if (/parking|garaje|garage/.test(s)) bonus += 40;
    if (/renov|reform|new|nuevo|lift|ascensor|terrace|terraza/.test(s)) bonus += 60;
    var net = Math.round((base * mult * 0.84 + bonus) / 10) * 10;
    var area = t.areaWords[areaKey] || t.areaWords.flat;
    return {
      label: t.estLabel, net: "€" + net.toLocaleString("en-US"), per: t.per, iban: t.iban,
      occ: occ + "%", occL: t.occL, effortL: t.effortL, handleL: t.handleL, handles: t.handles,
      startLabel: t.startLabel, note: t.note, summary: t.estSummary(net, area), area: area,
      ref: "EBR-" + (1000 + beds * 1000 + (occ % 100)) + "-ZGZ"
    };
  };
  App.prototype.buildReply = function (q) {
    var t = this.t();
    var s = q.toLowerCase();
    if (/fee|comisi|cost|coste|precio|charge|cobr[aá]/.test(s)) return { summary: t.feeReply, chips: t.startedChips };
    if (/fast|time|when|tarda|plazo|cu[aá]nto tarda|how long|quick/.test(s)) return { summary: t.timelineReply, chips: t.startedChips };
    if (/(2|3|1|studio|estudio|bed|dormitorio|flat|piso|apartment|near|junto|centro|fuentes|ebro|pilar|tubo|movera|universi|pedro|parking|renov|reform|lift|ascensor)/.test(s)) {
      var est = this.estimate(q);
      return { summary: est.summary, est: est, chips: t.chips };
    }
    return { summary: t.genericReply, chips: t.chips };
  };
  App.prototype.startHosting = function (est) {
    var t = this.t();
    var msgs = this.state.messages.concat([{ role: "system", summary: t.stepsSummary, steps: t.steps, chips: t.startedChips, contact: true }]);
    var patch = { messages: msgs };
    if (this.state.user && est) patch.stays = this.saveStay(this.state.user, { ref: est.ref || ("EBR-" + Math.floor(1000 + Math.random() * 9000) + "-ZGZ"), title: est.area || "Your flat", net: est.net });
    this.set(patch);
  };
  App.prototype.waHostUrl = function () { var t = this.t(); return "https://wa.me/" + CONTACT.whatsapp + "?text=" + encodeURIComponent(t.waHost); };
  App.prototype.mailHostUrl = function () { var t = this.t(); return "mailto:" + CONTACT.email + "?subject=" + encodeURIComponent(t.mailSubjectHost) + "&body=" + encodeURIComponent(t.waHost); };

  /* ================= detail overlay (guest) ================= */
  App.prototype.openDetail = function (h) { this.set({ openHome: h, activePhoto: 0 }); };
  App.prototype.closeDetail = function () { this.set({ openHome: null }); };

  /* ================= input handlers ================= */
  App.prototype.onDraftInput = function (e) {
    this.draft = e.target.value;
    try { localStorage.setItem(this.K.draft, this.draft); } catch (er) {}
  };
  App.prototype.onKey = function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.send(); return; }
    if (e.key === "ArrowUp" && !this.draft) {
      var last = null;
      for (var i = this.state.messages.length - 1; i >= 0; i--) { if (this.state.messages[i].role === "user") { last = this.state.messages[i]; break; } }
      if (last) { e.preventDefault(); this.draft = last.text; if (e.target) { e.target.value = last.text; e.target.selectionStart = e.target.selectionEnd = last.text.length; } }
    }
  };

  /* ================= render ================= */
  App.prototype.render = function () {
    var self = this, t = this.t(), st = this.state;
    var app = el("div", { class: "ebr-app", "data-theme": st.theme });
    app.appendChild(this.renderHeader());

    var body = el("div", { class: "ebr-body" });
    if (!st.started) body.appendChild(this.renderEntry());
    else { body.appendChild(this.renderScroll()); body.appendChild(this.renderDock()); }
    app.appendChild(body);

    if (this.mode !== "host" && st.openHome) app.appendChild(this.renderOverlay());

    this.root.innerHTML = "";
    this.root.appendChild(app);

    // persist + post-render focus/scroll
    this.saveConvo();
    if (st.started) {
      var sc = this.root.querySelector(".ebr-scroll");
      if (sc) sc.scrollTop = sc.scrollHeight;
      if (this._needDockFocus) { this._needDockFocus = false; var di = this.root.querySelector(".ebr-dock .ebr-input"); if (di) di.focus(); }
    } else if (this._needEntryFocus) {
      this._needEntryFocus = false;
      setTimeout(function () { var ei = self.root.querySelector(".ebr-entry .ebr-input"); if (ei) { ei.focus(); ei.selectionStart = ei.selectionEnd = ei.value.length; } }, 60);
    }
  };

  App.prototype.seg = function (active, label, iconHtml, onClick, href) {
    var attrs = { class: active ? "seg-on" : "seg-off" };
    var kids = [];
    if (iconHtml) { var ic = el("span", { html: iconHtml, style: "display:flex" }); kids.push(ic); }
    if (label) kids.push(el("span", { class: "ebr-hide-sm", text: label }));
    if (href) { attrs.href = href; return el("a", attrs, kids); }
    attrs.onclick = onClick; return el("button", attrs, kids);
  };

  App.prototype.renderHeader = function () {
    var self = this, t = this.t(), st = this.state;
    var markSize = st.started ? 26 : 32;

    // left cluster
    var logo = el("a", { class: "ebr-logo", href: this.mode === "host" ? "host.html" : "index.html", html: IC.logo.replace(/SZ/g, markSize) });
    if (!st.started) {
      var wm = el("span", { class: "ebr-wordmark", html: 'Ebro<span>stay</span>' });
      logo.appendChild(wm);
    }
    var leftKids = [logo];
    if (this.mode === "host" && !st.started) leftKids.push(el("span", { class: "ebr-host-badge ebr-hide-sm", text: t.hostsBadge }));
    if (st.started) {
      var lbl = this.mode === "host" ? t.newEstimate : t.newSearch;
      leftKids.push(el("button", { class: "ebr-newbtn", onclick: function () { self.reset(); } }, [document.createTextNode("+ "), el("span", { class: "ebr-hide-sm", text: lbl })]));
    }
    var left = el("div", { class: "ebr-head-left" + (this.mode === "host" ? " is-host" : "") }, leftKids);

    // right cluster
    var rightKids = [];
    if (!st.started) {
      var modeSeg = el("div", { class: "ebr-seg" });
      if (this.mode === "host") {
        modeSeg.appendChild(this.seg(false, t.modeGuest, IC.search, null, "index.html"));
        modeSeg.appendChild(this.seg(true, t.modeHost, IC.house, function () {}, null));
      } else {
        modeSeg.appendChild(this.seg(true, t.modeGuest, IC.search, function () {}, null));
        modeSeg.appendChild(this.seg(false, t.modeHost, IC.house, null, "host.html"));
      }
      rightKids.push(modeSeg);
    }
    var lang = el("div", { class: "ebr-seg ebr-lang" }, [
      el("button", { class: st.lang === "es" ? "seg-on" : "seg-off", text: "ES", onclick: function () { self.setLang("es"); } }),
      el("button", { class: st.lang === "en" ? "seg-on" : "seg-off", text: "EN", onclick: function () { self.setLang("en"); } })
    ]);
    rightKids.push(lang);
    rightKids.push(el("button", { class: "ebr-theme", "aria-label": "theme", html: st.theme === "dark" ? IC.moon : IC.sun, onclick: function () { self.toggleTheme(); } }));
    rightKids.push(this.renderAccount());
    var right = el("div", { class: "ebr-head-right" }, rightKids);

    return el("div", { class: "ebr-header" }, [left, right]);
  };

  App.prototype.renderAccount = function () {
    var self = this, t = this.t(), st = this.state;
    var btnLabel = st.user ? ("+34 " + st.user.slice(0, 3) + " …") : (this.mode === "host" ? t.hostLogin : t.signIn);
    var btn = el("button", { class: "ebr-acct-btn", onclick: function () { self.set({ accountOpen: !st.accountOpen }); } }, [
      el("span", { class: "ebr-acct-avatar", html: IC.user }),
      el("span", { class: "ebr-acct-label", text: btnLabel })
    ]);
    var wrap = el("div", { class: "ebr-acct-wrap" }, [btn]);
    if (!st.accountOpen) return wrap;

    wrap.appendChild(el("div", { class: "ebr-acct-scrim", onclick: function () { self.set({ accountOpen: false }); } }));
    var pop = el("div", { class: "ebr-acct-pop" });

    if (st.acctStage === "phone") {
      pop.appendChild(el("div", null, [el("div", { class: "ebr-acct-title", text: t.acctPhoneTitle }), el("div", { class: "ebr-acct-blurb", text: t.acctPhoneBlurb })]));
      var phoneInput = el("input", { value: st.acctPhone, inputmode: "tel", placeholder: "678 71 54 18" });
      phoneInput.addEventListener("input", function (e) { self.state.acctPhone = e.target.value; });
      phoneInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); self.sendCode(); } });
      pop.appendChild(el("div", { class: "ebr-phone-field" }, [el("span", { text: "+34" }), phoneInput]));
      pop.appendChild(el("button", { class: "ebr-btn-primary", text: t.acctSendCode, onclick: function () { self.sendCode(); } }));
      pop.appendChild(el("div", { class: "ebr-caption", text: t.acctNoPassword }));
    } else if (st.acctStage === "code") {
      pop.appendChild(el("div", null, [el("div", { class: "ebr-acct-title", text: t.acctCodeTitle }), el("div", { class: "ebr-acct-blurb", text: t.acctCodeBlurb(this.cleanPhone(st.acctPhone)) })]));
      var codeInput = el("input", { class: "ebr-code-input", value: st.acctCode, inputmode: "numeric", maxlength: "6", placeholder: "••••••" });
      codeInput.addEventListener("input", function (e) { self.state.acctCode = e.target.value; });
      codeInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); self.verify(); } });
      pop.appendChild(codeInput);
      pop.appendChild(el("div", { class: "ebr-demo-hint", text: t.acctDemoHint(st.acctGenCode) }));
      pop.appendChild(el("button", { class: "ebr-btn-primary", text: t.acctVerify, onclick: function () { self.verify(); } }));
      pop.appendChild(el("button", { class: "ebr-btn-text", text: t.acctChangeNumber, onclick: function () { self.set({ acctStage: "phone", acctCode: "" }); } }));
    } else {
      var title = this.mode === "host" ? t.acctMyListings : t.acctMyStays;
      var initial = (st.user || "?").slice(-2, -1) || "#";
      pop.appendChild(el("div", { class: "ebr-acct-inhead" }, [
        el("div", { class: "who" }, [el("div", { class: "nm", text: title }), el("div", { class: "ph", text: "+34 " + (st.user || "") })]),
        el("span", { class: "ebr-acct-initial", text: initial })
      ]));
      var stays = st.stays || [];
      if (stays.length) {
        var list = el("div", { class: "ebr-stays" });
        stays.forEach(function (s) {
          if (self.mode === "host") {
            list.appendChild(el("div", { class: "ebr-stay-card" }, [
              el("div", { class: "row" }, [el("div", { class: "ti", text: s.title }), el("span", { class: "status", text: t.listingStatus })]),
              el("div", { class: "rf", text: s.ref }),
              el("div", { class: "net" }, [el("b", { text: s.net }), el("small", { text: t.listingNetLabel })])
            ]));
          } else {
            list.appendChild(el("div", { class: "ebr-stay-card" }, [
              el("div", { class: "ti", text: s.title }),
              el("div", { class: "rf", text: s.ref + " · " + s.price }),
              el("a", { href: "https://wa.me/" + CONTACT.whatsapp + "?text=" + encodeURIComponent(t.waReserve(s.ref, s.title)), target: "_blank", rel: "noopener", text: t.acctMessageStay })
            ]));
          }
        });
        pop.appendChild(list);
      } else {
        pop.appendChild(el("div", { class: "ebr-empty-state", text: this.mode === "host" ? t.acctNoListings : t.acctNoStays }));
      }
      pop.appendChild(el("button", { class: "ebr-btn-text", text: t.acctSignOut, onclick: function () { self.signOut(); } }));
    }
    wrap.appendChild(pop);
    return wrap;
  };

  App.prototype.renderEntry = function () {
    var self = this, t = this.t();
    var ta = el("textarea", { class: "ebr-input", rows: "2", placeholder: t.placeholderEmpty });
    ta.value = this.draft;
    ta.addEventListener("input", function (e) { self.onDraftInput(e); });
    ta.addEventListener("keydown", function (e) { self.onKey(e); });
    var card = el("div", { class: "ebr-input-card" }, [
      ta,
      el("div", { class: "ebr-input-actions" }, [el("button", { class: "ebr-send", html: "→", onclick: function () { self.send(); } })])
    ]);
    var exRow = el("div", { class: "ebr-examples" });
    t.examples.forEach(function (label) { exRow.appendChild(el("button", { class: "ebr-chip-ex", text: label, onclick: function () { self.send(label); } })); });
    var inner = el("div", { class: "ebr-entry-inner" }, [
      el("div", { class: "ebr-lockup" }, [el("h1", { class: "ebr-h1", text: t.greeting }), el("p", { class: "ebr-sub", text: t.sub })]),
      card,
      el("div", { style: "display:flex;flex-direction:column;gap:12px;align-items:center;width:100%", }, [exRow])
    ]);
    return el("div", { class: "ebr-entry" }, [inner]);
  };

  App.prototype.renderScroll = function () {
    var self = this;
    var thread = el("div", { class: "ebr-thread" });
    this.state.messages.forEach(function (m) { thread.appendChild(self.renderMessage(m)); });
    return el("div", { class: "ebr-scroll" }, [thread]);
  };

  App.prototype.renderDock = function () {
    var self = this, t = this.t();
    var ta = el("textarea", { class: "ebr-input", rows: "1", placeholder: t.placeholderRefine });
    ta.value = this.draft;
    ta.addEventListener("input", function (e) { self.onDraftInput(e); });
    ta.addEventListener("keydown", function (e) { self.onKey(e); });
    var card = el("div", { class: "ebr-dock-card" }, [ta, el("button", { class: "ebr-dock-send", html: "→", onclick: function () { self.send(); } })]);
    return el("div", { class: "ebr-dock" }, [el("div", { class: "ebr-dock-inner" }, [card])]);
  };

  App.prototype.renderMessage = function (m) {
    var self = this, t = this.t();
    if (m.role === "user") return el("div", { class: "ebr-user" }, [el("div", { text: m.text })]);
    if (m.thinking) {
      return el("div", { class: "ebr-thinking" }, [
        el("span", { class: "lbl", text: "▍ ebrostay" }),
        el("span", { class: "dots" }, [
          el("span", { style: "animation-delay:0s" }), el("span", { style: "animation-delay:.2s" }), el("span", { style: "animation-delay:.4s" })
        ])
      ]);
    }
    // answer
    var kids = [el("div", { class: "ebr-answer-head" }, [el("span", { class: "lbl", text: "▍ ebrostay" }), el("p", { text: m.summary })])];

    if (this.mode === "host") {
      if (m.est) kids.push(this.renderEstimate(m.est));
      if (m.steps && m.steps.length) kids.push(this.renderSteps(m.steps));
    } else {
      if (m.results && m.results.length) kids.push(this.renderResults(m.results));
    }
    if (m.contact) kids.push(this.renderContact(m));
    if (m.chips && m.chips.length) {
      var chips = el("div", { class: "ebr-chips" });
      m.chips.forEach(function (label) { chips.appendChild(el("button", { class: "ebr-chip", text: label, onclick: function () { self.send(label); } })); });
      kids.push(chips);
    }
    return el("div", { class: "ebr-answer" }, kids);
  };

  /* ----- guest result rendering ----- */
  App.prototype.renderResults = function (results) {
    var self = this, wrap = el("div", { class: "ebr-results" });
    var withMap = results.filter(function (r) { return r.mapX != null; });
    if (withMap.length) wrap.appendChild(this.renderMap(withMap));
    results.forEach(function (r) { wrap.appendChild(self.renderCard(r)); });
    return wrap;
  };
  App.prototype.renderMap = function (pins) {
    var map = el("div", { class: "ebr-map" });
    map.innerHTML =
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M -6 16 C 24 30 44 26 66 42 C 82 53 94 56 106 54" fill="none" stroke="#9cc4f0" stroke-width="11" stroke-linecap="round" opacity="0.5"></path><path d="M 20 0 L 34 100 M 60 0 L 52 100 M 0 74 L 100 84" stroke="var(--border-default)" stroke-width="0.8" opacity="0.7"></path></svg>' +
      '<div class="ebr-map-label">ZARAGOZA · RÍO EBRO</div>';
    pins.forEach(function (r) {
      var pin = el("div", { class: "ebr-pin", style: "left:" + r.mapX + "%;top:" + r.mapY + "%" }, [
        el("div", { class: "pill", text: r.pinPrice }), el("div", { class: "stem" })
      ]);
      map.appendChild(pin);
    });
    return map;
  };
  App.prototype.renderCard = function (r) {
    var self = this;
    var photoCol = null;
    if (r.hasImg && r.img) {
      photoCol = el("div", { class: "ebr-card-photo" }, [el("img", { src: r.img, alt: "" }), el("div", { class: "ebr-photo-count", text: r.photoCount })]);
    } else if (r.home) {
      photoCol = el("div", { class: "ebr-card-photo is-empty", html: IC.houseBig });
    }
    var body = el("div", { class: "ebr-card-body" }, [
      el("div", { class: "ebr-card-top" }, [
        el("div", { style: "display:flex;flex-direction:column;gap:4px" }, [el("div", { class: "ebr-card-title", text: r.title }), el("div", { class: "ebr-card-hood", text: r.hood })]),
        el("div", { class: "ebr-card-price" }, [el("div", { class: "p", text: r.price }), el("div", { class: "a", text: r.allIn })])
      ]),
      el("div", { class: "ebr-card-blurb", text: r.blurb }),
      el("div", { class: "ebr-card-foot" }, [
        el("span", { class: "ebr-card-meta", text: r.meta + " · " + r.ref }),
        el("button", { class: "ebr-reserve", text: r.cta, onclick: function (e) { e.stopPropagation(); self.reserve(r); } })
      ])
    ]);
    var card = el("div", { class: "ebr-card" }, photoCol ? [photoCol, body] : [body]);
    if (r.home) card.addEventListener("click", function () { self.openDetail(r.home); });
    else card.style.cursor = "default";
    return card;
  };
  App.prototype.renderContact = function (m) {
    var wa, mail;
    if (this.mode === "host") { wa = this.waHostUrl(); mail = this.mailHostUrl(); }
    else { wa = this.waReserveUrl(m.contact); mail = this.mailReserveUrl(m.contact); }
    var t = this.t();
    return el("div", { class: "ebr-contact" }, [
      el("a", { class: "wa", href: wa, target: "_blank", rel: "noopener", html: IC.wa + "<span>" + t.contactWa + "</span>" }),
      el("a", { class: "mail", href: mail, html: IC.mail + "<span>" + t.contactEmail + "</span>" })
    ]);
  };

  /* ----- host estimate + steps ----- */
  App.prototype.renderEstimate = function (e2) {
    var self = this;
    var head = el("div", { class: "ebr-est-head" }, [
      el("div", { style: "display:flex;flex-direction:column;gap:6px" }, [
        el("div", { class: "ebr-est-label", text: e2.label }),
        el("div", { class: "ebr-est-fig" }, [el("span", { class: "net", text: e2.net }), el("span", { class: "per", text: e2.per })]),
        el("div", { class: "ebr-est-iban", text: e2.iban })
      ]),
      el("div", { class: "ebr-est-stats" }, [
        el("div", { class: "st" }, [el("b", { text: e2.occ }), el("small", { text: e2.occL })]),
        el("div", { class: "st" }, [el("b", { text: "0h" }), el("small", { text: e2.effortL })])
      ])
    ]);
    var handles = el("div", { class: "ebr-est-handles" });
    e2.handles.forEach(function (h) { handles.appendChild(el("span", { class: "ebr-handle" }, [el("span", { class: "dot" }), document.createTextNode(h)])); });
    var body = el("div", { class: "ebr-est-body" }, [
      el("div", { class: "h", text: e2.handleL }), handles,
      el("div", { class: "ebr-est-cta" }, [
        el("button", { class: "ebr-btn-lg", text: e2.startLabel, onclick: function () { self.startHosting(e2); } }),
        el("span", { class: "ebr-est-note", text: e2.note })
      ])
    ]);
    return el("div", { class: "ebr-est" }, [head, body]);
  };
  App.prototype.renderSteps = function (steps) {
    var wrap = el("div", { class: "ebr-steps" });
    steps.forEach(function (s) {
      wrap.appendChild(el("div", { class: "ebr-step" }, [
        el("span", { class: "n", text: s.n }),
        el("div", null, [el("div", { class: "ti", text: s.t }), el("div", { class: "de", text: s.d })])
      ]));
    });
    return wrap;
  };

  /* ----- detail overlay ----- */
  App.prototype.renderOverlay = function () {
    var self = this, t = this.t(), h = this.state.openHome;
    var photos = h.photos || [];
    var ai = this.state.activePhoto;
    var hero, ref;
    var heroWrap = el("div", { class: "ebr-hero" + (photos.length ? "" : " is-empty") });
    if (photos.length) heroWrap.appendChild(el("img", { src: photos[ai], alt: "" }));
    else heroWrap.appendChild(el("div", { html: IC.houseBig.replace('width="30" height="30"', 'width="64" height="64"'), style: "color:var(--text-brand)" }));
    heroWrap.appendChild(el("button", { class: "ebr-hero-close", html: "✕", onclick: function () { self.closeDetail(); } }));
    heroWrap.appendChild(el("div", { class: "ebr-hero-ref", text: h.ref }));

    var panelKids = [heroWrap];
    if (photos.length > 1) {
      var thumbs = el("div", { class: "ebr-thumbs" });
      photos.forEach(function (url, i) {
        thumbs.appendChild(el("img", { class: i === ai ? "active" : "", src: url, alt: "", onclick: function () { self.set({ activePhoto: i }); } }));
      });
      panelKids.push(thumbs);
    }

    var metaLine = this.metaShort(h) + " · " + t.months + (h.priceNote ? " · " + this.L(h.priceNote) : "");
    var top = el("div", { class: "ebr-panel-top" }, [
      el("div", { style: "display:flex;flex-direction:column;gap:7px" }, [
        el("div", { class: "hood", text: this.L(h.hood) }),
        el("h2", { text: this.L(h.name) }),
        el("div", { class: "meta", text: metaLine })
      ]),
      el("div", { class: "ebr-panel-price" }, [el("div", { class: "p", text: h.priceLabel }), el("div", { class: "a", text: t.allInLong })])
    ]);
    var amens = el("div", { class: "ebr-amens" });
    this.amenitiesFor(h).forEach(function (a) { amens.appendChild(el("span", { class: "ebr-amen", text: a })); });
    var body = el("div", { class: "ebr-panel-body" }, [
      top,
      el("p", { class: "ebr-panel-summary", text: this.L(h.about) || this.L(h.blurb) }),
      el("div", { class: "ebr-amen-group" }, [el("div", { class: "h", text: t.whatsInside }), amens]),
      el("div", { class: "ebr-panel-cta" }, [
        el("button", { class: "ebr-btn-lg", text: t.reserve, onclick: function () { var c = self.card(h); self.closeDetail(); self.reserve(c); } }),
        el("span", { class: "note", text: t.freeCancel })
      ])
    ]);
    panelKids.push(body);

    var panel = el("div", { class: "ebr-panel", "data-theme": this.state.theme }, panelKids);
    panel.addEventListener("click", function (e) { e.stopPropagation(); });
    var overlay = el("div", { class: "ebr-overlay", onclick: function () { self.closeDetail(); } }, [panel]);
    return overlay;
  };

  /* ---------- boot ---------- */
  window.EBR_App = App; // exposed for testing / programmatic access
  window.EBR_BOOT = function (mode) {
    var app = new App(mode);
    var root = document.getElementById("ebr-root");
    app.mount(root);
    window.__ebrApp = app;
  };
})();
