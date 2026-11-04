/*
 * Today's weather where you live, from Open-Meteo (free, no key), for the
 * outfit card on Today. The city is typed in once (no location permission
 * needed); the forecast is cached in this browser and refreshed every few hours.
 */
(() => {
  'use strict';
  const LO = window.LO;
  const { $, esc } = LO;
  const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  const API = 'https://api.open-meteo.com/v1/forecast';
  const KEY = 'planner:home-wx';
  const FRESH = 3 * 3600e3;
  const KINDS = [[[0], 'clear', '☀️'], [[1, 2], 'cloudy', '🌤️'], [[3], 'overcast', '☁️'], [[45, 48], 'fog', '🌫️'],
    [[51, 53, 55, 56, 57], 'drizzle', '🌦️'], [[61, 63, 65, 66, 67, 80, 81, 82], 'rain', '🌧️'], [[71, 73, 75, 77, 85, 86], 'snow', '🌨️'], [[95, 96, 99], 'storm', '⛈️']];

  LO.strings('homeWx', {
    zh: {
      city: '所在城市', cityPh: '比如 Richmond 或 上海', cityHint: '只用来查天气，不会获取你的位置。', notFound: '找不到这个城市，试试英文名。',
      wx: { clear: '晴', cloudy: '多云', overcast: '阴', fog: '雾', drizzle: '小雨', rain: '雨', snow: '雪', storm: '雷雨' }, rain: (p) => `降水 ${p}%`
    },
    en: {
      city: 'Your city', cityPh: 'e.g. Richmond or Shanghai', cityHint: 'Only used to look up the weather; your location is never read.', notFound: "Couldn't find that city. Try another spelling.",
      wx: { clear: 'Clear', cloudy: 'Partly cloudy', overcast: 'Overcast', fog: 'Fog', drizzle: 'Drizzle', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorm' }, rain: (p) => `${p}% rain`
    }
  });
  const t = LO.ns('homeWx');

  // { city, lat, lon, at, days: { key: { c, hi, lo, p } } }, this browser only
  let cache = LO.readJSON(KEY) || {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (_) { /* ignore */ } };
  let busy = false;
  let failedAt = 0;

  async function geocode(name) {
    for (const language of ['zh', 'en']) {
      const d = await (await fetch(`${GEO}?${new URLSearchParams({ name, count: '1', language })}`)).json();
      const hit = d && d.results && d.results[0];
      if (hit) return { lat: hit.latitude, lon: hit.longitude };
    }
    return null;
  }

  async function load() {
    if (!cache.city || busy || (cache.at && Date.now() - cache.at < FRESH && cache.days && cache.days[LO.todayKey()]) || Date.now() - failedAt < 5 * 60e3) return;
    busy = true;
    try {
      if (cache.lat == null) {
        const g = await geocode(cache.city);
        if (!g) { cache.miss = true; save(); return; }
        Object.assign(cache, g, { miss: false });
      }
      const r = await fetch(`${API}?${new URLSearchParams({
        latitude: cache.lat, longitude: cache.lon, timezone: 'auto', forecast_days: '3',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
      })}`);
      const d = (await r.json()).daily;
      if (!d || !Array.isArray(d.time)) throw new Error('no forecast');
      cache.days = {};
      d.time.forEach((k, i) => { cache.days[k] = { c: d.weather_code[i], hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], p: d.precipitation_probability_max[i] }; });
      cache.at = Date.now();
      save();
      if (LO.route() === 'today') LO.refresh();
    } catch (_) {
      failedAt = Date.now();
    } finally { busy = false; }
  }

  // Today's forecast with its label, or null (and starts loading it)
  function today() {
    load();
    const w = cache.days && cache.days[LO.todayKey()];
    if (!w || w.hi == null) return null;
    const kind = KINDS.find(([codes]) => codes.includes(w.c)) || [[], 'cloudy', '🌤️'];
    const wet = ['drizzle', 'rain', 'snow', 'storm'].includes(kind[1]) || (w.p != null && w.p >= 50);
    return { hi: Math.round(w.hi), lo: Math.round(w.lo), p: w.p, kind: kind[1], icon: kind[2], wet, line: `${kind[2]} ${t('wx')[kind[1]]} ${Math.round(w.hi)}° / ${Math.round(w.lo)}°${w.p != null && w.p >= 20 ? ` · 💧${t('rain')(w.p)}` : ''}` };
  }

  function openCity() {
    LO.openForm({
      title: t('city'),
      body: `<label class="fld"><span>${esc(t('city'))}</span><input class="input" name="hcity" maxlength="60" value="${esc(cache.city || '')}" placeholder="${esc(t('cityPh'))}"></label><p class="hint">${esc(t('cityHint'))}</p>`,
      onSave(dlg) {
        const city = $('input[name="hcity"]', dlg).value.trim();
        if (city === (cache.city || '')) return true;
        cache = city ? { city } : {};
        save();
        LO.refresh();
        return true;
      }
    });
  }

  LO.homeWeather = { today, openCity, city: () => cache.city || '', missed: () => !!cache.miss, notFound: () => t('notFound') };
})();
