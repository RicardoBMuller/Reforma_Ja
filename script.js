
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const $ = (selector, parent = document) => parent.querySelector(selector);

const sidebar = $('#sidebar');
const mobileMenuBtn = $('#mobileMenuBtn');
const modalBackdrop = $('#modalBackdrop');

let supabaseClient = null;
let allComments = [];

function initSidebar() {
  mobileMenuBtn?.addEventListener('click', () => sidebar.classList.toggle('open'));
  $$('.side-nav a').forEach(link => {
    link.addEventListener('click', () => sidebar.classList.remove('open'));
  });

  const sections = $$('.accordion[id], section[id], header[id]');
  const navLinks = $$('.side-nav a');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { threshold: 0.4 });
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
  content.style.maxHeight = `${content.scrollHeight + 20}px`;
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
  if (content) {
    requestAnimationFrame(() => {
      content.style.maxHeight = `${content.scrollHeight + 20}px`;
    });
  }
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
  }, { threshold: 0.14 });
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

function setTopicStatus(topicId, message, isError = false) {
  const status = document.querySelector(`.topic-comments-status[data-topic-id="${topicId}"]`);
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? '#fda4af' : '';
}

function renderTopicComments(topicId) {
  const list = document.querySelector(`.topic-comments-list[data-topic-id="${topicId}"]`);
  if (!list) return;

  const items = allComments
    .filter(item => item.topic_id === topicId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!items.length) {
    list.innerHTML = '<div class="empty-state">Ainda não há comentários neste tópico.</div>';
    refreshOpenAccordionHeight(list);
    return;
  }

  list.innerHTML = items.map(item => {
    const color = item.author_color || '#8b5cf6';
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
      </article>
    `;
  }).join('');

  refreshOpenAccordionHeight(list);
}

function renderAllTopics() {
  $$('.topic-comments-list').forEach(list => renderTopicComments(list.dataset.topicId));
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
      <p>Espaço rápido para observações da equipe durante a apresentação.</p>
      <form class="topic-comments-form" data-topic-id="${topicId}">
        <div class="topic-comments-grid">
          <label>
            <span>Nome</span>
            <input type="text" name="author_name" maxlength="40" placeholder="Ex.: Ricardo" required>
          </label>
          <label>
            <span>Cor do nome</span>
            <input type="color" name="author_color" value="#8b5cf6">
          </label>
        </div>
        <label>
          <span>Comentário</span>
          <textarea name="comment_text" placeholder="Escreva aqui a observação deste tópico..." required></textarea>
        </label>
        <div class="topic-comments-actions">
          <button type="submit" class="btn btn-primary">Publicar comentário</button>
          <button type="button" class="btn btn-ghost topic-refresh-btn" data-topic-id="${topicId}">Atualizar</button>
          <span class="topic-comments-status" data-topic-id="${topicId}">Comentários prontos.</span>
        </div>
      </form>
      <div class="topic-comments-list" data-topic-id="${topicId}"></div>
    `;
    inner.appendChild(block);
  });
}

async function initSupabase() {
  const cfg = window.APP_CONFIG || {};
  const url = cfg.SUPABASE_URL;
  const key = cfg.SUPABASE_ANON_KEY;
  const placeholders = ['COLE_SUA_SUPABASE_URL_AQUI', 'COLE_SUA_SUPABASE_ANON_KEY_AQUI'];

  if (!url || !key || placeholders.includes(url) || placeholders.includes(key)) {
    $$('.topic-comments-status').forEach(el => {
      el.textContent = 'Preencha o config.js e rode o SQL para ativar os comentários online.';
      el.style.color = '#fda4af';
    });
    $$('.topic-comments-list').forEach(el => {
      el.innerHTML = '<div class="empty-state">Comentários online aguardando configuração do Supabase.</div>';
    });
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(url, key);
    await fetchComments();

    supabaseClient
      .channel('public:project_topic_comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_topic_comments' }, () => fetchComments())
      .subscribe();
  } catch (error) {
    console.error(error);
    $$('.topic-comments-status').forEach(el => {
      el.textContent = 'Não foi possível conectar ao Supabase.';
      el.style.color = '#fda4af';
    });
  }
}

async function fetchComments() {
  if (!supabaseClient) return;

  $$('.topic-comments-status').forEach(el => {
    el.textContent = 'Carregando comentários...';
    el.style.color = '';
  });

  const { data, error } = await supabaseClient
    .from('project_topic_comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    $$('.topic-comments-status').forEach(el => {
      el.textContent = 'Erro ao carregar comentários. Verifique o SQL e as permissões.';
      el.style.color = '#fda4af';
    });
    return;
  }

  allComments = data || [];
  renderAllTopics();

  $$('.topic-comments-status').forEach(el => {
    const topicId = el.dataset.topicId;
    const total = allComments.filter(item => item.topic_id === topicId).length;
    el.textContent = `${total} comentário(s) neste tópico.`;
    el.style.color = '';
  });
}

async function submitTopicComment(event) {
  event.preventDefault();
  if (!supabaseClient) return;

  const form = event.currentTarget;
  const topicId = form.dataset.topicId;
  const formData = new FormData(form);
  const payload = {
    topic_id: topicId,
    author_name: (formData.get('author_name') || '').toString().trim(),
    author_color: (formData.get('author_color') || '#8b5cf6').toString(),
    comment_text: (formData.get('comment_text') || '').toString().trim()
  };

  if (!payload.author_name || !payload.comment_text) {
    setTopicStatus(topicId, 'Preencha nome e comentário.', true);
    return;
  }

  setTopicStatus(topicId, 'Publicando comentário...');
  const { error } = await supabaseClient.from('project_topic_comments').insert(payload);

  if (error) {
    console.error(error);
    setTopicStatus(topicId, 'Erro ao publicar comentário.', true);
    return;
  }

  form.reset();
  form.querySelector('input[name="author_color"]').value = '#8b5cf6';
  await fetchComments();
  setTopicStatus(topicId, 'Comentário publicado com sucesso.');
}

function initTopicCommentEvents() {
  $$('.topic-comments-form').forEach(form => form.addEventListener('submit', submitTopicComment));
  $$('.topic-refresh-btn').forEach(btn => btn.addEventListener('click', fetchComments));
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initAccordions();
  initModals();
  initReveal();
  buildTopicComments();
  initTopicCommentEvents();
  initSupabase();
});
