document.addEventListener('DOMContentLoaded', () => {
    const studyKey = 'quiet-word-studies';
    const draftKey = 'quiet-word-draft';
    const today = new Date().toISOString().slice(0, 10);
    const form = document.getElementById('study-form');
    const fields = ['reference', 'date', 'learned', 'reflection', 'application', 'questions', 'prayer'];
    let studies = JSON.parse(localStorage.getItem(studyKey) || '[]');
    let editingId = null;

    const escapeHtml = (value = '') => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]);
    const formatDate = date => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
    const getLessons = () => [...document.querySelectorAll('#lessons-container input')].map(input => input.value.trim()).filter(Boolean);
    const studyText = study => Object.values(study).join(' ').toLowerCase();
    const saveStudies = () => localStorage.setItem(studyKey, JSON.stringify(studies));

    function showView(target) {
        document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === target));
        document.querySelectorAll('[data-target]').forEach(link => link.classList.toggle('active', link.dataset.target === target && link.closest('.nav-links')));
        if (target === 'dashboard' || target === 'history' || target === 'favorites' || target === 'progress') renderAll();
        document.querySelector('.sidebar').classList.remove('open');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function studyCard(study) {
        const preview = study.reflection || study.learned || 'No reflection added yet.';
        return `<article class="study-card"><div class="study-card-top"><span class="card-date">${formatDate(study.date)}</span><button class="favorite-btn ${study.favorite ? 'is-favorite' : ''}" data-favorite="${study.id}" aria-label="Toggle favorite"><i class="ph ${study.favorite ? 'ph-star-fill' : 'ph-star'}"></i></button></div><h3>${escapeHtml(study.reference)}</h3><p>${escapeHtml(preview.slice(0, 130))}${preview.length > 130 ? '...' : ''}</p><div class="card-actions"><button class="text-btn" data-open="${study.id}">Open study <i class="ph ph-arrow-up-right"></i></button><button class="icon-btn" data-delete="${study.id}" aria-label="Delete study"><i class="ph ph-trash"></i></button></div></article>`;
    }

    function renderList(element, list, empty) { element.innerHTML = list.length ? list.map(studyCard).join('') : `<div class="empty-state"><i class="ph ph-notebook"></i><h3>${empty}</h3><p>Your saved studies will appear here.</p></div>`; }
    function renderAll() {
        const sorted = [...studies].sort((a, b) => new Date(b.date) - new Date(a.date));
        renderList(document.getElementById('recent-list'), sorted.slice(0, 3), 'Your journal is waiting');
        const query = document.getElementById('search-input')?.value.toLowerCase() || '';
        const order = document.getElementById('sort-select')?.value || 'newest';
        const history = sorted.filter(study => studyText(study).includes(query));
        if (order === 'oldest') history.reverse();
        renderList(document.getElementById('history-list'), history, 'No studies found');
        renderList(document.getElementById('favorites-list'), sorted.filter(study => study.favorite), 'No favorites yet');
        const todayStudy = studies.find(study => study.date === today);
        document.getElementById('today-title').textContent = todayStudy ? todayStudy.reference : 'What will you discover today?';
        document.getElementById('today-copy').textContent = todayStudy ? (todayStudy.reflection || todayStudy.learned || 'Your study for today is ready to revisit.') : 'Set aside a few quiet minutes to read, listen, and respond.';
        document.getElementById('today-action').innerHTML = todayStudy ? 'Open today\'s study <i class="ph ph-arrow-right"></i>' : 'Start today\'s study <i class="ph ph-arrow-right"></i>';
        document.getElementById('today-action').dataset.open = todayStudy?.id || '';
        document.getElementById('study-count').textContent = studies.length;
        document.getElementById('chapter-count').textContent = studies.length;
        document.getElementById('favorite-count').textContent = studies.filter(study => study.favorite).length;
        document.getElementById('streak-stat').textContent = calculateStreak();
        document.getElementById('progress-chapters').textContent = studies.length;
        document.getElementById('current-book').textContent = sorted[0]?.reference.split(' ')[0] || '—';
        document.getElementById('progress-percent').textContent = studies.length ? `${Math.min(studies.length * 5, 100)}%` : '0%';
        document.getElementById('progress-bar').style.width = `${Math.min(studies.length * 5, 100)}%`;
    }
    function calculateStreak() {
        const dates = new Set(studies.map(study => study.date)); let count = 0; const cursor = new Date(`${today}T12:00:00`);
        while (dates.has(cursor.toISOString().slice(0, 10))) { count++; cursor.setDate(cursor.getDate() - 1); }
        return count;
    }
    function addLesson(value = '') { const row = document.createElement('div'); row.className = 'lesson-input-row'; row.innerHTML = `<i class="ph ph-caret-right"></i><input type="text" placeholder="What will you remember?" value="${escapeHtml(value)}"><button type="button" class="remove-lesson" aria-label="Remove lesson"><i class="ph ph-x"></i></button>`; document.getElementById('lessons-container').appendChild(row); row.querySelector('input').focus(); }
    function resetEditor() { editingId = null; form.reset(); document.getElementById('date').value = today; document.getElementById('editor-title').textContent = 'New study'; document.getElementById('draft-badge').innerHTML = '<i class="ph ph-pencil-simple"></i> Draft'; document.getElementById('lessons-container').innerHTML = ''; addLesson(); document.getElementById('recovery-alert').classList.add('hidden'); }
    function openStudy(id) { const study = studies.find(item => item.id === id); if (!study) return; editingId = id; fields.forEach(field => { document.getElementById(field).value = study[field] || ''; }); document.getElementById('lessons-container').innerHTML = ''; (study.lessons || []).forEach(addLesson); if (!study.lessons?.length) addLesson(); document.getElementById('editor-title').textContent = 'Edit study'; document.getElementById('draft-badge').innerHTML = '<i class="ph ph-check-circle"></i> Saved study'; showView('new-study'); }

    document.querySelectorAll('[data-target]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); showView(link.dataset.target); }));
    document.getElementById('add-lesson-btn').addEventListener('click', () => addLesson());
    document.getElementById('lessons-container').addEventListener('click', event => { if (event.target.closest('.remove-lesson')) event.target.closest('.lesson-input-row').remove(); });
    document.getElementById('study-form').addEventListener('input', () => { const draft = Object.fromEntries(fields.map(field => [field, document.getElementById(field).value])); draft.lessons = getLessons(); localStorage.setItem(draftKey, JSON.stringify(draft)); document.getElementById('recovery-alert').classList.remove('hidden'); });
    document.getElementById('discard-btn').addEventListener('click', () => { localStorage.removeItem(draftKey); resetEditor(); });
    form.addEventListener('submit', event => { event.preventDefault(); const study = { id: editingId || crypto.randomUUID(), ...Object.fromEntries(fields.map(field => [field, document.getElementById(field).value.trim()])), lessons: getLessons(), favorite: editingId ? studies.find(item => item.id === editingId).favorite : false }; studies = editingId ? studies.map(item => item.id === editingId ? study : item) : [study, ...studies]; saveStudies(); localStorage.removeItem(draftKey); resetEditor(); renderAll(); showView('dashboard'); const toast = document.getElementById('toast'); toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); });
    document.addEventListener('click', event => { const open = event.target.closest('[data-open]'); const favorite = event.target.closest('[data-favorite]'); const remove = event.target.closest('[data-delete]'); if (open?.dataset.open) openStudy(open.dataset.open); if (favorite) { const item = studies.find(study => study.id === favorite.dataset.favorite); item.favorite = !item.favorite; saveStudies(); renderAll(); } if (remove && confirm('Delete this study?')) { studies = studies.filter(study => study.id !== remove.dataset.delete); saveStudies(); renderAll(); } });
    document.getElementById('search-input').addEventListener('input', renderAll); document.getElementById('sort-select').addEventListener('change', renderAll); document.getElementById('mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
    const draft = JSON.parse(localStorage.getItem(draftKey) || 'null'); if (draft && (draft.reference || draft.learned || draft.reflection)) { fields.forEach(field => { document.getElementById(field).value = draft[field] || ''; }); document.getElementById('lessons-container').innerHTML = ''; (draft.lessons || []).forEach(addLesson); document.getElementById('recovery-alert').classList.remove('hidden'); } else resetEditor();
    document.getElementById('welcome-date').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()); renderAll();
});
