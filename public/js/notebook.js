// public/js/notebook.js

// Variables globales del cuaderno espiritual
let currentLinkedVerses = []; // Versículos vinculados actualmente a la nota en edición

// --- SECCIÓN: NOTAS / CUADERNO ---

// Cargar todas las notas de la base de datos
async function loadNotes(query = '') {
  const container = document.getElementById('notes-list-container');
  if (!container) return;

  try {
    const url = query ? `/api/notes?q=${encodeURIComponent(query)}` : '/api/notes';
    const res = await fetch(url, { headers: getAuthHeaders() });
    
    if (!res.ok) throw new Error('Error al cargar notas');
    
    const notes = await res.json();
    container.innerHTML = '';

    if (notes.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">
          <p>No se encontraron notas espirituales.</p>
        </div>
      `;
      return;
    }

    notes.forEach(note => {
      const card = document.createElement('div');
      card.className = 'glass-panel note-card';
      
      const formattedDate = new Date(note.updated_at).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      // Crear string de citas vinculadas
      let citationStr = '';
      if (note.verses && note.verses.length > 0) {
        citationStr = 'Vinculado: ' + note.verses.map(v => `${v.book_name} ${v.chapter_number}:${v.verse_number}`).join(', ');
      }

      card.innerHTML = `
        <h3 class="note-title">${escapeHTML(note.title)}</h3>
        <div class="note-date">${formattedDate}</div>
        ${citationStr ? `<div class="note-linked-verses" title="${escapeHTML(citationStr)}">${escapeHTML(citationStr)}</div>` : ''}
        <div class="note-excerpt">${escapeHTML(note.content)}</div>
        <div class="note-card-actions">
          <button class="action-btn" onclick="editNote(${note.id})" title="Editar Nota">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Editar
          </button>
          <button class="action-btn" style="color: var(--danger);" onclick="deleteNote(${note.id})" title="Eliminar Nota">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Borrar
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
  }
}

// Iniciar creación de nueva nota
function initNewNote() {
  document.getElementById('note-modal-title').textContent = 'Escribir Nota Espiritual';
  document.getElementById('note-id-field').value = '';
  document.getElementById('note-title-field').value = '';
  document.getElementById('note-content-field').value = '';
  currentLinkedVerses = [];
  renderLinkedVersesInModal();
  document.getElementById('note-modal').classList.add('active');
}

// Vincular versículo y abrir modal de notas
function linkVerseToNote(verseId, citation) {
  if (!isLoggedIn()) {
    showToast('Por favor, inicia sesión para usar el cuaderno espiritual.', 'warning');
    if (window.showSection) window.showSection('section-auth');
    return;
  }

  // Evitar duplicados
  if (!currentLinkedVerses.some(v => v.id === verseId)) {
    currentLinkedVerses.push({ id: verseId, citation });
  }
  
  // Rellenar formulario e invocar
  document.getElementById('note-modal-title').textContent = 'Escribir Nota Espiritual';
  document.getElementById('note-id-field').value = '';
  document.getElementById('note-title-field').value = `Reflexión sobre ${citation}`;
  
  renderLinkedVersesInModal();
  document.getElementById('note-modal').classList.add('active');
}

// Renderizar versículos vinculados en el modal de nota
function renderLinkedVersesInModal() {
  const container = document.getElementById('note-linked-verses-list');
  if (!container) return;

  container.innerHTML = '';
  currentLinkedVerses.forEach(v => {
    const span = document.createElement('span');
    span.className = 'verse-tag-item';
    span.innerHTML = `
      ${escapeHTML(v.citation)}
      <span style="cursor:pointer; font-weight:bold; margin-left: 4px;" onclick="removeLinkedVerse(${v.id})">&times;</span>
    `;
    container.appendChild(span);
  });
}

function removeLinkedVerse(verseId) {
  currentLinkedVerses = currentLinkedVerses.filter(v => v.id !== verseId);
  renderLinkedVersesInModal();
}

// Guardar nota (Crear o Editar)
async function saveNote(e) {
  e.preventDefault();
  const id = document.getElementById('note-id-field').value;
  const title = document.getElementById('note-title-field').value;
  const content = document.getElementById('note-content-field').value;
  const verse_ids = currentLinkedVerses.map(v => v.id);

  const payload = { title, content, verse_ids };
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/notes/${id}` : '/api/notes';

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar nota');

    document.getElementById('note-modal').classList.remove('active');
    loadNotes();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Cargar nota en modal para editar
async function editNote(noteId) {
  try {
    const res = await fetch(`/api/notes`, { headers: getAuthHeaders() });
    const notes = await res.json();
    const note = notes.find(n => n.id === noteId);

    if (!note) return;

    document.getElementById('note-modal-title').textContent = 'Editar Nota Espiritual';
    document.getElementById('note-id-field').value = note.id;
    document.getElementById('note-title-field').value = note.title;
    document.getElementById('note-content-field').value = note.content;

    currentLinkedVerses = (note.verses || []).map(v => ({
      id: v.id,
      citation: `${v.book_name} ${v.chapter_number}:${v.verse_number}`
    }));

    renderLinkedVersesInModal();
    document.getElementById('note-modal').classList.add('active');
  } catch (error) {
    console.error('Error al editar nota:', error);
  }
}

// Eliminar nota
async function deleteNote(noteId) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta reflexión?')) return;

  try {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('No se pudo eliminar la nota');
    loadNotes();
  } catch (error) {
    showToast(error.message, 'error');
  }
}


// --- SECCIÓN: LISTAS PERSONALIZADAS ---

// Cargar listas del usuario
async function loadLists() {
  const container = document.getElementById('lists-container');
  if (!container) return;

  try {
    const res = await fetch('/api/lists', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al cargar listas');

    const lists = await res.json();
    container.innerHTML = '';

    if (lists.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">
          <p>No has creado listas de versículos personalizados.</p>
        </div>
      `;
      return;
    }

    lists.forEach(list => {
      const card = document.createElement('div');
      card.className = 'glass-panel list-card';
      card.innerHTML = `
        <div onclick="viewListDetails(${list.id})">
          <h3 class="list-card-title">${escapeHTML(list.name)}</h3>
          <p class="list-card-desc">${escapeHTML(list.description || 'Sin descripción')}</p>
          <span class="list-card-count">${list.verse_count} versículos</span>
        </div>
        <div class="note-card-actions" style="margin-top: 15px;">
          <button class="action-btn" onclick="deleteList(event, ${list.id})" style="color: var(--danger);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Eliminar
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
  }
}

// Iniciar creación de nueva lista
function initNewList() {
  document.getElementById('list-modal-title').textContent = 'Crear Lista Personalizada';
  document.getElementById('list-id-field').value = '';
  document.getElementById('list-name-field').value = '';
  document.getElementById('list-desc-field').value = '';
  document.getElementById('list-modal').classList.add('active');
}

// Guardar lista
async function saveList(e) {
  e.preventDefault();
  const id = document.getElementById('list-id-field').value;
  const name = document.getElementById('list-name-field').value;
  const description = document.getElementById('list-desc-field').value;

  const payload = { name, description };
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/lists/${id}` : '/api/lists';

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Error al guardar la lista');

    document.getElementById('list-modal').classList.remove('active');
    loadLists();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Eliminar lista
async function deleteList(event, listId) {
  event.stopPropagation(); // Evitar abrir detalles al presionar borrar
  if (!confirm('¿Estás seguro de que deseas eliminar esta lista de versículos?')) return;

  try {
    const res = await fetch(`/api/lists/${listId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('No se pudo eliminar la lista');
    loadLists();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Abrir modal de listado de checkbox para guardar versículo
async function openAddToListModal(verseId) {
  if (!isLoggedIn()) {
    showToast('Inicia sesión para guardar versículos en tus listas.', 'warning');
    if (window.showSection) {
      window.showSection('section-auth');
    } else {
      window.location.href = '/login';
    }
    return;
  }

  document.getElementById('add-to-list-verse-id').value = verseId;
  const container = document.getElementById('user-lists-checkboxes');
  container.innerHTML = '<p style="text-align: center;">Cargando tus listas...</p>';
  document.getElementById('add-to-list-modal').classList.add('active');

  try {
    // Obtener listas del usuario
    const resLists = await fetch('/api/lists', { headers: getAuthHeaders() });
    const lists = await resLists.json();

    // Obtener detalles de todas las listas del usuario para saber cuáles ya tienen este versículo
    // (Por simplicidad, consultamos cada lista o validamos al marcar)
    container.innerHTML = '';
    
    if (lists.length === 0) {
      container.innerHTML = `
        <p style="color: var(--text-secondary); text-align: center;">No tienes listas creadas.</p>
        <button class="btn btn-primary" onclick="closeModalAndGoToLists()" style="margin: 10px auto; display: block; font-size: 0.85rem;">Crear Lista</button>
      `;
      return;
    }

    for (let list of lists) {
      // Consultar versículos de la lista para ver si ya está guardado
      const resDetail = await fetch(`/api/lists/${list.id}`, { headers: getAuthHeaders() });
      const detail = await resDetail.json();
      const hasVerse = (detail.verses || []).some(v => v.verse_id === verseId);

      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.gap = '10px';
      div.innerHTML = `
        <input type="checkbox" id="chk-list-${list.id}" value="${list.id}" ${hasVerse ? 'checked' : ''} onchange="toggleVerseInList(${list.id}, ${verseId}, this)">
        <label for="chk-list-${list.id}" style="cursor: pointer; font-weight: 500;">
          ${escapeHTML(list.name)} <span style="font-size:0.75rem; color:var(--text-secondary);">(${list.verse_count} vers.)</span>
        </label>
      `;
      container.appendChild(div);
    }
  } catch (error) {
    container.innerHTML = '<p style="color: var(--danger);">Error al cargar las listas.</p>';
  }
}

function closeModalAndGoToLists() {
  document.getElementById('add-to-list-modal').classList.remove('active');
  // Ir a la pestaña Mi Espacio -> Mis Listas
  document.getElementById('nav-dashboard').click();
  const tabBtn = document.querySelector('[data-tab="tab-lists"]');
  if (tabBtn) tabBtn.click();
}

// Alternar versículo en lista mediante checkbox
async function toggleVerseInList(listId, verseId, checkbox) {
  const isChecked = checkbox.checked;
  const url = `/api/lists/${listId}/verses` + (isChecked ? '' : `/${verseId}`);
  const method = isChecked ? 'POST' : 'DELETE';
  const payload = isChecked ? JSON.stringify({ verse_id: verseId }) : null;

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: payload
    });

    if (!res.ok) throw new Error('Error al modificar versículo en lista.');
  } catch (error) {
    showToast(error.message, 'error');
    checkbox.checked = !isChecked; // Revertir check en caso de fallo
  }
}

// Ver detalles de lista y sus versículos
let activeViewListId = null;

async function viewListDetails(listId) {
  activeViewListId = listId;
  const modal = document.getElementById('view-list-modal');
  const title = document.getElementById('view-list-title');
  const desc = document.getElementById('view-list-desc');
  const container = document.getElementById('view-list-verses-container');

  container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Cargando versículos...</p>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/lists/${listId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('No se pudieron obtener los detalles de la lista.');
    const list = await res.json();

    title.textContent = list.name;
    desc.textContent = list.description || 'Sin descripción';
    container.innerHTML = '';

    if (!list.verses || list.verses.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Esta lista no contiene versículos todavía.</p>';
      return;
    }

    list.verses.forEach(v => {
      const card = document.createElement('div');
      card.className = 'verse-card glass-panel';
      card.style.padding = '16px';
      card.style.marginBottom = '10px';
      
      const citation = `${v.book_name} ${v.chapter_number}:${v.verse_number}`;

      card.innerHTML = `
        <div class="verse-card-header">
          <span class="verse-card-ref" style="font-weight: 700;">${escapeHTML(citation)}</span>
          <span class="verse-card-version">${v.version}</span>
        </div>
        <p class="verse-card-text" style="font-size: 0.95rem; margin-bottom: 8px;">"${escapeHTML(v.text)}"</p>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="action-btn" onclick="removeVerseFromListDetail(${listId}, ${v.verse_id})" style="color: var(--danger); font-size: 0.8rem;">
            Quitar de Lista
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p style="color: var(--danger); text-align: center;">${error.message}</p>`;
  }
}

// Remover versículo dentro del visor de detalles de la lista
async function removeVerseFromListDetail(listId, verseId) {
  try {
    const res = await fetch(`/api/lists/${listId}/verses/${verseId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error('Error al remover el versículo.');
    
    // Recargar detalles y actualizar contador general
    viewListDetails(listId);
    loadLists();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Exportar lista personalizada a PDF usando jsPDF
async function exportListToPDF(listId) {
  if (!listId) listId = activeViewListId;
  if (!listId) return;

  try {
    const res = await fetch(`/api/lists/${listId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al recuperar lista para PDF');
    const list = await res.json();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Estilos generales del PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241); // Color Indigo
    doc.text(list.name, 20, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    
    const descText = list.description || 'Lista de versículos guardados en Biblia Online.';
    // Dividir descripción en líneas automáticas
    const descLines = doc.splitTextToSize(descText, 170);
    doc.text(descLines, 20, 34);

    const dividerY = 34 + (descLines.length * 6);
    doc.setDrawColor(232, 228, 222);
    doc.line(20, dividerY, 190, dividerY);

    let y = dividerY + 12;

    if (!list.verses || list.verses.length === 0) {
      doc.text("Esta lista no contiene versículos guardados.", 20, y);
      doc.save(`${list.name.replace(/\s+/g, '_')}.pdf`);
      return;
    }

    doc.setFontSize(10);
    list.verses.forEach((v, index) => {
      // Validar si necesitamos saltar de página
      if (y > 270) {
        doc.addPage();
        y = 25;
      }

      const citation = `${v.book_name} ${v.chapter_number}:${v.verse_number} (${v.version})`;
      
      // Referencia
      doc.setFont("helvetica", "bold");
      doc.setTextColor(74, 63, 140);
      doc.text(`${index + 1}. ${citation}`, 20, y);
      y += 6;

      // Texto del versículo
      doc.setFont("helvetica", "oblique");
      doc.setTextColor(30, 27, 46);
      const verseLines = doc.splitTextToSize(`"${v.text}"`, 165);
      
      // Comprobar desborde con texto
      if (y + (verseLines.length * 5) > 280) {
        doc.addPage();
        y = 25;
      }

      doc.text(verseLines, 23, y);
      y += (verseLines.length * 5) + 8;
    });

    // Guardar archivo
    doc.save(`${list.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  } catch (error) {
    showToast('Error al generar el PDF: ' + error.message, 'error');
  }
}

// Helpers
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Registrar eventos iniciales al cargar DOM
document.addEventListener('DOMContentLoaded', () => {
  const noteForm = document.getElementById('note-form');
  const listForm = document.getElementById('list-form');
  const searchNotes = document.getElementById('search-notes-input');
  
  if (noteForm) noteForm.addEventListener('submit', saveNote);
  if (listForm) listForm.addEventListener('submit', saveList);
  
  const newNoteBtn = document.getElementById('new-note-btn');
  if (newNoteBtn) newNoteBtn.addEventListener('click', initNewNote);

  const newListBtn = document.getElementById('new-list-btn');
  if (newListBtn) newListBtn.addEventListener('click', initNewList);

  const downloadPdfBtn = document.getElementById('download-list-pdf');
  if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', () => exportListToPDF());

  if (searchNotes) {
    searchNotes.addEventListener('input', (e) => {
      loadNotes(e.target.value);
    });
  }
});
