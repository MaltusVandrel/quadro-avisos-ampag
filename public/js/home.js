const DEFAULT_CRITICALITY_KEY = 'quadro-avisos-default-criticality';
const ANONYMOUS_PROFILE_KEY = 'quadro-avisos-anonymous-profile';
const SESSION_KEY = 'quadro-avisos-session';
const API_BASE_URL = '';
const defaultCenter = { lat: -27.640099739226315, lng: -48.68046242802495 };
let map;
let selectedPosition = null;
let tempMarker = null;
let incidents = [];
let markerCluster;
let advancedMarkers = [];
let AdvancedMarkerElementCtor = null;
let selectionModeActive = false;
let previousSelection = null;

function getDefaultCriticality() {
  try {
    return localStorage.getItem(DEFAULT_CRITICALITY_KEY) || 'Relato';
  } catch (error) {
    return 'Relato';
  }
}

function saveDefaultCriticality(criticality) {
  localStorage.setItem(DEFAULT_CRITICALITY_KEY, criticality);
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function isLoggedIn() {
  const session = getSession();
  return !!(session && session.token && session.citizen);
}

async function api(path, options = {}) {
  const session = getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Erro na requisição' }));
    throw new Error(body.message || `Erro ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

function formatCpf(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function parseCpf(value) {
  return value.replace(/\D/g, '');
}

function openModalById(id) {
  document.querySelectorAll('.modal').forEach((modal) => modal.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function closeModalById(id) {
  document.getElementById(id).classList.add('hidden');
}

function collectAnonymousMetadata() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  const screenInfo = typeof window.screen !== 'undefined' ? window.screen : null;
  const plugins = [];

  if (navigator.plugins && navigator.plugins.length) {
    for (let index = 0; index < navigator.plugins.length; index += 1) {
      plugins.push(navigator.plugins[index].name || '');
    }
  }

  const mimeTypes = [];
  if (navigator.mimeTypes && navigator.mimeTypes.length) {
    for (let index = 0; index < navigator.mimeTypes.length; index += 1) {
      mimeTypes.push(navigator.mimeTypes[index].type || '');
    }
  }

  return {
    app: 'quadro-avisos',
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    appName: navigator.appName || '',
    appCodeName: navigator.appCodeName || '',
    appVersion: navigator.appVersion || '',
    product: navigator.product || '',
    productSub: navigator.productSub || '',
    vendor: navigator.vendor || '',
    language: navigator.language || '',
    languages: navigator.languages || [],
    cookieEnabled: navigator.cookieEnabled || false,
    doNotTrack: navigator.doNotTrack || '',
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory || null,
    maxTouchPoints: navigator.maxTouchPoints || null,
    oscpu: navigator.oscpu || '',
    webdriver: navigator.webdriver || false,
    userAgentData: navigator.userAgentData ? {
      brands: navigator.userAgentData.brands || [],
      mobile: navigator.userAgentData.mobile || false,
      platform: navigator.userAgentData.platform || '',
    } : null,
    screen: screenInfo ? {
      width: screenInfo.width || null,
      height: screenInfo.height || null,
      availWidth: screenInfo.availWidth || null,
      availHeight: screenInfo.availHeight || null,
      colorDepth: screenInfo.colorDepth || null,
      pixelDepth: screenInfo.pixelDepth || null,
      orientationType: screenInfo.orientation ? screenInfo.orientation.type : null,
      orientationAngle: screenInfo.orientation ? screenInfo.orientation.angle : null,
    } : null,
    window: {
      innerWidth: window.innerWidth || null,
      innerHeight: window.innerHeight || null,
      outerWidth: window.outerWidth || null,
      outerHeight: window.outerHeight || null,
      devicePixelRatio: window.devicePixelRatio || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    },
    document: {
      referrer: document.referrer || '',
      documentElementWidth: document.documentElement ? document.documentElement.clientWidth : null,
      documentElementHeight: document.documentElement ? document.documentElement.clientHeight : null,
    },
    connection: connection ? {
      effectiveType: connection.effectiveType || '',
      downlink: connection.downlink || null,
      rtt: connection.rtt || null,
      saveData: connection.saveData || false,
      type: connection.type || '',
    } : null,
    plugins,
    mimeTypes,
  };
}

function createAnonymousId(metadata) {
  const raw = JSON.stringify(metadata);
  let hash = 0;

  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
  }

  return `anon-${hash.toString(16).padStart(8, '0')}`;
}

function getAnonymousProfile() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(ANONYMOUS_PROFILE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    return null;
  }

  const metadata = collectAnonymousMetadata();
  const profile = {
    id: createAnonymousId(metadata),
    metadata,
    version: 1,
  };

  try {
    localStorage.setItem(ANONYMOUS_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    // Ignore storage errors.
  }

  return profile;
}

function initializeAnonymousProfile() {
  return getAnonymousProfile();
}

function getMarkerColor(criticality) {
  switch (criticality) {
    case 'Perigo':
      return '#ef4444';
    case 'Risco':
      return '#fb923c';
    case 'Transtorno':
      return '#facc15';
    case 'Relato':
      return '#a88a5a';
    default:
      return '#6b7280';
  }
}

function getCriticalityHelp(criticality) {
  switch (criticality) {
    case 'Perigo':
      return 'Situação com risco imediato de dano físico, material ou segurança.';
    case 'Risco':
      return 'Evento que pode evoluir para um problema maior se não for tratado.';
    case 'Transtorno':
      return 'Interrupção ou problema operacional que gera desconforto ou impacto.';
    default:
      return 'Registro inicial de um acontecimento sem risco imediato.';
  }
}

function getCriticalityColor(criticality) {
  switch (criticality) {
    case 'Perigo':
      return '#ef4444';
    case 'Risco':
      return '#fb923c';
    case 'Transtorno':
      return '#facc15';
    case 'Relato':
      return '#a88a5a';
    default:
      return '#2563eb';
  }
}

function updateCriticalitySelection(criticality) {
  const input = document.getElementById('criticality');
  const buttons = document.querySelectorAll('.criticality-option');
  const helpTitle = document.getElementById('criticalityHelpTitle');
  const helpText = document.getElementById('criticalityHelpText');
  const openFormButton = document.getElementById('openFormButton');
  const cameraReportButton = document.getElementById('cameraReportButton');

  if (input) {
    input.value = criticality;
  }

  buttons.forEach((button) => {
    const isActive = button.dataset.criticality === criticality;
    button.classList.toggle('is-active', isActive);
  });

  if (helpTitle) {
    helpTitle.textContent = criticality;
  }

  if (helpText) {
    helpText.textContent = getCriticalityHelp(criticality);
  }

  if (openFormButton) {
    openFormButton.style.background = getCriticalityColor(criticality);
  }

  if (cameraReportButton) {
    cameraReportButton.style.background = getCriticalityColor(criticality);
  }
}

function createMarkerElement(color) {
  const el = document.createElement('div');
  el.style.width = '16px';
  el.style.height = '16px';
  el.style.borderRadius = '50%';
  el.style.background = color;
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  return el;
}

function updateCoordinateBadge(position) {
  const badge = document.getElementById('selectionCoordinates');
  if (badge) {
    badge.textContent = `Lat: ${position.lat.toFixed(6)} • Lng: ${position.lng.toFixed(6)}`;
  }
}

function setSelectedPosition(position) {
  selectedPosition = position;
  updateCoordinateBadge(position);

  if (tempMarker) {
    tempMarker.map = null;
  }

  if (!selectionModeActive || !AdvancedMarkerElementCtor || !map) {
    return;
  }

  tempMarker = new AdvancedMarkerElementCtor({
    position,
    map,
    content: createMarkerElement('#dc2626'),
  });
}

function setSelectionUIVisible(isVisible) {
  const floatingActions = document.querySelector('.floating-actions');
  const selectionHint = document.getElementById('selectionHint');
  const selectionCoordinates = document.getElementById('selectionCoordinates');

  if (floatingActions) {
    floatingActions.style.display = isVisible ? 'flex' : 'none';
  }

  if (selectionHint) {
    selectionHint.classList.toggle('hidden', !isVisible);
  }

  if (selectionCoordinates) {
    selectionCoordinates.classList.toggle('hidden', !isVisible);
  }
}

function setIncidentMarkersVisible(isVisible) {
  advancedMarkers.forEach((marker) => {
    if (marker && marker.map !== undefined) {
      marker.map = isVisible ? map : null;
    }
  });
}

function startSelectionMode() {
  if (!map || !AdvancedMarkerElementCtor || selectionModeActive) {
    return;
  }

  selectionModeActive = true;
  previousSelection = selectedPosition ? { ...selectedPosition } : null;
  const center = map.getCenter();
  const position = { lat: center.lat(), lng: center.lng() };

  setSelectionUIVisible(false);
  setIncidentMarkersVisible(false);
  setSelectedPosition(position);

  const selectionActions = document.getElementById('selectionActions');
  const selectionHint = document.getElementById('selectionHint');
  const selectionCoordinates = document.getElementById('selectionCoordinates');

  if (selectionActions) {
    selectionActions.classList.remove('hidden');
  }

  if (selectionHint) {
    selectionHint.classList.remove('hidden');
  }

  if (selectionCoordinates) {
    selectionCoordinates.classList.remove('hidden');
  }
}

function cancelSelectionMode() {
  selectionModeActive = false;
  setSelectionUIVisible(true);
  setIncidentMarkersVisible(true);

  const selectionActions = document.getElementById('selectionActions');
  const selectionHint = document.getElementById('selectionHint');
  const selectionCoordinates = document.getElementById('selectionCoordinates');

  if (selectionActions) {
    selectionActions.classList.add('hidden');
  }

  if (selectionHint) {
    selectionHint.classList.add('hidden');
  }

  if (selectionCoordinates) {
    selectionCoordinates.classList.add('hidden');
  }

  if (tempMarker) {
    tempMarker.map = null;
    tempMarker = null;
  }

  if (previousSelection) {
    setSelectedPosition(previousSelection);
  } else {
    selectedPosition = null;
  }
}

function confirmSelectionMode() {
  if (!selectionModeActive || !map) {
    return;
  }

  const center = map.getCenter();
  const position = { lat: center.lat(), lng: center.lng() };

  selectionModeActive = false;
  setSelectionUIVisible(true);
  setIncidentMarkersVisible(true);

  const selectionActions = document.getElementById('selectionActions');
  const selectionHint = document.getElementById('selectionHint');
  const selectionCoordinates = document.getElementById('selectionCoordinates');

  if (selectionActions) {
    selectionActions.classList.add('hidden');
  }

  if (selectionHint) {
    selectionHint.classList.add('hidden');
  }

  if (selectionCoordinates) {
    selectionCoordinates.classList.add('hidden');
  }

  if (tempMarker) {
    tempMarker.map = null;
    tempMarker = null;
  }

  setSelectedPosition(position);
  openModal();
}

function renderIncidentMarker(item) {
  const markerContent = (() => {
    const el = document.createElement('div');
    el.style.width = '16px';
    el.style.height = '16px';
    el.style.borderRadius = '50%';
    el.style.background = getMarkerColor(item.criticality);
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    el.style.cursor = 'pointer';
    el.style.pointerEvents = 'auto';
    return el;
  })();

  const markerView = new AdvancedMarkerElementCtor({
    map,
    position: { lat: item.latitude, lng: item.longitude },
    title: item.description,
    content: markerContent,
  });

  const openView = () => openIncidentView(item);

  markerView.addEventListener('gmp-click', openView);
  markerView.addEventListener('click', openView);
  markerContent.addEventListener('click', openView);
  markerContent.addEventListener('touchend', openView);
  advancedMarkers.push(markerView);
}

let currentViewFiles = [];
let currentViewIndex = 0;

function formatIncidentDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderViewCarousel() {
  const img = document.getElementById('viewImage');
  const prevButton = document.getElementById('viewPrevButton');
  const nextButton = document.getElementById('viewNextButton');
  const counter = document.getElementById('viewCounter');

  if (!img || !counter) return;

  const file = currentViewFiles[currentViewIndex];
  img.src = file ? file.fileUrl : '';
  counter.textContent = currentViewFiles.length > 1
    ? `${currentViewIndex + 1} / ${currentViewFiles.length}`
    : '';

  if (prevButton) {
    prevButton.classList.toggle('hidden', currentViewFiles.length <= 1);
  }
  if (nextButton) {
    nextButton.classList.toggle('hidden', currentViewFiles.length <= 1);
  }
}

function showViewImage(index) {
  if (currentViewFiles.length === 0) return;
  currentViewIndex = (index + currentViewFiles.length) % currentViewFiles.length;
  renderViewCarousel();
}

async function openIncidentView(incident) {
  const title = document.getElementById('viewTitle');
  const subtitle = document.getElementById('viewSubtitle');
  const description = document.getElementById('viewDescription');
  const card = document.getElementById('incidentViewCard');

  if (title) title.textContent = incident.title || 'Ocorrência';
  if (subtitle) {
    const criticality = incident.criticality || 'Relato';
    const date = formatIncidentDate(incident.occurredAt);
    subtitle.textContent = date ? `${criticality} • ${date}` : criticality;
  }
  if (description) {
    description.textContent = incident.description || 'Sem descrição';
  }
  if (card) {
    card.style.backgroundColor = getCriticalityColor(incident.criticality);
  }

  currentViewFiles = [];
  currentViewIndex = 0;
  renderViewCarousel();
  openModalById('incidentViewModal');

  try {
    const files = await api(`/uploads?incidentId=${incident.id}`);
    currentViewFiles = Array.isArray(files) ? files : [];
    currentViewIndex = 0;
    renderViewCarousel();
  } catch (error) {
    console.error('Failed to load incident photos:', error);
  }
}

function closeIncidentView() {
  closeModalById('incidentViewModal');
  currentViewFiles = [];
  currentViewIndex = 0;
  const img = document.getElementById('viewImage');
  if (img) img.src = '';
}

function refreshClusters() {
  if (markerCluster) {
    markerCluster.clearMarkers();
  }

  if (typeof MarkerClusterer === 'undefined' || !AdvancedMarkerElementCtor) {
    return;
  }

  markerCluster = new MarkerClusterer({
    map,
    markers: advancedMarkers,
    renderer: {
      render: ({ count, position }) => {
        const el = document.createElement('div');
        el.innerHTML = `<span>${count}</span>`;
        el.style.width = '34px';
        el.style.height = '34px';
        el.style.borderRadius = '50%';
        el.style.background = '#111827';
        el.style.color = 'white';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontWeight = '700';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        return new AdvancedMarkerElementCtor({
          position,
          content: el,
          zIndex: count,
        });
      },
    },
  });
}

async function loadVisibleIncidents() {
  if (!map) return;

  const bounds = map.getBounds();
  if (!bounds) return;

  const boundsJson = typeof bounds.toJSON === 'function' ? bounds.toJSON() : bounds;
  const { north, south, east, west } = boundsJson;

  
  const profile = getAnonymousProfile();
  const anonId = profile ? profile.id : undefined;

  const params = new URLSearchParams({
    north: String(north),
    south: String(south),
    east: String(east),
    west: String(west),
  });

  if (anonId) {
    params.append('anonId', anonId);
  }

  try {
    const response = await api(`/incidents/map?${params.toString()}`);
    incidents = response;
    advancedMarkers.forEach((marker) => {
      if (marker) marker.map = null;
    });
    advancedMarkers = [];
    incidents.forEach(renderIncidentMarker);
    refreshClusters();
  } catch (error) {
    console.error('Failed to load incidents:', error);
  }
}

function openModal() {
  document.getElementById('incidentModal').classList.remove('hidden');
  document.getElementById('occurredAt').value = new Date().toISOString().slice(0, 16);
  document.getElementById('formHint').textContent = 'A localização será salva automaticamente.';
}

function closeModal() {
  document.getElementById('incidentModal').classList.add('hidden');
  document.getElementById('incidentForm').reset();
  document.getElementById('boFieldContainer').style.display = 'none';
  updateCriticalitySelection(getDefaultCriticality());
  uploadedFiles = [];
  renderPhotoPreview();
  const status = document.getElementById('photoUploadStatus');
  if (status) status.textContent = '';
  document.getElementById('formHint').textContent = 'Toque em “Nova ocorrência” para escolher o ponto no centro do mapa. A localização será salva automaticamente.';
}

function toggleBoField() {
  const checked = document.getElementById('boOpened').checked;
  const container = document.getElementById('boFieldContainer');
  container.style.display = checked ? 'block' : 'none';
}

let uploadedFiles = [];

function renderPhotoPreview() {
  const preview = document.getElementById('photoPreview');
  if (!preview) return;
  preview.innerHTML = '';

  uploadedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'photo-preview-item';

    const img = document.createElement('img');
    img.src = file.previewUrl || file.fileUrl;
    img.alt = 'Foto da ocorrência';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-photo';
    remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    remove.title = 'Remover foto';
    remove.addEventListener('click', () => {
      uploadedFiles.splice(index, 1);
      renderPhotoPreview();
    });

    item.appendChild(img);
    item.appendChild(remove);
    preview.appendChild(item);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

async function uploadPhotos(files) {
  const status = document.getElementById('photoUploadStatus') || document.createElement('div');
  status.id = 'photoUploadStatus';
  status.className = 'photo-upload-status';

  const input = document.getElementById('photos');
  if (input && input.parentNode) {
    input.parentNode.appendChild(status);
  }

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;

    let previewUrl;
    try {
      previewUrl = await readFileAsDataURL(file);
    } catch (error) {
      console.error('Failed to read photo:', error);
      alert(`Não foi possível ler ${file.name}.`);
      continue;
    }

    const fileEntry = { fileId: null, fileUrl: null, previewUrl };
    uploadedFiles.push(fileEntry);
    renderPhotoPreview();

    status.textContent = `Enviando ${file.name}...`;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await fetch('/uploads', {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        throw new Error(`Erro ${result.status}`);
      }

      const data = await result.json();
      fileEntry.fileId = data.fileId;
      fileEntry.fileUrl = data.fileUrl;
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert(`Não foi possível enviar ${file.name}. Tente novamente.`);
    }
  }

  status.textContent = '';
  renderPhotoPreview();
}

function renderSettingsMenu() {
  const loggedIn = isLoggedIn();
  document.querySelectorAll('[data-auth="guest"]').forEach((el) => {
    el.classList.toggle('hidden', loggedIn);
  });
  document.querySelectorAll('[data-auth="logged"]').forEach((el) => {
    el.classList.toggle('hidden', !loggedIn);
  });
}

function updateAuthModalMode(mode) {
  const isRegister = mode === 'register';
  document.getElementById('authTitle').textContent = isRegister ? 'Criar conta' : 'Acessar';
  document.getElementById('authRegisterFields').classList.toggle('hidden', !isRegister);
  document.getElementById('authSubmitButton').textContent = isRegister ? 'Cadastrar' : 'Entrar';
  document.getElementById('authToggleText').textContent = isRegister ? 'Já tem conta?' : 'Não tem conta?';
  document.getElementById('authToggleButton').textContent = isRegister ? 'Entrar' : 'Cadastrar';
  document.getElementById('authForm').dataset.mode = mode;
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const mode = document.getElementById('authForm').dataset.mode || 'login';
  const cpf = parseCpf(document.getElementById('authCpf').value);
  const password = document.getElementById('authPassword').value;

  if (mode === 'register') {
    const confirmPassword = document.getElementById('authConfirmPassword').value;
    const name = document.getElementById('authName').value.trim();

    if (!name) {
      alert('Nome é obrigatório.');
      return;
    }

    if (password !== confirmPassword) {
      alert('As senhas não conferem.');
      return;
    }

    const body = {
      cpf,
      password,
      name,
      birthAt: document.getElementById('authBirthAt').value || undefined,
      email: document.getElementById('authEmail').value || undefined,
      cellphone: document.getElementById('authCellphone').value || undefined,
      anonId: getAnonymousProfile()?.id,
    };

    try {
      const result = await api('/auth/register', { method: 'POST', body: JSON.stringify(body) });
      setSession({ token: result.token, citizen: result.citizen });
    } catch (error) {
      alert(error.message || 'Erro ao criar conta. Tente novamente.');
      return;
    }
  } else {
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ cpf, password }),
      });
      setSession({ token: result.token, citizen: result.citizen });
    } catch (error) {
      alert('Credenciais incorretas ou usuário inexistente.');
      return;
    }
  }

  closeModalById('authModal');
  renderSettingsMenu();
  document.getElementById('authForm').reset();
  loadVisibleIncidents();
}

async function openProfileModal() {
  const citizen = await api('/citizens/me');
  document.getElementById('profileName').value = citizen.name || '';
  document.getElementById('profileBirthAt').value = citizen.birthAt
    ? citizen.birthAt.slice(0, 10)
    : '';
  document.getElementById('profileEmail').value = citizen.email || '';
  document.getElementById('profileCellphone').value = citizen.cellphone || '';
  openModalById('profileModal');
}

async function handleProfileSubmit(event) {
  event.preventDefault();

  const body = {
    name: document.getElementById('profileName').value.trim(),
    birthAt: document.getElementById('profileBirthAt').value || undefined,
    email: document.getElementById('profileEmail').value || undefined,
    cellphone: document.getElementById('profileCellphone').value || undefined,
  };

  const citizen = await api('/citizens/me', { method: 'PATCH', body: JSON.stringify(body) });
  const session = getSession();
  setSession({ ...session, citizen });
  closeModalById('profileModal');
}

function handleLogout() {
  api('/auth/logout', { method: 'POST' }).catch(() => null);
  clearSession();
  closeModalById('confirmLogoutModal');
  renderSettingsMenu();
  loadVisibleIncidents();
}

function openCriticalityModal() {
  const current = getDefaultCriticality();
  document.querySelectorAll('#criticalityModal .criticality-option').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.defaultCriticality === current);
  });
  openModalById('criticalityModal');
}

function handleCriticalityConfirm() {
  const selected = document.querySelector('#criticalityModal .criticality-option.is-active');
  if (selected) {
    const criticality = selected.dataset.defaultCriticality;
    saveDefaultCriticality(criticality);
    updateCriticalitySelection(criticality);
  }
  closeModalById('criticalityModal');
}

let lastDeviceDirection = null;

function handleDeviceOrientation(event) {
  if (event.alpha != null) {
    lastDeviceDirection = Math.round(event.alpha);
  }
}

function getDeviceDirection() {
  if (lastDeviceDirection != null) {
    return String(lastDeviceDirection);
  }
  if (window.screen && window.screen.orientation && window.screen.orientation.angle != null) {
    return String(window.screen.orientation.angle);
  }
  if (window.orientation != null) {
    return String(window.orientation);
  }
  return undefined;
}

function requestDeviceOrientation() {
  if (typeof window.DeviceOrientationEvent === 'undefined') {
    return;
  }
  if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
    window.DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === 'granted') {
          window.addEventListener('deviceorientation', handleDeviceOrientation, true);
        }
      })
      .catch(() => {
        // Permission denied or not supported; ignore.
      });
  } else {
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);
  }
}

async function checkCameraReportAvailability() {
  const cameraButton = document.getElementById('cameraReportButton');
  if (!cameraButton) return;

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }
    await navigator.mediaDevices.getUserMedia({ video: true });
  } catch {
    return;
  }

  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const accuracy = position.coords ? position.coords.accuracy : null;
      if (accuracy != null && accuracy <= 1000) {
        cameraButton.classList.remove('hidden');
      }
    },
    () => {
      // Geolocation error; keep button hidden.
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

async function handleCameraReport(file) {
  if (!file) return;

  const status = document.getElementById('photoUploadStatus') || document.createElement('div');
  status.id = 'photoUploadStatus';
  status.className = 'photo-upload-status';
  const input = document.getElementById('photos');
  if (input && input.parentNode) {
    input.parentNode.appendChild(status);
  }
  status.textContent = 'Enviando foto...';

  let fileId;
  try {
    const previewUrl = await readFileAsDataURL(file);
    const formData = new FormData();
    formData.append('file', file);
    const result = await fetch('/uploads', { method: 'POST', body: formData });
    if (!result.ok) {
      throw new Error(`Erro ${result.status}`);
    }
    const data = await result.json();
    fileId = data.fileId;
  } catch (error) {
    console.error('Failed to upload camera photo:', error);
    alert('Não foi possível enviar a foto. Tente novamente.');
    status.textContent = '';
    return;
  }

  status.textContent = 'Obtendo localização...';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const anonymousProfile = initializeAnonymousProfile();
      const session = getSession();

      const incident = {
        title: undefined,
        description: undefined,
        fileIds: [fileId],
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        deviceDirection: getDeviceDirection(),
        criticality: getDefaultCriticality(),
        citizenId: session?.citizen?.id,
        anonId: anonymousProfile ? anonymousProfile.id : undefined,
        boOpened: false,
        occurredAt: new Date().toISOString(),
      };

      try {
        await api('/incidents', { method: 'POST', body: JSON.stringify(incident) });
        await loadVisibleIncidents();
        status.textContent = '';
      } catch (error) {
        console.error('Failed to create camera incident:', error);
        alert(error.message || 'Erro ao salvar ocorrência.');
        status.textContent = '';
      }
    },
    (error) => {
      console.error('Failed to get location for camera report:', error);
      alert('Não foi possível obter a localização precisa.');
      status.textContent = '';
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

async function initMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    return;
  }

  const { Map } = await google.maps.importLibrary('maps');
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
  AdvancedMarkerElementCtor = AdvancedMarkerElement;

  map = new Map(mapContainer, {
    zoom: 14,
    center: defaultCenter,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    mapId: '3504c5feee954d98114f3a2d',
  });

  map.addListener('center_changed', () => {
    if (!selectionModeActive || !map) {
      return;
    }

    const center = map.getCenter();
    const position = { lat: center.lat(), lng: center.lng() };
    setSelectedPosition(position);
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(currentPosition);
        setSelectedPosition(currentPosition);
      },
      () => {
        setSelectedPosition(defaultCenter);
      },
    );
  } else {
    setSelectedPosition(defaultCenter);
  }

  loadVisibleIncidents();
  updateCriticalitySelection(getDefaultCriticality());

  map.addListener('idle', () => {
    loadVisibleIncidents();
  });

  document.querySelectorAll('.criticality-option').forEach((button) => {
    button.addEventListener('click', () => {
      updateCriticalitySelection(button.dataset.criticality);
    });
  });

  const settingsFab = document.getElementById('settingsFab');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettingsPanel = document.getElementById('closeSettingsPanel');

  if (settingsFab && settingsPanel) {
    settingsFab.addEventListener('click', () => {
      settingsPanel.classList.toggle('hidden');
    });
  }

  if (closeSettingsPanel && settingsPanel) {
    closeSettingsPanel.addEventListener('click', () => {
      settingsPanel.classList.add('hidden');
    });
  }

  document.getElementById('settingsLogin')?.addEventListener('click', () => {
    updateAuthModalMode('login');
    openModalById('authModal');
    settingsPanel.classList.add('hidden');
  });

  document.getElementById('settingsProfile')?.addEventListener('click', () => {
    openProfileModal();
    settingsPanel.classList.add('hidden');
  });

  document.getElementById('settingsLogout')?.addEventListener('click', () => {
    openModalById('confirmLogoutModal');
    settingsPanel.classList.add('hidden');
  });

  document.getElementById('settingsCriticality')?.addEventListener('click', () => {
    openCriticalityModal();
    settingsPanel.classList.add('hidden');
  });

  document.getElementById('authToggleButton')?.addEventListener('click', () => {
    const currentMode = document.getElementById('authForm').dataset.mode || 'login';
    updateAuthModalMode(currentMode === 'login' ? 'register' : 'login');
  });

  document.getElementById('authCancelButton')?.addEventListener('click', () => closeModalById('authModal'));
  document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);

  document.getElementById('authCpf')?.addEventListener('input', (event) => {
    event.target.value = formatCpf(event.target.value);
  });

  document.getElementById('profileCancelButton')?.addEventListener('click', () => closeModalById('profileModal'));
  document.getElementById('profileForm')?.addEventListener('submit', handleProfileSubmit);

  document.getElementById('logoutCancelButton')?.addEventListener('click', () => closeModalById('confirmLogoutModal'));
  document.getElementById('logoutConfirmButton')?.addEventListener('click', handleLogout);

  document.getElementById('criticalityCancelButton')?.addEventListener('click', () => closeModalById('criticalityModal'));
  document.getElementById('criticalityConfirmButton')?.addEventListener('click', handleCriticalityConfirm);

  document.querySelectorAll('#criticalityModal .criticality-option').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#criticalityModal .criticality-option').forEach((btn) => {
        btn.classList.remove('is-active');
      });
      button.classList.add('is-active');
    });
  });

  document.querySelectorAll('.criticality-option').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.closest('#criticalityModal')) return;
      updateCriticalitySelection(button.dataset.criticality);
    });
  });

  document.getElementById('viewCloseButton')?.addEventListener('click', closeIncidentView);
  document.getElementById('viewPrevButton')?.addEventListener('click', () => showViewImage(currentViewIndex - 1));
  document.getElementById('viewNextButton')?.addEventListener('click', () => showViewImage(currentViewIndex + 1));
  document.getElementById('incidentViewModal')?.addEventListener('click', (event) => {
    if (event.target.id === 'incidentViewModal') {
      closeIncidentView();
    }
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  const defaultCriticality = getDefaultCriticality();
  updateCriticalitySelection(defaultCriticality);
  renderSettingsMenu();

  document.getElementById('openFormButton').addEventListener('click', startSelectionMode);
  document.getElementById('confirmSelectionButton').addEventListener('click', confirmSelectionMode);
  document.getElementById('cancelSelectionButton').addEventListener('click', cancelSelectionMode);
  document.getElementById('cancelButton').addEventListener('click', closeModal);
  document.getElementById('boOpened').addEventListener('change', toggleBoField);
  document.getElementById('photos')?.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      uploadPhotos(Array.from(files));
    }
  });

  document.getElementById('cameraReportButton')?.addEventListener('click', () => {
    requestDeviceOrientation();
    document.getElementById('cameraInput')?.click();
  });

  document.getElementById('cameraInput')?.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleCameraReport(files[0]);
    }
    event.target.value = '';
  });

  document.getElementById('incidentModal').addEventListener('click', (event) => {
    if (event.target.id === 'incidentModal') {
      closeModal();
    }
  });

  document.getElementById('incidentForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!selectedPosition) {
      alert('Selecione um ponto no mapa antes de salvar.');
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('Adicione pelo menos uma foto da ocorrência.');
      return;
    }

    const fileIds = uploadedFiles.map((file) => file.fileId).filter(Boolean);
    if (fileIds.length === 0) {
      alert('O envio das fotos ainda não foi concluído. Aguarde ou tente novamente.');
      return;
    }

    const anonymousProfile = initializeAnonymousProfile();
    const session = getSession();

    console.log('[incidentForm submit] selectedPosition:', selectedPosition, 'map center:', map.getCenter().toJSON());

    const incident = {
      title: document.getElementById('title').value.trim() || undefined,
      description: document.getElementById('description').value.trim() || undefined,
      fileIds,
      latitude: selectedPosition.lat,
      longitude: selectedPosition.lng,
      criticality: document.getElementById('criticality').value,
      citizenId: session?.citizen?.id,
      anonId: anonymousProfile ? anonymousProfile.id : undefined,
      boOpened: document.getElementById('boOpened').checked,
      boNumberOrProtocol: document.getElementById('boNumberOrProtocol').value.trim() || undefined,
      occurredAt: document.getElementById('occurredAt').value || new Date().toISOString(),
    };

    try {
      await api('/incidents', { method: 'POST', body: JSON.stringify(incident) });
      await loadVisibleIncidents();
      closeModal();
    } catch (error) {
      alert(error.message || 'Erro ao salvar ocorrência.');
    }
  });

  checkCameraReportAvailability();
}

initializeAnonymousProfile();

function loadGoogleMaps() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    return;
  }

  const meta = document.querySelector('meta[name="google-maps-api-key"]');
  const apiKey = meta?.content;

  if (!apiKey) {
    console.error('Google Maps API key not found.');
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async&callback=initMap`;
  script.defer = true;
  document.head.appendChild(script);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadGoogleMaps);
} else {
  loadGoogleMaps();
}
