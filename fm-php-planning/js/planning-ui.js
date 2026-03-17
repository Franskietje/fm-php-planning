// Event type colors.
const TYPE_COLORS = 
{
  briefing:   '#C632FD',
  vooropbouw:'#FFEFCB',
  opbouw:    '#CADBFE',
  exposanten:'#2E6FFD',
  beurs:     '#66B132',
  afbouw:    '#FF2712'
};

const TYPE_ORDER = 
{
  briefing:1,
  vooropbouw:2,
  opbouw:3,
  exposanten:4,
  beurs:5,
  afbouw:6
};

// Legend.
function renderLegend() 
{
  const legend = document.getElementById('legend');
  if (!legend) return;

  legend.innerHTML = '';

  Object.entries(TYPE_COLORS).forEach(([type, color]) => 
  {
    const item = document.createElement('div');
    item.className = 'legend-item';

    const box = document.createElement('span');
    box.className = 'legend-color';
    box.style.background = color;

    const label = document.createElement('span');
    label.textContent = type;

    item.appendChild(box);
    item.appendChild(label);
    legend.appendChild(item);
  });

  // Ensure we keep the calendar header offset in sync with the top bar.
  updateStickyHeaderHeight();
}

// Ensure the calendar header stays positioned correctly under the top bar.
function updateStickyHeaderHeight() 
{
  const header = document.querySelector('.planning-header-bar');
  if (!header) return;

  const rect = header.getBoundingClientRect();
  const computed = getComputedStyle(header);
  const marginBottom = parseFloat(computed.marginBottom) || 0;
  const totalHeight = rect.height + marginBottom;

  document.documentElement.style.setProperty('--planning-header-height', `${totalHeight}px`);
}

// Date parsing.
function parseMDY(str) 
{
  if (!str) return null;
  const [mm, dd, yyyy] = str.split('/').map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

function parseISODate(str)
{
  if (!str) return null;
  const [yyyy, mm, dd] = str.split('-').map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

function daysBetween(a, b) 
{
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / MS);
}

let activeProjectleider = '__all__';

// Date dd/mm/yy
function fmtShort(d) 
{
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function updateRangeUI(startISO) 
{
  const start = new Date(startISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 40);

  const rangeText = document.getElementById('rangeText');
  if (rangeText) rangeText.textContent = `Range: ${fmtShort(start)} → ${fmtShort(end)}`;

  return { endISO: end.toISOString().slice(0, 10) };
}

// Datepicker + first load
document.addEventListener('DOMContentLoaded', () => 
{
  renderLegend();
  updateStickyHeaderHeight();

  const startInput = document.getElementById('startDate');

  const todayISO = new Date().toISOString().slice(0, 10);
  startInput.value = todayISO;

  const { endISO } = updateRangeUI(todayISO);
  loadPlanning(todayISO, endISO);

  startInput.addEventListener('change', () => 
  {
    const startISO = startInput.value;
    const { endISO } = updateRangeUI(startISO);
    loadPlanning(startISO, endISO);
  });
});

window.addEventListener('resize', () => 
{
  updateStickyHeaderHeight();
});

// Dropdown.
function fillProjectleiderDropdown(data) 
{
  const select = document.getElementById('projectleider');
  select.innerHTML = '<option value="__all__">Alle projectleiders</option>';

  const set = new Set();
  Object.values(data.dossiers || {}).forEach(d => {(d.projectleiders || []).forEach(n => { if (n) set.add(n); });});

  [...set]
    .sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
    .forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

  select.value = '__all__';
  select.onchange = () => filterByProjectleider(select.value);
}

// Filter by projectleider.
function filterByProjectleider(name) 
{
  activeProjectleider = name;

  if (!planningData) return;

  const dossiers = {};
  Object.entries(planningData.dossiers || {}).forEach(([id, d]) => {if (name === '__all__' || (d.projectleiders || []).includes(name)) { dossiers[id] = d; }});
  renderDossiers(dossiers);
}

// Calendar header (30 days)
function renderCalendarHeader(startISO) 
{
  const grid = document.getElementById('planning-grid');
  const start = parseISODate(startISO);

  // left top cell.
  grid.appendChild(makeCell('', 'planning-header'));
  grid.appendChild(makeCell('Projecten', 'planning-header'));

  for (let i = 0; i < 40; i++) 
  {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);

    const day = String(d.getDate()).padStart(2, '0');
    const weekday = d.toLocaleDateString('nl-BE', { weekday: 'short' });

    const cell = document.createElement('div');

    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    cell.className = 'calendar-day' + (isWeekend ? ' weekend' : '');
    cell.innerHTML = `<div class="day">${day}</div> <div class="weekday">${weekday}</div> `;
    grid.appendChild(cell);
  }
}

function renderDossiers(dossiers) 
{
  const grid = document.getElementById('planning-grid');
  grid.innerHTML = '';

  if (!planningData || !planningData.planning) return;

  const startISO = document.getElementById('startDate').value;
  const rangeStart = parseISODate(startISO);

  // Header.
  renderCalendarHeader(startISO);

  // First visible index helper.
  function firstVisibleIndex(dossierId) 
  {
    const events = planningData.planning[dossierId] || [];
    let min = Infinity;

    events.forEach(ev => 
    {
      const from = parseMDY(ev.datum_van);
      const to   = parseMDY(ev.datum_tot);
      if (!from || !to) return;

      let s = daysBetween(rangeStart, from);
      let e = daysBetween(rangeStart, to) + 1;

      s = Math.max(0, s);
      e = Math.min(40, e);

      if (s < e) min = Math.min(min, s);
    });

    return min;
  }

  // Sort by first visible event.
  const sorted = Object.entries(dossiers).sort(([a], [b]) => 
  {
    const da = firstVisibleIndex(a);
    const db = firstVisibleIndex(b);
    if (da === Infinity && db === Infinity) return 0;
    if (da === Infinity) return 1;
    if (db === Infinity) return -1;
    return da - db;
  });

  // Render rows.
  sorted.forEach(([dossierId, dossier], rowIndex) => 
  {
    const gridRow = rowIndex + 2;

    // Projectleider kolom.
    const leaderCell = makeCell( dossier.projectleiders_text || '', 'planning-projectleider');
    leaderCell.style.gridColumn = '1';
    leaderCell.style.gridRow = gridRow;
    grid.appendChild(leaderCell);

    // Dossiernaam kolom.
    const nameCell = makeCell(dossier.dossiernaam || '(zonder naam)', 'planning-dossier');
    nameCell.style.gridColumn = '2';
    nameCell.style.gridRow = gridRow;
    grid.appendChild(nameCell);

    for (let d = 0; d < 40; d++) 
    {
      const date = new Date(rangeStart);
      date.setUTCDate(rangeStart.getUTCDate() + d);

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const cell = makeCell('', 'planning-cell' + (isWeekend ? ' weekend' : ''));

      cell.style.gridColumn = d + 3;
      cell.style.gridRow = gridRow;
      grid.appendChild(cell);
    }

    // Events.
    const events = planningData.planning[dossierId] || [];
    // SORT by TYPE_ORDER only.
    events.sort((a, b) => {
      const aType = (a.type || '').toLowerCase();
      const bType = (b.type || '').toLowerCase();
      const aOrder = TYPE_ORDER[aType] || 999;
      const bOrder = TYPE_ORDER[bType] || 999;
      return aOrder - bOrder;
    });

    let previousTo = null;
    let previousType = null;

    events.forEach(ev => 
    {
      const typeRaw = (ev.type || '').trim();
      const type = typeRaw.toLowerCase();
      if (!TYPE_COLORS[type]) return;

      const from = parseMDY(ev.datum_van);
      const to   = parseMDY(ev.datum_tot);
      if (!from || !to) return;

      let start = daysBetween(rangeStart, from);
      let end   = daysBetween(rangeStart, to) + 1;

      start = Math.max(0, start);
      end   = Math.min(40, end);
      if (start >= end) return;

      const block = document.createElement('div');
      if (previousTo && previousTo.toDateString() === from.toDateString()) 
      {
        if (previousType && TYPE_ORDER[type] >= TYPE_ORDER[previousType])
        {
          block.className = 'right-plan-block';
        }
        else
        {
          block.className = 'left-plan-block';
        }

        // Set span to 1 day for the half-block
        block.style.gridColumn = `${start + 3} / ${start + 4}`;
        block.style.gridRow = gridRow;
        block.style.background = TYPE_COLORS[type];
        block.title = `${typeRaw}: ${fmtShort(from)} ${ev.start_uur || ''} → ${fmtShort(to)} ${ev.stop_uur || ''}`;
        grid.appendChild(block);

        // If more days, add full blocks for the rest
        if (end > start + 1) {
          const fullBlock = document.createElement('div');
          fullBlock.className = 'plan-block';
          fullBlock.style.gridColumn = `${start + 4} / ${end + 3}`;
          fullBlock.style.gridRow = gridRow;
          fullBlock.style.background = TYPE_COLORS[type];
          fullBlock.title = `${typeRaw}: ${fmtShort(from)} ${ev.start_uur || ''} → ${fmtShort(to)} ${ev.stop_uur || ''}`;
          grid.appendChild(fullBlock);
        }
      } 
      else 
      {
        block.className = 'plan-block';
        block.style.gridColumn = `${start + 3} / ${end + 3}`;
        block.style.gridRow = gridRow;
        block.style.background = TYPE_COLORS[type];
        block.title = `${typeRaw}: ${fmtShort(from)} ${ev.start_uur || ''} → ${fmtShort(to)} ${ev.stop_uur || ''}`;
        grid.appendChild(block);
      }

      previousTo = to;
      previousType = type;
    });
  });
}

function makeCell(text, cls) 
{
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text ?? '';
  div.title = text ?? '';
  return div;
}

const refreshBtn = document.getElementById('refreshBtn');

if (refreshBtn)
{
  refreshBtn.addEventListener('click', () =>
  {
    const startISO = document.getElementById('startDate').value;
    const { endISO } = updateRangeUI(startISO);

    loadPlanning(startISO, endISO);
  });
}