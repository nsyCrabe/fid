// ===== Mes Cartes de Fidélité - App logic v2 =====
const STORAGE_KEY = 'loyalty_cards_v1';
const THEME_KEY = 'loyalty_theme_v1';

const COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#5b8def', '#9b59b6', '#34495e', '#16a085',
  '#c0392b', '#7f8c8d'
];

const THEMES = [
  { id: 'midnight', label: 'Minuit', swatch: 'linear-gradient(135deg,#1a1a2e,#5b8def)' },
  { id: 'sunset',   label: 'Coucher de soleil', swatch: 'linear-gradient(135deg,#4a1942,#ff6b6b)' },
  { id: 'forest',   label: 'Forêt', swatch: 'linear-gradient(135deg,#163023,#3ddc84)' },
  { id: 'ocean',    label: 'Océan', swatch: 'linear-gradient(135deg,#0a2e45,#00c2d1)' },
  { id: 'candy',    label: 'Bonbon', swatch: 'linear-gradient(135deg,#f8dbe9,#ff5da2)' },
  { id: 'mono',     label: 'Mono', swatch: 'linear-gradient(135deg,#161616,#ffffff)' }
];

let cards = [];
let editingId = null;
let currentDetailId = null;
let selectedColor = COLORS[5];
let selectedImage = null;
let stream = null;
let detectorInterval = null;

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cards = raw ? JSON.parse(raw) : [];
  } catch (e) { cards = []; }
}
function saveCards() { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); }

function loadTheme() {
  const t = localStorage.getItem(THEME_KEY) || 'midnight';
  document.body.setAttribute('data-theme', t);
  const meta = document.getElementById('themeColorMeta');
  const colors = { midnight:'#1a1a2e', sunset:'#4a1942', forest:'#163023', ocean:'#0a2e45', candy:'#fdeef5', mono:'#0a0a0a' };
  meta.setAttribute('content', colors[t] || '#1a1a2e');
}
function setTheme(id) {
  localStorage.setItem(THEME_KEY, id);
  loadTheme();
  renderThemeGrid();
}

function uid() { return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 1800);
}

function initials(name) { return name.trim().slice(0, 2).toUpperCase(); }

function renderGrid() {
  const grid = document.getElementById('cardsGrid');
  const empty = document.getElementById('emptyState');
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = cards.filter(c => c.name.toLowerCase().includes(query));

  document.getElementById('cardCount').textContent =
    cards.length + (cards.length === 1 ? ' carte enregistrée' : ' cartes enregistrées');

  grid.innerHTML = '';
  if (filtered.length === 0) {
    empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  grid.style.display = 'grid';

  filtered.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.animationDelay = (i * 0.03) + 's';

    if (c.image) {
      div.innerHTML = `
        <div class="card-image-bg" style="background-image:url('${c.image}')"></div>
        <div class="card-content">
          <div></div>
          <div>
            <div class="name">${escapeHtml(c.name)}</div>
            <div class="type">${labelForType(c.codeType)}</div>
          </div>
        </div>
      `;
    } else {
      div.style.background = `linear-gradient(135deg, ${c.color}, ${shade(c.color, -25)})`;
      div.innerHTML = `
        <div class="card-content">
          <div>
            <div class="name">${escapeHtml(c.name)}</div>
            <div class="type">${labelForType(c.codeType)}</div>
          </div>
          <div class="logo-letter">${initials(c.name)}</div>
        </div>
      `;
    }
    div.addEventListener('click', () => openDetail(c.id));
    grid.appendChild(div);
  });
}

function labelForType(t) {
  if (t === 'barcode') return 'Code-barres';
  if (t === 'qrcode') return 'QR Code';
  return 'Numéro';
}

function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Modal ajout/édition ----------
function openModal(editId = null) {
  editingId = editId;
  const modal = document.getElementById('modalOverlay');
  document.getElementById('inputName').value = '';
  document.getElementById('inputCode').value = '';
  document.getElementById('inputCodeType').value = 'barcode';
  selectedColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  selectedImage = null;
  resetImagePreview();

  if (editId) {
    const c = cards.find(x => x.id === editId);
    document.getElementById('modalTitle').textContent = 'Modifier la carte';
    document.getElementById('inputName').value = c.name;
    document.getElementById('inputCode').value = c.code;
    document.getElementById('inputCodeType').value = c.codeType;
    selectedColor = c.color;
    if (c.image) {
      selectedImage = c.image;
      setImagePreview(c.image);
    }
  } else {
    document.getElementById('modalTitle').textContent = 'Nouvelle carte';
  }
  renderColorRow();
  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  editingId = null;
}

function resetImagePreview() {
  const preview = document.getElementById('imagePreview');
  preview.style.backgroundImage = '';
  preview.innerHTML = '<span id="imagePlaceholder">📷 Ajouter une image</span>';
  document.getElementById('removeImageBtn').style.display = 'none';
}

function setImagePreview(dataUrl) {
  const preview = document.getElementById('imagePreview');
  preview.style.backgroundImage = `url('${dataUrl}')`;
  preview.innerHTML = '';
  document.getElementById('removeImageBtn').style.display = 'inline-block';
}

function renderColorRow() {
  const row = document.getElementById('colorRow');
  row.innerHTML = '';
  COLORS.forEach(color => {
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (color === selectedColor ? ' selected' : '');
    dot.style.background = color;
    dot.addEventListener('click', () => { selectedColor = color; renderColorRow(); });
    row.appendChild(dot);
  });
}

function resizeImage(file, maxSize, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height *= maxSize / width; width = maxSize;
      } else if (height > maxSize) {
        width *= maxSize / height; height = maxSize;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ---------- Détail carte ----------
function openDetail(id) {
  currentDetailId = id;
  const c = cards.find(x => x.id === id);
  document.getElementById('detailName').textContent = c.name;
  document.getElementById('detailType').textContent = labelForType(c.codeType);
  document.getElementById('detailCodeText').textContent = c.code || '';

  const banner = document.getElementById('detailBanner');
  if (c.image) {
    banner.style.backgroundImage = `url('${c.image}')`;
    banner.style.backgroundColor = 'transparent';
  } else {
    banner.style.backgroundImage = '';
    banner.style.backgroundColor = c.color;
  }

  const canvas = document.getElementById('barcodeCanvas');
  const qrHolder = document.getElementById('qrHolder');
  canvas.style.display = 'none';
  qrHolder.innerHTML = '';

  if (c.codeType === 'barcode' && c.code) {
    try {
      canvas.style.display = 'block';
      JsBarcode(canvas, c.code, {
        format: 'CODE128', lineColor: '#000', width: 2, height: 90,
        displayValue: false, margin: 5
      });
    } catch (e) { canvas.style.display = 'none'; }
  } else if (c.codeType === 'qrcode' && c.code) {
    if (window.QRCode) new QRCode(qrHolder, { text: c.code, width: 200, height: 200 });
  }

  document.getElementById('detailOverlay').classList.add('active');
}

function closeDetail() {
  document.getElementById('detailOverlay').classList.remove('active');
  currentDetailId = null;
}

// ---------- Thèmes ----------
function renderThemeGrid() {
  const grid = document.getElementById('themeGrid');
  const current = localStorage.getItem(THEME_KEY) || 'midnight';
  grid.innerHTML = '';
  THEMES.forEach(t => {
    const opt = document.createElement('div');
    opt.className = 'theme-option' + (t.id === current ? ' active' : '');
    opt.innerHTML = `<div class="theme-swatch" style="background:${t.swatch}"></div>${t.label}`;
    opt.addEventListener('click', () => setTheme(t.id));
    grid.appendChild(opt);
  });
}

// ---------- Scanner caméra ----------
async function openScanner() {
  const overlay = document.getElementById('scanOverlay');
  overlay.classList.add('active');
  const video = document.getElementById('scanVideo');
  const hint = document.getElementById('scanHint');

  if (!('BarcodeDetector' in window)) {
    hint.textContent = "Ton navigateur ne supporte pas le scan auto. Utilise Chrome sur Android, ou saisis le code manuellement.";
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    const detector = new BarcodeDetector({
      formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39']
    });
    detectorInterval = setInterval(async () => {
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          const format = barcodes[0].format;
          document.getElementById('inputCode').value = value;
          document.getElementById('inputCodeType').value = format === 'qr_code' ? 'qrcode' : 'barcode';
          closeScanner();
          showToast('Code détecté ✅');
        }
      } catch (e) {}
    }, 400);
  } catch (e) {
    hint.textContent = "Impossible d'accéder à la caméra. Vérifie les autorisations dans les réglages de ton téléphone.";
  }
}

function closeScanner() {
  document.getElementById('scanOverlay').classList.remove('active');
  if (detectorInterval) { clearInterval(detectorInterval); detectorInterval = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

function saveCard() {
  const name = document.getElementById('inputName').value.trim();
  const code = document.getElementById('inputCode').value.trim();
  const codeType = document.getElementById('inputCodeType').value;

  if (!name) { showToast('Donne un nom à ta carte 🙂'); return; }

  if (editingId) {
    const c = cards.find(x => x.id === editingId);
    c.name = name; c.code = code; c.codeType = codeType;
    c.color = selectedColor; c.image = selectedImage;
  } else {
    cards.push({ id: uid(), name, code, codeType, color: selectedColor, image: selectedImage, createdAt: Date.now() });
  }
  saveCards();
  renderGrid();
  closeModal();
  showToast('Carte enregistrée ✅');
}

// ---------- Events ----------
document.getElementById('fab').addEventListener('click', () => openModal());
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('saveBtn').addEventListener('click', saveCard);
document.getElementById('scanBtn').addEventListener('click', openScanner);
document.getElementById('scanClose').addEventListener('click', closeScanner);
document.getElementById('detailClose').addEventListener('click', closeDetail);
document.getElementById('searchInput').addEventListener('input', renderGrid);

document.getElementById('imagePicker').addEventListener('click', () => {
  document.getElementById('imageInput').click();
});
document.getElementById('imageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  resizeImage(file, 600, (dataUrl) => {
    selectedImage = dataUrl;
    setImagePreview(dataUrl);
  });
});
document.getElementById('removeImageBtn').addEventListener('click', () => {
  selectedImage = null;
  resetImagePreview();
});

document.getElementById('themeBtn').addEventListener('click', () => {
  renderThemeGrid();
  document.getElementById('themeOverlay').classList.add('active');
});
document.getElementById('closeThemeBtn').addEventListener('click', () => {
  document.getElementById('themeOverlay').classList.remove('active');
});

document.getElementById('detailEdit').addEventListener('click', () => {
  const id = currentDetailId;
  closeDetail();
  openModal(id);
});
document.getElementById('detailDelete').addEventListener('click', () => {
  if (confirm('Supprimer cette carte ?')) {
    cards = cards.filter(c => c.id !== currentDetailId);
    saveCards();
    renderGrid();
    closeDetail();
    showToast('Carte supprimée 🗑️');
  }
});

// Init
loadTheme();
loadCards();
renderGrid();
