'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const pad = (n, l = 2) => String(n).padStart(l, '0');
const store = {
  get(k, d) { try { const v = localStorage.getItem('vx_' + k); return v ? JSON.parse(v) : d } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('vx_' + k, JSON.stringify(v)) } catch (e) {} }
};
const TITLE = 'Vaqt xonasi — soat, taymer, sekundomer';

/* ---------- Boʻlimlar ---------- */
const TABS = ['soat', 'taymer', 'sekundomer', 'budilnik'];
function show(id) {
  if (!TABS.includes(id)) id = 'soat';
  $$('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.t === id));
  $$('.panel').forEach(p => p.hidden = p.id !== id);
  try { history.replaceState(null, '', '#' + id) } catch (e) {}
}
$$('.tab').forEach(b => b.onclick = () => show(b.dataset.t));
const active = () => ($$('.panel').find(p => !p.hidden) || {}).id;

/* ---------- Ovoz va bildirishnoma ---------- */
let snd = store.get('snd', true), ac;
const paintSnd = () => $('#sndBtn').textContent = 'Ovoz: ' + (snd ? 'yoqilgan' : 'oʻchiq');
$('#sndBtn').onclick = () => { snd = !snd; store.set('snd', snd); paintSnd(); if (snd) beep(1) };
function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume() } catch (e) {} }
document.addEventListener('click', audio);
function beep(n = 3) {
  if (!snd) return; audio(); if (!ac) return;
  for (let i = 0; i < n; i++) {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * .4;
    o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .3);
    o.start(t); o.stop(t + .32);
  }
}
function askNotify() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission() } catch (e) {} }
function notify(m) { try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Vaqt xonasi', { body: m }) } catch (e) {} }
let ringTimer = 0;
function alertOn(msg, loops) {
  $('#alertMsg').textContent = msg; $('#alert').classList.add('on'); notify(msg); beep(3);
  let n = 0; clearInterval(ringTimer);
  ringTimer = setInterval(() => { beep(3); if (++n >= loops) alertOff() }, 2000);
}
function alertOff() { clearInterval(ringTimer); $('#alert').classList.remove('on') }
$('#alertOff').onclick = alertOff;

/* ---------- Mavzu va toʻliq ekran ---------- */
{ const t = store.get('theme', null); if (t) document.documentElement.dataset.theme = t }
$('#themeBtn').onclick = () => {
  const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
  r.dataset.theme = dark ? 'light' : 'dark'; store.set('theme', r.dataset.theme);
};
$('#fsBtn').onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() } catch (e) {} };

/* ---------- Analog soat ---------- */
(function () {
  const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  let s = '<circle cx="100" cy="100" r="97" fill="var(--paper)" stroke="var(--brass)" stroke-width="3"/><circle cx="100" cy="100" r="92" fill="none" stroke="var(--line)"/>';
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * Math.PI / 180, big = i % 5 === 0, r1 = big ? 80 : 85, r2 = 90;
    s += `<line x1="${100 + r1 * Math.sin(a)}" y1="${100 - r1 * Math.cos(a)}" x2="${100 + r2 * Math.sin(a)}" y2="${100 - r2 * Math.cos(a)}" stroke="var(--ink)" stroke-width="${big ? 2 : .8}"/>`;
  }
  R.forEach((t, i) => { const a = i * 30 * Math.PI / 180; s += `<text x="${100 + 66 * Math.sin(a)}" y="${100 - 66 * Math.cos(a) + 4}" text-anchor="middle" font-size="12" font-family="Cormorant Garamond,Georgia,serif" font-weight="700" fill="var(--ink)">${t}</text>` });
  s += '<g id="hh"><line x1="100" y1="108" x2="100" y2="54" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/></g><g id="mh"><line x1="100" y1="112" x2="100" y2="32" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></g><g id="sh"><line x1="100" y1="118" x2="100" y2="22" stroke="var(--wine)" stroke-width="1.2"/></g><circle cx="100" cy="100" r="5" fill="var(--brass)"/><circle cx="100" cy="100" r="1.8" fill="var(--wine)"/>';
  $('#face').innerHTML = s;
})();

/* ---------- Soat, sana, dunyo vaqti ---------- */
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const ALL = [['Toshkent', 'Asia/Tashkent'], ['London', 'Europe/London'], ['Moskva', 'Europe/Moscow'], ['Dubay', 'Asia/Dubai'], ['Tokio', 'Asia/Tokyo'], ['Nyu-York', 'America/New_York'], ['Los-Anjeles', 'America/Los_Angeles'], ['Parij', 'Europe/Paris'], ['Istanbul', 'Europe/Istanbul'], ['Pekin', 'Asia/Shanghai'], ['Seul', 'Asia/Seoul'], ['Sidney', 'Australia/Sydney']];
const zf = ALL.map(z => { try { return new Intl.DateTimeFormat('en-GB', { timeZone: z[1], hour: '2-digit', minute: '2-digit', hour12: false }) } catch (e) { return null } });
let h24 = store.get('h24', true), shown = store.get('zones', [0, 1, 2, 3, 4]), lastDay = -1, lastSec = -1;
function drawWorld() {
  $('#world').innerHTML = shown.map(i => `<div><span>${ALL[i][0]}</span><span><span class="mono" data-z="${i}">--:--</span><button class="x" data-rm="${i}" aria-label="${ALL[i][0]}ni olib tashlash">×</button></span></div>`).join('');
  $('#zoneSel').innerHTML = ALL.map((z, i) => shown.includes(i) ? '' : `<option value="${i}">${z[0]}</option>`).join('');
  $('#zoneAdd').disabled = shown.length === ALL.length; lastSec = -1;
}
$('#world').onclick = e => { const b = e.target.closest('[data-rm]'); if (!b) return; shown = shown.filter(i => i !== +b.dataset.rm); store.set('zones', shown); drawWorld() };
$('#zoneAdd').onclick = () => { const v = $('#zoneSel').value; if (v === '') return; shown.push(+v); store.set('zones', shown); drawWorld() };
$('#fmt').onclick = () => { h24 = !h24; store.set('h24', h24) };
function drawClock() {
  const d = new Date(), ms = d.getMilliseconds(), s = d.getSeconds() + ms / 1000, m = d.getMinutes() + s / 60, h = d.getHours() % 12 + m / 60;
  $('#hh').setAttribute('transform', `rotate(${h * 30} 100 100)`);
  $('#mh').setAttribute('transform', `rotate(${m * 6} 100 100)`);
  $('#sh').setAttribute('transform', `rotate(${s * 6} 100 100)`);
  if (d.getSeconds() === lastSec) return; lastSec = d.getSeconds();
  let hh = d.getHours(), suf = ''; if (!h24) { suf = hh >= 12 ? ' PM' : ' AM'; hh = hh % 12 || 12 }
  $('#digital').textContent = `${pad(hh)}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${suf}`;
  if (d.getDate() !== lastDay) { lastDay = d.getDate(); $('#dateTxt').textContent = `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()}-yil, ${DAYS[d.getDay()]}` }
  $$('[data-z]').forEach(el => { const f = zf[+el.dataset.z]; if (f) el.textContent = f.format(d) });
}

/* ---------- Taymer + Pomodoro ---------- */
const C = 552.9, PH = [25, 5, 25, 5, 25, 5, 25, 15];
let T = Object.assign({ total: 0, left: 0, end: 0, run: false, act: false }, store.get('timer', {}));
let P = Object.assign({ on: false, i: 0 }, store.get('pomo', {}));
const saveT = () => store.set('timer', T);
const fmtHMS = s => `${pad(s / 3600 | 0)}:${pad((s % 3600) / 60 | 0)}:${pad(s % 60)}`;
const inputMs = () => (((+$('#th').value || 0) * 3600) + ((+$('#tm').value || 0) * 60) + (+$('#ts').value || 0)) * 1000;
const tBtn = () => $('#tGo').textContent = T.run ? 'Toʻxtatish' : (T.act ? 'Davom ettirish' : 'Boshlash');
function pomoLabel() {
  $('#pomo').textContent = 'Pomodoro: ' + (P.on ? 'yoqilgan' : 'oʻchiq');
  $('#tLabel').textContent = P.on ? `${P.i % 2 ? 'Dam olish' : 'Ish vaqti'} (${P.i + 1}/${PH.length})` : '';
}
function pomoSet() { const m = PH[P.i]; $('#th').value = m / 60 | 0; $('#tm').value = m % 60; $('#ts').value = 0; timerReset(); pomoLabel() }
function drawTimer() {
  const ms = T.run ? Math.max(0, T.end - Date.now()) : (T.act ? T.left : inputMs());
  $('#tDisp').textContent = fmtHMS(Math.ceil(ms / 1000));
  $('#ring').setAttribute('stroke-dashoffset', T.act && T.total ? C * (1 - ms / T.total) : 0);
  document.title = T.run ? `${fmtHMS(Math.ceil(ms / 1000))} — Taymer` : TITLE;
  if (T.run && ms <= 0) {
    T.run = false; T.act = false; saveT(); tBtn();
    if (P.on) {
      P.i = (P.i + 1) % PH.length; store.set('pomo', P); pomoSet(); timerGo();
      alertOn(P.i % 2 ? 'Ish vaqti tugadi — dam oling!' : 'Dam olish tugadi — ishga qaytamiz!', 3);
    } else { $('#taymer').classList.add('done'); alertOn('Taymer tugadi!', 8) }
  }
}
function timerGo() {
  if (T.run) { T.left = Math.max(0, T.end - Date.now()); T.run = false }
  else {
    $('#taymer').classList.remove('done');
    if (!T.act) { const ms = inputMs(); if (ms <= 0) return; T.total = T.left = ms; T.act = true }
    T.end = Date.now() + T.left; T.run = true; audio(); askNotify();
  }
  saveT(); tBtn();
}
function timerReset() { T.run = false; T.act = false; $('#taymer').classList.remove('done'); saveT(); tBtn(); drawTimer() }
$('#tGo').onclick = timerGo; $('#tReset').onclick = timerReset;
$$('#th,#tm,#ts').forEach(i => i.oninput = () => { if (!T.run) timerReset() });
$$('#presets .btn').forEach(b => b.onclick = () => { const m = +b.dataset.m; $('#th').value = m / 60 | 0; $('#tm').value = m % 60; $('#ts').value = 0; timerReset(); timerGo() });
$('#pomo').onclick = () => { P.on = !P.on; P.i = 0; store.set('pomo', P); if (P.on) pomoSet(); else { pomoLabel(); timerReset() } };
if (T.act) { const ms = T.total; $('#th').value = ms / 3600000 | 0; $('#tm').value = Math.floor(ms % 3600000 / 60000); $('#ts').value = Math.floor(ms % 60000 / 1000) }
pomoLabel(); tBtn();

/* ---------- Sekundomer ---------- */
let S = Object.assign({ run: false, start: 0, acc: 0, laps: [] }, store.get('sw', {}));
const elapsed = () => S.acc + (S.run ? Date.now() - S.start : 0);
const saveS = () => store.set('sw', S);
function fmtSW(ms) { const c = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000); return (h ? pad(h) + ':' : '') + `${pad(m)}:${pad(s)}.${pad(c)}` }
const sBtn = () => $('#sGo').textContent = S.run ? 'Toʻxtatish' : (S.acc ? 'Davom ettirish' : 'Boshlash');
function drawLaps() {
  $('#lapEmpty').style.display = S.laps.length ? 'none' : ''; $('#lapCopy').hidden = !S.laps.length;
  const sp = S.laps.map(l => l.split); let best = -1, worst = -1;
  if (sp.length > 1) { best = sp.indexOf(Math.min(...sp)); worst = sp.indexOf(Math.max(...sp)) }
  $('#laps').innerHTML = S.laps.map((l, i) => `<li class="${i === best ? 'best' : i === worst ? 'worst' : ''}"><span>${i + 1}-aylanish</span><span class="mono">${fmtSW(l.split)}</span><span class="mono" style="color:var(--soft)">${fmtSW(l.total)}</span></li>`).reverse().join('');
}
function swGo() { if (S.run) { S.acc += Date.now() - S.start; S.run = false } else { S.start = Date.now(); S.run = true } saveS(); sBtn() }
function swLap() { if (!S.run) return; const t = elapsed(), prev = S.laps.length ? S.laps[S.laps.length - 1].total : 0; S.laps.push({ total: t, split: t - prev }); saveS(); drawLaps() }
function swReset() { S = { run: false, start: 0, acc: 0, laps: [] }; saveS(); sBtn(); drawLaps() }
$('#sGo').onclick = swGo; $('#sLap').onclick = swLap; $('#sReset').onclick = swReset;
$('#lapCopy').onclick = async () => {
  const txt = S.laps.map((l, i) => `${i + 1}\t${fmtSW(l.split)}\t${fmtSW(l.total)}`).join('\n'), b = $('#lapCopy');
  try { await navigator.clipboard.writeText(txt); b.textContent = 'Nusxalandi' } catch (e) { b.textContent = 'Nusxalab boʻlmadi' }
  setTimeout(() => b.textContent = 'Aylanishlarni nusxalash', 1500);
};

/* ---------- Budilnik ---------- */
let alarms = store.get('alarms', []), fired = '';
const esc = t => t.replace(/[<>&"]/g, '');
function drawAlarms() {
  $('#alarmEmpty').style.display = alarms.length ? 'none' : '';
  alarms.sort((a, b) => a.t.localeCompare(b.t));
  $('#alarms').innerHTML = alarms.map(a => `<li><span><span class="mono" style="font-size:1.5rem">${a.t}</span>${a.label ? ' — ' + esc(a.label) : ''}</span><span><button class="btn" data-id="${a.id}" data-a="tog">${a.on ? 'Yoqilgan' : 'Oʻchiq'}</button> <button class="btn warn" data-id="${a.id}" data-a="del">Oʻchirish</button></span></li>`).join('');
}
$('#alarmAdd').onclick = () => {
  const t = $('#alarmTime').value; if (!t) return;
  alarms.push({ id: Date.now(), t, label: $('#alarmLabel').value.trim(), on: true });
  $('#alarmLabel').value = ''; store.set('alarms', alarms); drawAlarms(); askNotify();
};
$('#alarms').onclick = e => {
  const b = e.target.closest('button'); if (!b) return; const id = +b.dataset.id;
  if (b.dataset.a === 'del') alarms = alarms.filter(a => a.id !== id); else alarms.forEach(a => { if (a.id === id) a.on = !a.on });
  store.set('alarms', alarms); drawAlarms();
};
function checkAlarms() {
  const d = new Date(), k = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (k === fired) return;
  const hit = alarms.find(a => a.on && a.t === k);
  if (hit) { fired = k; alertOn(`Budilnik ${hit.t}${hit.label ? ' — ' + esc(hit.label) : ''}`, 15) } else fired = '';
}

/* ---------- Klaviatura ---------- */
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space' && e.target.tagName === 'BUTTON') return;
  const p = active(), k = e.key.toLowerCase();
  if (k >= '1' && k <= '4') return show(TABS[+k - 1]);
  if (p === 'taymer') { if (e.code === 'Space') { e.preventDefault(); timerGo() } else if (k === 'r') timerReset() }
  if (p === 'sekundomer') { if (e.code === 'Space') { e.preventDefault(); swGo() } else if (k === 'l') swLap(); else if (k === 'r') swReset() }
});

/* ---------- Ishga tushirish ---------- */
function loop() { drawClock(); drawTimer(); $('#sDisp').textContent = fmtSW(elapsed()); checkAlarms() }
drawWorld(); drawAlarms(); drawLaps(); sBtn(); paintSnd();
setInterval(loop, 50); loop();
show((location.hash || '#soat').slice(1));
addEventListener('hashchange', () => show((location.hash || '#soat').slice(1)));
