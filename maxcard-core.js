/* Shared by the browser and dependency-free Node tests. */
(function (root) {
  'use strict';
  const stats = ['pacing', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
  const positions = ['GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LM','RM','LW','RW','CF','ST'];
  const fields = ['ovr', ...stats];
  function parseOCR(text) {
    const result = {}, lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const aliases = { ovr: 'OVR|Overall', pacing: 'Pacing|Pace', shooting: 'Shooting', passing: 'Passing', dribbling: 'Dribbling', defending: 'Defending', physical: 'Physical|Physicality' };
    for (const [key, label] of Object.entries(aliases)) {
      const values = new Set();
      for (const line of lines) {
        if (/^[A-Za-z][A-Za-z -]+\s*\+\s*[1-5](?:\s|$)/.test(line)) continue;
        let match = line.match(new RegExp(`(?:^|\\s)(?:${label})\\s*[:+|–-]?\\s*(\\d{1,3})(?!\\d)`, 'i'));
        if (!match) match = line.match(new RegExp(`^(\\d{1,3})\\s*(?:${label})(?:$|\\s)`, 'i'));
        if (match && +match[1] > 0) values.add(+match[1]);
      }
      // Ambiguous duplicates remain blank for manual review.
      if (values.size === 1) result[key] = [...values][0];
    }
    const name = lines.find(s => /^(?:Player(?: name)?|Name)\s*:/i.test(s));
    if (name) result.name = name.replace(/^[^:]+:\s*/, '');
    const pos = lines.map(s => s.match(/^(?:Position\s*:\s*)?(GK|CB|LB|RB|LWB|RWB|CDM|CM|CAM|LM|RM|LW|RW|CF|ST)$/i)).find(Boolean);
    if (pos) result.position = pos[1].toUpperCase();
    const skills = [];
    for (const line of lines) {
      const m = line.match(/^([A-Za-z][A-Za-z -]{1,35}?)\s*\+\s*([1-5])(?:\s|$)/);
      if (m) skills.push({ name: m[1].trim(), points: +m[2] });
    }
    result.skills = skills;
    return result;
  }
  function validate(values) {
    for (const key of fields) {
      if (!/^\d+$/.test(String(values[key])) || +values[key] < 1 || +values[key] > (key === 'ovr' ? 200 : 999)) throw Error(`Enter a valid ${key} value.`);
    }
    if (values.position && !positions.includes(values.position)) throw Error('Select a valid football position.');
    if (!Array.isArray(values.skills) || !values.skills.length || values.skills.some(s => !s.name.trim() || !Number.isInteger(s.points) || s.points < 1 || s.points > 5) || values.skills.reduce((n,s) => n+s.points,0) !== 5) throw Error('Confirm skill allocations totaling exactly five points (for example Defender +2 and three +1 upgrades).');
    return values;
  }
  function rect(region, width, height) {
    const r = { x: Math.round(region.x * width), y: Math.round(region.y * height), w: Math.round(region.w * width), h: Math.round(region.h * height) };
    if (![r.x,r.y,r.w,r.h].every(Number.isFinite) || r.w < 1 || r.h < 1 || r.x < 0 || r.y < 0 || r.x+r.w > width || r.y+r.h > height) throw Error('Edit region falls outside the screenshot.');
    return r;
  }
  function assertPreserved(source, output, width, height, regions) {
    if (source.length !== width*height*4 || output.length !== source.length) throw Error('Image dimensions changed.');
    const mask = new Uint8Array(width*height);
    for (const region of regions) {
      const r = rect(region,width,height);
      for (let y=r.y;y<r.y+r.h;y++) mask.fill(1,y*width+r.x,y*width+r.x+r.w);
    }
    let changed = 0;
    for (let p=0;p<mask.length;p++) {
      let differs = false;
      for (let c=0;c<4;c++) if (source[p*4+c] !== output[p*4+c]) differs = true;
      if (differs && !mask[p]) throw Error(`Pixel preservation failed at ${p%width}, ${Math.floor(p/width)}.`);
      if (differs) changed++;
    }
    return { changed, outsideChanged: 0 };
  }
  const api = { stats, fields, positions, parseOCR, validate, rect, assertPreserved };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MaxCardCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
