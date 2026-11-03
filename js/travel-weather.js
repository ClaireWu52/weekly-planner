/*
 * Travel: weather forecast for each itinerary day, from Open-Meteo (free, no key).
 * Plugs into travel.js through LO.tripKit.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { esc } = LO;
  const K = LO.tripKit;
  const { t } = K;
  const WX_GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  const WX_API = 'https://api.open-meteo.com/v1/forecast';
  const WX_KEY = 'planner:travel:wx';
  const WX_DAYS = 16;
  const WX_FRESH = 3 * 3600e3;
  // Open-Meteo weather codes, grouped
  const WX_KINDS = [[[0], 'clear', '☀️'], [[1, 2], 'cloudy', '🌤️'], [[3], 'overcast', '☁️'], [[45, 48], 'fog', '🌫️'],
    [[51, 53, 55, 56, 57], 'drizzle', '🌦️'], [[61, 63, 65, 66, 67, 80, 81, 82], 'rain', '🌧️'], [[71, 73, 75, 77, 85, 86], 'snow', '🌨️'], [[95, 96, 99], 'storm', '⛈️']];

  // Forecasts are cached per destination in this browser only; they are refetched after a few hours.
  const wxCache = (() => { try { return LO.readJSON(WX_KEY) || {}; } catch (_) { return {}; } })();
  const wxBusy = new Set();
  const wxFailed = {};
  const wxSave = () => { try { localStorage.setItem(WX_KEY, JSON.stringify(wxCache)); } catch (_) { /* ignore */ } };

  // Does the trip have any day inside the forecast window?
  function wxWanted(tr) {
    if (!tr.start) return false;
    const today = LO.todayKey();
    const last = LO.keyOf(LO.addDays(LO.parseKey(today), WX_DAYS - 1));
    return (tr.end || tr.start) >= today && tr.start <= last;
  }

  // The geocoder only matches names in the language asked for, and knows fewer Chinese names,
  // so try the whole name and then each word (e.g. "首尔 Seoul"), in Chinese and in English.
  async function geocode(dest) {
    const words = dest.split(/[\s,，、·()（）/]+/).filter(Boolean);
    const names = Array.from(new Set([dest].concat(words.length > 1 ? words : [])));
    for (const name of names) {
      for (const language of ['zh', 'en']) {
        const d = await (await fetch(`${WX_GEO}?${new URLSearchParams({ name, count: '1', language })}`)).json();
        const hit = d && d.results && d.results[0];
        if (hit) return { lat: hit.latitude, lon: hit.longitude };
      }
    }
    return null;
  }

  async function loadWeather(tr) {
    const dest = tr.dest.trim();
    const c = wxCache[dest];
    if (wxBusy.has(dest) || (c && Date.now() - c.at < WX_FRESH) || Date.now() - (wxFailed[dest] || 0) < 5 * 60e3) return;
    wxBusy.add(dest);
    try {
      let geo = c && c.lat != null ? { lat: c.lat, lon: c.lon } : null;
      if (!geo) {
        geo = await geocode(dest);
        if (!geo) {
          wxCache[dest] = { at: Date.now(), days: {}, miss: true };
          wxSave();
          if (K.openId === tr.id && K.sec === 'days') K.render();
          return;
        }
      }
      const r = await fetch(`${WX_API}?${new URLSearchParams({
        latitude: geo.lat, longitude: geo.lon, timezone: 'auto', forecast_days: String(WX_DAYS),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
      })}`);
      const d = (await r.json()).daily;
      if (!d || !Array.isArray(d.time)) throw new Error('no forecast');
      const days = {};
      d.time.forEach((k, i) => { days[k] = { c: d.weather_code[i], hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], p: d.precipitation_probability_max[i] }; });
      wxCache[dest] = { lat: geo.lat, lon: geo.lon, at: Date.now(), days };
      wxSave();
      if (K.openId === tr.id && K.sec === 'days') K.render();
    } catch (_) {
      // offline or the service is down: keep what we had and try again in a few minutes
      wxFailed[dest] = Date.now();
    } finally { wxBusy.delete(dest); }
  }

  function wxHTML(tr, key) {
    const c = wxCache[tr.dest.trim()];
    const w = c && c.days && c.days[key];
    if (!w || w.hi == null) return '';
    const kind = WX_KINDS.find(([codes]) => codes.includes(w.c)) || [[], 'cloudy', '🌤️'];
    const rain = w.p != null && w.p >= 20 ? ` · 💧${esc(t('wxRain')(w.p))}` : '';
    return `<p class="day-wx" title="${esc(t('wxSrc'))}">${kind[2]} ${esc(t('wx')[kind[1]])} ${Math.round(w.hi)}° / ${Math.round(w.lo)}°${rain}</p>`;
  }

  // Shown above the itinerary; also starts loading the forecast when the trip is close enough.
  function wxNoteHTML(tr) {
    if (!wxWanted(tr)) return '';
    loadWeather(tr);
    const c = wxCache[tr.dest.trim()];
    return c && c.miss ? `<p class="hint">${esc(t('wxMiss')(tr.dest))}</p>` : '';
  }

  Object.assign(K, { weatherNoteHTML: wxNoteHTML, weatherDayHTML: wxHTML });
})();
