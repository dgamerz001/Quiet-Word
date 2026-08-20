document.addEventListener('DOMContentLoaded', () => {
    const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const strayMarkers = [];
    while (textWalker.nextNode()) {
        if (/^[+\s]+$/.test(textWalker.currentNode.textContent)) strayMarkers.push(textWalker.currentNode);
    }
    strayMarkers.forEach(node => node.remove());
    const studyKey = 'quiet-word-studies';
    const draftKey = 'quiet-word-draft';
    const themeKey = 'quiet-word-theme';
    const planKey = 'quiet-word-plans';
    const streakKey = 'quiet-word-streak-activity';
    const prayerKey = 'quiet-word-prayers';
    const collectionKey = 'quiet-word-collections';
    const localDate = value => { const date = value instanceof Date ? value : new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
    const today = localDate(new Date());
    const form = document.getElementById('study-form');
    const fields = ['reference', 'date', 'learned', 'reflection', 'application', 'questions', 'prayer'];
    let studies = JSON.parse(localStorage.getItem(studyKey) || '[]').map(study => ({ completed: true, tags: [], collectionIds: [], ...study }));
    const PLAN_DEFINITIONS = [
        { id: 'bible-in-one-year', planName: 'Bible in 1 Year', description: 'A whole-Bible reading rhythm for the year.', duration: 365, readings: ['Genesis 1–3', 'Genesis 4–7', 'Genesis 8–11', 'Genesis 12–15'] },
        { id: 'new-testament-90', planName: 'New Testament in 90 Days', description: 'Read through the New Testament one day at a time.', duration: 90, readings: ['Matthew 1–4', 'Matthew 5–7', 'Matthew 8–10', 'Matthew 11–13', 'Matthew 14–17'] },
        { id: 'gospels-30', planName: 'Gospels in 30 Days', description: 'Spend a month moving through the story of Jesus.', duration: 30, readings: ['Matthew 1–4', 'Matthew 5–7', 'Matthew 8–10', 'Matthew 11–13', 'Matthew 14–17'] },
        { id: 'psalms-30', planName: 'Psalms in 30 Days', description: 'A month of honest prayer and praise in the Psalms.', duration: 30, readings: ['Psalms 1–5', 'Psalms 6–10', 'Psalms 11–17', 'Psalms 18–22', 'Psalms 23–27'] },
        { id: 'proverbs-31', planName: 'Proverbs in 31 Days', description: 'A practical daily rhythm through Proverbs.', duration: 31, readings: ['Proverbs 1', 'Proverbs 2', 'Proverbs 3', 'Proverbs 4', 'Proverbs 5'] }
    ];
    const dateOnly = value => new Date(`${value}T12:00:00`);
    const dateString = value => localDate(dateOnly(value));
    const addDays = (value, days) => { const date = dateOnly(value); date.setDate(date.getDate() + days); return dateString(date.toISOString().slice(0, 10)); };
    const planReadings = definition => Array.from({ length: definition.duration }, (_, index) => definition.readings[index % definition.readings.length] || `${definition.planName} · Day ${index + 1}`);
    const makeSchedule = (readings, startDate) => readings.map((reference, index) => ({ dayNumber: index + 1, date: addDays(startDate, index), reference, completed: false, completedAt: null }));
    const uid = () => crypto.randomUUID();
    const normalizePlan = plan => {
        if (plan.schedule) return { userId: null, status: 'saved', completedReadings: [], ...plan, planName: plan.planName || plan.name, schedule: plan.schedule || [] };
        const startDate = plan.startDate || plan.createdAt || today;
        const schedule = (plan.items || []).map((item, index) => ({ dayNumber: index + 1, date: item.date || addDays(startDate, index), reference: item.reference, completed: Boolean(item.completed), completedAt: item.completedAt || null }));
        return { id: plan.id || uid(), userId: null, planName: plan.name || 'Untitled plan', description: plan.description || '', startDate: plan.startDate || null, targetDate: plan.targetDate || (schedule.length ? schedule[schedule.length - 1].date : null), status: plan.status || 'saved', currentDay: 1, schedule, completedReadings: schedule.filter(item => item.completed).map(item => item.dayNumber), createdAt: plan.createdAt || today, updatedAt: today };
    };
    let plans = JSON.parse(localStorage.getItem(planKey) || '[]').map(normalizePlan);
    let storedActivity = JSON.parse(localStorage.getItem(streakKey) || '[]');
    let prayers = JSON.parse(localStorage.getItem(prayerKey) || '[]');
    let collections = JSON.parse(localStorage.getItem(collectionKey) || '[]');
    let editingId = null;

    const escapeHtml = (value = '') => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]);
    const formatDate = date => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
    const getLessons = () => [...document.querySelectorAll('#lessons-container input')].map(input => input.value.trim()).filter(Boolean);
    const studyText = study => Object.values(study).join(' ').toLowerCase();
    const saveStudies = () => localStorage.setItem(studyKey, JSON.stringify(studies));
    const savePlans = () => localStorage.setItem(planKey, JSON.stringify(plans));
    const savePrayers = () => localStorage.setItem(prayerKey, JSON.stringify(prayers));
    const saveCollections = () => localStorage.setItem(collectionKey, JSON.stringify(collections));
    const saveActivity = () => localStorage.setItem(streakKey, JSON.stringify(storedActivity));
    const escapeAttribute = value => escapeHtml(value).replace(/`/g, '&#096;');

    function emptyState(title, copy) { return `<div class="empty-state"><i class="ph ph-notebook"></i><h3>${title}</h3><p>${copy}</p></div>`; }

    function syncReadingActivity() {
        const records = new Map();
        studies.forEach(study => { if (study.date && study.date <= today) records.set(study.date, { date: study.date, activityType: 'study', sourceId: study.id }); });
        plans.forEach(plan => plan.schedule.forEach(reading => { if (reading.completed && reading.date <= today) records.set(reading.date, { date: reading.date, activityType: 'plan-reading', sourceId: plan.id, planId: plan.id }); }));
        storedActivity = [...records.values()].sort((a, b) => a.date.localeCompare(b.date));
        saveActivity();
        return storedActivity;
    }

    function streakStats() {
        const activity = syncReadingActivity();
        const dates = new Set(activity.map(item => item.date));
        let currentStreak = 0;
        let cursor = today;
        while (dates.has(cursor)) { currentStreak += 1; cursor = addDays(cursor, -1); }
        let longestStreak = 0;
        let run = 0;
        let previous = null;
        activity.forEach(item => { run = previous && addDays(previous, 1) === item.date ? run + 1 : 1; longestStreak = Math.max(longestStreak, run); previous = item.date; });
        return { currentStreak, longestStreak, totalReadingDays: activity.length, totalCompletedReadings: plans.reduce((count, plan) => count + plan.schedule.filter(item => item.completed).length, 0), lastActiveDate: activity.at(-1)?.date || null, activity };
    }

    function renderStreakDetails() {
        const stats = streakStats();
        document.getElementById('streak-stats').innerHTML = `<article class="streak-stat-card"><span class="stat-icon"><i class="ph ph-fire"></i></span><strong>${stats.currentStreak}</strong><span>Current streak</span></article><article class="streak-stat-card"><span class="stat-icon"><i class="ph ph-trophy"></i></span><strong>${stats.longestStreak}</strong><span>Longest streak</span></article><article class="streak-stat-card"><span class="stat-icon"><i class="ph ph-calendar-check"></i></span><strong>${stats.totalReadingDays}</strong><span>Active reading days</span></article><article class="streak-stat-card"><span class="stat-icon"><i class="ph ph-books"></i></span><strong>${stats.totalCompletedReadings}</strong><span>Completed readings</span></article>`;
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthDays = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
        const offset = monthStart.getDay();
        const cells = Array.from({ length: offset + monthDays }, (_, index) => { if (index < offset) return '<span class="calendar-cell is-blank"></span>'; const day = index - offset + 1; const date = localDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), day)); const state = stats.activity.some(item => item.date === date) ? 'is-complete' : date === today ? 'is-today' : date > today ? 'is-future' : 'is-missed'; return `<span class="calendar-cell ${state}" title="${date}">${day}</span>`; }).join('');
        document.getElementById('streak-calendar').innerHTML = `<div class="calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="calendar-grid">${cells}</div>`;
        document.getElementById('streak-message').textContent = stats.currentStreak ? 'Keep your rhythm going.' : 'Keep going. Start again today.';
        const recent = stats.activity.slice(-7).reverse();
        document.getElementById('recent-activity').innerHTML = recent.length ? recent.map(item => `<div class="recent-activity-row"><span class="activity-dot"></span><span>${formatDate(item.date)}</span><small>${item.activityType === 'plan-reading' ? 'Reading plan completed' : 'Bible study recorded'}</small></div>`).join('') : '<p class="helper-text">Your recent reading days will appear here.</p>';
        document.getElementById('streak-stat').textContent = stats.currentStreak;
    }

    function planProgress(plan) { const completed = plan.schedule.filter(item => item.completed).length; return { completed, remaining: plan.schedule.length - completed, percent: plan.schedule.length ? Math.round(completed / plan.schedule.length * 100) : 0 }; }
    function activePlan() { return plans.find(plan => plan.status === 'active'); }
    function renderPlanSchedule(plan) { return plan.schedule.map(item => `<label class="plan-item ${item.completed ? 'is-complete' : item.date === today ? 'is-current' : item.date < today ? 'is-past' : 'is-upcoming'}"><input type="checkbox" data-plan="${plan.id}" data-plan-item="${item.dayNumber - 1}" ${item.completed ? 'checked' : ''}><span><strong>Day ${item.dayNumber}</strong><small>${formatDate(item.date)} · ${item.date === today ? 'Current' : item.completed ? 'Completed' : item.date < today ? 'Catch up' : 'Upcoming'}</small>${escapeHtml(item.reference)}</span></label>`).join(''); }
    function renderPlans() {
        const target = document.getElementById('plans-list');
        const active = activePlan();
        const catalog = PLAN_DEFINITIONS.map(definition => `<article class="v2-card plan-catalog-card"><span class="eyebrow">${definition.duration} days</span><h3>${escapeHtml(definition.planName)}</h3><p>${escapeHtml(definition.description)}</p><button class="btn primary-btn" data-start-predefined="${definition.id}"><i class="ph ph-play"></i> Start plan</button></article>`).join('');
        const saved = plans.filter(plan => plan.status !== 'active').map(plan => { const progress = planProgress(plan); return `<article class="v2-card"><div class="v2-card-heading"><div><span class="eyebrow">${plan.status === 'completed' ? 'Completed' : 'Saved'} · ${progress.percent}%</span><h3>${escapeHtml(plan.planName)}</h3></div><button class="icon-btn" data-delete-plan="${plan.id}" aria-label="Delete reading plan"><i class="ph ph-trash"></i></button></div><p>${escapeHtml(plan.description || 'A personal reading rhythm.')}</p><button class="text-btn" data-open-plan="${plan.id}">View schedule <i class="ph ph-arrow-up-right"></i></button></article>`; }).join('');
        const activeMarkup = active ? (() => { const progress = planProgress(active); const current = active.schedule.find(item => item.date === today && !item.completed) || active.schedule.find(item => !item.completed); return `<article class="v2-card active-plan-card"><div class="v2-card-heading"><div><span class="eyebrow">Active plan · Day ${current?.dayNumber || active.schedule.length} of ${active.schedule.length}</span><h2>${escapeHtml(active.planName)}</h2></div><button class="text-btn" data-open-plan="${active.id}">Full schedule</button></div><p>${escapeHtml(active.description)}</p><div class="plan-summary-grid"><span><strong>${progress.percent}%</strong> progress</span><span><strong>${progress.completed}</strong> completed</span><span><strong>${progress.remaining}</strong> remaining</span></div><div class="progress-track"><span style="width:${progress.percent}%"></span></div><h3>Today's reading</h3><p>${current ? escapeHtml(current.reference) : 'Plan complete'}</p><div class="card-actions"><button class="btn dark-btn" data-create-study="${active.id}" data-create-day="${current?.dayNumber || ''}"><i class="ph ph-book-open"></i> Create study</button>${current && !current.completed ? `<button class="btn primary-btn" data-complete-reading="${active.id}" data-complete-day="${current.dayNumber}">Mark as read</button>` : ''}</div></article>`; })() : `<article class="v2-card empty-plan-card"><span class="section-icon"><i class="ph ph-calendar-check"></i></span><h2>Build a rhythm of reading</h2><p>Choose a reading plan and begin your journey through Scripture.</p><button class="btn primary-btn" data-scroll-catalog>Explore reading plans</button></article>`;
        target.innerHTML = `<div class="plans-active-section"><div class="section-heading"><div><p class="eyebrow">Your current path</p><h2>Active plan</h2></div></div>${activeMarkup}</div><div class="section-heading plans-catalog-heading"><div><p class="eyebrow">Start somewhere good</p><h2>Explore plans</h2></div><button class="text-btn" id="custom-plan-inline">Create custom plan <i class="ph ph-plus"></i></button></div><div class="v2-grid plan-catalog-grid">${catalog}</div>${saved ? `<div class="section-heading"><div><p class="eyebrow">Your library</p><h2>Saved and completed</h2></div></div><div class="v2-grid">${saved}</div>` : ''}<div id="plan-detail" class="plan-detail"></div>`;
        document.getElementById('custom-plan-inline').addEventListener('click', createCustomPlan);
    }

    function startPlan(definition, startDate = today) {
        const existing = activePlan();
        if (existing && !confirm(`You are already following ${existing.planName}. Start a new plan instead?`)) return;
        const schedule = makeSchedule(planReadings(definition), startDate);
        plans.forEach(plan => { if (plan.status === 'active') plan.status = 'saved'; });
        const plan = { id: uid(), userId: null, planName: definition.planName, description: definition.description, startDate, targetDate: definition.targetDate || schedule[schedule.length - 1].date, status: 'active', currentDay: 1, schedule, completedReadings: [], createdAt: today, updatedAt: today, definitionId: definition.id };
        plans.unshift(plan); savePlans(); renderPlans(); renderAll(); showView('plans');
    }

    function openPlanSetup(definition = null) {
        const setup = document.getElementById('plan-setup');
        const start = today;
        const readings = definition ? planReadings(definition).join(', ') : '';
        document.getElementById('plan-setup-heading').textContent = definition ? `Start ${definition.planName}` : 'Create a custom plan';
        document.getElementById('plan-setup-definition').value = definition?.id || 'custom';
        document.getElementById('plan-setup-name').value = definition?.planName || '';
        document.getElementById('plan-setup-description').value = definition?.description || '';
        document.getElementById('plan-setup-start').value = start;
        document.getElementById('plan-setup-target').value = addDays(start, Math.max(0, (definition?.duration || 1) - 1));
        document.getElementById('plan-setup-readings').value = readings;
        setup.classList.remove('hidden'); setup.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('plan-setup-name').focus();
    }

    function createCustomPlan() { openPlanSetup(); }

    function showPlanDetail(plan) {
        const target = document.getElementById('plan-detail');
        const progress = planProgress(plan);
        target.innerHTML = `<article class="v2-card plan-detail-card"><div class="v2-card-heading"><div><span class="eyebrow">${plan.status === 'active' ? 'Active plan' : plan.status === 'completed' ? 'Reading Plan Complete' : 'Saved plan'}</span><h2>${escapeHtml(plan.planName)}</h2></div><button class="icon-btn" data-close-plan aria-label="Close plan details"><i class="ph ph-x"></i></button></div><p>${escapeHtml(plan.description || '')}</p><div class="plan-summary-grid"><span><strong>${plan.schedule.length}</strong> readings</span><span><strong>${progress.percent}%</strong> progress</span><span><strong>${plan.startDate ? formatDate(plan.startDate) : 'Not started'}</strong> start date</span></div>${plan.status === 'saved' ? `<label class="sub-label" for="plan-start-${plan.id}">Start date</label><input class="plan-start-input" id="plan-start-${plan.id}" type="date" value="${plan.startDate || today}"><button class="btn primary-btn" data-start-saved="${plan.id}"><i class="ph ph-play"></i> Start plan</button>` : ''}<div class="plan-schedule">${renderPlanSchedule(plan)}</div></article>`;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function completeReading(planId, dayNumber) {
        const plan = plans.find(item => item.id === planId);
        const reading = plan?.schedule.find(item => item.dayNumber === Number(dayNumber));
        if (!reading || reading.completed) return;
        reading.completed = true; reading.completedAt = new Date().toISOString();
        plan.completedReadings = plan.schedule.filter(item => item.completed).map(item => item.dayNumber); plan.currentDay = plan.schedule.find(item => !item.completed)?.dayNumber || plan.schedule.length; plan.updatedAt = today;
        if (plan.completedReadings.length === plan.schedule.length) { plan.status = 'completed'; plan.completedAt = new Date().toISOString(); }
        savePlans(); renderAll(); renderPlans(); showToast(plan.status === 'completed' ? 'Reading plan complete.' : 'Reading marked as read.');
    }

    function renderDashboardPlan() {
        let card = document.getElementById('dashboard-plan-card');
        if (!card) { card = document.createElement('article'); card.id = 'dashboard-plan-card'; card.className = 'dashboard-plan-card'; document.querySelector('#dashboard .dashboard-grid').after(card); }
        const plan = activePlan();
        if (!plan) { card.innerHTML = `<div><p class="eyebrow">Reading plans</p><h2>Build a rhythm of reading</h2><p>Choose a plan and let today's reading meet you where you are.</p></div><button class="btn primary-btn" data-target="plans">Explore plans <i class="ph ph-arrow-right"></i></button>`; return; }
        const progress = planProgress(plan); const reading = plan.schedule.find(item => item.date === today && !item.completed) || plan.schedule.find(item => !item.completed);
        card.innerHTML = `<div><p class="eyebrow">Today's reading · Day ${reading?.dayNumber || plan.schedule.length}</p><h2>${escapeHtml(plan.planName)}</h2><p>${reading ? escapeHtml(reading.reference) : 'Plan complete'}</p><div class="progress-track"><span style="width:${progress.percent}%"></span></div><small>${progress.percent}% complete · ${progress.remaining} readings remaining</small></div><div class="card-actions"><button class="btn dark-btn" data-create-study="${plan.id}" data-create-day="${reading?.dayNumber || ''}"><i class="ph ph-book-open"></i> Create study</button>${reading && !reading.completed ? `<button class="btn primary-btn" data-complete-reading="${plan.id}" data-complete-day="${reading.dayNumber}">Mark as read</button>` : ''}</div>`;
    }

    function showToast(message) { const toast = document.getElementById('toast'); toast.querySelector('span').textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }

    function renderPrayers() {
        const target = document.getElementById('prayers-list');
        target.innerHTML = prayers.length ? prayers.slice().sort((a, b) => b.date.localeCompare(a.date)).map(prayer => `<article class="v2-card prayer-entry"><div class="v2-card-heading"><div><span class="card-date">${formatDate(prayer.date)}</span><h3>${escapeHtml(prayer.title)}</h3></div><button class="icon-btn" data-delete-prayer="${prayer.id}" aria-label="Delete prayer"><i class="ph ph-trash"></i></button></div><p>${escapeHtml(prayer.text)}</p></article>`).join('') : emptyState('A quiet place is waiting', 'Saved prayers will stay in this browser until you choose to remove them.');
    }

    function renderCollections() {
        const target = document.getElementById('collections-list');
        target.innerHTML = collections.length ? collections.map(collection => { const items = studies.filter(study => collection.studyIds.includes(study.id)); return `<article class="v2-card"><div class="v2-card-heading"><div><span class="eyebrow">${items.length} saved studies</span><h3>${escapeHtml(collection.name)}</h3></div><button class="icon-btn" data-delete-collection="${collection.id}" aria-label="Delete collection"><i class="ph ph-trash"></i></button></div><p>${escapeHtml(collection.description || 'A collection of meaningful studies.')}</p><div class="collection-studies">${items.length ? items.map(study => `<button class="text-btn" data-open="${study.id}">${escapeHtml(study.reference)} <i class="ph ph-arrow-up-right"></i></button>`).join('') : '<span class="helper-text">No studies in this collection yet.</span>'}</div></article>`; }).join('') : emptyState('Make a place for your themes', 'Collections help you return to studies that belong together.');
    }

    function renderInsights() {
        const activeDays = new Set(studies.map(study => study.date)).size;
        const lessonCount = studies.reduce((count, study) => count + (study.lessons || []).length, 0);
        const prayerDays = new Set(prayers.map(prayer => prayer.date)).size;
        const favoriteCount = studies.filter(study => study.favorite).length;
        document.getElementById('insights-grid').innerHTML = `<article class="insight-card"><span class="stat-icon"><i class="ph ph-calendar-check"></i></span><strong>${activeDays}</strong><span>days recorded</span><p>Your journal is building a steady pattern of returning.</p></article><article class="insight-card"><span class="stat-icon"><i class="ph ph-lightbulb"></i></span><strong>${lessonCount}</strong><span>lessons captured</span><p>Small observations become a faithful record over time.</p></article><article class="insight-card"><span class="stat-icon"><i class="ph ph-hands-praying"></i></span><strong>${prayerDays}</strong><span>prayer days</span><p>Your prayer journal grows alongside your study.</p></article><article class="insight-card"><span class="stat-icon"><i class="ph ph-star"></i></span><strong>${favoriteCount}</strong><span>favorite passages</span><p>These are the words you have chosen to keep close.</p></article>`;
    }

    function renderV2() { renderPlans(); renderPrayers(); renderCollections(); renderInsights(); }

    function setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(themeKey, theme);
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            const dark = theme === 'dark';
            button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
            button.innerHTML = `<i class="ph ${dark ? 'ph-sun' : 'ph-moon'}"></i><span>${dark ? 'Light mode' : 'Dark mode'}</span>`;
        });
    }

    function showView(target) {
        document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === target));
        document.querySelectorAll('[data-target]').forEach(link => link.classList.toggle('active', link.dataset.target === target && link.closest('.nav-links')));
        if (target === 'dashboard' || target === 'history' || target === 'favorites' || target === 'progress') renderAll();
        if (['plans', 'prayers', 'collections', 'insights'].includes(target)) renderV2();
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
        renderDashboardPlan();
        renderStreakDetails();
        document.getElementById('study-count').textContent = studies.length;
        document.getElementById('chapter-count').textContent = studies.length;
        document.getElementById('favorite-count').textContent = studies.filter(study => study.favorite).length;
        document.getElementById('streak-stat').textContent = calculateStreak();
        document.getElementById('progress-chapters').textContent = studies.length;
        document.getElementById('current-book').textContent = sorted[0]?.reference.split(' ')[0] || '—';
        document.getElementById('progress-percent').textContent = studies.length ? `${Math.min(studies.length * 5, 100)}%` : '0%';
        document.getElementById('progress-bar').style.width = `${Math.min(studies.length * 5, 100)}%`;
        const progressCard = document.querySelector('#progress .progress-card');
        let planSummary = progressCard.querySelector('.plan-progress-summary');
        if (!planSummary) { planSummary = document.createElement('div'); planSummary.className = 'plan-progress-summary'; progressCard.appendChild(planSummary); }
        const planItems = plans.reduce((items, plan) => items.concat(plan.schedule), []);
        const planComplete = planItems.filter(item => item.completed).length;
        planSummary.innerHTML = `<span class="eyebrow">Reading plan progress</span><strong>${planComplete}/${planItems.length}</strong><p>${planItems.length ? 'Keep returning to the next reading on your path.' : 'Create a reading plan to track progress beyond individual studies.'}</p>`;
        renderV2();
    }
    function calculateStreak() {
        const planDates = plans.flatMap(plan => plan.schedule.filter(item => item.completed).map(item => item.date)); const dates = new Set([...studies.map(study => study.date), ...planDates]); let count = 0; const cursor = new Date(`${today}T12:00:00`);
            return streakStats().currentStreak;
    }
    function addLesson(value = '') { const row = document.createElement('div'); row.className = 'lesson-input-row'; row.innerHTML = `<i class="ph ph-caret-right"></i><input type="text" placeholder="What will you remember?" value="${escapeHtml(value)}"><button type="button" class="remove-lesson" aria-label="Remove lesson"><i class="ph ph-x"></i></button>`; document.getElementById('lessons-container').appendChild(row); row.querySelector('input').focus(); }
    function resetEditor() { editingId = null; form.reset(); document.getElementById('date').value = today; document.getElementById('editor-title').textContent = 'New study'; document.getElementById('draft-badge').innerHTML = '<i class="ph ph-pencil-simple"></i> Draft'; document.getElementById('lessons-container').innerHTML = ''; addLesson(); document.getElementById('recovery-alert').classList.add('hidden'); }
    function openStudy(id) { const study = studies.find(item => item.id === id); if (!study) return; editingId = id; fields.forEach(field => { document.getElementById(field).value = study[field] || ''; }); document.getElementById('lessons-container').innerHTML = ''; (study.lessons || []).forEach(addLesson); if (!study.lessons?.length) addLesson(); document.getElementById('editor-title').textContent = 'Edit study'; document.getElementById('draft-badge').innerHTML = '<i class="ph ph-check-circle"></i> Saved study'; showView('new-study'); }

    document.querySelectorAll('[data-target]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); showView(link.dataset.target); }));
    document.getElementById('add-lesson-btn').addEventListener('click', () => addLesson());
    document.getElementById('lessons-container').addEventListener('click', event => { if (event.target.closest('.remove-lesson')) event.target.closest('.lesson-input-row').remove(); });
    document.getElementById('study-form').addEventListener('input', () => { const draft = Object.fromEntries(fields.map(field => [field, document.getElementById(field).value])); draft.lessons = getLessons(); localStorage.setItem(draftKey, JSON.stringify(draft)); document.getElementById('recovery-alert').classList.remove('hidden'); });
    document.getElementById('discard-btn').addEventListener('click', () => { localStorage.removeItem(draftKey); resetEditor(); });
    document.getElementById('add-plan-btn').addEventListener('click', createCustomPlan);
    document.getElementById('plan-setup').addEventListener('submit', event => { event.preventDefault(); const name = document.getElementById('plan-setup-name').value.trim(); const description = document.getElementById('plan-setup-description').value.trim(); const startDate = document.getElementById('plan-setup-start').value; const targetDate = document.getElementById('plan-setup-target').value; const readings = document.getElementById('plan-setup-readings').value.split(',').map(reference => reference.trim()).filter(Boolean); if (!name || !startDate || !targetDate || targetDate < startDate || !readings.length) { alert('Add a name, valid dates, and at least one Bible reference.'); return; } const definitionId = document.getElementById('plan-setup-definition').value; if (!confirm(`Start ${name} on ${formatDate(startDate)}?`)) return; startPlan({ id: definitionId, planName: name, description, duration: readings.length, readings, targetDate }, startDate); event.target.classList.add('hidden'); });
    document.getElementById('cancel-plan-setup').addEventListener('click', () => document.getElementById('plan-setup').classList.add('hidden'));
        document.getElementById('add-streak-widget').addEventListener('click', () => { localStorage.setItem('quiet-word-streak-widget', 'enabled'); showToast('Streak widget preference saved for this device.'); });
    document.getElementById('add-prayer-btn').addEventListener('click', () => { document.getElementById('prayer-form').classList.toggle('hidden'); if (!document.getElementById('prayer-form').classList.contains('hidden')) document.getElementById('prayer-title').focus(); });
    document.getElementById('prayer-form').addEventListener('submit', event => { event.preventDefault(); prayers.unshift({ id: uid(), title: document.getElementById('prayer-title').value.trim(), text: document.getElementById('prayer-text').value.trim(), date: today }); savePrayers(); event.target.reset(); event.target.classList.add('hidden'); renderPrayers(); renderInsights(); });
    document.getElementById('add-collection-btn').addEventListener('click', () => { if (!studies.length) { alert('Save a study before creating a collection.'); return; } const name = prompt('Name this collection:'); if (!name?.trim()) return; const description = prompt('What is this collection about?') || ''; const selection = prompt(`Add study numbers separated by commas:\n${studies.map((study, index) => `${index + 1}. ${study.reference}`).join('\n')}`) || ''; const studyIds = selection.split(',').map(value => studies[Number(value.trim()) - 1]?.id).filter(Boolean); collections.unshift({ id: uid(), name: name.trim(), description: description.trim(), studyIds, createdAt: today }); saveCollections(); renderCollections(); showView('collections'); });
    document.getElementById('plans-list').addEventListener('change', event => { const input = event.target.closest('[data-plan]'); if (!input) return; const plan = plans.find(item => item.id === input.dataset.plan); const planItem = plan?.schedule[Number(input.dataset.planItem)]; if (!planItem) return; planItem.completed = input.checked; planItem.completedAt = input.checked ? new Date().toISOString() : null; plan.completedReadings = plan.schedule.filter(item => item.completed).map(item => item.dayNumber); if (plan.completedReadings.length === plan.schedule.length) { plan.status = 'completed'; plan.completedAt = new Date().toISOString(); } else if (plan.status === 'completed') plan.status = 'active'; savePlans(); renderAll(); renderPlans(); });
    form.addEventListener('submit', event => { event.preventDefault(); const previous = studies.find(item => item.id === editingId); const study = { ...previous, id: editingId || uid(), ...Object.fromEntries(fields.map(field => [field, document.getElementById(field).value.trim()])), lessons: getLessons(), favorite: previous?.favorite || false, completed: previous?.completed ?? true }; studies = editingId ? studies.map(item => item.id === editingId ? study : item) : [study, ...studies]; saveStudies(); localStorage.removeItem(draftKey); resetEditor(); renderAll(); showView('dashboard'); const toast = document.getElementById('toast'); toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); });
    document.addEventListener('click', event => { const open = event.target.closest('[data-open]'); const favorite = event.target.closest('[data-favorite]'); const remove = event.target.closest('[data-delete]'); const deletePlan = event.target.closest('[data-delete-plan]'); const deletePrayer = event.target.closest('[data-delete-prayer]'); const deleteCollection = event.target.closest('[data-delete-collection]'); const startPredefined = event.target.closest('[data-start-predefined]'); const startSaved = event.target.closest('[data-start-saved]'); const openPlan = event.target.closest('[data-open-plan]'); const complete = event.target.closest('[data-complete-reading]'); const createStudy = event.target.closest('[data-create-study]'); if (open?.dataset.open) openStudy(open.dataset.open); if (favorite) { const item = studies.find(study => study.id === favorite.dataset.favorite); item.favorite = !item.favorite; saveStudies(); renderAll(); } if (remove && confirm('Delete this study?')) { studies = studies.filter(study => study.id !== remove.dataset.delete); saveStudies(); renderAll(); } if (deletePlan && confirm('Delete this reading plan?')) { plans = plans.filter(plan => plan.id !== deletePlan.dataset.deletePlan); savePlans(); renderPlans(); renderAll(); } if (deletePrayer && confirm('Delete this prayer?')) { prayers = prayers.filter(prayer => prayer.id !== deletePrayer.dataset.deletePrayer); savePrayers(); renderPrayers(); renderInsights(); } if (deleteCollection && confirm('Delete this collection?')) { collections = collections.filter(collection => collection.id !== deleteCollection.dataset.deleteCollection); saveCollections(); renderCollections(); } if (startPredefined) { const definition = PLAN_DEFINITIONS.find(item => item.id === startPredefined.dataset.startPredefined); if (definition) openPlanSetup(definition); } if (startSaved) { const plan = plans.find(item => item.id === startSaved.dataset.startSaved); const input = document.getElementById(`plan-start-${plan?.id}`); if (plan && input?.value && confirm(`Start ${plan.planName} on ${formatDate(input.value)}?`)) { plan.startDate = input.value; plan.schedule = plan.schedule.map((item, index) => ({ ...item, date: addDays(plan.startDate, index) })); plan.targetDate = plan.schedule[plan.schedule.length - 1]?.date || plan.startDate; plan.status = 'active'; plans.forEach(item => { if (item.id !== plan.id && item.status === 'active') item.status = 'saved'; }); savePlans(); renderAll(); renderPlans(); } } if (openPlan) { const plan = plans.find(item => item.id === openPlan.dataset.openPlan); if (plan) showPlanDetail(plan); } if (complete) completeReading(complete.dataset.completeReading, complete.dataset.completeDay); if (createStudy) { const plan = plans.find(item => item.id === createStudy.dataset.createStudy); const reading = plan?.schedule.find(item => item.dayNumber === Number(createStudy.dataset.createDay)); resetEditor(); if (reading) document.getElementById('reference').value = reading.reference; showView('new-study'); } if (event.target.closest('[data-scroll-catalog]')) document.querySelector('.plans-catalog-heading')?.scrollIntoView({ behavior: 'smooth' }); if (event.target.closest('[data-close-plan]')) document.getElementById('plan-detail').innerHTML = ''; });
    document.getElementById('search-input').addEventListener('input', renderAll); document.getElementById('sort-select').addEventListener('change', renderAll); document.getElementById('mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')));
    setTheme(localStorage.getItem(themeKey) || 'light');
    const draft = JSON.parse(localStorage.getItem(draftKey) || 'null'); if (draft && (draft.reference || draft.learned || draft.reflection)) { fields.forEach(field => { document.getElementById(field).value = draft[field] || ''; }); document.getElementById('lessons-container').innerHTML = ''; (draft.lessons || []).forEach(addLesson); document.getElementById('recovery-alert').classList.remove('hidden'); } else resetEditor();
    document.getElementById('welcome-date').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()); renderAll();
});
