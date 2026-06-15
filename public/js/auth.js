// public/js/auth.js

// Gestión del Token JWT y Estado de Sesión
const TOKEN_KEY = 'biblia_token';
const USER_KEY = 'biblia_user';

// Función para mostrar notificaciones personalizadas (Toasts)
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Iconos SVG según tipo (más profesionales que emojis)
  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  
  toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
  container.appendChild(toast);
  
  // Forzar reflujo
  toast.offsetHeight;
  
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
}

function isLoggedIn() {
  return !!getToken();
}

function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  updateAuthUI();
  if (window.showSection) {
    window.showSection('section-search-home');
  } else {
    window.location.href = '/';
  }
}

// Actualizar la interfaz de usuario en base al estado de autenticación
async function updateAuthUI() {
  const anonView = document.getElementById('user-anonymous-view');
  const loggedView = document.getElementById('user-logged-view');
  const userDisplay = document.getElementById('user-name-display');
  const userAvatar = document.getElementById('user-avatar-btn');
  const adminLink = document.getElementById('admin-panel-link');
  const recentSearchesBox = document.getElementById('recent-searches-box');

  // Elementos de la barra de navegación móvil
  const bottomNavLogin = document.getElementById('bottom-nav-login');
  const bottomNavProfile = document.getElementById('bottom-nav-profile');
  const bottomNavLogout = document.getElementById('bottom-nav-logout');

  const user = getUser();

  if (isLoggedIn() && user) {
    if (anonView) anonView.classList.add('hidden');
    if (loggedView) loggedView.classList.remove('hidden');
    if (userDisplay) userDisplay.textContent = user.name;
    if (userAvatar) {
      if (user.profile_image) {
        userAvatar.style.backgroundImage = `url(${user.profile_image})`;
        userAvatar.style.backgroundSize = 'cover';
        userAvatar.style.backgroundPosition = 'center';
        userAvatar.textContent = '';
      } else {
        userAvatar.style.backgroundImage = '';
        userAvatar.textContent = user.name.charAt(0).toUpperCase();
      }
    }

    // Configurar menú móvil inferior para autenticado
    if (bottomNavLogin) bottomNavLogin.classList.add('hidden');
    if (bottomNavProfile) bottomNavProfile.classList.remove('hidden');
    if (bottomNavLogout) bottomNavLogout.classList.remove('hidden');

    // Mostrar panel administrador si corresponde
    if (user.role === 'admin') {
      if (adminLink) adminLink.classList.remove('hidden');
    } else {
      if (adminLink) adminLink.classList.add('hidden');
    }

    if (recentSearchesBox) {
      recentSearchesBox.classList.remove('hidden');
      loadRecentSearches();
    }
  } else {
    if (anonView) anonView.classList.remove('hidden');
    if (loggedView) loggedView.classList.add('hidden');
    if (adminLink) adminLink.classList.add('hidden');
    if (recentSearchesBox) recentSearchesBox.classList.add('hidden');

    // Configurar menú móvil inferior para invitado
    if (bottomNavLogin) bottomNavLogin.classList.remove('hidden');
    if (bottomNavProfile) bottomNavProfile.classList.add('hidden');
    if (bottomNavLogout) bottomNavLogout.classList.add('hidden');
  }
}

// Cargar versiones en selectores compartidos de autenticación (ej: registro)
async function loadRegisterVersions() {
  const selectReg = document.getElementById('register-version');
  if (!selectReg) return;

  try {
    const res = await fetch('/api/bible/versions');
    const versions = await res.json();
    
    selectReg.innerHTML = '';
    versions.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.abbreviation} - ${v.name}`;
      selectReg.appendChild(opt);
    });
  } catch (error) {
    console.error('Error al cargar versiones:', error);
  }
}

// Captura de eventos para Formularios de Login y Registro
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Error al iniciar sesión.');
        }

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        
        updateAuthUI();
        showToast('Sesión iniciada correctamente', 'success');
        
        // Cargar datos que dependen del login
        if (window.checkSessionAndRedirects) window.checkSessionAndRedirects();
        
        if (window.showSection) {
          window.showSection('section-search-home');
        } else {
          window.location.href = '/';
        }
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = err.message;
          errorDiv.style.display = 'block';
        }
      }
    });
  }

  if (registerForm) {
    loadRegisterVersions();
    
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const defaultVersion = document.getElementById('register-version').value;
      const errorDiv = document.getElementById('register-error');

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name, 
            email, 
            password, 
            default_version_id: parseInt(defaultVersion) 
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Error al registrarse.');
        }

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        updateAuthUI();
        showToast('Registro completado con éxito', 'success');
        
        if (window.checkSessionAndRedirects) window.checkSessionAndRedirects();

        if (window.showSection) {
          window.showSection('section-search-home');
        } else {
          window.location.href = '/';
        }
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = err.message;
          errorDiv.style.display = 'block';
        }
      }
    });
  }

  // Interceptar enlace de Iniciar Sesión para soporte SPA
  const loginLink = document.querySelector('#user-anonymous-view a[href="/login"]');
  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.showSection) {
        window.showSection('section-auth');
      } else {
        window.location.href = '/login';
      }
    });
  }

  // Desloguearse
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  updateAuthUI();
});
