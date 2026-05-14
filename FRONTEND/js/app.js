/* ══════════════════════════════════════════════════════
   ECOMATCH — app.js v1.0
   Frontend JavaScript: navbar, animaciones, materiales, contadores
   ══════════════════════════════════════════════════════ */

'use strict';

/* ── Inicialización y conexión con backend ── */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando ECOMATCH Frontend...');

  if (typeof api === 'undefined' || typeof authManager === 'undefined' || typeof testConnection === 'undefined') {
    console.error('❌ Error: Dependencias de frontend no cargadas correctamente');
    return;
  }

  const isConnected = await testConnection();
  if (isConnected) {
    console.log('✅ Frontend conectado exitosamente con el backend');
  } else {
    console.warn('⚠️ No se pudo conectar con el backend. Algunas funciones pueden no estar disponibles.');
  }

  initializeNavigation();
  updateNavAuthState();
  await loadMaterialsFromApi();
  if (authManager.isAuthenticated()) {
    await loadProfile();
  }
});

/* ── Datos de materiales de ejemplo ── */
const MATERIALS = [
  { id:1, emoji:'🥤', type:'Plástico / PET', title:'PET transparente grado A', location:'📍 Guadalajara, Jalisco', price:'$4.50/kg', qty:'500 kg', badge:'Disponible', badgeClass:'badge-green', filter:'plastico' },
  { id:2, emoji:'🔩', type:'Metal / Acero', title:'Acero estructural mixto', location:'📍 Monterrey, Nuevo León', price:'$6.80/kg', qty:'2.5 ton', badge:'VIP', badgeClass:'badge-vip', filter:'metal' },
  { id:3, emoji:'📦', type:'Papel / Cartón', title:'Cartón corrugado prensado', location:'📍 Ciudad de México', price:'$2.80/kg', qty:'1.2 ton', badge:'Disponible', badgeClass:'badge-green', filter:'papel' },
  { id:4, emoji:'🍶', type:'Vidrio', title:'Vidrio transparente limpio', location:'📍 Puebla, Puebla', price:'$1.20/kg', qty:'800 kg', badge:'Disponible', badgeClass:'badge-green', filter:'vidrio' },
  { id:5, emoji:'⚡', type:'Metal / Cobre', title:'Cobre de instalación eléctrica', location:'📍 Querétaro', price:'$85.00/kg', qty:'120 kg', badge:'VIP', badgeClass:'badge-vip', filter:'metal' },
  { id:6, emoji:'💻', type:'Electrónicos', title:'Chatarra electrónica mixta', location:'📍 León, Guanajuato', price:'$12.00/kg', qty:'300 kg', badge:'Disponible', badgeClass:'badge-green', filter:'electronico' },
  { id:7, emoji:'🧴', type:'Plástico HDPE', title:'HDPE natural molido', location:'📍 Tijuana, B.C.', price:'$8.20/kg', qty:'700 kg', badge:'Disponible', badgeClass:'badge-green', filter:'plastico' },
  { id:8, emoji:'📰', type:'Papel / Periódico', title:'Papel periódico compactado', location:'📍 Mérida, Yucatán', price:'$1.90/kg', qty:'2 ton', badge:'VIP', badgeClass:'badge-vip', filter:'papel' },
];

let currentUser = null;
const grid = document.getElementById('materialsGrid');
const dashboardSection = document.getElementById('dashboard');
const dashboardWelcome = document.getElementById('dashboardWelcome');
const dashboardRole = document.getElementById('dashboardRole');
const dashboardVip = document.getElementById('dashboardVip');
const dashboardPublicaciones = document.getElementById('dashboardPublicaciones');
const dashboardCompras = document.getElementById('dashboardCompras');
const dashboardAhorro = document.getElementById('dashboardAhorro');
const dashboardRegisterCall = document.getElementById('dashboardRegisterCall');
const dashboardButton = document.getElementById('dashboardButton');
const logoutButton = document.getElementById('logoutButton');
const loginNavButton = document.getElementById('loginNavButton');
const registerNavButton = document.getElementById('registerNavButton');

const FILTER_MAP = {
  plastico: 'Plástico / PET',
  metal: 'Metal / Acero',
  papel: 'Papel / Cartón',
  vidrio: 'Vidrio',
  electronico: 'Electrónicos'
};

async function loadMaterialsFromApi(filter = 'all') {
  try {
    const result = await api.products.getAll();
    if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
      renderMaterials(result.data, filter);
      return;
    }
  } catch (error) {
    console.warn('No se pudo cargar materiales desde API, usando datos de ejemplo.', error);
  }

  renderMaterials(MATERIALS, filter);
}

function normalizeType(type) {
  return String(type || '').trim().toLowerCase();
}

function renderMaterials(items = MATERIALS, filter = 'all') {
  const mapped = items.map(item => {
    const typeText = item.tipo_material || item.type || 'Material reciclable';
    const title = item.titulo || item.title || 'Material disponible';
    const location = item.ciudad ? `📍 ${item.ciudad}` : item.location || 'Ubicación disponible';
    const price = item.precio_kg ? `$${Number(item.precio_kg).toFixed(2)}/kg` : item.price || 'Precio a consultar';
    const qty = item.cantidad_kg ? `${item.cantidad_kg} kg` : item.qty || 'Cantidad variable';
    const seller = item.vendedor_empresa || item.empresa || 'Proveedor verificado';
    const filterType = normalizeType(typeText).includes('plást') || normalizeType(typeText).includes('pet') ? 'plastico'
      : normalizeType(typeText).includes('acero') || normalizeType(typeText).includes('metal') ? 'metal'
      : normalizeType(typeText).includes('papel') || normalizeType(typeText).includes('cartón') ? 'papel'
      : normalizeType(typeText).includes('vidrio') ? 'vidrio'
      : normalizeType(typeText).includes('electr') ? 'electronico'
      : 'all';

    return {
      id: item.id || item.id_publicacion || Math.random().toString(36).slice(2),
      emoji: item.emoji || '♻️',
      type: typeText,
      title,
      location,
      price,
      qty,
      badge: item.es_vip ? 'VIP' : 'Disponible',
      badgeClass: item.es_vip ? 'badge-vip' : 'badge-green',
      filter: filterType,
      seller
    };
  });

  const filtered = filter === 'all' ? mapped : mapped.filter(m => m.filter === filter);
  grid.innerHTML = filtered.map(m => `
    <div class="material-card" data-id="${m.id}" data-filter="${m.filter}">
      <div class="material-img">
        ${m.emoji}
        <span class="material-badge ${m.badgeClass}">${m.badge}</span>
      </div>
      <div class="material-body">
        <div class="material-type">${m.type}</div>
        <div class="material-title">${m.title}</div>
        <div class="material-location">${m.location}</div>
        <div class="material-seller">${m.seller}</div>
        <div class="material-footer">
          <span class="material-price">${m.price}</span>
          <span class="material-qty">${m.qty}</span>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.material-card').forEach(card => {
    card.addEventListener('click', () => {
      if (!authManager.isAuthenticated()) {
        showModal('Inicia sesión para ver el detalle del material y contactar al proveedor.', {
          title: 'Acceso requerido',
          icon: '🔒'
        });
      } else {
        showModal('Ya estás conectado. Pronto tendrás un panel completo con tus solicitudes y publicaciones.', {
          title: '¡Ya estás conectado!',
          icon: '👋',
          hideActions: true,
          timeout: 3000
        });
      }
    });
  });
}

async function loadProfile() {
  try {
    const response = await api.auth.getProfile();
    if (response.success) {
      currentUser = response.user;
      renderDashboard(currentUser);
      updateNavAuthState();
      return;
    }
  } catch (error) {
    console.warn('No fue posible cargar perfil:', error.message);
  }

  authManager.setToken(null);
  updateNavAuthState();
}

function renderDashboard(user) {
  if (!user) return;
  if (dashboardSection) dashboardSection.style.display = 'block';

  dashboardWelcome.textContent = `Hola, ${user.nombre || user.empresa || 'miembro'}`;
  dashboardRole.textContent = `Tipo de cuenta: ${user.tipo_usuario || 'General'}`;
  dashboardVip.textContent = `Estado VIP: ${user.es_vip ? 'Activo' : 'Basico'}`;
  dashboardPublicaciones.textContent = user.publicaciones_activas || '0';
  dashboardCompras.textContent = user.solicitudes_recibidas || '0';
  dashboardAhorro.textContent = '320';

  if (dashboardRegisterCall) {
    dashboardRegisterCall.style.display = authManager.isAuthenticated() ? 'inline-block' : 'none';
  }

  showSection('dashboard');
}

function showSection(id) {
  document.querySelectorAll('section').forEach(section => {
    if (!section.id) return;

    if (id === 'login' || id === 'registro' || id === 'dashboard') {
      section.style.display = section.id === id ? 'block' : 'none';
      return;
    }

    if (section.id !== 'login' && section.id !== 'registro' && section.id !== 'dashboard') {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  });

  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateNavAuthState() {
  const isAuthed = authManager.isAuthenticated();
  if (dashboardButton) dashboardButton.style.display = isAuthed ? 'inline-flex' : 'none';
  if (logoutButton) logoutButton.style.display = isAuthed ? 'inline-flex' : 'none';
  if (loginNavButton) loginNavButton.style.display = isAuthed ? 'none' : 'inline-flex';
  if (registerNavButton) registerNavButton.style.display = isAuthed ? 'none' : 'inline-flex';
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    authManager.logout();
  });
}

if (dashboardButton) {
  dashboardButton.addEventListener('click', () => {
    if (authManager.isAuthenticated()) {
      showSection('dashboard');
    } else {
      showSection('login');
    }
  });
}

const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navMobile = document.getElementById('navMobile');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

navToggle?.addEventListener('click', () => {
  navMobile.classList.toggle('open');
});

/* Cerrar menú mobile al hacer click en link */
navMobile?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navMobile.classList.remove('open'));
});

/* ══════════════════════════════
   2. SMOOTH SCROLL
══════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ── Filtros ── */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    loadMaterialsFromApi(this.dataset.filter);
  });
});

/* ══════════════════════════════
   4. COUNTER ANIMATION
══════════════════════════════ */
function animateCounter(el, target, duration = 2000) {
  const start = performance.now();
  const isLarge = target > 100000;

  function update(time) {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = isLarge ? current.toLocaleString('es-MX') : current.toLocaleString('es-MX');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* Observer para disparar contadores al entrar en viewport */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      entry.target.dataset.animated = 'true';
      const target = parseInt(entry.target.dataset.target, 10);
      animateCounter(entry.target, target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

/* ══════════════════════════════
   5. SCROLL REVEAL
══════════════════════════════ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

/* Aplicar animación de entrada a tarjetas */
document.querySelectorAll(
  '.material-card, .step-card, .benefit-card, .testimonial-card, .plan-card, .impact-counter'
).forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(32px)';
  el.style.transition = `opacity 0.6s ${i * 0.08}s ease, transform 0.6s ${i * 0.08}s ease`;
  revealObserver.observe(el);
});

/* ══════════════════════════════
   6. MODAL SYSTEM (Improved)
══════════════════════════════ */
function showModal(msg, options = {}) {
  // Remove existing modal if any
  const existing = document.getElementById('eco-modal');
  if (existing) existing.remove();

  // Create modal elements
  const modal = document.createElement('div');
  modal.id = 'eco-modal';
  modal.className = 'eco-modal-overlay';

  const modalContent = document.createElement('div');
  modalContent.className = 'eco-modal-content';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'eco-modal-close';
  closeBtn.innerHTML = '×';
  closeBtn.setAttribute('aria-label', 'Cerrar modal');

  const modalBody = document.createElement('div');
  modalBody.className = 'eco-modal-body';

  const icon = document.createElement('div');
  icon.className = 'eco-modal-icon';
  icon.textContent = options.icon || '♻️';

  const title = document.createElement('h3');
  title.className = 'eco-modal-title';
  title.textContent = options.title || '¡Únete a ECOMATCH!';

  const message = document.createElement('p');
  message.className = 'eco-modal-message';
  message.innerHTML = msg;

  const actions = document.createElement('div');
  actions.className = 'eco-modal-actions';

  // Default actions
  if (!options.hideActions) {
    const registerBtn = document.createElement('a');
    registerBtn.href = '#registro';
    registerBtn.className = 'btn btn-primary';
    registerBtn.textContent = 'Registrarme gratis';
    registerBtn.addEventListener('click', () => modal.remove());

    const loginBtn = document.createElement('a');
    loginBtn.href = '#login';
    loginBtn.className = 'btn btn-secondary';
    loginBtn.textContent = 'Iniciar sesión';
    loginBtn.addEventListener('click', () => modal.remove());

    actions.appendChild(registerBtn);
    actions.appendChild(loginBtn);
  }

  // Assemble modal
  modalBody.appendChild(icon);
  modalBody.appendChild(title);
  modalBody.appendChild(message);
  if (!options.hideActions) modalBody.appendChild(actions);

  modalContent.appendChild(closeBtn);
  modalContent.appendChild(modalBody);

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Event listeners
  const closeModal = () => modal.remove();

  // Close button
  closeBtn.addEventListener('click', closeModal);

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // ESC key to close
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Cleanup when modal is removed
  const observer = new MutationObserver(() => {
    if (!document.body.contains(modal)) {
      document.body.style.overflow = '';
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });

  // Auto-remove after timeout if specified
  if (options.timeout) {
    setTimeout(closeModal, options.timeout);
  }

  return modal;
}

/* ══════════════════════════════
   8. AUTHENTICATION FORMS
══════════════════════════════ */

// ── Función para inicializar navegación ──
function initializeNavigation() {
  console.log('🔗 Inicializando navegación...');

  // Asegurar que la sección de inicio esté visible por defecto
  const inicioSection = document.getElementById('inicio');
  if (inicioSection) {
    inicioSection.style.display = 'block';
  }

  // Ocultar secciones de auth por defecto
  const loginSection = document.getElementById('login');
  const registroSection = document.getElementById('registro');
  if (loginSection) loginSection.style.display = 'none';
  if (registroSection) registroSection.style.display = 'none';
}

// ── Navigation handling ──
document.addEventListener('click', (e) => {
  const href = e.target.closest('a')?.getAttribute('href');
  if (href && href.startsWith('#')) {
    e.preventDefault();
    const targetId = href.substring(1);

    if (targetId === 'login' || targetId === 'registro') {
      showSection(targetId);
    } else if (targetId === 'dashboard') {
      if (authManager.isAuthenticated()) {
        showSection('dashboard');
      } else {
        showSection('login');
      }
    } else {
      showSection('inicio');
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

// ── Login form handling ──
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const response = await api.auth.login({
        email: email,
        password: password
      });

      if (response.token) {
        authManager.setToken(response.token);
      }

      showModal('✅ ¡Bienvenido! Has iniciado sesión correctamente.', {
        title: '¡Inicio de sesión exitoso!',
        icon: '✅',
        hideActions: true,
        timeout: 3000
      });
      console.log('Login exitoso:', response);
      await loadProfile();

    } catch (error) {
      showModal(`❌ Error al iniciar sesión: ${error.message}`, {
        title: 'Error de inicio de sesión',
        icon: '❌',
        hideActions: true
      });
      console.error('Error en login:', error);
    }
  });
}

// ── Register form handling ──
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      nombre: document.getElementById('registerName').value,
      email: document.getElementById('registerEmail').value,
      password: document.getElementById('registerPassword').value,
      tipo_usuario: document.getElementById('registerType').value,
      empresa: document.getElementById('registerName').value, // Usar el mismo nombre para empresa
      estado: document.getElementById('registerState').value
    };

    try {
      const response = await api.auth.register(formData);
      if (response.token) {
        authManager.setToken(response.token);
      }
      showModal('✅ ¡Registro exitoso! Bienvenido a ECOMATCH.', {
        title: '¡Registro exitoso!',
        icon: '🎉',
        hideActions: true,
        timeout: 4000
      });
      console.log('Registro exitoso:', response);
      registerForm.reset();
      await loadProfile();

    } catch (error) {
      showModal(`❌ Error en el registro: ${error.message}`, {
        title: 'Error en el registro',
        icon: '❌',
        hideActions: true
      });
      console.error('Error en registro:', error);
    }
  });
}

// ── Contact form handling ──
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // For now, just show a success message since backend doesn't have contact endpoint
    showModal('✅ ¡Mensaje enviado! Nos pondremos en contacto contigo pronto.', {
      title: 'Mensaje enviado',
      icon: '📧',
      hideActions: true,
      timeout: 4000
    });

    contactForm.reset();
  });
}

/* ══════════════════════════════
   8. NAVBAR ACTIVE LINK
══════════════════════════════ */
const sections = document.querySelectorAll('section[id]');
const navLinksAll = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 120) {
      current = section.getAttribute('id');
    }
  });
  navLinksAll.forEach(a => {
    a.style.color = a.getAttribute('href') === `#${current}` ? '#2ECC71' : '';
  });
}, { passive: true });

console.log('%c🌱 ECOMATCH v1.0 — Conectando residuos y recursos', 'color:#2ECC71;font-weight:bold;font-size:14px;');