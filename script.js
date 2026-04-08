const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const $ = (selector, parent = document) => parent.querySelector(selector);

const sidebar = $('#sidebar');
const mobileMenuBtn = $('#mobileMenuBtn');
const modalBackdrop = $('#modalBackdrop');
const commentForm = $('#commentForm');
const previewBtn = $('#previewBtn');
const previewBox = $('#previewBox');
const commentsList = $('#commentsList');
const commentsStatus = $('#commentsStatus');
const commentSearch = $('#commentSearch');
const refreshCommentsBtn = $('#refreshCommentsBtn');

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
  content.style.maxHeight = `${content.scrollHeight + 6}px`;
  if (!animate) requestAnimationFrame(() => { content.style.transition = ''; });
}

function closeAccordion(acc, content, btn) {
  acc.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
  content.style.maxHeight = '0px';
  content.classList.remove('expanded');
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

function markdownToHtml(raw = '') {
  let text = escapeHtml(raw.trim());

  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  const lines = text.split('\n');
  let inList = false;
  const processed = lines.map(line => {
    if (/^\s*-\s+/.test(line)) {
      const item = line.replace(/^\s*-\s+/, '');
      if (!inList) {
        inList = true;
        return `<ul><li>${item}</li>`;
      }
      return `<li>${item}</li>`;
    }
    if (inList) {
      inList = false;
      return `</ul><p>${line || ''}</p>`;
    }
    return `<p>${line || ''}</p>`;
  }).join('');

  return inList ? `${processed}</ul>` : processed;
}

function updatePreview() {
  const text = $('#commentText').value;
  previewBox.innerHTML = markdownToHtml(text) || '<p>Escreva algo para visualizar o preview.</p>';
}

function initPreview() {
  previewBtn?.addEventListener('click', () => {
    previewBox.classList.toggle('hidden');
    updatePreview();
  });
  $('#commentText')?.addEventListener('input', () => {
    if (!previewBox.classList.contains('hidden')) updatePreview();
  });
}

function setStatus(message, isError = false) {
  commentsStatus.textContent = message;
  commentsStatus.style.color = isError ? '#fda4af' : '';
}

function renderComments(items) {
  const q = (commentSearch.value || '').toLowerCase().trim();
  const filtered = items.filter(item => {
    const hay = `${item.author_name || ''} ${item.comment_text || ''}`.toLowerCase();
    return !q || hay.includes(q);
  });

  if (!filtered.length) {
    commentsList.innerHTML = '<div class="empty-state">Nenhum comentário encontrado ainda.</div>';
    return;
  }

  commentsList.innerHTML = filtered.map(item => {
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
        <div class="comment-body">${markdownToHtml(item.comment_text || '')}</div>
      </article>
    `;
  }).join('');
}

async function initSupabase() {
  const cfg = window.APP_CONFIG || {};
  const url = cfg.SUPABASE_URL;
  const key = cfg.SUPABASE_ANON_KEY;

  const placeholders = ['COLE_SUA_SUPABASE_URL_AQUI', 'COLE_SUA_SUPABASE_ANON_KEY_AQUI'];
  if (!url || !key || placeholders.includes(url) || placeholders.includes(key)) {
    setStatus('Preencha o config.js com sua URL e chave anônima do Supabase para ativar os comentários online.', true);
    commentsList.innerHTML = '<div class="empty-state">Comentários online aguardando configuração do Supabase.</div>';
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(url, key);
    await fetchComments();

    supabaseClient
      .channel('public:project_comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_comments' }, () => fetchComments())
      .subscribe();
  } catch (error) {
    console.error(error);
    setStatus('Não foi possível conectar ao Supabase.', true);
  }
}

async function fetchComments() {
  if (!supabaseClient) return;
  setStatus('Carregando comentários...');
  const { data, error } = await supabaseClient
    .from('project_comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    setStatus('Erro ao carregar comentários. Verifique o SQL e as permissões.', true);
    return;
  }

  allComments = data || [];
  renderComments(allComments);
  setStatus(`${allComments.length} comentário(s) carregado(s).`);
}

async function submitComment(event) {
  event.preventDefault();
  if (!supabaseClient) {
    setStatus('Configure o Supabase antes de publicar comentários.', true);
    return;
  }

  const payload = {
    author_name: $('#authorName').value.trim(),
    author_color: $('#authorColor').value,
    comment_text: $('#commentText').value.trim()
  };

  if (!payload.author_name || !payload.comment_text) {
    setStatus('Preencha nome e comentário.', true);
    return;
  }

  setStatus('Publicando comentário...');
  const { error } = await supabaseClient.from('project_comments').insert(payload);
  if (error) {
    console.error(error);
    setStatus('Erro ao publicar comentário.', true);
    return;
  }

  commentForm.reset();
  $('#authorColor').value = '#8b5cf6';
  previewBox.classList.add('hidden');
  await fetchComments();
  setStatus('Comentário publicado com sucesso.');
}

function initCommentEvents() {
  commentForm?.addEventListener('submit', submitComment);
  commentSearch?.addEventListener('input', () => renderComments(allComments));
  refreshCommentsBtn?.addEventListener('click', fetchComments);
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initAccordions();
  initModals();
  initReveal();
  initPreview();
  initCommentEvents();
  initSupabase();
});
