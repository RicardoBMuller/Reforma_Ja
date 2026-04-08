const fadeItems = document.querySelectorAll('.fade-up');
const overlay = document.getElementById('overlay');
const introModal = document.getElementById('introModal');
const pitchModal = document.getElementById('pitchModal');
const body = document.body;

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

fadeItems.forEach(item => observer.observe(item));

function openModal(modal) {
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  const someOpen = !introModal.classList.contains('hidden') || !pitchModal.classList.contains('hidden');
  if (!someOpen) {
    overlay.classList.add('hidden');
    body.style.overflow = '';
  }
}

function closeAllModals() {
  [introModal, pitchModal].forEach(modal => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  });
  overlay.classList.add('hidden');
  body.style.overflow = '';
}

document.getElementById('openIntroBtn').addEventListener('click', () => openModal(introModal));
document.getElementById('openPitchBtn').addEventListener('click', () => openModal(pitchModal));
document.getElementById('openPitchModalBottom').addEventListener('click', () => openModal(pitchModal));
document.getElementById('backToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-close');
    closeModal(document.getElementById(modalId));
    if (introModal.classList.contains('hidden') && pitchModal.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      body.style.overflow = '';
    }
  });
});

overlay.addEventListener('click', closeAllModals);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeAllModals();
});

document.querySelectorAll('.topic-card').forEach(card => {
  const summary = card.querySelector('summary');

  summary.addEventListener('mouseenter', () => {
    card.style.borderColor = 'rgba(88,196,255,.34)';
  });

  summary.addEventListener('mouseleave', () => {
    if (!card.hasAttribute('open')) {
      card.style.borderColor = 'rgba(255,255,255,.09)';
    }
  });

  card.addEventListener('toggle', () => {
    card.style.borderColor = card.hasAttribute('open')
      ? 'rgba(88,196,255,.34)'
      : 'rgba(255,255,255,.09)';
  });
});
