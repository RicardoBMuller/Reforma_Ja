const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const mobileMenuBtn = $('#mobileMenuBtn');
const sidebar = $('#sidebar');
const modalBackdrop = $('#modalBackdrop');

function initSidebar() {
  mobileMenuBtn?.addEventListener('click', () => sidebar.classList.toggle('open'));

  $$('.side-nav a').forEach(link => {
    link.addEventListener('click', () => sidebar.classList.remove('open'));
  });

  const sections = $$('main [id]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      $$('.side-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { threshold: 0.45 });
  sections.forEach(section => observer.observe(section));
}

function initAccordions() {
  $$('.accordion').forEach(acc => {
    const btn = $('.accordion-toggle', acc);
    const content = $('.accordion-content', acc);
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    if (expanded) openAccordion(acc, content, btn, false);

    btn.addEventListener('click', () => {
      const isOpen = acc.classList.contains('open');
      if (isOpen) closeAccordion(acc, content, btn);
      else openAccordion(acc, content, btn, true);
    });
  });
}

function openAccordion(acc, content, btn, animate = true) {
  acc.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
  content.classList.add('expanded');
  if (!animate) content.style.transition = 'none';
  content.style.maxHeight = `${content.scrollHeight + 24}px`;
  if (!animate) requestAnimationFrame(() => { content.style.transition = ''; });
}

function closeAccordion(acc, content, btn) {
  acc.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
  content.style.maxHeight = '0px';
  content.classList.remove('expanded');
}

function refreshOpenAccordionHeight(container) {
  const accordion = container.closest('.accordion');
  if (!accordion || !accordion.classList.contains('open')) return;
  const content = $('.accordion-content', accordion);
  requestAnimationFrame(() => {
    content.style.maxHeight = `${content.scrollHeight + 24}px`;
  });
}

function initModals() {
  $$('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.openModal));
  });

  $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeAllModals));
  modalBackdrop?.addEventListener('click', closeAllModals);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });
}

function openModal(id) {
  modalBackdrop.classList.remove('hidden');
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('hidden');
}

function closeAllModals() {
  modalBackdrop.classList.add('hidden');
  $$('.modal').forEach(modal => modal.classList.add('hidden'));
}

function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.12 });
  $$('.fade-up').forEach(el => observer.observe(el));
}

function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function storageKey(topicId) {
  return `eod-comments-${topicId}`;
}

function readComments(topicId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(topicId)) || '[]');
  } catch {
    return [];
  }
}

function saveComments(topicId, comments) {
  localStorage.setItem(storageKey(topicId), JSON.stringify(comments));
}

function setTopicStatus(topicId, message, isError = false) {
  const status = document.querySelector(`.topic-comments-status[data-topic-id="${topicId}"]`);
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? '#c2410c' : '#6880b3';
}

function renderTopicComments(topicId) {
  const list = document.querySelector(`.topic-comments-list[data-topic-id="${topicId}"]`);
  if (!list) return;

  const items = readComments(topicId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!items.length) {
    list.innerHTML = '<div class="empty-state">Nenhum comentário ainda. Use este espaço para anotar ideias durante a apresentação.</div>';
    setTopicStatus(topicId, '0 comentário(s) neste tópico.');
    refreshOpenAccordionHeight(list);
    return;
  }

  list.innerHTML = items.map((item, index) => {
    const color = item.author_color || '#6ea8fe';
    const created = new Date(item.created_at).toLocaleString('pt-BR');
    return `
      <article class="comment-card">
        <div class="comment-top">
          <div class="comment-author" style="color:${color}">
            <span class="author-dot" style="background:${color}"></span>
            <span>${escapeHtml(item.author_name || 'Sem nome')}</span>
          </div>
          <div class="comment-time">${created}</div>
        </div>
        <div class="comment-body">${escapeHtml(item.comment_text || '')}</div>
        <div class="topic-comments-actions">
          <button type="button" class="btn btn-ghost comment-remove-btn" data-topic-id="${topicId}" data-index="${index}">Remover</button>
        </div>
      </article>
    `;
  }).join('');

  setTopicStatus(topicId, `${items.length} comentário(s) neste tópico.`);
  refreshOpenAccordionHeight(list);
}

function buildTopicComments() {
  $$('.accordion').forEach((accordion, index) => {
    const inner = $('.accordion-inner', accordion);
    if (!inner) return;

    const topicId = accordion.id || `topico-${index + 1}`;
    const block = document.createElement('div');
    block.className = 'topic-comments';
    block.innerHTML = `
      <h5>Comentários deste tópico</h5>
      <p>Espaço rápido para observações durante a conversa com seus amigos.</p>
      <form class="topic-comments-form" data-topic-id="${topicId}">
        <div class="topic-comments-grid">
          <label>
            <span>Nome</span>
            <input type="text" name="author_name" maxlength="40" placeholder="Ex.: Ricardo" required>
          </label>
          <label>
            <span>Cor do nome</span>
            <input type="color" name="author_color" value="#6ea8fe">
          </label>
        </div>
        <label>
          <span>Comentário</span>
          <textarea name="comment_text" placeholder="Escreva a observação deste tópico..." required></textarea>
        </label>
        <div class="topic-comments-actions">
          <button type="submit" class="btn btn-primary">Salvar comentário</button>
          <button type="button" class="btn btn-ghost topic-clear-btn" data-topic-id="${topicId}">Limpar tópico</button>
          <span class="topic-comments-status" data-topic-id="${topicId}">Comentários prontos.</span>
        </div>
      </form>
      <div class="topic-comments-list" data-topic-id="${topicId}"></div>
    `;
    inner.appendChild(block);
    renderTopicComments(topicId);
  });
}

function submitTopicComment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const topicId = form.dataset.topicId;
  const formData = new FormData(form);
  const payload = {
    author_name: String(formData.get('author_name') || '').trim(),
    author_color: String(formData.get('author_color') || '#6ea8fe'),
    comment_text: String(formData.get('comment_text') || '').trim(),
    created_at: new Date().toISOString()
  };

  if (!payload.author_name || !payload.comment_text) {
    setTopicStatus(topicId, 'Preencha nome e comentário.', true);
    return;
  }

  const comments = readComments(topicId);
  comments.unshift(payload);
  saveComments(topicId, comments);

  form.reset();
  form.querySelector('input[name="author_color"]').value = '#6ea8fe';
  renderTopicComments(topicId);
  setTopicStatus(topicId, 'Comentário salvo neste aparelho.');
}

function removeTopicComment(topicId, index) {
  const comments = readComments(topicId);
  comments.splice(index, 1);
  saveComments(topicId, comments);
  renderTopicComments(topicId);
}

function clearTopicComments(topicId) {
  localStorage.removeItem(storageKey(topicId));
  renderTopicComments(topicId);
  setTopicStatus(topicId, 'Comentários deste tópico removidos.');
}

function initTopicCommentEvents() {
  $$('.topic-comments-form').forEach(form => form.addEventListener('submit', submitTopicComment));
  document.addEventListener('click', event => {
    const removeBtn = event.target.closest('.comment-remove-btn');
    if (removeBtn) {
      removeTopicComment(removeBtn.dataset.topicId, Number(removeBtn.dataset.index));
    }

    const clearBtn = event.target.closest('.topic-clear-btn');
    if (clearBtn) {
      clearTopicComments(clearBtn.dataset.topicId);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initAccordions();
  initModals();
  initReveal();
  buildTopicComments();
  initTopicCommentEvents();
});
