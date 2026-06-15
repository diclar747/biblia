// public/js/admin.js

let selectedImportFile = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Verificar sesión de administrador
  const user = getUser();
  if (!isLoggedIn() || !user || user.role !== 'admin') {
    showToast('Acceso no autorizado. Se requieren credenciales de administrador.', 'error');
    window.location.href = '/';
    return;
  }

  // Cargar perfil en cabecera
  const adminNameDisplay = document.getElementById('admin-user-name');
  if (adminNameDisplay) adminNameDisplay.textContent = `Administrador: ${user.name}`;

  // Cargar usuarios
  loadUsers();

  // Configurar formularios y subida de archivos
  setupAdminEventListeners();
});

// Cargar usuarios en la tabla
async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('No se pudieron recuperar los usuarios.');
    const users = await res.json();

    tbody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      const regDate = new Date(u.created_at).toLocaleDateString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });

      const roleBadge = u.role === 'admin' ? 
        '<span class="badge badge-admin">Admin</span>' : 
        '<span class="badge badge-user">Lector</span>';

      tr.innerHTML = `
        <td>${u.id}</td>
        <td style="font-weight: 600;">${escapeHTML(u.name)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td>${roleBadge}</td>
        <td>${regDate}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">${error.message}</td></tr>`;
  }
}

// Configurar los manejadores de eventos administrativos
function setupAdminEventListeners() {
  // Agregar nueva versión
  const addVersionForm = document.getElementById('add-version-form');
  const versionStatus = document.getElementById('version-status');
  
  if (addVersionForm) {
    addVersionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('version-name').value;
      const abbreviation = document.getElementById('version-abbr').value;

      try {
        const res = await fetch('/api/admin/versions', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, abbreviation })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar la versión');

        if (versionStatus) {
          versionStatus.textContent = 'Versión registrada con éxito.';
          versionStatus.style.color = 'var(--success)';
        }
        addVersionForm.reset();
      } catch (err) {
        if (versionStatus) {
          versionStatus.textContent = err.message;
          versionStatus.style.color = 'var(--danger)';
        }
      }
    });
  }

  // Lógica Drag and Drop para importador
  const dropArea = document.getElementById('file-drop-area');
  const fileInput = document.getElementById('file-input');
  const importBtn = document.getElementById('import-btn');
  const dropText = document.querySelector('.file-drop-text');

  if (dropArea && fileInput) {
    dropArea.addEventListener('click', () => fileInput.click());

    // Eventos de arrastre
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
      }, false);
    });

    // Evento al soltar el archivo
    dropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        handleSelectedFile(files[0]);
      }
    });

    // Evento al seleccionar archivo manualmente
    fileInput.addEventListener('change', (e) => {
      if (fileInput.files.length > 0) {
        handleSelectedFile(fileInput.files[0]);
      }
    });
  }

  function handleSelectedFile(file) {
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      showToast('Solo se admiten archivos .json y .csv', 'error');
      return;
    }

    selectedImportFile = file;
    if (dropText) dropText.textContent = `Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (importBtn) importBtn.removeAttribute('disabled');
  }

  // Click en Procesar e Importar
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      if (!selectedImportFile) return;

      const statusBox = document.getElementById('import-status');
      statusBox.style.display = 'block';
      statusBox.className = 'import-status-box'; // Limpiar clases anteriores
      statusBox.textContent = 'Procesando archivo e importando registros en la base de datos... Por favor, espere.';
      importBtn.setAttribute('disabled', 'true');

      const formData = new FormData();
      formData.append('file', selectedImportFile);

      try {
        const headers = getAuthHeaders();
        // Quitar Content-Type para permitir al navegador definir el límite multipart
        delete headers['Content-Type'];

        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers,
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error del servidor al importar.');

        statusBox.classList.add('import-status-success');
        statusBox.innerHTML = `
          <strong>¡Importación exitosa!</strong><br>
          Versículos importados/actualizados: ${data.imported}<br>
          Registros omitidos/no resueltos: ${data.skipped}
        `;
      } catch (err) {
        statusBox.classList.add('import-status-error');
        statusBox.textContent = `Error: ${err.message}`;
      } finally {
        importBtn.removeAttribute('disabled');
        // Limpiar archivo seleccionado
        selectedImportFile = null;
        if (fileInput) fileInput.value = '';
        if (dropText) dropText.textContent = 'Arrastra tu archivo aquí o haz clic para seleccionar';
      }
    });
  }
}
