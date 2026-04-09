// ─── STATE ───────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES = [
  {
    id: 'A', letter: 'A', name: 'Superiores',
    exercises: [
      { id: 'e1', name: 'Dips', prog: 'Progressão Dubla/Tripla' },
      { id: 'e2', name: 'Chin Up', prog: 'Progressão Dubla/Tripla' },
      { id: 'e3', name: 'Flexão na Argola', prog: 'Progressão Dubla/Tripla' },
       { id: 'e3', name: 'Remada aberta na Argola', prog: 'Progressão Dubla/Tripla' },
      { id: 'e4', name: 'Elevação de Perna', prog: 'Volume Total' },
      { id: 'e5', name: 'Ring Facepull', prog: 'Volume Total' },
      { id: 'e6', name: 'Ring Extension', prog: 'Cluster' },
      { id: 'e7', name: 'Ring Pelican Curl', prog: 'Cluster' },
    ]
  },
  {
    id: 'B', letter: 'B', name: 'Inferiores',
    exercises: [
      { id: 'e1', name: 'Pistol Squat', prog: 'Progressão Linear' },
      { id: 'e2', name: 'Nórdica', prog: 'Progressão Linear' },
      { id: 'e3', name: 'Bulgarian Split Squat', prog: 'Progressão Dubla/Tripla' },
      { id: 'e4', name: 'Stiff', prog: 'Progressão Dubla/Tripla' },
      { id: 'e5', name: 'Hollow Body Hold', prog: 'Volume' },
      { id: 'e6', name: 'Panturrilha em pé', prog: 'Progressão Dubla/Tripla' },
      { id: 'e7', name: 'Tibial Raise', prog: 'Progressão Dubla/Tripla' },
    ]
  },

]

function loadTemplates() {
  const t = localStorage.getItem('logbook_templates')
  return t ? JSON.parse(t) : DEFAULT_TEMPLATES
}
function saveTemplates(t) { localStorage.setItem('logbook_templates', JSON.stringify(t)) }
function loadLog() {
  const l = localStorage.getItem('logbook_log')
  return l ? JSON.parse(l) : []
}
function saveLog(l) { localStorage.setItem('logbook_log', JSON.stringify(l)) }

let templates = loadTemplates()
let log = loadLog()
let currentWorkout = null
let expandedExercise = null

// ─── UTILS ───────────────────────────────────────────────────────────────────

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatDateFull(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function progClass(prog) {
  const map = { 'DDP': 'ddp', 'DP': 'dp', 'Cluster': 'cluster', 'Volume': 'volume' }
  return map[prog] || ''
}

function showToast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2000)
}

function closeModal(id) { document.getElementById(id).classList.remove('open') }

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.getElementById(id).classList.add('active')
}

// ─── NAV ─────────────────────────────────────────────────────────────────────

function navigate(tab) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('nav' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active')
  if (tab === 'home') { renderHome(); showView('viewHome') }
  else if (tab === 'history') { renderHistory(); showView('viewHistory') }
  else if (tab === 'templates') { renderTemplates(); showView('viewTemplates') }
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function renderHome() {
  const d = new Date()
  document.getElementById('headerDate').textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })

  const list = document.getElementById('dayList')
  const sorted = [...log].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20)

  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">🏋️</div><div class="empty-text">Nenhum treino ainda.<br>Toque em + para começar.</div></div>`
    return
  }

  list.innerHTML = sorted.map(entry => {
    const exCount = entry.exercises.filter(e => e.series.some(s => s.reps || s.load)).length
    const totalSeries = entry.exercises.reduce((acc, e) => acc + e.series.length, 0)
    return `
    <div class="day-item" onclick="openDetail('${entry.id}')">
      <div class="day-item-left">
        <div class="day-item-date">${formatDate(entry.date)} · ${formatTime(entry.date)}</div>
        <div class="day-item-workout">${entry.templateName}</div>
        <div class="day-item-meta">${exCount} exercícios · ${totalSeries} séries</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge-workout">${entry.templateLetter}</span>
        <span class="day-item-arrow">›</span>
      </div>
    </div>`
  }).join('')
}

// ─── NEW WORKOUT ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnNewWorkout').addEventListener('click', () => {
    renderTemplateSelector()
    showView('viewSelectTemplate')
  })
  document.getElementById('headerDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })
  renderHome()
})

function renderTemplateSelector() {
  const grid = document.getElementById('templateGrid')
  grid.innerHTML = templates.map(t => `
    <div class="template-card" onclick="startWorkout('${t.id}')">
      <div class="template-letter">${t.letter}</div>
      <div class="template-name">${t.name}</div>
      <div class="template-exercises">${t.exercises.map(e => e.name).join(' · ')}</div>
    </div>
  `).join('')
}

function startWorkout(templateId) {
  const t = templates.find(t => t.id === templateId)
  if (!t) return
  currentWorkout = {
    id: uid(),
    date: new Date().toISOString(),
    templateId: t.id,
    templateLetter: t.letter,
    templateName: t.name,
    exercises: t.exercises.map(e => ({
      id: uid(),
      name: e.name,
      prog: e.prog,
      series: [{ reps: '', load: '', note: '' }],
      notes: ''
    }))
  }
  renderWorkout()
  showView('viewWorkout')
}

// ─── WORKOUT VIEW ─────────────────────────────────────────────────────────────

function renderWorkout() {
  if (!currentWorkout) return
  document.getElementById('workoutTitle').textContent = currentWorkout.templateName
  document.getElementById('workoutSubtitle').textContent = formatDateFull(currentWorkout.date)

  const filled = currentWorkout.exercises.filter(e => e.series.some(s => s.reps || s.load)).length
  const pct = currentWorkout.exercises.length ? (filled / currentWorkout.exercises.length) * 100 : 0
  document.getElementById('progressFill').style.width = pct + '%'

  const list = document.getElementById('exerciseList')
  list.innerHTML = currentWorkout.exercises.map((ex) => `
    <div class="exercise-card" id="excard-${ex.id}">
      <div class="exercise-header" onclick="toggleExercise('${ex.id}')">
        <div>
          <div class="exercise-name">${ex.name}</div>
          <div style="margin-top:4px">${renderSeriesSummary(ex)}</div>
        </div>
        <span class="exercise-prog ${progClass(ex.prog)}">${ex.prog}</span>
      </div>
      <div class="exercise-body ${expandedExercise === ex.id ? 'open' : ''}" id="exbody-${ex.id}">
        <div class="series-table">
          <div class="series-row" style="margin-bottom:2px">
            <span class="series-col-label">#</span>
            <span class="series-col-label">Reps</span>
            <span class="series-col-label">Carga</span>
            <span class="series-col-label">Nota</span>
            <span></span>
          </div>
          ${ex.series.map((s, si) => `
            <div class="series-row" id="srow-${ex.id}-${si}">
              <span class="series-label">${si + 1}</span>
              <input class="series-input" type="text" inputmode="decimal" placeholder="—" value="${s.reps}"
                oninput="updateSeries('${ex.id}', ${si}, 'reps', this.value)">
              <input class="series-input" type="text" inputmode="decimal" placeholder="—" value="${s.load}"
                oninput="updateSeries('${ex.id}', ${si}, 'load', this.value)">
              <input class="series-input" type="text" placeholder="—" value="${s.note || ''}"
                oninput="updateSeries('${ex.id}', ${si}, 'note', this.value)">
              <button class="btn-remove-series" onclick="removeSeries('${ex.id}', ${si})" ${ex.series.length <= 1 ? 'disabled style="opacity:0.2"' : ''}>×</button>
            </div>
          `).join('')}
        </div>
        <button class="btn-add-series" onclick="addSeries('${ex.id}')">+ série</button>
        <textarea class="notes-input" placeholder="Observações do exercício..." oninput="updateExNotes('${ex.id}', this.value)">${ex.notes || ''}</textarea>
      </div>
    </div>
  `).join('')
}

function renderSeriesSummary(ex) {
  const done = ex.series.filter(s => s.reps || s.load)
  if (done.length === 0) return `<span style="font-family:var(--mono);font-size:11px;color:var(--text3)">0 séries</span>`
  return `<div class="summary-row">${done.map((s) =>
    `<span class="summary-chip">${s.reps || '?'}${s.load ? ' × ' + s.load + 'kg' : ''}</span>`
  ).join('')}</div>`
}

function toggleExercise(exId) {
  expandedExercise = expandedExercise === exId ? null : exId
  renderWorkout()
  if (expandedExercise) {
    setTimeout(() => {
      const el = document.getElementById('excard-' + exId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }
}

function updateSeries(exId, si, field, val) {
  const ex = currentWorkout.exercises.find(e => e.id === exId)
  if (!ex) return
  ex.series[si][field] = val
  const filled = currentWorkout.exercises.filter(e => e.series.some(s => s.reps || s.load)).length
  const pct = currentWorkout.exercises.length ? (filled / currentWorkout.exercises.length) * 100 : 0
  document.getElementById('progressFill').style.width = pct + '%'
}

function updateExNotes(exId, val) {
  const ex = currentWorkout.exercises.find(e => e.id === exId)
  if (ex) ex.notes = val
}

function addSeries(exId) {
  const ex = currentWorkout.exercises.find(e => e.id === exId)
  if (!ex) return
  ex.series.push({ reps: '', load: '', note: '' })
  renderWorkout()
}

function removeSeries(exId, si) {
  const ex = currentWorkout.exercises.find(e => e.id === exId)
  if (!ex || ex.series.length <= 1) return
  ex.series.splice(si, 1)
  renderWorkout()
}

function confirmFinish() {
  const hasData = currentWorkout.exercises.some(e => e.series.some(s => s.reps || s.load))
  if (!hasData) {
    if (!confirm('Nenhum dado registrado. Salvar assim mesmo?')) return
  }
  log.unshift(currentWorkout)
  saveLog(log)
  currentWorkout = null
  expandedExercise = null
  showToast('Treino salvo!')
  navigate('home')
}

function cancelWorkout() {
  if (confirm('Cancelar o treino? Os dados não serão salvos.')) {
    currentWorkout = null
    expandedExercise = null
    navigate('home')
  }
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────

function renderHistory() {
  const list = document.getElementById('historyList')
  if (log.length === 0) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Nenhum treino registrado ainda.</div></div>`
    return
  }
  const sorted = [...log].sort((a, b) => new Date(b.date) - new Date(a.date))
  list.innerHTML = sorted.map(entry => `
    <div class="day-item" onclick="openDetail('${entry.id}')">
      <div class="day-item-left">
        <div class="day-item-date">${formatDate(entry.date)} · ${formatTime(entry.date)}</div>
        <div class="day-item-workout">${entry.templateName}</div>
        <div class="day-item-meta">${entry.exercises.length} exercícios</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge-workout">${entry.templateLetter}</span>
        <span class="day-item-arrow">›</span>
      </div>
    </div>
  `).join('')
}

function openDetail(id) {
  const entry = log.find(e => e.id === id)
  if (!entry) return
  document.getElementById('modalDetailTitle').textContent = entry.templateName + ' — ' + formatDate(entry.date)
  const body = document.getElementById('modalDetailBody')
  body.innerHTML = entry.exercises.map(ex => {
    const hasSeries = ex.series.some(s => s.reps || s.load)
    return `
    <div class="hist-exercise-block">
      <div class="hist-exercise-name">${ex.name} <span style="font-family:var(--mono);font-size:10px;color:var(--text3)">${ex.prog}</span></div>
      ${hasSeries ? ex.series.filter(s => s.reps || s.load).map((s, i) => `
        <div class="hist-series-row">
          <span class="hist-chip">#${i+1}</span>
          ${s.reps ? `<span class="hist-chip">${s.reps} reps</span>` : ''}
          ${s.load ? `<span class="hist-chip">${s.load} kg</span>` : ''}
          ${s.note ? `<span style="font-family:var(--mono);font-size:11px;color:var(--text2)">${s.note}</span>` : ''}
        </div>
      `).join('') : `<div style="font-family:var(--mono);font-size:11px;color:var(--text3)">sem dados</div>`}
      ${ex.notes ? `<div class="hist-notes">"${ex.notes}"</div>` : ''}
    </div>`
  }).join('<hr style="border:none;border-top:1px solid var(--border);margin:10px 0">')

  document.getElementById('btnDeleteWorkout').onclick = () => deleteWorkout(id)
  document.getElementById('modalDetail').classList.add('open')
}

function deleteWorkout(id) {
  if (!confirm('Excluir este registro permanentemente?')) return
  log = log.filter(e => e.id !== id)
  saveLog(log)
  closeModal('modalDetail')
  renderHistory()
  renderHome()
  showToast('Registro excluído')
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

function renderTemplates() {
  const list = document.getElementById('templateManageList')
  list.innerHTML = templates.map(t => `
    <div class="template-manage-card">
      <div class="template-manage-header" onclick="toggleTemplateBody('${t.id}')">
        <div class="template-manage-title">
          <div class="template-letter-small">${t.letter}</div>
          <div>
            <div style="font-size:14px;font-weight:600">${t.name}</div>
            <div style="font-size:11px;color:var(--text2);font-family:var(--mono)">${t.exercises.length} exercícios</div>
          </div>
        </div>
        <span style="color:var(--text3);font-size:18px">›</span>
      </div>
      <div class="template-manage-body" id="tbody-${t.id}">
        <div class="ex-list" id="exlist-${t.id}">
          ${t.exercises.map((ex) => `
            <div class="ex-list-item">
              <div>
                <div class="ex-list-name">${ex.name}</div>
                <div class="ex-list-prog">${ex.prog}</div>
              </div>
              <button onclick="removeExFromTemplate('${t.id}','${ex.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0" title="Remover">×</button>
            </div>
          `).join('')}
        </div>
        <div class="add-ex-form" id="addform-${t.id}" style="display:none">
          <input class="text-input" type="text" placeholder="Nome do exercício" id="exname-${t.id}">
          <select class="select-input" id="exprog-${t.id}">
            <option value="DDP">DDP</option>
            <option value="DP">DP</option>
            <option value="Cluster">Cluster</option>
            <option value="Volume">Volume</option>
          </select>
          <div class="row-btns">
            <button class="btn btn-primary" style="font-size:13px;padding:10px" onclick="addExToTemplate('${t.id}')">Adicionar</button>
            <button class="btn btn-ghost" style="font-size:13px;padding:10px" onclick="document.getElementById('addform-${t.id}').style.display='none'">Cancelar</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
          <button class="btn btn-ghost" style="font-size:13px;padding:10px" onclick="document.getElementById('addform-${t.id}').style.display='block'">+ exercício</button>
          <button class="btn btn-danger" style="font-size:13px;padding:10px" onclick="deleteTemplate('${t.id}')">Excluir template</button>
        </div>
      </div>
    </div>
  `).join('')

  // Botão criar novo template
  list.innerHTML += `
    <button class="btn btn-ghost" style="margin-top:4px" onclick="openCreateTemplate()">+ novo template</button>
  `
}

function toggleTemplateBody(id) {
  const el = document.getElementById('tbody-' + id)
  el.classList.toggle('open')
}

function removeExFromTemplate(templateId, exId) {
  const t = templates.find(t => t.id === templateId)
  if (!t) return
  t.exercises = t.exercises.filter(e => e.id !== exId)
  saveTemplates(templates)
  renderTemplates()
  showToast('Exercício removido')
}

function addExToTemplate(templateId) {
  const nameEl = document.getElementById('exname-' + templateId)
  const progEl = document.getElementById('exprog-' + templateId)
  const name = nameEl.value.trim()
  if (!name) { nameEl.focus(); return }
  const t = templates.find(t => t.id === templateId)
  if (!t) return
  t.exercises.push({ id: uid(), name, prog: progEl.value })
  saveTemplates(templates)
  renderTemplates()
  document.getElementById('tbody-' + templateId).classList.add('open')
  showToast('Exercício adicionado')
}

function deleteTemplate(templateId) {
  if (!confirm('Excluir este template permanentemente?')) return
  templates = templates.filter(t => t.id !== templateId)
  saveTemplates(templates)
  renderTemplates()
  showToast('Template excluído')
}

// ─── CREATE TEMPLATE ──────────────────────────────────────────────────────────

let newTemplateExercises = []

function openCreateTemplate() {
  newTemplateExercises = []
  document.getElementById('newTemplateName').value = ''
  document.getElementById('newTemplateLetter').value = ''
  document.getElementById('newTemplateExList').innerHTML = '<div style="font-family:var(--mono);font-size:11px;color:var(--text3);padding:8px 0">Nenhum exercício ainda.</div>'
  document.getElementById('newExName').value = ''
  document.getElementById('newExProg').value = 'DDP'
  document.getElementById('modalCreateTemplate').classList.add('open')
}

function addExToNew() {
  const nameEl = document.getElementById('newExName')
  const progEl = document.getElementById('newExProg')
  const name = nameEl.value.trim()
  if (!name) { nameEl.focus(); return }
  newTemplateExercises.push({ id: uid(), name, prog: progEl.value })
  nameEl.value = ''
  renderNewExList()
}

function removeExFromNew(exId) {
  newTemplateExercises = newTemplateExercises.filter(e => e.id !== exId)
  renderNewExList()
}

function renderNewExList() {
  const list = document.getElementById('newTemplateExList')
  if (newTemplateExercises.length === 0) {
    list.innerHTML = '<div style="font-family:var(--mono);font-size:11px;color:var(--text3);padding:8px 0">Nenhum exercício ainda.</div>'
    return
  }
  list.innerHTML = newTemplateExercises.map(ex => `
    <div class="ex-list-item">
      <div>
        <div class="ex-list-name">${ex.name}</div>
        <div class="ex-list-prog">${ex.prog}</div>
      </div>
      <button onclick="removeExFromNew('${ex.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0">×</button>
    </div>
  `).join('')
}

function saveNewTemplate() {
  const name = document.getElementById('newTemplateName').value.trim()
  const letter = document.getElementById('newTemplateLetter').value.trim().toUpperCase().slice(0, 2)
  if (!name) { document.getElementById('newTemplateName').focus(); return }
  if (!letter) { document.getElementById('newTemplateLetter').focus(); return }
  if (newTemplateExercises.length === 0) { showToast('Adicione ao menos 1 exercício'); return }
  const newId = uid()
  templates.push({ id: newId, letter, name, exercises: newTemplateExercises })
  saveTemplates(templates)
  closeModal('modalCreateTemplate')
  renderTemplates()
  showToast('Template criado!')
}