// Almaty Guide — вся логика сайта (Vanilla JS)
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* хранилище недоступно */ } }
  };
  const fmt = n => Math.round(n).toLocaleString("ru-RU") + " ₸";
  const byId = id => PLACES.find(p => p.id === id);
  const priceLabel = p => (p.price === 0 ? "Бесплатно" : "≈ " + fmt(p.price));

  const state = {
    aud: store.get("ag_aud", "turist"),
    cmp: [],
    route: store.get("ag_route", []).filter(byId)
  };

  // ---------- Уведомления ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ---------- Появление при скролле ----------
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.1 })
    : null;
  const observe = () => $$(".reveal:not(.in)").forEach(el => (io ? io.observe(el) : el.classList.add("in")));

  // ---------- Каталог ----------
  function filtered() {
    const q = $("#q").value.trim().toLowerCase();
    const cat = $("#fCat").value, aud = $("#fAud").value, price = $("#fPrice").value, dur = $("#fDur").value;
    return PLACES.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || p.tags.join(" ").toLowerCase().includes(q)) &&
      (!cat || p.cat === cat) && (!aud || p.aud.includes(aud)) &&
      (price === "" || p.price <= Number(price)) &&
      (!dur || (dur === "99" ? p.dur > 2 : p.dur <= Number(dur)))
    ).sort((a, b) => {
      // Для выбранной аудитории — сначала подходящие, а для первокурсника ещё и дешёвые
      const sa = a.aud.includes(state.aud) ? 0 : 1, sb = b.aud.includes(state.aud) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return state.aud === "student" ? a.price - b.price : 0;
    });
  }

  function cardHtml(p) {
    const inCmp = state.cmp.includes(p.id), inRoute = state.route.includes(p.id);
    const badges = [...p.aud.map(a => "Для " + (a === "turist" ? "туриста" : "первокурсника")),
      ...(p.price === 0 ? ["Бесплатно"] : p.price <= 1500 ? ["Бюджетно"] : [])];
    return `<article class="card reveal" data-id="${p.id}">
      <img src="images/${p.img}.svg" alt="Иллюстрация: ${p.name}" loading="lazy" width="600" height="400">
      <div class="card-b"><span class="chip">${CATS[p.cat]}</span><h3>${p.name}</h3>
      <p class="muted">${p.district}</p><p>${p.short}</p>
      <ul class="facts"><li>💰 ${priceLabel(p)}</li><li>⏱ ${p.dur} ч · 🕘 ${p.hours}</li><li>🚌 ${p.transport}</li></ul>
      <div class="tags">${badges.map(b => `<span class="tag">${b}</span>`).join("")}</div>
      <div class="btns">
        <button class="btn sm" data-act="more">Подробнее</button>
        <button class="btn sm ghost" data-act="cmp" aria-pressed="${inCmp}">${inCmp ? "Убрать из сравнения" : "Добавить к сравнению"}</button>
        <button class="btn sm ghost" data-act="route" aria-pressed="${inRoute}">${inRoute ? "В маршруте ✓" : "В мой маршрут"}</button>
      </div></div></article>`;
  }

  function renderCatalog() {
    const list = filtered();
    $("#found").textContent = `Найдено мест: ${list.length}`;
    $("#grid").innerHTML = list.length ? list.map(cardHtml).join("") : `<p class="empty">Ничего не найдено. Сбросьте фильтры или измените запрос.</p>`;
    observe();
  }

  // ---------- Модальное окно ----------
  let lastFocus = null;
  function openModal(id) {
    const p = byId(id); if (!p) return;
    lastFocus = document.activeElement;
    $("#mBody").innerHTML = `<img src="images/${p.img}.svg" alt="Иллюстрация: ${p.name}" style="border-radius:12px;margin-bottom:16px">
      <h2 id="mTitle">${p.name}</h2><p class="muted">${CATS[p.cat]} · ${p.district}</p><p>${p.long}</p>
      <p><b>Цена:</b> ${priceLabel(p)}<br><b>Часы:</b> ${p.hours}<br><b>Сезон:</b> ${p.season}<br><b>Как добраться:</b> ${p.transport}</p>
      <h3>Советы</h3><ul>${p.tips.map(t => `<li>${t}</li>`).join("")}</ul>
      <p class="note muted">Цены и часы ориентировочные, уточняйте на официальных сайтах.</p>
      <div class="btns"><button class="btn sm" data-modal="cmp" data-id="${p.id}">Добавить к сравнению</button>
      <button class="btn sm accent" data-modal="route" data-id="${p.id}">В мой маршрут</button></div>`;
    $("#modal").hidden = false; $(".dlg").focus();
  }
  function closeModal() { $("#modal").hidden = true; if (lastFocus) lastFocus.focus(); }

  // ---------- Сравнение ----------
  function toggleCompare(id) {
    if (state.cmp.includes(id)) state.cmp = state.cmp.filter(x => x !== id);
    else if (state.cmp.length >= 3) { toast("Можно сравнить не более 3 мест. Уберите одно из выбранных."); return; }
    else state.cmp.push(id);
    renderCompare(); renderCatalog();
  }
  function renderCompare() {
    $("#cmpCount").textContent = state.cmp.length;
    const box = $("#cmpBox");
    if (state.cmp.length < 2) {
      box.innerHTML = `<p class="empty">Выберите 2–3 места кнопкой «Добавить к сравнению» (сейчас выбрано: ${state.cmp.length}).</p>`; return;
    }
    const ps = state.cmp.map(byId);
    const minP = Math.min(...ps.map(p => p.price)), minD = Math.min(...ps.map(p => p.dur));
    const differs = f => new Set(ps.map(f)).size > 1;
    const rows = [
      ["Стоимость", priceLabel, p => differs(x => x.price) && p.price === minP],
      ["Время работы", p => p.hours],
      ["Длительность визита", p => p.dur + " ч", p => differs(x => x.dur) && p.dur === minD],
      ["Транспорт", p => p.transport],
      ["Для кого", p => p.aud.map(a => AUD[a]).join(", ")],
      ["Сезонность", p => p.season],
      ["Что рядом / активности", p => p.tags.join(", ")]
    ];
    box.innerHTML = `<table><caption class="muted" style="text-align:left;padding:8px 12px">Зелёным выделены лучшие значения (дешевле, короче)</caption>
      <thead><tr><th scope="col">Параметр</th>${ps.map(p => `<th scope="col">${p.name}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(([n, f, best]) => `<tr><th scope="row" style="background:#EAF2F6;color:var(--blue)">${n}</th>${ps.map(p => `<td class="${best && best(p) ? "best" : ""}">${f(p)}</td>`).join("")}</tr>`).join("")}
      </tbody></table>`;
  }

  // ---------- Маршрут и калькулятор ----------
  function saveRoute() { store.set("ag_route", state.route); }
  function toggleRoute(id) {
    state.route = state.route.includes(id) ? state.route.filter(x => x !== id) : [...state.route, id];
    saveRoute(); renderCatalog(); renderCalcPlaces(); calc();
  }
  function renderCalcPlaces() {
    $("#calcPlaces").innerHTML = PLACES.map(p => `<label><input type="checkbox" data-place="${p.id}" ${state.route.includes(p.id) ? "checked" : ""}> ${p.name} (${priceLabel(p)})</label>`).join("");
  }
  function calc() {
    const out = $("#calcOut"), err = $("#peopleErr");
    const n = Number($("#people").value);
    if ($("#people").value === "" || !Number.isInteger(n) || n < 1 || n > 50) {
      err.textContent = "Введите количество человек: целое число от 1 до 50.";
      out.innerHTML = `<p class="muted">Исправьте количество человек, чтобы увидеть расчёт.</p>`; return null;
    }
    err.textContent = "";
    const ps = state.route.map(byId);
    if (!ps.length) { out.innerHTML = `<p class="muted">Выберите места или готовый маршрут, чтобы увидеть бюджет.</p>`; return null; }
    const k = $("#disc").checked ? 1 - COSTS.studentDiscount : 1, tr = $("#trans").value, trips = ps.length + 1;
    const entry = ps.reduce((s, p) => s + p.price, 0) * n * k;
    const transport = tr === "taxi" ? trips * COSTS.taxiPerTrip : trips * COSTS[tr] * n; // такси — на группу, автобус/метро — на человека
    const food = ((($("#lunch").checked ? COSTS.lunch : 0) + ($("#coffee").checked ? COSTS.coffee : 0)) * n);
    const total = entry + transport + food;
    out.innerHTML = `<div class="sum"><span>Входные билеты</span><b>${fmt(entry)}</b></div>
      <div class="sum"><span>Транспорт (${trips} поездки)</span><b>${fmt(transport)}</b></div>
      <div class="sum"><span>Еда и кофе</span><b>${fmt(food)}</b></div>
      <div class="sum"><span>Итого за день</span><span class="total">${fmt(total)}</span></div>
      <div class="sum"><span>На одного человека</span><b>${fmt(total / n)}</b></div>`;
    return { ps, n, total };
  }
  function routeText() {
    const r = calc(); if (!r) return "";
    return `Мой маршрут по Алматы (${r.n} чел.):\n` + r.ps.map((p, i) => `${i + 1}. ${p.name}`).join("\n") + `\nОриентировочный бюджет: ${fmt(r.total)} (${fmt(r.total / r.n)} на человека)`;
  }
  async function copyRoute() {
    const text = routeText(); if (!text) { toast("Сначала выберите места и введите количество человек."); return; }
    try { await navigator.clipboard.writeText(text); toast("Маршрут скопирован"); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Маршрут скопирован"); } catch (e2) { toast("Не удалось скопировать. Выделите текст вручную."); }
      ta.remove();
    }
  }

  // ---------- Готовые маршруты ----------
  function renderRoutes() {
    $("#routeGrid").innerHTML = ROUTES.map(r => `<article class="panel reveal"><h3>${r.name}</h3><p>${r.desc}</p>
      <ol>${r.ids.map(id => `<li>${byId(id).name}</li>`).join("")}</ol>
      <button class="btn sm accent" data-route="${r.id}">Добавить в калькулятор</button></article>`).join("");
  }

  // ---------- Для первокурсника ----------
  function renderStudent() {
    const done = store.get("ag_check", []);
    $("#checks").innerHTML = CHECKLIST.map((t, i) => `<li><label><input type="checkbox" data-check="${i}" ${done.includes(i) ? "checked" : ""}> ${t}</label></li>`).join("");
    const pct = Math.round(done.length / CHECKLIST.length * 100);
    $("#progFill").style.width = pct + "%"; $("#prog").setAttribute("aria-valuenow", pct);
    $("#progText").textContent = `Выполнено: ${done.length} из ${CHECKLIST.length}`;
    $("#freeList").innerHTML = PLACES.filter(p => p.price === 0).map(p => `<li>${p.name}</li>`).join("");
    $("#studyList").innerHTML = PLACES.filter(p => p.cat === "modern").map(p => `<li>${p.name}</li>`).join("");
  }

  // ---------- Аудитория ----------
  function setAudience(a) {
    state.aud = a; store.set("ag_aud", a);
    $$("[data-aud]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.aud === a)));
    $("#hint").textContent = HINTS[a]; renderCatalog();
  }

  // ---------- События ----------
  function bind() {
    $("#fCat").innerHTML += Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    $$(".filters input,.filters select").forEach(el => el.addEventListener("input", renderCatalog));
    $$("[data-aud]").forEach(b => b.addEventListener("click", () => setAudience(b.dataset.aud)));
    $("#grid").addEventListener("click", e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const id = b.closest(".card").dataset.id;
      if (b.dataset.act === "more") openModal(id);
      else if (b.dataset.act === "cmp") toggleCompare(id);
      else toggleRoute(id);
    });
    $("#mBody").addEventListener("click", e => {
      const b = e.target.closest("[data-modal]"); if (!b) return;
      b.dataset.modal === "cmp" ? toggleCompare(b.dataset.id) : toggleRoute(b.dataset.id);
    });
    $("#mClose").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
    $("#cmpClear").addEventListener("click", () => { state.cmp = []; renderCompare(); renderCatalog(); });
    $("#routeGrid").addEventListener("click", e => {
      const b = e.target.closest("[data-route]"); if (!b) return;
      state.route = ROUTES.find(r => r.id === b.dataset.route).ids.slice(); saveRoute();
      renderCalcPlaces(); renderCatalog(); calc(); toast("Маршрут добавлен в калькулятор");
      $("#calc").scrollIntoView({ behavior: "smooth" });
    });
    $("#calcPlaces").addEventListener("change", e => {
      const id = e.target.dataset.place; if (!id) return;
      state.route = e.target.checked ? [...state.route, id] : state.route.filter(x => x !== id);
      saveRoute(); renderCatalog(); calc();
    });
    $("#calcForm").addEventListener("input", calc);
    $("#saveRoute").addEventListener("click", () => { saveRoute(); toast("Маршрут сохранён на этом устройстве"); });
    $("#copyRoute").addEventListener("click", copyRoute);
    $("#checks").addEventListener("change", e => {
      const i = Number(e.target.dataset.check); let done = store.get("ag_check", []);
      done = e.target.checked ? [...new Set([...done, i])] : done.filter(x => x !== i);
      store.set("ag_check", done); renderStudent();
    });
    const nav = $("#nav"), burger = $("#burger");
    burger.addEventListener("click", () => { const o = nav.classList.toggle("open"); burger.setAttribute("aria-expanded", String(o)); });
    nav.addEventListener("click", e => { if (e.target.tagName === "A") { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); } });
    const up = $("#up");
    window.addEventListener("scroll", () => { up.hidden = window.scrollY < 600; }, { passive: true });
    up.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  bind(); setAudience(state.aud); renderRoutes(); renderStudent(); renderCompare(); renderCalcPlaces(); calc(); observe();
})();
