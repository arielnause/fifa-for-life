const STORAGE_KEY = 'fifa_for_life_v1';

const PALETTE = [
  { color: '#185FA5', bg: '#dbeafe' },
  { color: '#534AB7', bg: '#ede9fe' },
  { color: '#993C1D', bg: '#fee2d5' },
  { color: '#3B6D11', bg: '#dcfce7' },
  { color: '#854F0B', bg: '#fef3c7' },
  { color: '#993556', bg: '#fce7f3' },
  { color: '#0F6E56', bg: '#d1fae5' },
];

const INIT_PLAYERS = [
  { id: 1, name: 'Gay',    ...PALETTE[0] },
  { id: 2, name: 'Amos',   ...PALETTE[1] },
  { id: 3, name: 'Shalom', ...PALETTE[2] },
  { id: 4, name: 'Nissim', ...PALETTE[3] },
  { id: 5, name: 'Idan',   ...PALETTE[4] },
  { id: 6, name: 'Ronen',  ...PALETTE[5] },
  { id: 7, name: 'Yoav',   ...PALETTE[6] },
];

let state = { players: INIT_PLAYERS, matches: [], nextId: 1, nextPid: 8 };
let currentTab = 'standings';
let lastDraw = null;
let selectedPlayers = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) {}
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function ini(name) { return name.slice(0, 2).toUpperCase(); }

function avatar(p, size = 28, fontSize = 11) {
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${fontSize}px;background:${p.bg};color:${p.color}">${ini(p.name)}</div>`;
}

function getStandings() {
  const map = {};
  state.players.forEach(p => {
    map[p.id] = { ...p, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0, form: [] };
  });
  [...state.matches]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(m => {
      const h = map[m.home], a = map[m.away];
      if (!h || !a) return;
      h.P++; a.P++;
      h.GF += m.homeGoals; h.GA += m.awayGoals;
      a.GF += m.awayGoals; a.GA += m.homeGoals;
      if (m.homeGoals > m.awayGoals) {
        h.W++; h.Pts += 3; a.L++; h.form.push('W'); a.form.push('L');
      } else if (m.homeGoals < m.awayGoals) {
        a.W++; a.Pts += 3; h.L++; a.form.push('W'); h.form.push('L');
      } else {
        h.D++; a.D++; h.Pts++; a.Pts++; h.form.push('D'); a.form.push('D');
      }
    });
  return Object.values(map).sort((a, b) =>
    b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF
  );
}

function renderStandings() {
  const st = getStandings();
  if (!st.length) {
    return `<div class="empty"><div class="empty-icon">👥</div><p>No players yet</p></div>`;
  }
  const rows = st.map((p, i) => {
    const gd = p.GF - p.GA;
    const posClass = i === 0 ? 'top' : (i === st.length - 1 && st.length > 1 ? 'bot' : '');
    const form = p.form.slice(-5).map(f => `<span class="fd ${f}"></span>`).join('');
    return `<div class="st-row ${i === 0 ? 'leader' : ''}">
      <div class="st-pos ${posClass}">${i + 1}</div>
      <div class="st-name">
        ${avatar(p, 28, 11)}
        <div style="min-width:0">
          <div class="name-label">${p.name}</div>
          <div class="form-dots">${form}</div>
        </div>
      </div>
      <div class="st-num">${p.P}</div>
      <div class="st-num">${p.W}</div>
      <div class="st-num">${gd > 0 ? '+' : ''}${gd}</div>
      <div class="st-num">${p.GF}</div>
      <div class="st-pts">${p.Pts}</div>
    </div>`;
  }).join('');
  return `
    <div class="standings-table">
      <div class="st-head">
        <span>#</span><span>Player</span><span>P</span><span>W</span><span>GD</span><span>GF</span><span>Pts</span>
      </div>
      ${rows}
    </div>
    <p class="hint">🟢 leader &nbsp;·&nbsp; dots = last 5</p>`;
}

function renderDraw() {
  const checks = state.players.map(p => {
    const sel = selectedPlayers.has(p.id);
    return `<div class="pcheck ${sel ? 'selected' : ''}" onclick="toggleCheck(${p.id})">
      ${avatar(p, 26, 10)}
      <span class="pcheck-name">${p.name}</span>
    </div>`;
  }).join('');

  const teamColors = [
    { bg: '#dbeafe', color: '#185FA5' },
    { bg: '#ede9fe', color: '#534AB7' },
    { bg: '#dcfce7', color: '#3B6D11' },
    { bg: '#fef3c7', color: '#854F0B' },
  ];

  let drawHtml = '';
  if (lastDraw && lastDraw.teams) {
    const teamBlocks = lastDraw.teams.map((team, i) => {
      const p1 = state.players.find(p => p.id === team[0]);
      const p2 = state.players.find(p => p.id === team[1]);
      if (!p1 || !p2) return '';
      const c = teamColors[i % teamColors.length];
      return `
        <div class="team-block" style="background:${c.bg};border-color:${c.color}50">
          <div class="team-label" style="color:${c.color}">Team ${i + 1}</div>
          <div class="team-players">
            ${avatar(p1, 32, 12)}
            <span style="font-size:15px;font-weight:600;color:#1c1c1e">${p1.name}</span>
            <span style="font-size:13px;color:#6b6b6b">&amp;</span>
            ${avatar(p2, 32, 12)}
            <span style="font-size:15px;font-weight:600;color:#1c1c1e">${p2.name}</span>
          </div>
        </div>`;
    }).join('<div class="team-vs">vs</div>');

    let oddHtml = '';
    if (lastDraw.odd) {
      const op = state.players.find(p => p.id === lastDraw.odd);
      if (op) oddHtml = `
        <div class="odd-block">
          ${avatar(op, 28, 11)}
          <div>
            <div style="font-size:11px;color:#6b6b6b">Sits out this round</div>
            <div style="font-size:14px;font-weight:600">${op.name}</div>
          </div>
        </div>`;
    }

    drawHtml = `
      <div class="card">
        <div class="card-title">🎯 Today's teams</div>
        ${teamBlocks}
        ${oddHtml}
        <button class="btn-primary" style="margin-top:12px" onclick="showTab('add')">Add result for these teams</button>
      </div>`;
  }

  return `
    <div class="draw-section">
      <div class="card">
        <div class="card-title">Who's playing today?</div>
        <div class="player-checks">${checks}</div>
        <div class="sel-count" id="sel-count">${selectedPlayers.size} selected</div>
        <button class="btn-primary" id="draw-btn" onclick="doDraw()" ${selectedPlayers.size < 4 ? 'disabled' : ''}>
          🔀 Draw teams
        </button>
      </div>
      ${drawHtml}
    </div>`;
}

function toggleCheck(id) {
  if (selectedPlayers.has(id)) selectedPlayers.delete(id);
  else selectedPlayers.add(id);
  document.querySelectorAll('.pcheck').forEach(el => {
    const eid = parseInt(el.getAttribute('onclick').match(/\d+/)[0]);
    el.classList.toggle('selected', selectedPlayers.has(eid));
  });
  const cnt = document.getElementById('sel-count');
  if (cnt) cnt.textContent = selectedPlayers.size + ' selected';
  const btn = document.getElementById('draw-btn');
  if (btn) btn.disabled = selectedPlayers.size < 4;
}

function doDraw() {
  const ids = [...selectedPlayers].sort(() => Math.random() - 0.5);
  if (ids.length < 4) return;
  const teams = [];
  for (let i = 0; i < Math.floor(ids.length / 2); i++) {
    teams.push([ids[i * 2], ids[i * 2 + 1]]);
  }
  const odd = ids.length % 2 === 1 ? ids[ids.length - 1] : null;
  lastDraw = { teams, odd };
  render();
}

function renderResults() {
  if (!state.matches.length) {
    return `<div class="empty"><div class="empty-icon">⚽</div><p>No matches yet — add the first result!</p></div>`;
  }
  const pm = {};
  state.players.forEach(p => pm[p.id] = p);
  const cards = [...state.matches]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .map(m => {
      const h = pm[m.home], a = pm[m.away];
      if (!h || !a) return '';
      let hb, ab;
      if (m.homeGoals > m.awayGoals) { hb = 'ob-w'; ab = 'ob-l'; }
      else if (m.homeGoals < m.awayGoals) { hb = 'ob-l'; ab = 'ob-w'; }
      else { hb = ab = 'ob-d'; }
      const wl = (cls) => cls === 'ob-w' ? 'W' : cls === 'ob-l' ? 'L' : 'D';
      const ds = new Date(m.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const tA = m.teamA ? `<div class="r-team">${m.teamA}</div>` : '';
      const tB = m.teamB ? `<div class="r-team right">${m.teamB}</div>` : '';
      return `
        <div class="result-card">
          <div class="result-date">${ds}</div>
          <div class="result-row">
            <div style="flex:1"><div class="r-name">${h.name}</div>${tA}</div>
            <div class="r-score">
              <div class="score-box">${m.homeGoals}</div>
              <div class="score-sep">–</div>
              <div class="score-box">${m.awayGoals}</div>
            </div>
            <div style="flex:1;text-align:right"><div class="r-name right">${a.name}</div>${tB}</div>
          </div>
          <div class="r-badges">
            <span class="ob ${hb}">${wl(hb)}</span>
            <span class="ob ${ab}">${wl(ab)}</span>
          </div>
        </div>`;
    }).join('');
  return `<div class="results-list">${cards}</div>`;
}

function renderAdd() {
  const today = new Date().toISOString().slice(0, 10);

  if (lastDraw && lastDraw.teams && lastDraw.teams.length >= 2) {
    const t1 = lastDraw.teams[0], t2 = lastDraw.teams[1];
    const n = id => { const p = state.players.find(p => p.id === id); return p ? p.name : ''; };
    const tALabel = `${n(t1[0])} & ${n(t1[1])}`;
    const tBLabel = `${n(t2[0])} & ${n(t2[1])}`;
    const mkOpts = team => team.map(id => {
      const p = state.players.find(p => p.id === id);
      return p ? `<option value="${p.id}">${p.name}</option>` : '';
    }).join('');

    return `
      <div class="add-form">
        <div class="info-banner">🔀 Using today's draw — pick winner from each team</div>
        <div>
          <div class="field-label">Team 1 — ${tALabel}</div>
          <div class="row">
            <select id="sel-home">${mkOpts(t1)}</select>
            <input type="number" id="sc-home" value="0" min="0" max="99">
          </div>
        </div>
        <div>
          <div class="field-label">Team 2 — ${tBLabel}</div>
          <div class="row">
            <select id="sel-away">${mkOpts(t2)}</select>
            <input type="number" id="sc-away" value="0" min="0" max="99">
          </div>
        </div>
        <div>
          <div class="field-label">Date</div>
          <input type="date" id="match-date" value="${today}">
        </div>
        <button class="btn-primary" onclick="addMatch('${tALabel}','${tBLabel}')">Save result</button>
        <div class="success-banner" id="success-msg">✅ Saved!</div>
        <button class="btn-ghost" onclick="lastDraw=null;render()">Enter manually instead</button>
      </div>`;
  }

  const opts = state.players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  return `
    <div class="add-form">
      <div>
        <div class="field-label">Home player</div>
        <div class="row">
          <select id="sel-home">${opts}</select>
          <input type="number" id="sc-home" value="0" min="0" max="99">
        </div>
      </div>
      <div>
        <div class="field-label">Away player</div>
        <div class="row">
          <select id="sel-away">${opts}</select>
          <input type="number" id="sc-away" value="0" min="0" max="99">
        </div>
      </div>
      <div>
        <div class="field-label">Date</div>
        <input type="date" id="match-date" value="${today}">
      </div>
      <button class="btn-primary" onclick="addMatch()">Save result</button>
      <div class="success-banner" id="success-msg">✅ Saved!</div>
    </div>`;
}

function addMatch(teamALabel, teamBLabel) {
  const home = parseInt(document.getElementById('sel-home').value);
  const away = parseInt(document.getElementById('sel-away').value);
  const hg = parseInt(document.getElementById('sc-home').value) || 0;
  const ag = parseInt(document.getElementById('sc-away').value) || 0;
  const date = document.getElementById('match-date').value || new Date().toISOString().slice(0, 10);
  if (home === away) { alert('Pick two different players!'); return; }
  const entry = { id: state.nextId++, home, away, homeGoals: hg, awayGoals: ag, date };
  if (teamALabel) entry.teamA = teamALabel;
  if (teamBLabel) entry.teamB = teamBLabel;
  state.matches.push(entry);
  save();
  const msg = document.getElementById('success-msg');
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; lastDraw = null; showTab('results'); }, 1000);
}

function showTab(tab) {
  currentTab = tab;
  ['standings', 'draw', 'results', 'add'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === tab ? '' : 'none';
  });
  document.querySelectorAll('.tab').forEach((el, i) => {
    el.classList.toggle('active', ['standings', 'draw', 'results', 'add'][i] === tab);
  });
  render();
}

function render() {
  const map = { standings: renderStandings, draw: renderDraw, results: renderResults, add: renderAdd };
  document.getElementById('tab-' + currentTab).innerHTML = map[currentTab]();
  document.getElementById('header-sub').textContent =
    `${state.players.length} players · ${state.matches.length} matches`;
}

loadState();
render();
