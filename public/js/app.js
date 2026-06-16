// public/js/app.js

// Estado global de la aplicación
let activeVersionId = 1; // RVR1960 por defecto
let currentSearchQuery = '';
let currentFilters = {
  version_id: '',
  book_id: '',
  testament: '',
  tag: ''
};
let currentPage = 1;
const itemsPerPage = 10;

// Estado del lector lateral
let currentReaderBookId = null;
let currentReaderChapter = 1;
let currentReaderChapterCount = 0;

// Variables de autocompletado
let suggestionTimeout = null;
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const debounceMs = isMobile ? 500 : 250;

// --- INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('🚀 PWA: Service Worker registrado con éxito:', reg.scope);
        // Forzar activación inmediata si hay una nueva versión esperando
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] Nueva versión disponible. Activando...');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch(err => console.error('❌ PWA: Fallo al registrar Service Worker:', err));

    // Refrescar la página cuando el nuevo service worker tome el control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  // Cargar elementos iniciales
  loadFiltersData();
  loadVerseOfTheDay();
  initTheme();
  setupEventListeners();
  checkSessionAndRedirects();
  setupBottomNav();
  setupPwaInstall();

  // Soporte SPA para ruta directa /login
  if (window.location.pathname === '/login' || window.location.search.includes('login=true')) {
    setTimeout(() => {
      if (window.showSection) window.showSection('section-auth');
    }, 150);
  }
});

// Inicializar tema guardado o preferencia del sistema
function initTheme() {
  let theme = localStorage.getItem('theme');
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
  }
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('#theme-toggle svg path');
  if (icon) {
    if (theme === 'dark') {
      icon.setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.32 11.32l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
    } else {
      icon.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    }
  }
}

// Alternar entre tema claro y oscuro
function toggleTheme() {
  let theme = localStorage.getItem('theme') || 'light';
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  
  const icon = document.querySelector('#theme-toggle svg path');
  if (icon) {
    if (theme === 'dark') {
      icon.setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.32 11.32l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
    } else {
      icon.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    }
  }
}

// Comprobar la sesión activa y redirigir
function checkSessionAndRedirects() {
  const user = getUser();
  if (user) {
    if (user.default_version_id) {
      activeVersionId = user.default_version_id;
      const verInd = document.getElementById('results-version-indicator');
      if (verInd) verInd.textContent = user.default_version_abbreviation || 'RVR1960';
    }
  }
}

// Cargar datos en los filtros avanzados y selectores de lectura
async function loadFiltersData() {
  try {
    // 1. Cargar versiones
    const resVersions = await fetch('/api/bible/versions');
    const versions = await resVersions.json();
    
    const filterVer = document.getElementById('filter-version');
    const readerVer = document.getElementById('reader-select-version');
    const profileVer = document.getElementById('profile-version');

    const renderVersionSelect = (selectEl, defaultVal) => {
      if (!selectEl) return;
      selectEl.innerHTML = '';
      versions.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `${v.abbreviation} - ${v.name}`;
        if (v.id == defaultVal) opt.selected = true;
        selectEl.appendChild(opt);
      });
    };

    renderVersionSelect(filterVer, activeVersionId);
    renderVersionSelect(readerVer, activeVersionId);
    renderVersionSelect(profileVer, activeVersionId);

    // 2. Cargar libros
    const resBooks = await fetch('/api/bible/books');
    const books = await resBooks.json();
    
    const filterBook = document.getElementById('filter-book');
    const readerBook = document.getElementById('reader-select-book');

    if (filterBook) {
      books.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        filterBook.appendChild(opt);
      });
    }

    if (readerBook) {
      readerBook.innerHTML = '';
      books.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        readerBook.appendChild(opt);
      });
      // Inicializar capítulos del primer libro
      if (books.length > 0) {
        loadReaderChapters(books[0].id);
      }
    }

    // 3. Cargar etiquetas
    const resTags = await fetch('/api/tags');
    const tags = await resTags.json();
    const filterTag = document.getElementById('filter-tag');
    if (filterTag) {
      tags.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name;
        opt.textContent = t.name;
        filterTag.appendChild(opt);
      });
    }
  } catch (error) {
    console.error('Error al inicializar filtros:', error);
  }
}

// Cargar Capítulos para el selector de lectura
async function loadReaderChapters(bookId, selectChapterNum = 1) {
  const selectCap = document.getElementById('reader-select-chapter');
  if (!selectCap) return;

  try {
    const res = await fetch(`/api/bible/books/${bookId}/chapters`);
    const chapters = await res.json();
    
    selectCap.innerHTML = '';
    
    if (chapters.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-';
      selectCap.appendChild(opt);
      
      currentReaderBookId = bookId;
      currentReaderChapter = 0;
      currentReaderChapterCount = 0;
      updateReaderNavButtons();
      
      const container = document.getElementById('reader-content-verses');
      if (container) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 40px;">Este libro no tiene capítulos ni versículos cargados aún en la base de datos.<br><br>Puedes cargar más libros y versiones desde el panel administrador.</p>';
      }
      return;
    }
    
    chapters.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.number;
      opt.textContent = c.number;
      if (c.number == selectChapterNum) opt.selected = true;
      selectCap.appendChild(opt);
    });

    const activeCap = Number(selectCap.value || selectChapterNum);
    currentReaderBookId = Number(bookId);
    currentReaderChapter = activeCap;
    currentReaderChapterCount = chapters.length;
    updateReaderNavButtons();

    loadReaderVerses(bookId, activeCap);
  } catch (error) {
    console.error('Error al cargar capítulos de lectura:', error);
  }
}

// Actualizar estado de los botones de navegación del lector
function updateReaderNavButtons() {
  const prevBtn = document.getElementById('reader-prev-chapter');
  const nextBtn = document.getElementById('reader-next-chapter');
  if (prevBtn) prevBtn.disabled = !currentReaderChapter || currentReaderChapter <= 1;
  if (nextBtn) nextBtn.disabled = !currentReaderChapterCount || currentReaderChapter >= currentReaderChapterCount;
}

// Cargar capítulo anterior en el lector lateral
function loadPreviousChapter() {
  if (!currentReaderBookId || currentReaderChapter <= 1) return;
  const newChapter = currentReaderChapter - 1;
  const selectCap = document.getElementById('reader-select-chapter');
  if (selectCap) selectCap.value = newChapter;
  loadReaderChapters(currentReaderBookId, newChapter);
}

// Cargar siguiente capítulo en el lector lateral
function loadNextChapter() {
  if (!currentReaderBookId || currentReaderChapter >= currentReaderChapterCount) return;
  const newChapter = currentReaderChapter + 1;
  const selectCap = document.getElementById('reader-select-chapter');
  if (selectCap) selectCap.value = newChapter;
  loadReaderChapters(currentReaderBookId, newChapter);
}

// Cargar Versículos del Lector Lateral
async function loadReaderVerses(bookId, chapterNumber) {
  const container = document.getElementById('reader-content-verses');
  if (!container) return;

  if (!chapterNumber || chapterNumber === '') {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 40px;">Este libro no tiene capítulos cargados aún en la base de datos.</p>';
    return;
  }

  const readerVer = document.getElementById('reader-select-version');
  const verId = readerVer ? readerVer.value : activeVersionId;

  try {
    const res = await fetch(`/api/bible/books/${bookId}/chapters/${chapterNumber}/verses?version_id=${verId}`);
    const verses = await res.json();

    container.innerHTML = '';
    
    if (verses.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 40px;">No hay versículos disponibles para este capítulo en la versión seleccionada.</p>';
      return;
    }

    // Actualizar título del lector
    const bookSelect = document.getElementById('reader-select-book');
    const bookName = bookSelect.options[bookSelect.selectedIndex].text;
    document.getElementById('reader-title-text').textContent = `${bookName} ${chapterNumber}`;

    verses.forEach(v => {
      const p = document.createElement('div');
      p.className = 'reader-verse';
      p.id = `reader-v-${v.id}`;
      
      const citation = `${v.book_name} ${v.chapter_number}:${v.number}`;
      
      p.innerHTML = `
        <div class="verse-line">
          <span class="reader-verse-num">${v.number}</span>
          <span class="verse-text">${escapeHTML(v.text)}</span>
          ${getVerseActionsHTML(v, citation)}
        </div>
      `;

      container.appendChild(p);
    });
  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger); text-align: center;">Error al cargar texto del capítulo.</p>`;
  }
}

// Cargar Versículo del Día
async function loadVerseOfTheDay() {
  const textEl = document.getElementById('votd-text-content');
  const citationEl = document.getElementById('votd-citation');
  const versionEl = document.getElementById('votd-version');
  if (!textEl) return;

  try {
    const res = await fetch('/api/bible/verse-of-the-day');
    if (!res.ok) throw new Error();
    const verse = await res.json();

    const citation = `${verse.book_name} ${verse.chapter_number}:${verse.number}`;
    textEl.innerHTML = `"${escapeHTML(verse.text)}"`;
    citationEl.textContent = citation;
    versionEl.textContent = verse.version;

    // Configurar botones de copia y compartir del versículo del día
    document.getElementById('votd-copy').onclick = () => copyToClipboard(verse.text, citation);
    document.getElementById('votd-share').onclick = () => shareOnWhatsApp(verse.text, citation);
  } catch (error) {
    textEl.textContent = '"Jehová es mi pastor; nada me faltará."';
    citationEl.textContent = 'Salmos 23:1';
    versionEl.textContent = 'RVR1960';
  }
}

// Configurar los manejadores de eventos principales
function setupEventListeners() {
  // Toggle Tema Claro/Oscuro
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Toggle filtros avanzados
  const toggleFiltersBtn = document.getElementById('toggle-filters');
  const advancedFilters = document.getElementById('advanced-filters');
  if (toggleFiltersBtn && advancedFilters) {
    toggleFiltersBtn.addEventListener('click', () => {
      const isOpen = advancedFilters.style.display === 'block';
      advancedFilters.style.display = isOpen ? 'none' : 'block';
    });
  }

  // Toggles de navegación principal
  const navSearch = document.getElementById('nav-search');
  const navDashboard = document.getElementById('nav-dashboard');
  const logoLink = document.getElementById('logo-link');

  const showSection = (sectionId) => {
    document.getElementById('section-search-home').classList.add('hidden');
    document.getElementById('section-search-results').classList.add('hidden');
    document.getElementById('section-user-dashboard').classList.add('hidden');
    document.getElementById('section-games-hub').classList.add('hidden');
    const authSec = document.getElementById('section-auth');
    if (authSec) authSec.classList.add('hidden');

    const targetEl = document.getElementById(sectionId);
    if (targetEl) targetEl.classList.remove('hidden');

    // Manejar menú activo
    const navGames = document.getElementById('nav-games');
    if (navSearch && navDashboard) {
      navSearch.classList.remove('active');
      navDashboard.classList.remove('active');
      if (navGames) navGames.classList.remove('active');

      if (sectionId === 'section-search-home' || sectionId === 'section-search-results') {
        navSearch.classList.add('active');
      } else if (sectionId === 'section-user-dashboard') {
        navDashboard.classList.add('active');
      } else if (sectionId === 'section-games-hub') {
        if (navGames) navGames.classList.add('active');
      }
    }
  };
  window.showSection = showSection;

  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Limpiar filtros e input
      document.getElementById('main-search-input').value = '';
      document.getElementById('clear-search').style.display = 'none';
      showSection('section-search-home');
    });
  }

  if (navSearch) {
    navSearch.addEventListener('click', (e) => {
      e.preventDefault();
      const query = document.getElementById('main-search-input').value;
      if (query.trim() !== '') {
        showSection('section-search-results');
      } else {
        showSection('section-search-home');
      }
    });
  }

  if (navDashboard) {
    // Si la navegación a Mi Espacio se activa
    navDashboard.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isLoggedIn()) {
        showToast('Por favor, inicia sesión para acceder a tu diario espiritual.', 'warning');
        showSection('section-auth');
        return;
      }
      showSection('section-user-dashboard');
      // Cargar favoritos
      loadFavorites();
      loadNotes();
      loadLists();
    });
  }

  // Botón volver a inicio
  const backBtn = document.getElementById('back-to-home-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('main-search-input').value = '';
      document.getElementById('clear-search').style.display = 'none';
      showSection('section-search-home');
    });
  }

  // Entrada de búsqueda principal (Escuchar Enter y autocompletado)
  const mainSearchInput = document.getElementById('main-search-input');
  if (mainSearchInput) {
    mainSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSuggestionHighlight(1, 'suggestions-box');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSuggestionHighlight(-1, 'suggestions-box');
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!acceptActiveSuggestion('suggestions-box')) {
          hideSuggestions();
          triggerSearch(mainSearchInput.value);
        }
        return;
      }
      if (e.key === 'Escape') {
        hideSuggestions();
      }
    });

    mainSearchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      document.getElementById('clear-search').style.display = val ? 'block' : 'none';
      handleAutocomplete(val, 'suggestions-box');
    });
  }

  // Entrada de búsqueda en resultados
  const resultsSearchInput = document.getElementById('results-search-input');
  if (resultsSearchInput) {
    resultsSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSuggestionHighlight(1, 'results-suggestions');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSuggestionHighlight(-1, 'results-suggestions');
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!acceptActiveSuggestion('results-suggestions')) {
          hideSuggestions();
          triggerSearch(resultsSearchInput.value);
        }
        return;
      }
      if (e.key === 'Escape') {
        hideSuggestions();
      }
    });

    resultsSearchInput.addEventListener('input', (e) => {
      handleAutocomplete(e.target.value, 'results-suggestions');
    });
  }

  // Botón borrar búsqueda
  const clearSearchBtn = document.getElementById('clear-search');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      mainSearchInput.value = '';
      clearSearchBtn.style.display = 'none';
      hideSuggestions();
      mainSearchInput.focus();
    });
  }

  // Botón Aplicar Filtros Avanzados
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      const query = mainSearchInput.value;
      const advancedFilters = document.getElementById('advanced-filters');
      if (advancedFilters) advancedFilters.style.display = 'none';
      triggerSearch(query);
    });
  }

  // Selectores de lectura lateral
  const readerBook = document.getElementById('reader-select-book');
  const readerCap = document.getElementById('reader-select-chapter');
  const readerVer = document.getElementById('reader-select-version');

  if (readerBook) {
    readerBook.addEventListener('change', (e) => {
      loadReaderChapters(e.target.value, 1);
    });
  }

  if (readerCap) {
    readerCap.addEventListener('change', (e) => {
      const bookId = readerBook.value;
      loadReaderVerses(bookId, e.target.value);
    });
  }

  if (readerVer) {
    readerVer.addEventListener('change', () => {
      const bookId = readerBook.value;
      const chapter = readerCap.value;
      loadReaderVerses(bookId, chapter);
    });
  }

  // Navegación anterior/siguiente en el lector lateral
  const readerPrevBtn = document.getElementById('reader-prev-chapter');
  const readerNextBtn = document.getElementById('reader-next-chapter');
  if (readerPrevBtn) readerPrevBtn.addEventListener('click', loadPreviousChapter);
  if (readerNextBtn) readerNextBtn.addEventListener('click', loadNextChapter);

  // Pestañas del panel lateral (Lector / Notas / Etiquetas / Listas / Historial)
  document.querySelectorAll('#reader-tabs .reader-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchReaderTab(tab);
    });
  });

  // Paginación
  document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      executeSearchQuery();
    }
  });

  document.getElementById('next-page-btn').addEventListener('click', () => {
    currentPage++;
    executeSearchQuery();
  });

  // Tabs de "Mi Espacio"
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Cerrar sugerencias y menús de versículos al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box-wrapper') && !e.target.closest('#results-search-input')) {
      hideSuggestions();
    }
    if (!e.target.closest('.verse-actions-menu-wrapper')) {
      document.querySelectorAll('.verse-actions-dropdown').forEach(m => {
        m.style.display = 'none';
      });
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  // Configuración de Perfil modal
  const profileSettingsBtn = document.getElementById('profile-settings-btn');
  const userAvatarBtn = document.getElementById('user-avatar-btn');
  
  const openProfile = async () => {
    if (!isLoggedIn()) return;
    
    // Rellenar datos
    try {
      const res = await fetch('/api/auth/profile', { headers: getAuthHeaders() });
      const user = await res.json();
      
      document.getElementById('profile-name').value = user.name;
      document.getElementById('profile-email').value = user.email;
      
      const selectVer = document.getElementById('profile-version');
      if (selectVer && user.default_version_id) {
        selectVer.value = user.default_version_id;
      }
      
      // Foto de Perfil Vista Previa
      const preview = document.getElementById('profile-image-preview');
      const placeholder = document.getElementById('profile-image-placeholder');
      const fileInput = document.getElementById('profile-image-input');
      
      if (fileInput) fileInput.value = '';
      if (preview && placeholder) {
        if (user.profile_image) {
          preview.src = user.profile_image;
          preview.style.display = 'block';
          placeholder.style.display = 'none';
        } else {
          preview.src = '';
          preview.style.display = 'none';
          placeholder.style.display = 'block';
          placeholder.textContent = user.name.charAt(0).toUpperCase();
        }
      }
      
      document.getElementById('profile-password').value = '';
      document.getElementById('profile-modal').classList.add('active');
    } catch (err) {
      console.error(err);
    }
  };

  if (profileSettingsBtn) profileSettingsBtn.addEventListener('click', openProfile);
  if (userAvatarBtn) userAvatarBtn.addEventListener('click', openProfile);

  // Toggle de tarjetas login/registro integradas en el SPA
  const loginCard = document.getElementById('login-card');
  const registerCard = document.getElementById('register-card');
  const showRegisterBtn = document.getElementById('show-register-btn');
  const showLoginBtn = document.getElementById('show-login-btn');

  if (showRegisterBtn && loginCard && registerCard) {
    showRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginCard.classList.add('hidden');
      registerCard.classList.remove('hidden');
    });
  }

  if (showLoginBtn && loginCard && registerCard) {
    showLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      registerCard.classList.add('hidden');
      loginCard.classList.remove('hidden');
    });
  }

  // Guardar perfil
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('profile-name').value;
      const defaultVersion = document.getElementById('profile-version').value;
      const password = document.getElementById('profile-password').value;

      // Detectar si seleccionó foto nueva
      const imageInput = document.getElementById('profile-image-input');
      const hasImage = imageInput && imageInput.files && imageInput.files.length > 0;
      let uploadedImageUrl = null;

      try {
        if (hasImage) {
          const formData = new FormData();
          formData.append('profile_image', imageInput.files[0]);
          const imgHeaders = getAuthHeaders();
          delete imgHeaders['Content-Type']; // Dejar al navegador fijar boundary

          const imgRes = await fetch('/api/auth/profile-image', {
            method: 'POST',
            headers: imgHeaders,
            body: formData
          });
          const imgData = await imgRes.json();
          if (!imgRes.ok) throw new Error(imgData.error || 'Error al subir la imagen.');
          uploadedImageUrl = imgData.profile_image;
        }

        const payload = { name, default_version_id: parseInt(defaultVersion) };
        if (password.trim() !== '') {
          payload.password = password;
        }

        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');

        // Actualizar datos de sesión local
        const user = getUser();
        user.name = name;
        user.default_version_id = parseInt(defaultVersion);
        if (uploadedImageUrl) {
          user.profile_image = uploadedImageUrl;
        }
        
        // Obtener la abreviación de la versión elegida
        const verSelect = document.getElementById('profile-version');
        const verText = verSelect.options[verSelect.selectedIndex].text.split(' - ')[0];
        user.default_version_abbreviation = verText;
        
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        
        // Actualizar UI
        activeVersionId = user.default_version_id;
        const verInd = document.getElementById('results-version-indicator');
        if (verInd) verInd.textContent = verText;

        document.getElementById('profile-modal').classList.remove('active');
        updateAuthUI();
        showToast('Perfil actualizado correctamente.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

// --- SECCIÓN: BÚSQUEDA Y SUGERENCIAS ---

// Disparador principal de búsquedas
function triggerSearch(query) {
  currentSearchQuery = query;
  currentPage = 1;
  
  // Rellenar los filtros actuales
  currentFilters.version_id = document.getElementById('filter-version').value;
  currentFilters.book_id = document.getElementById('filter-book').value;
  currentFilters.testament = document.getElementById('filter-testament').value;
  currentFilters.tag = document.getElementById('filter-tag').value;

  // Actualizar indicadores visuales
  const filterVerSelect = document.getElementById('filter-version');
  const verAbbr = filterVerSelect.options[filterVerSelect.selectedIndex].text.split(' - ')[0];
  document.getElementById('results-version-indicator').textContent = verAbbr;

  // Sincronizar inputs de texto
  document.getElementById('main-search-input').value = query;
  document.getElementById('results-search-input').value = query;

  // Cambiar vista a resultados
  document.getElementById('section-search-home').classList.add('hidden');
  document.getElementById('section-search-results').classList.remove('hidden');

  executeSearchQuery();
}

// Genera el HTML del menú de acciones para un versículo (icono de 3 barras)
function getVerseActionsHTML(v, citation) {
  const menuId = `verse-menu-${v.id}`;
  return `
    <div class="verse-actions-menu-wrapper">
      <button class="action-btn verse-menu-toggle" onclick="toggleVerseMenu(event, ${v.id})" title="Acciones">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div class="verse-actions-dropdown" id="${menuId}" style="display: none;">
        <button class="action-btn" onclick="toggleFavorite(this, ${v.id}); closeVerseMenu(${v.id})" title="Marcar Favorito">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          Favorito
        </button>
        <button class="action-btn" onclick="openTagModal(${v.id}); closeVerseMenu(${v.id})" title="Etiquetar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.39.39 1.02.39 1.41 0l7.59-7.59c.39-.39.39-1.02 0-1.41L12 2Z"/><path d="m7 7-.01.01"/></svg>
          Etiquetar
        </button>
        <button class="action-btn" onclick="openAddToListModal(${v.id}); closeVerseMenu(${v.id})" title="Guardar en Lista">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Guardar en Lista
        </button>
        <button class="action-btn" onclick="linkVerseToNote(${v.id}, '${escapeJS(citation)}'); closeVerseMenu(${v.id})" title="Escribir Reflexión">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Anotar
        </button>
        <button class="action-btn" onclick="compareVerseAll(${v.book_id}, ${v.chapter_number}, ${v.number}, '${escapeJS(citation)}'); closeVerseMenu(${v.id})" title="Comparar Versiones">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
          Comparar
        </button>
        <button class="action-btn" onclick="copyToClipboard('${escapeJS(v.text)}', '${escapeJS(citation)}'); closeVerseMenu(${v.id})" title="Copiar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          Copiar
        </button>
        <button class="action-btn" onclick="openShareModal('${escapeJS(v.text)}', '${escapeJS(citation)}'); closeVerseMenu(${v.id})" title="Compartir Pasaje">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          Compartir
        </button>
        <button class="action-btn" onclick="openGeneratorForVerse(${v.id}, '${escapeJS(v.text)}', '${escapeJS(citation)}'); closeVerseMenu(${v.id})" title="Crear Imagen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          Diseñar
        </button>
      </div>
    </div>
  `;
}

function toggleVerseMenu(event, verseId) {
  event.stopPropagation();
  const menu = document.getElementById(`verse-menu-${verseId}`);
  if (!menu) return;
  const isHidden = menu.style.display === 'none';
  // Cerrar todos los menús abiertos
  document.querySelectorAll('.verse-actions-dropdown').forEach(m => {
    m.style.display = 'none';
  });
  menu.style.display = isHidden ? 'flex' : 'none';
}

function closeVerseMenu(verseId) {
  const menu = document.getElementById(`verse-menu-${verseId}`);
  if (menu) menu.style.display = 'none';
}

// Renderiza la vista de capítulo completo cuando la búsqueda es una cita
function renderChapterView(verses, parsedCitation) {
  const container = document.getElementById('verses-results-container');
  container.innerHTML = '';

  if (!verses || verses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 40px;">
        <p>No se encontraron versículos para esta referencia.</p>
      </div>
    `;
    return;
  }

  const firstVerse = verses[0];
  const title = document.createElement('div');
  title.className = 'chapter-view-header';
  title.innerHTML = `
    <h2 style="font-family: var(--font-title); font-size: 1.6rem; font-weight: 700; margin-bottom: 4px;">${escapeHTML(firstVerse.book_name)} ${firstVerse.chapter_number}</h2>
    <p style="color: var(--text-secondary); font-size: 0.9rem;">${parsedCitation.verse ? 'Mostrando el capítulo completo. El versículo buscado está resaltado.' : 'Mostrando el capítulo completo.'}</p>
  `;
  container.appendChild(title);

  const matchedIds = parsedCitation.matched_verse_ids || [];

  verses.forEach(v => {
    const isMatched = matchedIds.includes(v.id);
    const verseEl = document.createElement('div');
    verseEl.className = `reader-verse chapter-verse ${isMatched ? 'reader-verse-highlight' : ''}`;
    verseEl.id = `chapter-v-${v.id}`;

    const citation = `${v.book_name} ${v.chapter_number}:${v.number}`;

    verseEl.innerHTML = `
      <div class="verse-line">
        <span class="reader-verse-num">${v.number}</span>
        <span class="verse-text">${escapeHTML(v.text)}</span>
        ${getVerseActionsHTML(v, citation)}
      </div>
    `;

    container.appendChild(verseEl);
  });

  // Scroll suave al primer versículo resaltado
  if (matchedIds.length > 0) {
    setTimeout(() => {
      const firstMatched = document.getElementById(`chapter-v-${matchedIds[0]}`);
      if (firstMatched) {
        firstMatched.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  }
}

// Renderizar vista de estudio temático (Fe, Amor, Esperanza, etc.)
function renderStudyView(study, verses) {
  const container = document.getElementById('verses-results-container');
  container.innerHTML = '';

  if (!verses || verses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); padding: 40px;">
        <p>El estudio no tiene versículos vinculados.</p>
      </div>
    `;
    return;
  }

  const studyHeader = document.createElement('div');
  studyHeader.className = 'chapter-view-header';
  studyHeader.innerHTML = `
    <h2 style="font-family: var(--font-title); font-size: 1.6rem; font-weight: 700; margin-bottom: 8px;">Estudio: ${escapeHTML(study.topic)}</h2>
    <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 12px;">${escapeHTML(study.summary || '')}</p>
    <div class="study-content" style="font-size: 0.95rem; line-height: 1.7; color: var(--text-primary); margin-bottom: 16px;">${escapeHTML(study.content).replace(/\n/g, '<br>')}</div>
    <p style="color: var(--accent); font-weight: 600; font-size: 0.9rem;">Versículos relacionados (${verses.length}):</p>
  `;
  container.appendChild(studyHeader);

  verses.forEach(v => {
    const verseEl = document.createElement('div');
    verseEl.className = 'reader-verse chapter-verse';
    const citation = `${v.book_name} ${v.chapter_number}:${v.number}`;
    verseEl.innerHTML = `
      <div class="verse-line">
        <span class="reader-verse-num">${v.number}</span>
        <span class="verse-text">${escapeHTML(v.text)}</span>
        ${getVerseActionsHTML(v, citation)}
      </div>
    `;
    container.appendChild(verseEl);
  });
}

// Sincroniza el lector lateral con un capítulo sin requerir evento de click
function syncReaderWithCitation(bookId, chapterNumber, verseId) {
  const selectBook = document.getElementById('reader-select-book');
  const selectVer = document.getElementById('reader-select-version');
  
  if (selectBook) selectBook.value = bookId;
  if (selectVer) selectVer.value = currentFilters.version_id || activeVersionId;
  
  loadReaderChapters(bookId, chapterNumber).then(() => {
    if (verseId) {
      setTimeout(() => {
        const verseEl = document.getElementById(`reader-v-${verseId}`);
        if (verseEl) {
          verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          verseEl.classList.add('reader-verse-highlight');
          setTimeout(() => {
            verseEl.classList.remove('reader-verse-highlight');
          }, 2500);
        }
      }, 400);
    }
  });
}

// Ejecutar búsqueda en la API con filtros y paginación
async function executeSearchQuery() {
  const container = document.getElementById('verses-results-container');
  const countEl = document.getElementById('results-count');
  if (!container) return;

  container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Buscando en las Escrituras...</p>';
  document.getElementById('pagination-container').style.display = 'none';

  try {
    const offset = (currentPage - 1) * itemsPerPage;
    let url = `/api/bible/search?limit=${itemsPerPage}&offset=${offset}`;

    if (currentSearchQuery.trim() !== '') {
      url += `&q=${encodeURIComponent(currentSearchQuery)}`;
    }
    // Filtrar por la versión seleccionada
    if (currentFilters.version_id) {
      url += `&version_id=${currentFilters.version_id}`;
    }
    if (currentFilters.book_id) url += `&book_id=${currentFilters.book_id}`;
    if (currentFilters.testament) url += `&testament=${currentFilters.testament}`;
    if (currentFilters.tag) url += `&tag=${encodeURIComponent(currentFilters.tag)}`;

    // Petición al endpoint
    const res = await fetchWithRetry(url, { headers: getAuthHeaders() });
    const data = await res.json();

    container.innerHTML = '';
    countEl.textContent = `${data.total} ${data.parsed_citation ? 'versículos' : 'resultados'}`;

    if (!data.results || data.results.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 40px;">
          <p>No se encontraron versículos que coincidan con la búsqueda.</p>
          <p style="font-size: 0.9rem; margin-top: 10px;">Prueba buscando otra palabra clave, o limpia los filtros avanzados.</p>
        </div>
      `;
      return;
    }

    // Si es una cita bíblica, mostrar el capítulo completo para lectura continua
    if (data.parsed_citation) {
      renderChapterView(data.results, data.parsed_citation);

      // Refrescar búsquedas recientes si corresponde
      if (isLoggedIn()) {
        loadRecentSearches();
      }
      return;
    }

    // Si es un estudio temático (Fe, Amor, Esperanza...), mostrar el estudio y sus versículos
    if (data.parsed_study) {
      countEl.textContent = `${data.total} versículos · Estudio: ${data.parsed_study.topic}`;
      renderStudyView(data.parsed_study, data.results);

      if (isLoggedIn()) {
        loadRecentSearches();
      }
      return;
    }

    // Dibujar resultados por palabra clave
    data.results.forEach(v => {
      const card = document.createElement('div');
      card.className = 'verse-card glass-panel';
      
      const citation = `${v.book_name} ${v.chapter_number}:${v.number}`;
      
      // Resaltado de palabras clave en el texto
      let textWithHighlights = escapeHTML(v.text);
      if (currentSearchQuery.trim() !== '') {
        const words = currentSearchQuery.trim().split(/\s+/).filter(w => w.length > 1);
        words.forEach(word => {
          // Escapar caracteres especiales en la palabra buscada
          const escWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`(${escWord})`, 'gi');
          textWithHighlights = textWithHighlights.replace(regex, '<span class="highlight">$1</span>');
        });
      }

      // Convertir lista de etiquetas en badges
      let tagsHTML = '';
      if (v.tags) {
        tagsHTML = '<div class="verse-tags-list">';
        v.tags.split(',').forEach(t => {
          tagsHTML += `<span class="verse-tag-item"># ${escapeHTML(t)}</span>`;
        });
        tagsHTML += '</div>';
      }

      card.innerHTML = `
        <div class="verse-card-header">
          <a href="#" class="verse-card-ref" onclick="openInReader(event, ${v.book_id}, ${v.chapter_number}, ${v.id})">${escapeHTML(citation)}</a>
          <div class="verse-card-header-right">
            <span class="verse-card-version">${v.version}</span>
            ${getVerseActionsHTML(v, citation)}
          </div>
        </div>
        <p class="verse-card-text">"${textWithHighlights}"</p>
        ${tagsHTML}
      `;
      container.appendChild(card);
    });

    // Paginación lógica
    const totalPages = Math.ceil(data.total / itemsPerPage);
    if (totalPages > 1) {
      document.getElementById('pagination-container').style.display = 'flex';
      document.getElementById('page-indicator').textContent = `Página ${currentPage} de ${totalPages}`;
      document.getElementById('prev-page-btn').disabled = currentPage === 1;
      document.getElementById('next-page-btn').disabled = currentPage === totalPages;
    }

    // Refrescar searches recientes si correspondiese
    if (isLoggedIn()) {
      loadRecentSearches();
    }
  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger); text-align: center;">Fallo en el servicio de búsqueda: ${error.message}</p>`;
  }
}

// Estado compartido para navegación de sugerencias
let activeSuggestionIndex = -1;
let currentSuggestions = [];
let currentSuggestionQuery = '';

// Manejar Autocompletado mientras se escribe
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text, query) {
  if (!query || !text) return escapeHTML(text || '');
  const words = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0)
    .sort((a, b) => b.length - a.length);
  if (words.length === 0) return escapeHTML(text);

  const normalizedText = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const mask = new Array(normalizedText.length).fill(false);
  words.forEach(word => {
    const re = new RegExp(escapeRegExp(word), 'gi');
    let m;
    while ((m = re.exec(normalizedText)) !== null) {
      for (let i = m.index; i < m.index + m[0].length; i++) {
        if (i < mask.length) mask[i] = true;
      }
      if (m[0].length === 0) break;
    }
  });

  const codePoints = Array.from(text);
  const origIndices = [];
  codePoints.forEach((ch, origIdx) => {
    const normCh = ch
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    for (let k = 0; k < normCh.length; k++) {
      origIndices.push(origIdx);
    }
  });

  let result = '';
  let inHighlight = false;
  for (let origIdx = 0; origIdx < codePoints.length; origIdx++) {
    const positions = [];
    for (let i = 0; i < origIndices.length; i++) {
      if (origIndices[i] === origIdx) positions.push(i);
    }
    const isMasked = positions.length > 0 && positions.some(p => mask[p]);
    if (isMasked && !inHighlight) {
      result += '<span class="suggestion-highlight">';
      inHighlight = true;
    } else if (!isMasked && inHighlight) {
      result += '</span>';
      inHighlight = false;
    }
    result += escapeHTML(codePoints[origIdx]);
  }
  if (inHighlight) result += '</span>';
  return result;
}

function handleAutocomplete(value, dropdownId) {
  const box = document.getElementById(dropdownId);
  if (!box) return;

  if (suggestionTimeout) clearTimeout(suggestionTimeout);
  activeSuggestionIndex = -1;
  currentSuggestions = [];
  currentSuggestionQuery = value ? value.trim() : '';

  if (!value || value.trim() === '') {
    box.style.display = 'none';
    return;
  }

  suggestionTimeout = setTimeout(async () => {
    try {
      const res = await fetchWithRetry(`/api/bible/suggestions?q=${encodeURIComponent(value.trim())}`);
      const suggestions = await res.json();
      currentSuggestions = suggestions;

      if (suggestions.length === 0) {
        box.style.display = 'none';
        return;
      }

      renderSuggestions(box, suggestions, dropdownId);
      box.style.display = 'block';
    } catch (error) {
      console.error(error);
    }
  }, 250);
}

function renderSuggestions(box, suggestions, dropdownId) {
  box.innerHTML = '';
  suggestions.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.dataset.index = index;
    
    let typeBadge = '';
    if (item.type === 'book') typeBadge = 'Libro';
    if (item.type === 'chapter') typeBadge = 'Capítulo';
    if (item.type === 'verse') typeBadge = 'Versículo';
    if (item.type === 'tag') typeBadge = 'Tema';

    div.innerHTML = `
      <svg class="suggestion-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>${highlightMatch(item.label, currentSuggestionQuery)}</span>
      <span class="suggestion-badge">${typeBadge}</span>
    `;

    div.addEventListener('click', () => {
      selectSuggestion(item, dropdownId);
    });

    div.addEventListener('mouseenter', () => {
      activeSuggestionIndex = index;
      highlightSuggestion(box);
    });

    box.appendChild(div);
  });
}

function selectSuggestion(item, dropdownId) {
  hideSuggestions();
  const query = item.label.replace('Tema: ', '');
  document.getElementById('main-search-input').value = query;
  document.getElementById('results-search-input').value = query;

  if (item.type === 'book') {
    // Abrir el libro directamente en el lector, capítulo 1
    document.getElementById('section-search-home').classList.add('hidden');
    document.getElementById('section-search-results').classList.remove('hidden');
    syncReaderWithCitation(item.data.book_id, 1);
  } else {
    // Capítulos, versículos, rangos y temas se resuelven como búsqueda
    triggerSearch(query);
  }
}

function highlightSuggestion(box) {
  const items = box.querySelectorAll('.suggestion-item');
  items.forEach((el, idx) => {
    if (idx === activeSuggestionIndex) {
      el.classList.add('suggestion-active');
    } else {
      el.classList.remove('suggestion-active');
    }
  });
}

function moveSuggestionHighlight(direction, dropdownId) {
  const box = document.getElementById(dropdownId);
  if (!box || box.style.display === 'none') return;

  const items = box.querySelectorAll('.suggestion-item');
  if (items.length === 0) return;

  activeSuggestionIndex += direction;
  if (activeSuggestionIndex < 0) activeSuggestionIndex = items.length - 1;
  if (activeSuggestionIndex >= items.length) activeSuggestionIndex = 0;

  highlightSuggestion(box);
  items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
}

function acceptActiveSuggestion(dropdownId) {
  const box = document.getElementById(dropdownId);
  if (!box || box.style.display === 'none') return false;

  if (activeSuggestionIndex >= 0 && currentSuggestions[activeSuggestionIndex]) {
    selectSuggestion(currentSuggestions[activeSuggestionIndex], dropdownId);
    return true;
  }
  return false;
}

function hideSuggestions() {
  const box1 = document.getElementById('suggestions-box');
  const box2 = document.getElementById('results-suggestions');
  if (box1) box1.style.display = 'none';
  if (box2) box2.style.display = 'none';
  activeSuggestionIndex = -1;
  currentSuggestions = [];
}

// Abrir capítulo desde cita en el lector lateral
function openInReader(event, bookId, chapterNumber, verseId) {
  event.preventDefault();
  syncReaderWithCitation(bookId, chapterNumber, verseId);
}

// --- SECCIÓN: ACCIONES DE VERSÍCULOS ---

// Copiar texto del versículo al portapapeles
function copyToClipboard(text, citation) {
  const fullText = `"${text}" - ${citation} (Biblia Online)`;
  navigator.clipboard.writeText(fullText).then(() => {
    showToast('Versículo copiado al portapapeles.', 'success');
  }).catch(err => {
    console.error('Error al copiar:', err);
  });
}

// Compartir versículo en WhatsApp
function shareOnWhatsApp(text, citation) {
  const message = encodeURIComponent(`"${text}" — ${citation} (Compartido desde Biblia Online)`);
  window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
}

// Agregar/quitar favorito
async function toggleFavorite(buttonEl, verseId) {
  if (!isLoggedIn()) {
    showToast('Por favor, inicia sesión para marcar versículos favoritos.', 'warning');
    if (window.showSection) window.showSection('section-auth');
    return;
  }

  try {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ verse_id: verseId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    
    // Si estamos en la pestaña favoritos del Dashboard, recargar
    if (document.getElementById('nav-dashboard').classList.contains('active')) {
      loadFavorites();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Cargar favoritos en la pestaña Dashboard
async function loadFavorites() {
  const container = document.getElementById('favorites-container');
  if (!container) return;

  container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Cargando favoritos...</p>';

  try {
    const res = await fetch('/api/favorites', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al cargar favoritos');
    const favorites = await res.json();

    container.innerHTML = '';

    if (favorites.length === 0) {
      container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Aún no tienes favoritos guardados.</p>`;
      return;
    }

    favorites.forEach(v => {
      const card = document.createElement('div');
      card.className = 'verse-card glass-panel';
      
      const citation = `${v.book_name} ${v.chapter_number}:${v.verse_number}`;

      card.innerHTML = `
        <div class="verse-card-header">
          <span class="verse-card-ref" style="font-weight:700;">${escapeHTML(citation)}</span>
          <span class="verse-card-version">${v.version}</span>
        </div>
        <p class="verse-card-text">"${escapeHTML(v.text)}"</p>
        <div class="verse-actions-toolbar">
          <button class="action-btn" onclick="linkVerseToNote(${v.verse_id}, '${escapeJS(citation)}')" title="Escribir Reflexión">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Anotar
          </button>
          <button class="action-btn" style="color: var(--danger);" onclick="removeFavoriteFromDashboard(${v.verse_id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Quitar Favorito
          </button>
          <button class="action-btn" onclick="copyToClipboard('${escapeJS(v.text)}', '${escapeJS(citation)}')">
            Copiar
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger); text-align: center;">${error.message}</p>`;
  }
}

async function removeFavoriteFromDashboard(verseId) {
  try {
    const res = await fetch(`/api/favorites/${verseId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error('Error al quitar de favoritos.');
    loadFavorites();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// --- SECCIÓN: COMPARAR VERSIONES MODAL ---

async function compareVerseAll(bookId, chapterNumber, verseNumber, citation) {
  const modal = document.getElementById('compare-modal');
  const title = document.getElementById('compare-modal-title');
  const content = document.getElementById('compare-modal-content');

  title.textContent = `Comparando ${citation}`;
  content.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Cargando traducciones...</p>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/bible/compare/${bookId}/${chapterNumber}/${verseNumber}`);
    if (!res.ok) throw new Error('No se encontraron comparativas');
    const translations = await res.json();

    content.innerHTML = '';
    translations.forEach(t => {
      const item = document.createElement('div');
      item.style.padding = '12px 14px';
      item.style.borderBottom = '1px solid var(--border-color)';
      item.innerHTML = `
        <div style="font-weight: 700; font-size: 0.82rem; color: var(--accent); margin-bottom: 4px; text-transform: uppercase;">
          ${escapeHTML(t.version_name)} (${t.version_abbreviation})
        </div>
        <p style="font-size: 1rem; line-height: 1.5;">"${escapeHTML(t.text)}"</p>
      `;
      content.appendChild(item);
    });
  } catch (error) {
    content.innerHTML = `<p style="color: var(--danger); text-align: center;">${error.message}</p>`;
  }
}

// --- SECCIÓN: ETIQUETAS DE VERSÍCULOS MODAL ---

async function openTagModal(verseId) {
  if (!isLoggedIn()) {
    showToast('Inicia sesión para etiquetar versículos.', 'warning');
    if (window.showSection) window.showSection('section-auth');
    return;
  }

  document.getElementById('tag-verse-id').value = verseId;
  document.getElementById('new-tag-input').value = '';
  const container = document.getElementById('current-verse-tags-list');
  container.innerHTML = '<span>Cargando etiquetas...</span>';
  
  document.getElementById('tag-verse-modal').classList.add('active');
  loadVerseTagsList(verseId);
}

async function loadVerseTagsList(verseId) {
  const container = document.getElementById('current-verse-tags-list');
  try {
    const res = await fetch(`/api/tags/verse/${verseId}`);
    const tags = await res.json();

    container.innerHTML = '';
    if (tags.length === 0) {
      container.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">Este versículo no tiene etiquetas asignadas.</span>';
      return;
    }

    tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'verse-tag-item';
      span.innerHTML = `
        # ${escapeHTML(t.name)}
        <span style="cursor: pointer; font-weight: bold; margin-left: 4px;" onclick="removeTagFromVerse(${verseId}, ${t.id})">&times;</span>
      `;
      container.appendChild(span);
    });
  } catch (error) {
    container.innerHTML = '<span style="color: var(--danger);">Error al cargar etiquetas.</span>';
  }
}

// Enviar asignación de etiqueta
document.getElementById('add-tag-submit-btn').addEventListener('click', async () => {
  const verseId = document.getElementById('tag-verse-id').value;
  const tagName = document.getElementById('new-tag-input').value;

  if (!tagName || tagName.trim() === '') return;

  try {
    const res = await fetch('/api/tags/verse', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ verse_id: parseInt(verseId), tag_name: tagName })
    });

    if (!res.ok) throw new Error('Error al asignar etiqueta.');
    
    document.getElementById('new-tag-input').value = '';
    loadVerseTagsList(verseId);
    
    // Recargar buscador si es necesario para refrescar etiquetas
    executeSearchQuery();
  } catch (error) {
    showToast(error.message, 'error');
  }
});

async function removeTagFromVerse(verseId, tagId) {
  try {
    const res = await fetch(`/api/tags/verse/${verseId}/${tagId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error('Error al eliminar etiqueta.');
    
    loadVerseTagsList(verseId);
    executeSearchQuery(); // Refrescar etiquetas en el buscador
  } catch (error) {
    showToast(error.message, 'error');
  }
}


// --- SECCIÓN: HISTORIAL DE BÚSQUEDA ---

async function loadRecentSearches() {
  const container = document.getElementById('recent-searches-list');
  if (!container) return;

  try {
    const res = await fetch('/api/bible/history', { headers: getAuthHeaders() });
    const history = await res.json();

    container.innerHTML = '';
    if (history.length === 0) {
      container.innerHTML = '<span style="font-size:0.85rem; color:var(--text-secondary);">No tienes búsquedas recientes.</span>';
      return;
    }

    history.forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.padding = '4px 10px';
      btn.style.fontSize = '0.78rem';
      btn.style.borderRadius = '20px';
      btn.textContent = h.query;
      btn.onclick = () => {
        document.getElementById('main-search-input').value = h.query;
        triggerSearch(h.query);
      };
      container.appendChild(btn);
    });

    // Agregar botón de limpiar historial
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-danger';
    clearBtn.style.padding = '4px 10px';
    clearBtn.style.fontSize = '0.75rem';
    clearBtn.style.borderRadius = '20px';
    clearBtn.innerHTML = 'Limpiar Historial';
    clearBtn.onclick = clearSearchHistory;
    container.appendChild(clearBtn);
  } catch (error) {
    console.error(error);
  }
}

async function clearSearchHistory() {
  if (!confirm('¿Deseas limpiar tu historial de búsquedas recientes?')) return;

  try {
    const res = await fetch('/api/bible/history', {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error();
    loadRecentSearches();
  } catch (error) {
    console.error('Error al borrar historial');
  }
}


// --- HELPERS GENERALES ---

function escapeJS(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Fetch con retry automático
async function fetchWithRetry(url, options = {}, retries = 2, delay = 800) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res;
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

// Detectar estado de conexión
function updateOnlineStatus() {
  const wasOffline = document.body.classList.contains('is-offline');
  if (navigator.onLine) {
    document.body.classList.remove('is-offline');
    if (wasOffline) {
      showToast('Conexión restaurada', 'success');
    }
  } else {
    document.body.classList.add('is-offline');
    showToast('Sin conexión. Algunas funciones pueden no estar disponibles.', 'warning');
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// --- SECCIÓN: CREADOR DE TARJETAS BÍBLICAS ---
let generatorActiveVerse = {
  text: "Todo lo puedo en Cristo que me fortalece.",
  citation: "Filipenses 4:13"
};

let activeBgCategory = 'montanas';
const bgCategories = {
  montanas: '🏔️ Montañas',
  cascadas: '🌊 Cascadas',
  bosques: '🌲 Bosques',
  lagos_mares: '🏖️ Lagos/Mares',
  amaneceres_atardeceres: '🌅 Amaneceres',
  valles_rios: '🏕️ Valles/Ríos',
  gradientes: '🎨 Gradientes'
};

const backgrounds = [
  // --- MONTAÑAS (10) ---
  { id: 'm1', name: 'Cumbre Nevada', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop&q=80' },
  { id: 'm2', name: 'Alpes Suizos', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=600&fit=crop&q=80' },
  { id: 'm3', name: 'Monte Everest', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=600&fit=crop&q=80' },
  { id: 'm4', name: 'Refugio de Cumbre', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?w=600&h=600&fit=crop&q=80' },
  { id: 'm5', name: 'Cordillera Púrpura', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=600&h=600&fit=crop&q=80' },
  { id: 'm6', name: 'Atardecer de Roca', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&h=600&fit=crop&q=80' },
  { id: 'm7', name: 'Paso de Montaña', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1491555103944-7c647fd85706?w=600&h=600&fit=crop&q=80' },
  { id: 'm8', name: 'Picos Azules', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1485601930021-b61753c86f6f?w=600&h=600&fit=crop&q=80' },
  { id: 'm9', name: 'Valle Alto', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1480497490787-505ec076689f?w=600&h=600&fit=crop&q=80' },
  { id: 'm10', name: 'Dolomitas', category: 'montanas', imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600&h=600&fit=crop&q=80' },

  // --- CASCADAS (10) ---
  { id: 'c1', name: 'Cascada Salvaje', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&h=600&fit=crop&q=80' },
  { id: 'c2', name: 'Salto del Ángel', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=600&h=600&fit=crop&q=80' },
  { id: 'c3', name: 'Cascada de Bosque', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=600&fit=crop&q=80' },
  { id: 'c4', name: 'Río de Roca', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=600&h=600&fit=crop&q=80' },
  { id: 'c5', name: 'Cascada de Selva', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&h=600&fit=crop&q=80' },
  { id: 'c6', name: 'Salto Escondido', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1455218873375-47ce697ae5b4?w=600&h=600&fit=crop&q=80' },
  { id: 'c7', name: 'Cascada Islandia', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=600&h=600&fit=crop&q=80' },
  { id: 'c8', name: 'Flujo Rocoso', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&h=600&fit=crop&q=80' },
  { id: 'c9', name: 'Cañón y Agua', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=600&fit=crop&q=80' },
  { id: 'c10', name: 'Cascada Nebulosa', category: 'cascadas', imageUrl: 'https://images.unsplash.com/photo-1472214222541-d510753a4907?w=600&h=600&fit=crop&q=80' },

  // --- BOSQUES (10) ---
  { id: 'b1', name: 'Niebla del Bosque', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=600&fit=crop&q=80' },
  { id: 'b2', name: 'Bosque Místico', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=600&fit=crop&q=80' },
  { id: 'b3', name: 'Senderos Dorados', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=600&h=600&fit=crop&q=80' },
  { id: 'b4', name: 'Rayos de Sol', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=600&h=600&fit=crop&q=80' },
  { id: 'b5', name: 'Pinos Gigantes', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&h=600&fit=crop&q=80' },
  { id: 'b6', name: 'Bosque de Bambú', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&q=80' },
  { id: 'b7', name: 'Otoño Pintoresco', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=600&fit=crop&q=80' },
  { id: 'b8', name: 'Arces Rojos', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&h=600&fit=crop&q=80' },
  { id: 'b9', name: 'Niebla Verde', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop&q=80' },
  { id: 'b10', name: 'Hojas de Luz', category: 'bosques', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa5f6ba5e3?w=600&h=600&fit=crop&q=80' },

  // --- LAGOS Y MARES (10) ---
  { id: 'l1', name: 'Lago Sereno', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=600&h=600&fit=crop&q=80' },
  { id: 'l2', name: 'Playa Tropical', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=600&fit=crop&q=80' },
  { id: 'l3', name: 'Lago Espejo', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=600&fit=crop&q=80' },
  { id: 'l4', name: 'Océano Abierto', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=600&fit=crop&q=80' },
  { id: 'l5', name: 'Atardecer Marino', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=600&h=600&fit=crop&q=80' },
  { id: 'l6', name: 'Acantilado del Mar', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&h=600&fit=crop&q=80' },
  { id: 'l7', name: 'Lago en las Nubes', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop&q=80' },
  { id: 'l8', name: 'Muelle al Amanecer', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1472214222541-d510753a4907?w=600&h=600&fit=crop&q=80' },
  { id: 'l9', name: 'Islas de Coral', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=600&fit=crop&q=80' },
  { id: 'l10', name: 'Marea Baja', category: 'lagos_mares', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=600&fit=crop&q=80' },

  // --- AMANECERES Y ATARDECERES (10) ---
  { id: 'a1', name: 'Cielo Naranja', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=600&h=600&fit=crop&q=80' },
  { id: 'a2', name: 'Amanecer de Oro', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=600&fit=crop&q=80' },
  { id: 'a3', name: 'Atardecer de Nubes', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=600&h=600&fit=crop&q=80' },
  { id: 'a4', name: 'Sol Poniente', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1472214222541-d510753a4907?w=600&h=600&fit=crop&q=80' },
  { id: 'a5', name: 'Amanecer en la Colina', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa5f6ba5e3?w=600&h=600&fit=crop&q=80' },
  { id: 'a6', name: 'Silueta de Pinos', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&h=600&fit=crop&q=80' },
  { id: 'a7', name: 'Atardecer Rosa', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=600&fit=crop&q=80' },
  { id: 'a8', name: 'Cielo Encendido', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=600&h=600&fit=crop&q=80' },
  { id: 'a9', name: 'Horizonte de Fuego', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=600&h=600&fit=crop&q=80' },
  { id: 'a10', name: 'Último Rayo', category: 'amaneceres_atardeceres', imageUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=600&h=600&fit=crop&q=80' },

  // --- VALLES Y RÍOS (10) ---
  { id: 'v1', name: 'Río Fluyente', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=600&fit=crop&q=80' },
  { id: 'v2', name: 'Valle Verde', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=600&fit=crop&q=80' },
  { id: 'v3', name: 'Río en Otoño', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=600&fit=crop&q=80' },
  { id: 'v4', name: 'Meandro de Cañón', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=600&h=600&fit=crop&q=80' },
  { id: 'v5', name: 'Valle Suizo', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop&q=80' },
  { id: 'v6', name: 'Pradera y Corriente', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1472214222541-d510753a4907?w=600&h=600&fit=crop&q=80' },
  { id: 'v7', name: 'Río Silencioso', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&h=600&fit=crop&q=80' },
  { id: 'v8', name: 'Campo de Trigo', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=600&fit=crop&q=80' },
  { id: 'v9', name: 'Río de Piedras', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1455218873375-47ce697ae5b4?w=600&h=600&fit=crop&q=80' },
  { id: 'v10', name: 'Flores y Valle', category: 'valles_rios', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa5f6ba5e3?w=600&h=600&fit=crop&q=80' },

  // --- GRADIENTES (existing, fallback) ---
  { id: 'sunset', name: 'Gradiente Atardecer', category: 'gradientes', colors: ['#3b0764', '#f97316'] },
  { id: 'ocean', name: 'Gradiente Océano', category: 'gradientes', colors: ['#0f172a', '#0284c7'] },
  { id: 'forest', name: 'Gradiente Bosque', category: 'gradientes', colors: ['#14532d', '#65a30d'] },
  { id: 'stars', name: 'Gradiente Estrellas', category: 'gradientes', colors: ['#090d16', '#1e1b4b'], drawStars: true }
];
let generatorSelectedBg = 'sunset';

// Pre-cargar imágenes para el creador de tarjetas
backgrounds.forEach(bg => {
  if (bg.imageUrl) {
    bg.imageEl = new Image();
    bg.imageEl.crossOrigin = 'anonymous'; // Evitar problemas de CORS en canvas
    bg.imageEl.src = bg.imageUrl;
    bg.imageEl.onload = () => {
      if (generatorSelectedBg === bg.id) {
        drawVerseCard();
      }
    };
  }
});

function initBackgroundSelector() {
  const grid = document.getElementById('background-selector-grid');
  const filtersContainer = document.getElementById('bg-category-filters');
  if (!grid) return;

  // 1. Renderizar pestañas de categorías si existe el contenedor y no tiene hijos
  if (filtersContainer && filtersContainer.children.length === 0) {
    filtersContainer.innerHTML = '';
    Object.keys(bgCategories).forEach(catKey => {
      const btn = document.createElement('button');
      btn.className = `bg-category-btn ${catKey === activeBgCategory ? 'active' : ''}`;
      btn.textContent = bgCategories[catKey];
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        activeBgCategory = catKey;
        document.querySelectorAll('.bg-category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initBackgroundSelector();
      });
      filtersContainer.appendChild(btn);
    });
  }

  // 2. Renderizar fondos correspondientes a la categoría activa
  grid.innerHTML = '';
  const filteredBgs = backgrounds.filter(bg => (bg.category || 'gradientes') === activeBgCategory);
  
  filteredBgs.forEach(bg => {
    const thumb = document.createElement('div');
    thumb.className = `bg-thumbnail ${bg.id === generatorSelectedBg ? 'selected' : ''}`;
    
    if (bg.imageUrl) {
      thumb.style.backgroundImage = `url(${bg.imageUrl})`;
      thumb.style.backgroundSize = 'cover';
      thumb.style.backgroundPosition = 'center';
    } else if (bg.colors) {
      const gradColors = bg.colors.join(', ');
      thumb.style.background = `linear-gradient(135deg, ${gradColors})`;
    }
    
    thumb.title = bg.name;
    
    thumb.addEventListener('click', () => {
      document.querySelectorAll('.bg-thumbnail').forEach(t => t.classList.remove('selected'));
      thumb.classList.add('selected');
      generatorSelectedBg = bg.id;
      drawVerseCard();
    });
    
    grid.appendChild(thumb);
  });
}

function drawVerseCard() {
  const canvas = document.getElementById('card-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // 1. Dibujar degradado de fondo o imagen
  const bg = backgrounds.find(b => b.id === generatorSelectedBg) || backgrounds[0];
  
  if (bg.imageUrl && bg.imageEl && bg.imageEl.complete) {
    ctx.drawImage(bg.imageEl, 0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (bg.colors) {
      bg.colors.forEach((col, idx) => {
        grad.addColorStop(idx / (bg.colors.length - 1), col);
      });
    } else {
      // Fallback si la imagen no se ha cargado aún
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Estrellas
  if (bg.drawStars) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 40; i++) {
      const x = Math.sin(i * 123.456) * 0.5 + 0.5;
      const y = Math.cos(i * 456.789) * 0.5 + 0.5;
      const r = (Math.sin(i) * 0.5 + 0.5) * 1.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x * width, y * height, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Filtro de oscuridad
  const opacitySelect = document.getElementById('card-overlay-opacity');
  const opacity = opacitySelect ? parseFloat(opacitySelect.value) : 0.45;
  if (opacity > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Dibujar texto del versículo
  const fontSizeSelect = document.getElementById('card-font-size');
  const fontSize = fontSizeSelect ? parseInt(fontSizeSelect.value) : 22;
  const alignSelect = document.getElementById('card-align');
  const align = alignSelect ? alignSelect.value : 'center';
  const colorSelect = document.getElementById('card-text-color');
  const textColor = colorSelect ? colorSelect.value : '#ffffff';

  ctx.fillStyle = textColor;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `italic 500 ${fontSize}px 'Playfair Display', Georgia, serif`;

  const text = `"${generatorActiveVerse.text}"`;
  const citation = generatorActiveVerse.citation.toUpperCase();

  // Envoltura de texto
  const maxWidth = width - 80;
  const words = text.split(' ');
  let lines = [];
  let currentLine = '';

  for (let n = 0; n < words.length; n++) {
    let testLine = currentLine + words[n] + ' ';
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(currentLine.trim());
      currentLine = words[n] + ' ';
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine.trim());

  // Centrado vertical
  const lineHeight = fontSize * 1.4;
  const totalTextHeight = lines.length * lineHeight;
  let startY = (height - totalTextHeight) / 2 - 20;

  let startX = width / 2;
  if (align === 'left') startX = 40;
  if (align === 'right') startX = width - 40;

  lines.forEach((line, idx) => {
    ctx.fillText(line, startX, startY + (idx * lineHeight));
  });

  // 4. Dibujar cita
  ctx.font = `bold ${fontSize - 4}px 'Inter', sans-serif`;
  if (textColor === '#1e293b') {
    ctx.fillStyle = '#4A3F8C';
  } else if (textColor === '#fef08a') {
    ctx.fillStyle = '#C9A96E';
  } else {
    ctx.fillStyle = '#6B5FB5';
  }
  
  const citationY = startY + totalTextHeight + 20;
  ctx.fillText(citation, startX, citationY);

  // 5. Marca de agua
  ctx.font = "500 12px 'Inter', sans-serif";
  ctx.fillStyle = textColor === '#1e293b' ? 'rgba(30, 27, 46, 0.4)' : 'rgba(255, 255, 255, 0.4)';
  ctx.textAlign = 'center';
  ctx.fillText("BIBLIA ONLINE", width / 2, height - 30);
}

// Inicializar buscador del creador de tarjetas
async function handleGeneratorSearch() {
  const query = document.getElementById('generator-search-input').value;
  const dropdown = document.getElementById('generator-suggestions');
  if (!dropdown) return;

  if (query.trim().length < 2) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`/api/bible/search?limit=5&q=${encodeURIComponent(query)}`);
    const data = await res.json();

    dropdown.innerHTML = '';
    if (data.results && data.results.length > 0) {
      data.results.forEach(v => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        const citation = `${v.book_name} ${v.chapter_number}:${v.number}`;
        
        item.innerHTML = `
          <span>📖</span>
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:600; font-size:0.85rem;">${escapeHTML(citation)}</span>
            <span style="font-size:0.75rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">"${escapeHTML(v.text)}"</span>
          </div>
        `;
        
        item.addEventListener('click', () => {
          generatorActiveVerse = {
            text: v.text,
            citation: citation
          };
          document.getElementById('generator-search-input').value = citation;
          dropdown.innerHTML = '';
          dropdown.style.display = 'none';
          drawVerseCard();
        });
        dropdown.appendChild(item);
      });
      dropdown.style.display = 'block';
    } else {
      dropdown.innerHTML = '<div style="padding: 10px; color: var(--text-secondary); text-align: center; font-size: 0.85rem;">No se encontraron versículos.</div>';
      dropdown.style.display = 'block';
    }
  } catch (error) {
    console.error(error);
  }
}

// Abrir desde cualquier versículo
function openGeneratorForVerse(verseId, text, citation) {
  generatorActiveVerse = { text, citation };
  
  const navDashboard = document.getElementById('nav-dashboard');
  if (navDashboard) {
    if (!isLoggedIn()) {
      showToast('Por favor, inicia sesión para usar el creador de tarjetas.', 'warning');
      showSection('section-auth');
      return;
    }
    navDashboard.click();
    
    const tabBtn = document.querySelector('[data-tab="tab-image-generator"]');
    if (tabBtn) {
      tabBtn.click();
    }
  }

  const genInput = document.getElementById('generator-search-input');
  if (genInput) genInput.value = citation;

  drawVerseCard();
}
window.openGeneratorForVerse = openGeneratorForVerse;

// Modal de Compartir en Redes Sociales
function openShareModal(text, citation) {
  const modal = document.getElementById('share-verse-modal');
  if (!modal) return;

  document.getElementById('share-modal-text').textContent = `"${text}"`;
  document.getElementById('share-modal-citation').textContent = citation;

  const message = `"${text}" — ${citation} (Compartido desde Biblia Online)`;
  const encodedMessage = encodeURIComponent(message);
  
  const shareUrl = `${window.location.origin}/?q=${encodeURIComponent(citation)}`;
  const encodedUrl = encodeURIComponent(shareUrl);

  document.getElementById('share-link-whatsapp').href = `https://api.whatsapp.com/send?text=${encodedMessage}`;
  document.getElementById('share-link-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  document.getElementById('share-link-telegram').href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`;
  document.getElementById('share-link-twitter').href = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;

  const copyBtn = document.getElementById('share-btn-copy');
  if (copyBtn) {
    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
    newCopyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Enlace de búsqueda copiado al portapapeles.', 'success');
      }).catch(err => {
        console.error(err);
      });
    });
  }

  modal.classList.add('active');
}
window.openShareModal = openShareModal;

// Configurar listeners del creador de tarjetas
document.addEventListener('DOMContentLoaded', () => {
  const cardFontSize = document.getElementById('card-font-size');
  const cardAlign = document.getElementById('card-align');
  const cardTextColor = document.getElementById('card-text-color');
  const cardOpacity = document.getElementById('card-overlay-opacity');
  const downloadCardBtn = document.getElementById('download-card-btn');
  const shareCardBtn = document.getElementById('share-card-btn');
  const genSearchInput = document.getElementById('generator-search-input');
  const genSearchBtn = document.getElementById('generator-search-btn');

  if (cardFontSize) cardFontSize.addEventListener('change', drawVerseCard);
  if (cardAlign) cardAlign.addEventListener('change', drawVerseCard);
  if (cardTextColor) cardTextColor.addEventListener('change', drawVerseCard);
  if (cardOpacity) cardOpacity.addEventListener('change', drawVerseCard);

  if (genSearchInput) {
    let genTimeout = null;
    genSearchInput.addEventListener('input', () => {
      clearTimeout(genTimeout);
      genTimeout = setTimeout(handleGeneratorSearch, 300);
    });
    
    // Ocultar sugerencias del creador al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#generator-search-input') && !e.target.closest('#generator-suggestions')) {
        const drop = document.getElementById('generator-suggestions');
        if (drop) drop.style.display = 'none';
      }
    });
  }

  if (genSearchBtn) {
    genSearchBtn.addEventListener('click', handleGeneratorSearch);
  }

  if (downloadCardBtn) {
    downloadCardBtn.addEventListener('click', () => {
      const canvas = document.getElementById('card-canvas');
      if (!canvas) return;
      
      const link = document.createElement('a');
      const filename = `tarjeta_biblica_${generatorActiveVerse.citation.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Tarjeta descargada correctamente.', 'success');
    });
  }

  if (shareCardBtn) {
    shareCardBtn.addEventListener('click', () => {
      const canvas = document.getElementById('card-canvas');
      if (!canvas) return;

      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], 'tarjeta_biblica.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: 'Pasaje Bíblico - Biblia Online',
            text: `"${generatorActiveVerse.text}" — ${generatorActiveVerse.citation}`
          }).then(() => {
            showToast('Tarjeta compartida con éxito.', 'success');
          }).catch(err => {
            console.log('Error al compartir:', err);
          });
        } else {
          openShareModal(generatorActiveVerse.text, generatorActiveVerse.citation);
        }
      }, 'image/png');
    });
  }

  // Hook para actualizar inicialización si clickean la pestaña
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId === 'tab-image-generator') {
        initBackgroundSelector();
        setTimeout(drawVerseCard, 100);
      }
    });
  });

  // Procesar parámetros de URL (Búsquedas dinámicas compartidas ?q=...)
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('q') || urlParams.get('search');
  if (queryParam) {
    const mainSearch = document.getElementById('main-search-input');
    if (mainSearch) {
      mainSearch.value = queryParam;
      setTimeout(() => triggerSearch(queryParam), 300);
    }
  }
});

// ===== BOTTOM NAVIGATION SYNC =====
function setupBottomNav() {
  const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
  const topNavItems = document.querySelectorAll('.nav-links .nav-item');
  
  // Mapear IDs de bottom nav a top nav
  const navMap = {
    'bottom-nav-search': 'nav-search',
    'bottom-nav-games': 'nav-games',
    'bottom-nav-login': 'nav-dashboard',
    'bottom-nav-profile': 'nav-dashboard'
  };
  
  bottomNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      if (item.id === 'bottom-nav-logout') {
        if (window.logout) {
          window.logout();
        } else if (typeof logout === 'function') {
          logout();
        }
        return;
      }
      
      const topId = navMap[item.id];
      if (topId) {
        const topItem = document.getElementById(topId);
        if (topItem) topItem.click();
      }
    });
  });
  
  // Observador para sincronizar estado activo
  const observer = new MutationObserver(() => {
    topNavItems.forEach(topItem => {
      const bottomId = Object.keys(navMap).find(k => navMap[k] === topItem.id);
      if (bottomId) {
        const bottomItem = document.getElementById(bottomId);
        if (bottomItem) {
          bottomItem.classList.toggle('active', topItem.classList.contains('active'));
        }
      }
      
      // Sincronizar también para el botón de perfil si corresponde
      const profileItem = document.getElementById('bottom-nav-profile');
      if (profileItem && topItem.id === 'nav-dashboard') {
        profileItem.classList.toggle('active', topItem.classList.contains('active'));
      }
      // Sincronizar también para el botón de login si corresponde
      const loginItem = document.getElementById('bottom-nav-login');
      if (loginItem && topItem.id === 'nav-dashboard') {
        loginItem.classList.toggle('active', topItem.classList.contains('active'));
      }
    });
  });
  
  topNavItems.forEach(item => {
    observer.observe(item, { attributes: true, attributeFilter: ['class'] });
  });
}

// ===== PWA INSTALL PROMPT =====
let deferredInstallPrompt = null;

function setupPwaInstall() {
  const banner = document.getElementById('pwa-install-banner');
  const btnInstall = document.getElementById('pwa-install-confirm');
  const btnDismiss = document.getElementById('pwa-install-dismiss');
  
  // No mostrar si ya está instalada
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    return;
  }
  
  // No mostrar si el usuario la descartó antes
  if (localStorage.getItem('pwa-banner-dismissed') === 'true') {
    return;
  }
  
  // Capturar el evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
  });
  
  // Para iOS: mostrar banner manualmente después de unos segundos
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isIos && isSafari && !window.navigator.standalone) {
    setTimeout(() => {
      if (banner) {
        banner.querySelector('.pwa-install-text strong').textContent = 'Añadir a pantalla de inicio';
        banner.querySelector('.pwa-install-text span').textContent = 'Toca Compartir y luego "Añadir a Inicio"';
        btnInstall.textContent = 'Entendido';
        showInstallBanner();
        btnInstall.addEventListener('click', () => {
          hideInstallBanner();
          localStorage.setItem('pwa-banner-dismissed', 'true');
        });
      }
    }, 3000);
  }
  
  function showInstallBanner() {
    if (banner) banner.classList.add('show');
  }
  
  function hideInstallBanner() {
    if (banner) banner.classList.remove('show');
  }
  
  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (isIos) return; // iOS manejado arriba
      
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Biblia Online se está instalando...', 'success');
        }
        deferredInstallPrompt = null;
        hideInstallBanner();
      } else {
        // Fallback: intentar abrir instrucciones
        showToast('Para instalar: toca el menú del navegador y selecciona "Añadir a pantalla de inicio"', 'info');
      }
    });
  }
  
  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      hideInstallBanner();
      localStorage.setItem('pwa-banner-dismissed', 'true');
    });
  }
  
  // Ocultar banner cuando se instala
  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    showToast('¡Biblia Online instalada!', 'success');
    deferredInstallPrompt = null;
  });
}


// ===== PESTAÑAS DEL PANEL LATERAL (Lector / Notas / Etiquetas / Listas / Historial) =====

function switchReaderTab(tab) {
  document.querySelectorAll('#reader-tabs .reader-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.reader-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `reader-tab-${tab}`);
  });

  if (tab === 'notas') loadSideNotes();
  else if (tab === 'etiquetas') loadSideTags();
  else if (tab === 'listas') loadSideLists();
  else if (tab === 'historial') loadSideHistory();
  else if (tab === 'historia') loadSideBookStudy();
  else if (tab === 'eventos') loadSideEvents();
}

async function loadSideNotes() {
  const container = document.getElementById('side-notes-list');
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = '<p class="side-panel-empty">Inicia sesión para ver tus notas.</p>';
    return;
  }

  container.innerHTML = '<p class="side-panel-empty">Cargando notas...</p>';
  try {
    const res = await fetch('/api/notes', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error();
    const notes = await res.json();

    if (notes.length === 0) {
      container.innerHTML = '<p class="side-panel-empty">No tienes notas guardadas.</p>';
      return;
    }

    container.innerHTML = '';
    notes.forEach(note => {
      const el = document.createElement('div');
      el.className = 'side-panel-item';
      const refs = note.verses && note.verses.length
        ? note.verses.map(v => `${v.book_name} ${v.chapter_number}:${v.verse_number}`).join(', ')
        : 'Sin versículos vinculados';
      el.innerHTML = `
        <div class="side-panel-item-title">${escapeHTML(note.title)}</div>
        <div class="side-panel-item-meta">${escapeHTML(refs)} · ${new Date(note.updated_at).toLocaleDateString()}</div>
      `;
      el.addEventListener('click', () => {
        if (window.showSection) window.showSection('section-user-dashboard');
      });
      container.appendChild(el);
    });
  } catch (error) {
    container.innerHTML = '<p class="side-panel-empty">Error al cargar notas.</p>';
  }
}

async function loadSideTags() {
  const container = document.getElementById('side-tags-list');
  if (!container) return;

  container.innerHTML = '<p class="side-panel-empty">Cargando etiquetas...</p>';
  try {
    const res = await fetch('/api/tags');
    const tags = await res.json();

    if (tags.length === 0) {
      container.innerHTML = '<p class="side-panel-empty">No hay etiquetas disponibles.</p>';
      return;
    }

    container.innerHTML = '';
    tags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'side-panel-tag';
      el.textContent = tag.name;
      el.addEventListener('click', () => {
        const query = `Tema: ${tag.name}`;
        document.getElementById('main-search-input').value = query;
        document.getElementById('results-search-input').value = query;
        triggerSearch(query);
      });
      container.appendChild(el);
    });
  } catch (error) {
    container.innerHTML = '<p class="side-panel-empty">Error al cargar etiquetas.</p>';
  }
}

async function loadSideLists() {
  const container = document.getElementById('side-lists-list');
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = '<p class="side-panel-empty">Inicia sesión para ver tus listas.</p>';
    return;
  }

  container.innerHTML = '<p class="side-panel-empty">Cargando listas...</p>';
  try {
    const res = await fetch('/api/lists', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error();
    const lists = await res.json();

    if (lists.length === 0) {
      container.innerHTML = '<p class="side-panel-empty">No tienes listas guardadas.</p>';
      return;
    }

    container.innerHTML = '';
    lists.forEach(list => {
      const el = document.createElement('div');
      el.className = 'side-panel-item';
      el.innerHTML = `
        <div class="side-panel-item-title">${escapeHTML(list.name)}</div>
        <div class="side-panel-item-meta">${list.verse_count || 0} versículos guardados</div>
      `;
      el.addEventListener('click', () => {
        if (window.showSection) window.showSection('section-user-dashboard');
      });
      container.appendChild(el);
    });
  } catch (error) {
    container.innerHTML = '<p class="side-panel-empty">Error al cargar listas.</p>';
  }
}

async function loadSideHistory() {
  const container = document.getElementById('side-history-list');
  if (!container) return;

  if (!isLoggedIn()) {
    container.innerHTML = '<p class="side-panel-empty">Inicia sesión para ver tu historial.</p>';
    return;
  }

  container.innerHTML = '<p class="side-panel-empty">Cargando historial...</p>';
  try {
    const res = await fetch('/api/bible/history', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error();
    const history = await res.json();

    if (history.length === 0) {
      container.innerHTML = '<p class="side-panel-empty">No tienes historial de búsqueda.</p>';
      return;
    }

    container.innerHTML = '';
    history.forEach(h => {
      const el = document.createElement('div');
      el.className = 'side-panel-item';
      el.innerHTML = `
        <div class="side-panel-item-title">${escapeHTML(h.query)}</div>
        <div class="side-panel-item-meta">${new Date(h.created_at).toLocaleString()}</div>
      `;
      el.addEventListener('click', () => {
        document.getElementById('main-search-input').value = h.query;
        document.getElementById('results-search-input').value = h.query;
        triggerSearch(h.query);
      });
      container.appendChild(el);
    });
  } catch (error) {
    container.innerHTML = '<p class="side-panel-empty">Error al cargar historial.</p>';
  }
}


async function loadSideBookStudy() {
  const container = document.getElementById('side-book-study');
  if (!container) return;

  const bookSelect = document.getElementById('reader-select-book');
  const bookId = bookSelect ? bookSelect.value : null;

  if (!bookId) {
    container.innerHTML = '<p class="side-panel-empty">Selecciona un libro para ver su historia y contexto.</p>';
    return;
  }

  container.innerHTML = '<p class="side-panel-empty">Cargando historia del libro...</p>';
  try {
    const res = await fetch(`/api/studies/book/${bookId}`);
    if (!res.ok) throw new Error();
    const bs = await res.json();

    container.innerHTML = `
      <h4 style="margin-bottom: 10px; color: var(--primary); font-family: var(--font-title); font-size: 1.1rem;">${escapeHTML(bs.book_name)}</h4>
      <div class="side-panel-item-meta" style="margin-bottom: 6px;"><strong>Autor:</strong> ${escapeHTML(bs.author || 'Desconocido')}</div>
      <div class="side-panel-item-meta" style="margin-bottom: 6px;"><strong>Fecha:</strong> ${escapeHTML(bs.date_written || 'Desconocida')}</div>
      <div class="side-panel-item-meta" style="margin-bottom: 6px;"><strong>Propósito:</strong> ${escapeHTML(bs.purpose || '')}</div>
      <div class="side-panel-item-meta" style="margin-bottom: 14px;"><strong>Temas:</strong> ${escapeHTML(bs.key_themes || '')}</div>
      <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary);">${escapeHTML(bs.content).replace(/\n/g, '<br>')}</div>
    `;
  } catch (error) {
    container.innerHTML = '<p class="side-panel-empty">Error al cargar la historia del libro.</p>';
  }
}

async function loadSideEvents() {
  const container = document.getElementById('side-events-list');
  if (!container) return;

  container.innerHTML = '<p class="side-panel-empty">Cargando eventos históricos...</p>';
  try {
    const res = await fetch('/api/studies/events');
    const events = await res.json();

    if (events.length === 0) {
      container.innerHTML = '<p class="side-panel-empty">No hay eventos registrados.</p>';
      return;
    }

    container.innerHTML = '';
    events.forEach(ev => {
      const el = document.createElement('div');
      el.className = 'side-panel-item';
      const ref = ev.chapter_start
        ? `${ev.book_name} ${ev.chapter_start}${ev.verse_start ? ':' + ev.verse_start : ''}`
        : ev.book_name;
      el.innerHTML = `
        <div class="side-panel-item-title">${escapeHTML(ev.title)}</div>
        <div class="side-panel-item-meta">${escapeHTML(ref)}</div>
      `;
      el.addEventListener('click', () => {
        document.getElementById('main-search-input').value = ref;
        document.getElementById('results-search-input').value = ref;
        triggerSearch(ref);
      });
      container.appendChild(el);
    });
  } catch (error) {
    container.innerHTML = '<p class="side-panel-empty">Error al cargar eventos.</p>';
  }
}
