// === ЧАТ-ПРИЛОЖЕНИЕ: список команд + чат ===

function saveTeamsLocal() {
try { localStorage.setItem('clc_teams', JSON.stringify(teams)); } catch (e) {}
}

function getSortedTeams() {
return [...teams].sort((a, b) => {
const ai = pinnedTeams.indexOf(a.id);
const bi = pinnedTeams.indexOf(b.id);
if (ai !== -1 && bi !== -1) return ai - bi;
if (ai !== -1) return -1;
if (bi !== -1) return 1;
return 0;
});
}

// Главная страница: список команд (тап — открыть чат, долгое нажатие — закрепить)
function renderTeamsList() {
const wrap = document.getElementById('home-teams-list');
if (!wrap) return;
const sorted = getSortedTeams();
if (!sorted.length) {
wrap.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#888;"><div style="font-size:48px;margin-bottom:10px;">👥</div><p>Пока нет команд.</p><p style="font-size:13px;margin-top:8px;">Команды, созданные в основном приложении, появятся здесь автоматически.</p></div>';
return;
}
wrap.innerHTML = sorted.map(t => {
const unread = getUnreadChatCount(t.id);
const pinnedMark = pinnedTeams.includes(t.id) ? '📌 ' : '';
const avatarHtml = t.avatar
? `<img src="${escapeHtml(t.avatar)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
: `<div style="width:40px;height:40px;border-radius:50%;background:#2a2a2a;display:flex;align-items:center;justify-content:center;font-size:20px;">🎸</div>`;
return `<div class="list-item" style="cursor:pointer;" onclick="if(window.__teamPressFired){window.__teamPressFired=false;return;} openTeamChat('${t.id}')" ontouchstart="startTeamPress(event,'${t.id}')" ontouchend="cancelTeamPress()" ontouchcancel="cancelTeamPress()" onmousedown="startTeamPress(event,'${t.id}')" onmouseup="cancelTeamPress()" onmouseleave="cancelTeamPress()">
<div class="item-left" style="min-width:0;flex:1;display:flex;align-items:center;gap:10px;">
${avatarHtml}
<div style="min-width:0;flex:1;"><div class="item-title">${pinnedMark}${escapeHtml(t.name)}</div></div>
</div>
${unread ? `<span style="background:#ef5350;color:#fff;font-size:11px;font-weight:bold;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 6px;">${unread}</span>` : ''}
</div>`;
}).join('');
}

function toggleTeamPin(teamId) {
const idx = pinnedTeams.indexOf(teamId);
if (idx !== -1) pinnedTeams.splice(idx, 1);
else pinnedTeams.unshift(teamId);
try { localStorage.setItem('clc_pinned_teams', JSON.stringify(pinnedTeams)); } catch {}
renderTeamsList();
}
function closeTeamPinMenu() {
const menu = document.getElementById('team-pin-menu-popup');
if (menu) menu.remove();
const overlay = document.getElementById('team-pin-menu-overlay');
if (overlay) overlay.remove();
}
function openTeamPinMenu(teamId, x, y) {
closeTeamPinMenu();
const isPinned = pinnedTeams.includes(teamId);
const overlay = document.createElement('div');
overlay.id = 'team-pin-menu-overlay';
overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:transparent;';
overlay.onclick = closeTeamPinMenu;
document.body.appendChild(overlay);
const menu = document.createElement('div');
menu.id = 'team-pin-menu-popup';
menu.style.cssText = 'position:fixed;background:#2a2a2a;border-radius:10px;overflow:hidden;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.5);min-width:180px;';
menu.innerHTML = `<div class="team-pin-option" style="padding:13px 18px;color:#eee;font-size:15px;">${isPinned ? '📌 Открепить' : '📌 Закрепить вверху'}</div>`;
document.body.appendChild(menu);
menu.querySelector('.team-pin-option').addEventListener('click', (e) => { e.stopPropagation(); closeTeamPinMenu(); toggleTeamPin(teamId); });
menu.style.left = Math.min(x, window.innerWidth - 190) + 'px';
menu.style.top = Math.min(y, window.innerHeight - 60) + 'px';
}
function startTeamPress(e, teamId) {
const x = e.touches ? e.touches[0].clientX : e.clientX;
const y = e.touches ? e.touches[0].clientY : e.clientY;
window.__teamPressFired = false;
window.__teamPressTimer = setTimeout(() => {
window.__teamPressFired = true;
if (navigator.vibrate) navigator.vibrate(30);
openTeamPinMenu(teamId, x, y);
}, 500);
}
function cancelTeamPress() { clearTimeout(window.__teamPressTimer); }

// === БЛОКИРОВКА ПРОКРУТКИ СТРАНИЦЫ ПОД ЧАТОМ ===
function lockBodyScroll() {
window.__bodyScrollY = window.scrollY || window.pageYOffset || 0;
document.body.style.position = 'fixed';
document.body.style.top = '-' + window.__bodyScrollY + 'px';
document.body.style.left = '0';
document.body.style.right = '0';
document.body.style.width = '100%';
}
function unlockBodyScroll() {
document.body.style.position = '';
document.body.style.top = '';
document.body.style.left = '';
document.body.style.right = '';
document.body.style.width = '';
window.scrollTo(0, window.__bodyScrollY || 0);
}

// === ОТКРЫТИЕ ЧАТА ===
function openTeamChat(teamId) {
const team = teams.find(t => t.id === teamId);
if (!team) return;
currentChatTeamId = teamId;
chatEditingMessageId = null;
document.getElementById('chat-team-name').innerText = team.name;
document.getElementById('chat-team-avatar').innerHTML = team.avatar ? `<img src="${escapeHtml(team.avatar)}" alt="">` : '🎸';
document.getElementById('chat-input').value = '';
showPage('page-team-chat');
setupChatKeyboardHandling();
setupChatFixedAreasTouchBlock();
setupChatTouchGuard();
setupChatFocusPin();
lockBodyScroll();
setTimeout(adjustChatForKeyboard, 50);
if (!chatMessagesCache[teamId]) chatMessagesCache[teamId] = [];
let mCache = {};
try { mCache = JSON.parse(localStorage.getItem('clc_team_members_cache') || '{}'); } catch {}
if (mCache[teamId] && mCache[teamId].profiles) {
currentMembersProfiles = { ...currentMembersProfiles, ...mCache[teamId].profiles };
}
startTeamRolesListener(teamId);
renderChatMessages(teamId);
if (db && currentUser) {
db.collection('teamRegistry').doc(teamId).collection('private').doc('profiles').get().then(doc => {
if (doc.exists) {
currentMembersProfiles = { ...currentMembersProfiles, ...(doc.data() || {}) };
try {
const c = JSON.parse(localStorage.getItem('clc_team_members_cache') || '{}');
c[teamId] = { ids: (c[teamId] && c[teamId].ids) || [], profiles: currentMembersProfiles };
localStorage.setItem('clc_team_members_cache', JSON.stringify(c));
} catch {}
if (currentChatTeamId === teamId) renderChatMessages(teamId);
}
}).catch(err => console.error('Не удалось загрузить профили для чата:', err));
}
startChatListener(teamId);
startChatReadsListener(teamId);
markChatRead(teamId);
setTimeout(() => scrollChatToBottom(), 50);
}

// === ФИКСЫ КЛАВИАТУРЫ/СКРОЛЛА (весь накопленный опыт) ===
function setupChatFixedAreasTouchBlock() {
if (window.__chatFixedTouchBound) return;
window.__chatFixedTouchBound = true;
const header = document.getElementById('chat-page-header');
const inputBar = document.getElementById('chat-input-bar');
const block = (e) => { e.preventDefault(); };
if (header) header.addEventListener('touchmove', block, { passive: false });
if (inputBar) inputBar.addEventListener('touchmove', block, { passive: false });
}
function setupChatTouchGuard() {
if (window.__chatTouchGuardBound) return;
window.__chatTouchGuardBound = true;
const page = document.getElementById('page-team-chat');
if (!page) return;
page.addEventListener('touchmove', (e) => {
const list = document.getElementById('chat-messages-list');
if (!list || !list.contains(e.target)) { e.preventDefault(); return; }
const canScroll = list.scrollHeight > list.clientHeight + 1;
if (!canScroll) { e.preventDefault(); return; }
const atTop = list.scrollTop <= 0;
const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
if (page.__lastTouchY !== undefined) {
const dy = e.touches[0].clientY - page.__lastTouchY;
if ((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
}
page.__lastTouchY = e.touches[0].clientY;
}, { passive: false });
page.addEventListener('touchend', () => { page.__lastTouchY = undefined; }, { passive: true });
}
function setupChatFocusPin() {
if (window.__chatFocusPinBound) return;
window.__chatFocusPinBound = true;
const input = document.getElementById('chat-input');
if (!input) return;
const chatActive = () => {
const page = document.getElementById('page-team-chat');
return !!(page && page.classList.contains('active'));
};
// Сжатие страницы под клавиатуру в момент касания — ДО того, как iOS решит прокручивать
const preshrink = () => {
if (!chatActive() || __vvMaxH <= 0) return;
let lastKb = parseInt(localStorage.getItem('clc_kb_height') || '0');
if (!lastKb || lastKb < 100 || lastKb > __vvMaxH * 0.7) lastKb = Math.round(__vvMaxH * 0.42);
const page = document.getElementById('page-team-chat');
page.style.setProperty('height', (__vvMaxH - lastKb) + 'px', 'important');
setTimeout(() => {
if (chatActive() && !__kbOpen && document.activeElement !== input) {
page.style.removeProperty('height');
page.style.removeProperty('top');
}
}, 800);
};
['pointerdown', 'touchstart'].forEach(ev => {
input.addEventListener(ev, preshrink, { passive: true });
});
// Конец тапа: ручной фокус-страховка (без preventDefault — жест «настоящий»)
input.addEventListener('touchend', () => {
if (!chatActive()) return;
window.scrollTo(0, 0);
input.focus();
}, false);
input.addEventListener('focusin', () => {
if (chatActive()) window.scrollTo(0, 0);
});
window.addEventListener('scroll', () => {
if (chatActive() && window.scrollY !== 0) window.scrollTo(0, 0);
}, true);
input.addEventListener('focus', () => {
[0, 100, 300, 600].forEach(ms => setTimeout(() => {
if (chatActive()) { window.scrollTo(0, 0); adjustChatForKeyboard(); }
}, ms));
});
input.addEventListener('blur', () => setTimeout(() => {
if (chatActive()) window.scrollTo(0, 0);
}, 100));
}
function setupChatKeyboardHandling() {
if (!window.visualViewport || window.__chatKeyboardHandlerBound) return;
window.__chatKeyboardHandlerBound = true;
window.visualViewport.addEventListener('resize', adjustChatForKeyboard);
window.visualViewport.addEventListener('scroll', adjustChatForKeyboard);
}
let __chatKBLast = -1;
let __vvMaxH = 0; // запоминаем высоту экрана БЕЗ клавиатуры
let __kbOpen = false;
function adjustChatForKeyboard() {
const page = document.getElementById('page-team-chat');
if (!page || !page.classList.contains('active') || !window.visualViewport) return;
const vv = window.visualViewport;
const vh = Math.round(vv.height);
if (vh > __vvMaxH) __vvMaxH = vh;
const kb = __vvMaxH > 0 ? (__vvMaxH - vh) : 0;
if (kb > 150) {
__kbOpen = true;
try { localStorage.setItem('clc_kb_height', String(kb)); } catch {}
page.style.setProperty('height', vh + 'px', 'important');
page.style.setProperty('top', vv.offsetTop + 'px', 'important');
window.scrollTo(0, 0);
} else {
__kbOpen = false;
page.style.removeProperty('height');
page.style.removeProperty('top');
}
if (kb !== __chatKBLast) { __chatKBLast = kb; scrollChatToBottom(); }
}
function autoGrowChatInput(el) {
el.style.setProperty('height', 'auto', 'important');
const newHeight = Math.min(el.scrollHeight, 98);
el.style.setProperty('height', Math.max(newHeight, 38) + 'px', 'important');
el.style.overflowY = el.scrollHeight > 98 ? 'auto' : 'hidden';
}
function closeTeamChat() {
currentChatTeamId = null;
chatEditingMessageId = null;
__chatKBLast = -1;
__vvMaxH = 0;
__kbOpen = false;
const pageEl = document.getElementById('page-team-chat');
if (pageEl) { pageEl.style.removeProperty('height'); pageEl.style.removeProperty('top'); }
renderTeamsList();
showPage('page-home');
unlockBodyScroll();
}
function scrollChatToBottom() {
const list = document.getElementById('chat-messages-list');
if (list) list.scrollTop = list.scrollHeight;
}

// === ЛИСТЕНЕРЫ ЧАТА ===
function startChatListener(teamId) {
if (chatListenerUnsubs[teamId] || !db || !currentUser) return;
chatListenerUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).collection('chat')
.orderBy('createdAt', 'desc').limit(50)
.onSnapshot(snap => {
const msgs = [];
snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
msgs.reverse();
chatMessagesCache[teamId] = msgs;
if (currentChatTeamId === teamId) {
const list = document.getElementById('chat-messages-list');
const wasAtBottom = list ? (list.scrollHeight - list.scrollTop - list.clientHeight < 60) : true;
renderChatMessages(teamId);
if (wasAtBottom) scrollChatToBottom();
markChatRead(teamId);
}
renderTeamsList();
}, err => console.error('chat listener error:', err));
}
function startChatReadsListener(teamId) {
if (chatReadsListenerUnsubs[teamId] || !db || !currentUser) return;
chatReadsListenerUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).collection('chatReads')
.onSnapshot(snap => {
const reads = {};
snap.forEach(doc => { reads[doc.id] = doc.data().lastReadAt || 0; });
chatReadsCache[teamId] = reads;
try { localStorage.setItem('clc_chat_reads_cache', JSON.stringify(chatReadsCache)); } catch {}
if (currentChatTeamId === teamId) renderChatMessages(teamId);
renderTeamsList();
}, err => console.error('chat reads listener error:', err));
}
// === НЕПРОЧИТАННОЕ / ОТМЕТКИ ПРОЧТЕНИЯ ===
function getUnreadChatCount(teamId) {
if (!currentUser) return 0;
const msgs = chatMessagesCache[teamId] || [];
const reads = chatReadsCache[teamId] || {};
const myLastRead = reads[currentUser.uid] || 0;
return msgs.filter(m => !m.deleted && m.senderId !== currentUser.uid && m.createdAt > myLastRead).length;
}
function markChatRead(teamId) {
if (!db || !currentUser) return;
db.collection('teamRegistry').doc(teamId).collection('chatReads').doc(currentUser.uid)
.set({ lastReadAt: Date.now() }, { merge: true }).catch(err => console.error('mark chat read failed:', err));
}

// === РЕНДЕР СООБЩЕНИЙ ===
function formatChatDateLabel(ts) {
const d = new Date(ts);
const now = new Date();
const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / (24 * 60 * 60 * 1000));
if (diffDays === 0) return 'Сегодня';
if (diffDays === 1) return 'Вчера';
const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
return `${d.getDate()} ${months[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`;
}
function renderChatMessages(teamId) {
const list = document.getElementById('chat-messages-list');
if (!list) return;
const msgs = chatMessagesCache[teamId] || [];
const roles = teamRolesCache[teamId] || {};
const reads = chatReadsCache[teamId] || {};
let lastDayKey = null;
list.innerHTML = msgs.map(m => {
let dateDivider = '';
const dayKey = new Date(m.createdAt).toDateString();
if (dayKey !== lastDayKey) {
lastDayKey = dayKey;
dateDivider = `<div style="text-align:center;margin:8px 0;"><span style="background:rgba(255,255,255,0.08);color:#888;font-size:12px;padding:4px 12px;border-radius:12px;">${formatChatDateLabel(m.createdAt)}</span></div>`;
}
const isMe = m.senderId === currentUser.uid;
const p = currentMembersProfiles[m.senderId] || {};
const name = [p.displayName, p.lastName].filter(Boolean).join(' ').trim() || 'Без имени';
const roleObj = roles[m.senderId];
const roleLabel = roleObj && roleObj.role === 'owner' ? 'Владелец' : (roleObj && roleObj.role === 'admin' ? 'Админ' : '');
const avatarHtml = p.avatar ? `<img src="${escapeHtml(p.avatar)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">` : `<div style="width:32px;height:32px;border-radius:50%;background:#444;display:flex;align-items:center;justify-content:center;">👤</div>`;
const time = new Date(m.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
const bodyText = m.deleted ? '<i style="opacity:0.6;">Сообщение удалено</i>' : escapeHtml(m.text || '');
const editedTag = (!m.deleted && m.editedAt) ? ' <span style="opacity:0.6;font-size:11px;">(изменено)</span>' : '';
const otherUids = Object.keys(roles).filter(uid => uid !== m.senderId);
let statusHtml = '';
if (isMe && !m.deleted) {
const allRead = otherUids.every(uid => (reads[uid] || 0) >= m.createdAt);
statusHtml = allRead ? `<span style="color:#42a5f5;font-size:11px;">✔\uFE0E✔\uFE0E</span>` : `<span style="color:#888;font-size:11px;">✔\uFE0E</span>`;
}
const pressAttrs = !m.deleted ? `ontouchstart="startChatMsgPress(event,'${teamId}','${m.id}','${m.senderId}')" ontouchend="cancelChatMsgPress()" ontouchcancel="cancelChatMsgPress()" onmousedown="startChatMsgPress(event,'${teamId}','${m.id}','${m.senderId}')" onmouseup="cancelChatMsgPress()" onmouseleave="cancelChatMsgPress()"` : '';
let bubbleHtml;
if (isMe) {
bubbleHtml = `<div style="display:flex;justify-content:flex-end;">
<div ${pressAttrs} style="max-width:75%;background:rgba(144,202,249,0.18);border-radius:14px 14px 4px 14px;padding:8px 12px;">
<div style="font-size:14px;color:#eee;white-space:pre-wrap;word-break:break-word;">${bodyText}${editedTag}</div>
<div style="display:flex;justify-content:flex-end;align-items:center;gap:4px;margin-top:2px;">${m.starred ? '<span style="font-size:11px;">⭐</span>' : ''}<span style="font-size:11px;color:#888;">${time}</span>${statusHtml}</div>
</div>
</div>`;
} else {
bubbleHtml = `<div style="display:flex;gap:8px;align-items:flex-end;">
${avatarHtml}
<div ${pressAttrs} style="max-width:75%;background:#2a2a2a;border-radius:14px 14px 14px 4px;padding:8px 12px;">
<div style="font-size:12px;color:#90caf9;font-weight:bold;">${escapeHtml(name)}${roleLabel ? ` <span style="color:#888;font-weight:normal;">· ${roleLabel}</span>` : ''}</div>
<div style="font-size:14px;color:#eee;white-space:pre-wrap;word-break:break-word;margin-top:2px;">${bodyText}${editedTag}</div>
<div style="font-size:11px;color:#888;margin-top:2px;">${m.starred ? '⭐ ' : ''}${time}</div>
</div>
</div>`;
}
return dateDivider + bubbleHtml;
}).join('');
}
function handleChatInputKeydown(e) {
}

// === ОТПРАВКА / РЕДАКТИРОВАНИЕ ===
async function sendOrEditChatMessage() {
const teamId = currentChatTeamId;
if (!teamId || !db || !currentUser) return;
const input = document.getElementById('chat-input');
const text = input.value.trim();
if (!text) return;
input.value = '';
try {
if (chatEditingMessageId) {
await db.collection('teamRegistry').doc(teamId).collection('chat').doc(chatEditingMessageId).update({ text, editedAt: Date.now() });
chatEditingMessageId = null;
} else {
await db.collection('teamRegistry').doc(teamId).collection('chat').add({ text, senderId: currentUser.uid, createdAt: Date.now() });
}
} catch (err) {
console.error('Не удалось отправить сообщение:', err);
showToast('❌ Не удалось отправить сообщение', 'error');
input.value = text;
}
}

// === ДОЛГОЕ НАЖАТИЕ И МЕНЮ СООБЩЕНИЯ ===
function startChatMsgPress(e, teamId, msgId, senderId) {
const x = e.touches ? e.touches[0].clientX : e.clientX;
const y = e.touches ? e.touches[0].clientY : e.clientY;
window.__chatPressFired = false;
window.__chatPressTimer = setTimeout(() => {
window.__chatPressFired = true;
if (navigator.vibrate) navigator.vibrate(30);
openChatMsgMenu(teamId, msgId, senderId, x, y);
}, 500);
}
function cancelChatMsgPress() { clearTimeout(window.__chatPressTimer); }
function closeChatMsgMenuPopup() {
const menu = document.getElementById('chat-msg-menu-popup');
if (menu) menu.remove();
const overlay = document.getElementById('chat-msg-menu-overlay');
if (overlay) overlay.remove();
}
function openChatMsgMenu(teamId, msgId, senderId, x, y) {
closeChatMsgMenuPopup();
const myRole = getMyRole(teamId);
const isMine = currentUser && senderId === currentUser.uid;
const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';
const msg = (chatMessagesCache[teamId] || []).find(m => m.id === msgId);
if (!msg) return;
const reads = chatReadsCache[teamId] || {};
const roles = teamRolesCache[teamId] || {};
const otherUids = Object.keys(roles).filter(uid => uid !== senderId);
const allRead = otherUids.every(uid => (reads[uid] || 0) >= msg.createdAt);
const options = [];
options.push(['star', msg.starred ? '⭐ Убрать из избранного' : '⭐ В избранное']);
if (isMine && !allRead) options.push(['edit', '✏️ Изменить']);
if (isMine || isOwnerOrAdmin) options.push(['delete', '🗑️ Удалить сообщение']);
if (!isMine && isOwnerOrAdmin) options.push(['deleteAllKick', '⛔ Удалить все сообщения и исключить']);
if (options.length === 0) return;
const overlay = document.createElement('div');
overlay.id = 'chat-msg-menu-overlay';
overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:transparent;';
overlay.onclick = closeChatMsgMenuPopup;
document.body.appendChild(overlay);
const menu = document.createElement('div');
menu.id = 'chat-msg-menu-popup';
menu.style.cssText = 'position:fixed;background:#2a2a2a;border-radius:10px;overflow:hidden;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.5);min-width:220px;';
menu.innerHTML = options.map(([val, label]) =>
`<div class="chat-menu-option" data-action="${val}" style="padding:13px 18px;color:${val==='deleteAllKick'?'#ef5350':'#eee'};font-size:15px;">${label}</div>`
).join('<div style="height:1px;background:rgba(255,255,255,0.1);"></div>');
document.body.appendChild(menu);
menu.querySelectorAll('.chat-menu-option').forEach(el => {
el.addEventListener('click', (e) => {
e.stopPropagation();
const action = el.dataset.action;
closeChatMsgMenuPopup();
if (action === 'star') toggleStarChatMessage(teamId, msgId);
else if (action === 'edit') startEditChatMessage(msgId);
else if (action === 'delete') deleteChatMessage(teamId, msgId);
else if (action === 'deleteAllKick') deleteAllMessagesFromUserAndKick(teamId, senderId);
});
});
const menuHeight = options.length * 45;
menu.style.left = Math.min(x, window.innerWidth - 230) + 'px';
menu.style.top = Math.min(y, window.innerHeight - menuHeight - 10) + 'px';
}
function startEditChatMessage(msgId) {
const teamId = currentChatTeamId;
const msg = (chatMessagesCache[teamId] || []).find(m => m.id === msgId);
if (!msg) return;
chatEditingMessageId = msgId;
const input = document.getElementById('chat-input');
input.value = msg.text || '';
input.focus();
}

// === ОЧИСТКА ЧАТА (долгое нажатие на кнопку чата владельцем) ===
function startChatBtnPress(e, teamId) {
const x = e.touches ? e.touches[0].clientX : e.clientX;
const y = e.touches ? e.touches[0].clientY : e.clientY;
window.__chatBtnPressFired = false;
window.__chatBtnPressTimer = setTimeout(() => {
window.__chatBtnPressFired = true;
if (navigator.vibrate) navigator.vibrate(30);
openClearChatMenu(teamId, x, y);
}, 500);
}
function cancelChatBtnPress() { clearTimeout(window.__chatBtnPressTimer); }
function closeClearChatMenuPopup() {
const menu = document.getElementById('clear-chat-menu-popup');
if (menu) menu.remove();
const overlay = document.getElementById('clear-chat-menu-overlay');
if (overlay) overlay.remove();
}
function openClearChatMenu(teamId, x, y) {
if (getMyRole(teamId) !== 'owner') return;
closeClearChatMenuPopup();
const overlay = document.createElement('div');
overlay.id = 'clear-chat-menu-overlay';
overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:transparent;';
overlay.onclick = closeClearChatMenuPopup;
document.body.appendChild(overlay);
const menu = document.createElement('div');
menu.id = 'clear-chat-menu-popup';
menu.style.cssText = 'position:fixed;background:#2a2a2a;border-radius:10px;overflow:hidden;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.5);min-width:240px;';
menu.innerHTML = `<div class="clear-chat-option" data-action="keepStarred" style="padding:13px 18px;color:#eee;font-size:15px;">⭐ Очистить, оставить избранные</div><div style="height:1px;background:rgba(255,255,255,0.1);"></div><div class="clear-chat-option" data-action="clearAll" style="padding:13px 18px;color:#ef5350;font-size:15px;">🗑️ Очистить чат полностью</div>`;
document.body.appendChild(menu);
menu.querySelectorAll('.clear-chat-option').forEach(el => {
el.addEventListener('click', (e) => {
e.stopPropagation();
const action = el.dataset.action;
closeClearChatMenuPopup();
if (action === 'clearAll') clearTeamChat(teamId, false);
else if (action === 'keepStarred') clearTeamChat(teamId, true);
});
});
menu.style.left = Math.min(x, window.innerWidth - 250) + 'px';
menu.style.top = Math.min(y, window.innerHeight - 100) + 'px';
}
async function clearTeamChat(teamId, keepStarred) {
if (!db || !currentUser) return;
const confirmMsg = keepStarred ? 'Очистить чат, оставив только избранные сообщения?' : 'Очистить весь чат полностью? Это действие необратимо для всех участников.';
if (!confirm(confirmMsg)) return;
try {
const snap = await db.collection('teamRegistry').doc(teamId).collection('chat').get();
const docsToDelete = snap.docs.filter(doc => !(keepStarred && doc.data().starred));
let batch = db.batch();
let count = 0;
for (const doc of docsToDelete) {
batch.delete(doc.ref);
count++;
if (count === 400) { await batch.commit(); batch = db.batch(); count = 0; }
}
if (count > 0) await batch.commit();
showToast('✅ Чат очищен', 'success');
} catch (err) {
console.error('Не удалось очистить чат:', err);
showToast('❌ Не удалось очистить чат', 'error');
}
}
async function toggleStarChatMessage(teamId, msgId) {
const msg = (chatMessagesCache[teamId] || []).find(m => m.id === msgId);
if (!msg) return;
try {
await db.collection('teamRegistry').doc(teamId).collection('chat').doc(msgId).update({ starred: !msg.starred });
} catch (err) {
console.error('Не удалось изменить избранное:', err);
}
}
async function deleteChatMessage(teamId, msgId) {
if (!confirm('Удалить это сообщение?')) return;
try {
await db.collection('teamRegistry').doc(teamId).collection('chat').doc(msgId).update({ text: null, deleted: true, editedAt: null });
} catch (err) {
console.error('Не удалось удалить сообщение:', err);
showToast('❌ Не удалось удалить сообщение', 'error');
}
}
async function deleteAllMessagesFromUserAndKick(teamId, senderId) {
if (!confirm('Удалить все сообщения этого участника и исключить его из команды?')) return;
try {
const snap = await db.collection('teamRegistry').doc(teamId).collection('chat').where('senderId', '==', senderId).get();
const batch = db.batch();
snap.forEach(doc => batch.update(doc.ref, { text: null, deleted: true, editedAt: null }));
await batch.commit();
} catch (err) {
console.error('Не удалось удалить сообщения участника:', err);
}
currentMembersTeamId = teamId;
await kickTeamMember(senderId);
}

// === ПОСТРАНИЧНАЯ ЗАГРУЗКА ИСТОРИИ ===
function handleChatScroll(el) {
if (el.scrollTop < 40) loadMoreChatMessages(currentChatTeamId);
}
async function loadMoreChatMessages(teamId) {
if (!teamId || !db || chatOldestLoaded[teamId] === 'end') return;
const msgs = chatMessagesCache[teamId] || [];
if (msgs.length === 0) return;
const oldestTs = msgs[0].createdAt;
try {
const snap = await db.collection('teamRegistry').doc(teamId).collection('chat')
.orderBy('createdAt', 'desc').startAfter(oldestTs).limit(30).get();
if (snap.empty) { chatOldestLoaded[teamId] = 'end'; return; }
const older = [];
snap.forEach(doc => older.push({ id: doc.id, ...doc.data() }));
older.reverse();
const list = document.getElementById('chat-messages-list');
const prevHeight = list ? list.scrollHeight : 0;
chatMessagesCache[teamId] = older.concat(chatMessagesCache[teamId] || []);
renderChatMessages(teamId);
if (list) list.scrollTop = list.scrollHeight - prevHeight;
} catch (err) { console.error('Не удалось подгрузить старые сообщения:', err); }
}

// === ЛИСТЕНЕРЫ КОМАНДЫ ===
function startTeamRegistryListener(teamId) {
if (teamRegistryListenerUnsubs[teamId] || !db || !currentUser) return;
teamRegistryListenerUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).onSnapshot(doc => {
if (!doc.exists) return;
const data = doc.data();
const team = teams.find(t => t.id === teamId);
if (!team) return;
if (data.updatedAt && team.updatedAt && data.updatedAt < team.updatedAt) return;
team.name = data.name;
team.avatar = data.avatar || null;
team.updatedAt = data.updatedAt || team.updatedAt;
team.createdBy = data.createdBy || team.createdBy;
saveTeamsLocal();
renderTeamsList();
if (currentChatTeamId === teamId) {
document.getElementById('chat-team-name').innerText = team.name;
document.getElementById('chat-team-avatar').innerHTML = team.avatar ? `<img src="${escapeHtml(team.avatar)}" alt="">` : '🎸';
}
}, err => console.error('teamRegistry listener error:', err));
}
function startMembershipWatch(teamId) {
if (membershipWatchUnsubs[teamId] || !db || !currentUser) return;
let sawExisting = false;
membershipWatchUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).collection('members').doc(currentUser.uid)
.onSnapshot(doc => {
if (doc.exists) { sawExisting = true; return; }
if (!sawExisting) return;
handleKickedFromTeam(teamId);
}, err => console.error('membership watch error:', err));
}
function handleKickedFromTeam(teamId) {
const team = teams.find(t => t.id === teamId);
const teamName = team ? team.name : 'команда';
recentlyLeftTeams[teamId] = Date.now();
teams = teams.filter(t => t.id !== teamId);
[teamListenerUnsubs, teamRegistryListenerUnsubs, membershipWatchUnsubs,
teamRolesListenerUnsubs, chatListenerUnsubs, chatReadsListenerUnsubs].forEach(m => {
if (m[teamId]) { m[teamId](); delete m[teamId]; }
});
delete teamRolesCache[teamId];
delete chatMessagesCache[teamId];
delete chatReadsCache[teamId];
pinnedTeams = pinnedTeams.filter(id => id !== teamId);
saveTeamsLocal();
if (currentChatTeamId === teamId) closeTeamChat();
renderTeamsList();
alert(`⚠️ Вас удалили из команды «${teamName}»`);
}
function startTeamRolesListener(teamId) {
if (teamRolesListenerUnsubs[teamId] || !db || !currentUser) return;
teamRolesListenerUnsubs[teamId] = db.collection('teamRegistry').doc(teamId).collection('members')
.onSnapshot(snap => {
const roles = {};
let myRawRole;
snap.forEach(doc => {
roles[doc.id] = { role: doc.data().role || 'member', joinedAt: doc.data().joinedAt || 0 };
if (doc.id === currentUser.uid) myRawRole = doc.data().role;
});
teamRolesCache[teamId] = roles;
try { localStorage.setItem('clc_team_roles_cache', JSON.stringify(teamRolesCache)); } catch {}
const team = teams.find(t => t.id === teamId);
if (!myRawRole && team && team.createdBy === currentUser.uid) {
db.collection('teamRegistry').doc(teamId).collection('members').doc(currentUser.uid)
.set({ role: 'owner' }, { merge: true }).catch(err => console.error('role bootstrap failed:', err));
}
if (currentChatTeamId === teamId) renderChatMessages(teamId);
if (currentMembersTeamId === teamId && typeof renderTeamMembersList === 'function') renderTeamMembersList();
renderTeamsList();
}, err => console.error('roles listener error:', err));
}
function getMyRole(teamId) {
const roles = teamRolesCache[teamId];
if (!roles || !currentUser) return 'member';
const entry = roles[currentUser.uid];
return entry ? entry.role : 'member';
}
function isTeamOwner(teamId) { return getMyRole(teamId) === 'owner'; }
function isTeamOwnerOrAdmin(teamId) { const r = getMyRole(teamId); return r === 'owner' || r === 'admin'; }
function notAllowedForRole() { showToast('⛔ Недоступно для вашей роли в команде', 'error'); }

// Точка входа: запускает листенеры команды (только чат-related, без песен)
function startTeamDataListener(teamId) {
startTeamRegistryListener(teamId);
startMembershipWatch(teamId);
startTeamRolesListener(teamId);
startChatListener(teamId);
startChatReadsListener(teamId);
}