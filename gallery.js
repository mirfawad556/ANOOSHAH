/* =========================================================
   SECRET VAULT GALLERY — INDEXEDDB & INTERACTIVE ENGINE
   Stores high-resolution photos with date, time & category
   ========================================================= */

const DB_NAME = 'AnooshahVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'memories';

let db = null;
let currentFilter = 'all';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
    initGalleryUI();
    await renderGallery();
  } catch (err) {
    console.error('Gallery initialization error:', err);
  }
});

/* =========================================================
   1. INDEXEDDB SETUP (High capacity local storage)
   ========================================================= */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('datetime', 'datetime', { unique: false });
      }
    };

    request.onsuccess = async (e) => {
      db = e.target.result;
      await seedInitialMemoryIfEmpty();
      resolve(db);
    };

    request.onerror = (e) => {
      console.error('IndexedDB error:', e.target.error);
      reject(e.target.error);
    };
  });
}

function getStore(mode = 'readonly') {
  const tx = db.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
}

function getAllMemoriesFromDB() {
  return new Promise((resolve, reject) => {
    const store = getStore('readonly');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function addMemoryToDB(memory) {
  return new Promise((resolve, reject) => {
    const store = getStore('readwrite');
    const request = store.add(memory);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteMemoryFromDB(id) {
  return new Promise((resolve, reject) => {
    const store = getStore('readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Seed the first starter memory with her photo
async function seedInitialMemoryIfEmpty() {
  const existing = await getAllMemoriesFromDB();
  if (existing.length === 0) {
    await addMemoryToDB({
      image: 'assets/avatar.png',
      category: 'her',
      datetime: '2007-08-17T00:00',
      caption: 'The day the universe became brighter — Happy Birthday Anooshah! 💖',
      createdAt: Date.now()
    });
  }
}

/* =========================================================
   2. GALLERY UI & EVENTS
   ========================================================= */
function initGalleryUI() {
  // Category Tiles Click (HER / US)
  const tileHer = document.getElementById('tile-her');
  const tileUs = document.getElementById('tile-us');

  tileHer?.addEventListener('click', () => {
    setActiveFilter('her');
  });

  tileUs?.addEventListener('click', () => {
    setActiveFilter('us');
  });

  // Filter Pills (All / Her / Us)
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const filter = pill.getAttribute('data-filter');
      setActiveFilter(filter);
    });
  });

  // Direct Add Buttons on Tiles
  document.getElementById('btn-add-her')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setActiveFilter('her');
    openUploadModal('her');
  });

  document.getElementById('btn-add-us')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setActiveFilter('us');
    openUploadModal('us');
  });

  // Modal Controls
  const uploadModal = document.getElementById('upload-modal');
  const openModalBtn = document.getElementById('btn-open-upload-modal');
  const closeModalBtn = document.getElementById('close-upload-modal');

  openModalBtn?.addEventListener('click', () => {
    const targetCat = currentFilter === 'all' ? 'her' : currentFilter;
    openUploadModal(targetCat);
  });

  closeModalBtn?.addEventListener('click', () => {
    uploadModal?.classList.remove('active');
  });

  uploadModal?.addEventListener('click', (e) => {
    if (e.target === uploadModal) uploadModal.classList.remove('active');
  });

  // Multi-file and Whole Folder Selection
  let selectedFiles = [];
  let uploadMode = 'files'; // 'files' or 'folder'

  const btnModeFiles = document.getElementById('btn-mode-files');
  const btnModeFolder = document.getElementById('btn-mode-folder');
  const fileInput = document.getElementById('file-input');
  const folderInput = document.getElementById('folder-input');
  const dropZone = document.getElementById('drop-zone');
  const filenameDisplay = document.getElementById('drop-filename');
  const dropHint = document.getElementById('drop-hint');
  const dropIcon = document.getElementById('drop-icon');
  const selectedSummary = document.getElementById('selected-summary');
  const summaryText = document.getElementById('summary-text');
  const progressBox = document.getElementById('upload-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressStatus = document.getElementById('progress-status');
  const saveBtn = document.getElementById('btn-save-photo');

  // Mode Switch
  btnModeFiles?.addEventListener('click', () => {
    uploadMode = 'files';
    btnModeFiles.classList.add('active');
    btnModeFolder.classList.remove('active');
    if (dropIcon) dropIcon.textContent = '🖼️';
    if (dropHint) dropHint.textContent = 'Select multiple photos with Ctrl+A or Shift+Click!';
    fileInput.value = '';
    folderInput.value = '';
    selectedFiles = [];
    updateSummary();
  });

  btnModeFolder?.addEventListener('click', () => {
    uploadMode = 'folder';
    btnModeFolder.classList.add('active');
    btnModeFiles.classList.remove('active');
    if (dropIcon) dropIcon.textContent = '📁';
    if (dropHint) dropHint.textContent = 'Pick any folder — all pictures inside will be uploaded in 1 click!';
    fileInput.value = '';
    folderInput.value = '';
    selectedFiles = [];
    updateSummary();
  });

  // Click on drop zone triggers active input
  dropZone?.addEventListener('click', (e) => {
    if (e.target.tagName.toLowerCase() === 'input') return;
    if (uploadMode === 'folder') {
      folderInput?.click();
    } else {
      fileInput?.click();
    }
  });

  function processFiles(filesList) {
    const validImages = Array.from(filesList).filter((f) => {
      return (
        f.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic)$/i.test(f.name)
      );
    });

    selectedFiles = validImages;
    updateSummary();
  }

  function updateSummary() {
    if (selectedFiles.length > 0) {
      if (filenameDisplay) {
        filenameDisplay.textContent = `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} ready to import!`;
        filenameDisplay.style.color = '#ff9ed4';
      }
      if (selectedSummary && summaryText) {
        selectedSummary.style.display = 'flex';
        summaryText.textContent = `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} loaded from ${uploadMode === 'folder' ? 'folder' : 'selection'}`;
      }
    } else {
      if (filenameDisplay) {
        filenameDisplay.textContent = 'Click or Drag & Drop photos or folder here';
        filenameDisplay.style.color = '#fff';
      }
      if (selectedSummary) selectedSummary.style.display = 'none';
    }
  }

  fileInput?.addEventListener('change', () => {
    if (fileInput.files) processFiles(fileInput.files);
  });

  folderInput?.addEventListener('change', () => {
    if (folderInput.files) processFiles(folderInput.files);
  });

  // Drag and Drop
  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  });

  // Upload Form Submit
  const uploadForm = document.getElementById('upload-form');
  uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      alert('Please select at least one photo or folder first!');
      return;
    }

    const category = document.querySelector('input[name="photo-category"]:checked')?.value || 'her';
    const defaultDatetime = document.getElementById('photo-datetime')?.value || new Date().toISOString().slice(0, 16);
    const userCaption = document.getElementById('photo-caption')?.value.trim();

    // Show Progress
    if (progressBox) progressBox.style.display = 'flex';
    if (saveBtn) saveBtn.disabled = true;

    const total = selectedFiles.length;
    let completed = 0;

    for (let i = 0; i < total; i++) {
      const file = selectedFiles[i];

      // Auto-extract date/time from file if available, or fall back to input date
      let fileDate = defaultDatetime;
      if (file.lastModified) {
        try {
          const modDate = new Date(file.lastModified);
          if (!isNaN(modDate.getTime())) {
            fileDate = new Date(modDate.getTime() - modDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          }
        } catch (err) {}
      }

      // Generate caption
      let finalCaption = userCaption;
      if (!finalCaption) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        finalCaption = cleanName.length > 2 ? cleanName : 'Cherished memory 💕';
      } else if (total > 1) {
        finalCaption = `${userCaption} (${i + 1}/${total})`;
      }

      // Convert to Base64 & save
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            await addMemoryToDB({
              image: event.target.result,
              category: category,
              datetime: fileDate,
              caption: finalCaption,
              createdAt: Date.now() + i
            });
          } catch (err) {
            console.error('Error saving image:', file.name, err);
          }
          completed++;
          const percent = Math.round((completed / total) * 100);
          if (progressFill) progressFill.style.width = `${percent}%`;
          if (progressStatus) progressStatus.textContent = `Importing ${completed} of ${total} photos... (${percent}%)`;
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    // Finished
    setTimeout(async () => {
      if (progressBox) progressBox.style.display = 'none';
      if (progressFill) progressFill.style.width = '0%';
      if (saveBtn) saveBtn.disabled = false;

      uploadModal?.classList.remove('active');
      uploadForm.reset();
      selectedFiles = [];
      updateSummary();

      // Play sound and celebrate!
      if (typeof playChimeSound === 'function') playChimeSound();
      if (typeof triggerHeartBurst === 'function') triggerHeartBurst();
      showToast(`🎉 Successfully added ${total} photo${total > 1 ? 's' : ''} to ${category.toUpperCase()}! 💖`);

      await renderGallery();
    }, 400);
  });

  // Lightbox Close
  const lightboxModal = document.getElementById('lightbox-modal');
  const closeLightboxBtn = document.getElementById('close-lightbox');

  closeLightboxBtn?.addEventListener('click', () => {
    lightboxModal?.classList.remove('active');
  });

  lightboxModal?.addEventListener('click', (e) => {
    if (e.target === lightboxModal) lightboxModal.classList.remove('active');
  });
}

function openUploadModal(category = 'her') {
  const uploadModal = document.getElementById('upload-modal');
  if (!uploadModal) return;

  // Pre-select category radio
  const targetRadio = document.querySelector(`input[name="photo-category"][value="${category}"]`);
  if (targetRadio) targetRadio.checked = true;

  // Set default datetime to now
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const dtInput = document.getElementById('photo-datetime');
  if (dtInput) dtInput.value = localIso;

  uploadModal.classList.add('active');
  setTimeout(() => document.getElementById('photo-caption')?.focus(), 200);
}

function setActiveFilter(filter) {
  currentFilter = filter;

  // Update pills
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.getAttribute('data-filter') === filter);
  });

  // Update category tiles
  document.getElementById('tile-her')?.classList.toggle('active', filter === 'her');
  document.getElementById('tile-us')?.classList.toggle('active', filter === 'us');

  renderGallery();
}

/* =========================================================
   3. RENDER GALLERY & COUNTERS
   ========================================================= */
async function renderGallery() {
  const grid = document.getElementById('photos-grid');
  const emptyState = document.getElementById('empty-state');
  if (!grid) return;

  const allMemories = await getAllMemoriesFromDB();

  // Sort descending by date/time
  allMemories.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  // Update Tile Counts
  const countHer = allMemories.filter((m) => m.category === 'her').length;
  const countUs = allMemories.filter((m) => m.category === 'us').length;

  const countHerEl = document.getElementById('count-her');
  const countUsEl = document.getElementById('count-us');
  if (countHerEl) countHerEl.textContent = `${countHer} ${countHer === 1 ? 'Moment' : 'Moments'}`;
  if (countUsEl) countUsEl.textContent = `${countUs} ${countUs === 1 ? 'Moment' : 'Moments'}`;

  // Filter Memories
  const filtered = allMemories.filter((m) => {
    if (currentFilter === 'all') return true;
    return m.category === currentFilter;
  });

  grid.innerHTML = '';
  if (emptyState) emptyState.style.display = 'none';

  // 1. Always create the "+ Add New Photo" card for the current view
  const addCard = document.createElement('div');
  addCard.className = 'memory-card add-card-placeholder';
  const targetCategory = currentFilter === 'all' ? 'her' : currentFilter;
  const targetLabel = currentFilter === 'us' ? 'US (Together)' : 'HER (Solo)';

  addCard.innerHTML = `
    <div class="add-card-inner">
      <div class="add-card-icon">+</div>
      <h4>Add Photo to ${currentFilter === 'all' ? 'Vault' : currentFilter.toUpperCase()}</h4>
      <p>Upload a memory to ${targetLabel} ✨</p>
    </div>
  `;
  addCard.addEventListener('click', () => {
    openUploadModal(targetCategory);
  });
  grid.appendChild(addCard);

  // 2. Render all filtered memory cards
  filtered.forEach((memory) => {
    const card = document.createElement('article');
    card.className = 'memory-card';

    // Format Date & Time nicely
    const dt = new Date(memory.datetime);
    const dateFormatted = isNaN(dt.getTime())
      ? memory.datetime
      : dt.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

    const isHer = memory.category === 'her';
    const badgeText = isHer ? '👑 HER' : '💑 US';

    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${memory.image}" alt="${memory.caption}" loading="lazy" />
        <span class="card-tag-badge">${badgeText}</span>
        <button class="card-delete-btn" title="Delete Memory">&times;</button>
      </div>
      <div class="card-body">
        <div class="card-datetime">
          <span>📅</span>
          <span>${dateFormatted}</span>
        </div>
        <p class="card-caption">${escapeHtml(memory.caption)}</p>
      </div>
    `;

    // Click image to open lightbox
    card.querySelector('img').addEventListener('click', () => {
      openLightbox(memory, dateFormatted);
    });

    // Delete memory
    card.querySelector('.card-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to remove this memory from the vault?')) {
        await deleteMemoryFromDB(memory.id);
        showToast('Memory removed from vault');
        await renderGallery();
      }
    });

    grid.appendChild(card);
  });
}

function openLightbox(memory, formattedTime) {
  const lightbox = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  const time = document.getElementById('lightbox-time');
  const badge = document.getElementById('lightbox-badge');

  if (lightbox && img && caption && time && badge) {
    img.src = memory.image;
    caption.textContent = memory.caption;
    time.textContent = `📅 ${formattedTime}`;
    badge.textContent = memory.category === 'her' ? '👑 HER' : '💑 US';
    lightbox.classList.add('active');
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
