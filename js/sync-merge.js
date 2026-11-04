/*
 * Combines two devices' copies of a section, given the copy both last agreed on
 * (the base). Whatever changed on only one side since the base is kept, so a to-do
 * added on the phone and another added on the computer both survive.
 *
 *   objects        merged key by key; a key removed on one side goes, unless the
 *                  other side changed it since the base
 *   lists of {id}  merged item by item the same way; new items keep their place
 *   anything else  (text, numbers, plain lists) taken from the side that changed;
 *                  when both changed it, from the side given as the winner
 *
 * pickSection decides one section of a sync round: combined against the base when
 * there is one; without a base (first sync on this device, or after importing a
 * backup) the cloud copy wins when this device is joining, otherwise the more
 * recently changed copy wins whole.
 *
 * describe counts what changed in a section's lists of {id} items (its own top-level
 * lists, or the section itself when it is one), for the "what came in" note after a sync.
 *
 * LO.syncMerge has no page or storage behind it, so tests can run it on its own.
 */
(() => {
  'use strict';
  const LO = window.LO;

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  function same(a, b) {
    if (a === b) return true;
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
    if (isObj(a)) {
      if (!isObj(b)) return false;
      const ka = Object.keys(a);
      return ka.length === Object.keys(b).length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
    }
    return false;
  }
  const has = (o, k) => isObj(o) && Object.prototype.hasOwnProperty.call(o, k);
  // a list whose items are all objects with their own distinct id
  function isIdList(a) {
    if (!Array.isArray(a)) return false;
    const seen = new Set();
    return a.every((x) => isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number') && !seen.has(x.id) && seen.add(x.id));
  }

  // localWins: which side to take when both changed the same plain value
  function merge3(base, local, remote, localWins) {
    if (same(local, remote)) return local;
    if (base !== undefined && same(base, local)) return remote;
    if (base !== undefined && same(base, remote)) return local;
    if (isObj(local) && isObj(remote)) return mergeObj(isObj(base) ? base : {}, local, remote, localWins);
    if (isIdList(local) && isIdList(remote) && (base === undefined || isIdList(base))) return mergeList(base || [], local, remote, localWins);
    return localWins ? local : remote;
  }

  // one side has it, the other removed it since the base: it goes unless it was changed meanwhile
  const keepOne = (inBase, b, v) => !inBase || !same(b, v);

  function mergeObj(base, local, remote, localWins) {
    const out = {};
    Object.keys(local).concat(Object.keys(remote).filter((k) => !has(local, k))).forEach((k) => {
      const inL = has(local, k);
      const inR = has(remote, k);
      const inB = has(base, k);
      if (inL && inR) out[k] = merge3(inB ? base[k] : undefined, local[k], remote[k], localWins);
      else if (inL ? keepOne(inB, base[k], local[k]) : keepOne(inB, base[k], remote[k])) out[k] = inL ? local[k] : remote[k];
    });
    return out;
  }

  function mergeList(base, local, remote, localWins) {
    const byId = (a) => new Map(a.map((x) => [x.id, x]));
    const B = byId(base);
    const L = byId(local);
    const R = byId(remote);
    // follow the order of the side that reordered; if neither did, the local one
    const order = (a, ids) => a.map((x) => x.id).filter((id) => ids.has(id));
    const localMoved = !same(order(local, R), order(base, R));
    const [first, second] = !localMoved && !same(order(remote, L), order(base, L)) ? [remote, local] : [local, remote];
    const keep = (id) => {
      const inL = L.has(id);
      const inR = R.has(id);
      if (inL && inR) return true;
      return inL ? keepOne(B.has(id), B.get(id), L.get(id)) : keepOne(B.has(id), B.get(id), R.get(id));
    };
    const ids = first.map((x) => x.id).filter(keep);
    // items only the other side has go after the item they followed there
    // (and after anything new on this side that follows it too)
    const inSecond = new Set(second.map((x) => x.id));
    second.forEach((x, i) => {
      if (ids.includes(x.id) || !keep(x.id)) return;
      let at = 0;
      for (let j = i - 1; j >= 0; j--) {
        const k = ids.indexOf(second[j].id);
        if (k >= 0) { at = k + 1; break; }
      }
      while (at < ids.length && !inSecond.has(ids[at])) at++;
      ids.splice(at, 0, x.id);
    });
    return ids.map((id) => {
      if (L.has(id) && R.has(id)) return merge3(B.get(id), L.get(id), R.get(id), localWins);
      return L.has(id) ? L.get(id) : R.get(id);
    });
  }

  // base: the section as both sides last agreed (undefined if none); ls / rs: when
  // each side last changed it; joining: this device just turned sync on
  function pickSection(base, local, remote, ls, rs, joining) {
    if (remote == null) return local;
    if (local == null) return remote;
    if (base !== undefined) return merge3(base, local, remote, (ls || 0) >= (rs || 0));
    if (joining) return remote;
    return (rs || 0) > (ls || 0) ? remote : local;
  }

  // { lists: { key: { added, removed, changed } }, other: bool } between two copies of a
  // section; key is '' when the section itself is the list. other: something outside
  // those lists changed too.
  function describe(before, after) {
    const lists = {};
    const count = (key, a, b) => {
      const A = new Map((a || []).map((x) => [x.id, x]));
      const B = new Map((b || []).map((x) => [x.id, x]));
      const c = { added: 0, removed: 0, changed: 0 };
      B.forEach((x, id) => { if (!A.has(id)) c.added++; else if (!same(A.get(id), x)) c.changed++; });
      A.forEach((x, id) => { if (!B.has(id)) c.removed++; });
      if (c.added || c.removed || c.changed) lists[key] = c;
    };
    let other = false;
    if (isIdList(before) || isIdList(after)) count('', isIdList(before) ? before : [], isIdList(after) ? after : []);
    else if (isObj(before) || isObj(after)) {
      const a = isObj(before) ? before : {};
      const b = isObj(after) ? after : {};
      new Set(Object.keys(a).concat(Object.keys(b))).forEach((k) => {
        const la = a[k] === undefined || isIdList(a[k]);
        const lb = b[k] === undefined || isIdList(b[k]);
        if (la && lb && (a[k] !== undefined || b[k] !== undefined)) count(k, a[k], b[k]);
        else if (!same(a[k], b[k])) other = true;
      });
    } else other = !same(before, after);
    return { lists, other };
  }

  LO.syncMerge = { merge3, same, pickSection, describe };
})();
