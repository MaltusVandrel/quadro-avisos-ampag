const STORAGE_KEY = 'quadro-avisos-occurrences';
const DEFAULT_CRITICALITY_KEY = 'quadro-avisos-default-criticality';
const ANONYMOUS_PROFILE_KEY = 'quadro-avisos-anonymous-profile';
const defaultCenter = { lat: -27.640099739226315, lng: -48.68046242802495 };
let map;
let selectedPosition = null;
let tempMarker = null;
let occurrences = [];
let markerCluster;
let advancedMarkers = [];
let AdvancedMarkerElementCtor = null;
let selectionModeActive = false;
let previousSelection = null;

function getStoredOccurrences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

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

function saveOccurrences(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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

function setOccurrenceMarkersVisible(isVisible) {
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
  setOccurrenceMarkersVisible(false);
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
  setOccurrenceMarkersVisible(true);

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
  setOccurrenceMarkersVisible(true);

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

function renderOccurrenceMarker(item) {
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

  const infoWindow = new google.maps.InfoWindow({
    content: `<div><strong>${item.criticality}</strong><br>${item.description || 'Sem descrição'}</div>`,
  });

  const openInfoWindow = () => infoWindow.open({ map, anchor: markerView });

  markerView.addEventListener('gmp-click', openInfoWindow);
  markerView.addEventListener('click', openInfoWindow);
  markerContent.addEventListener('click', openInfoWindow);
  markerContent.addEventListener('touchend', openInfoWindow);
  advancedMarkers.push(markerView);
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

function loadOccurrences() {
  occurrences = getStoredOccurrences();
  advancedMarkers = [];
  occurrences.forEach(renderOccurrenceMarker);
  refreshClusters();
}

function openModal() {
  document.getElementById('occurrenceModal').classList.remove('hidden');
  document.getElementById('occurredAt').value = new Date().toISOString().slice(0, 16);
  document.getElementById('formHint').textContent = 'A localização será salva automaticamente.';
}

function closeModal() {
  document.getElementById('occurrenceModal').classList.add('hidden');
  document.getElementById('occurrenceForm').reset();
  document.getElementById('boFieldContainer').style.display = 'none';
  updateCriticalitySelection(getDefaultCriticality());
  document.getElementById('formHint').textContent = 'Toque em “Nova ocorrência” para escolher o ponto no centro do mapa. A localização será salva automaticamente.';
}

function toggleBoField() {
  const checked = document.getElementById('boOpened').checked;
  const container = document.getElementById('boFieldContainer');
  container.style.display = checked ? 'block' : 'none';
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

  loadOccurrences();
  updateCriticalitySelection(getDefaultCriticality());

  document.querySelectorAll('.criticality-option').forEach((button) => {
    button.addEventListener('click', () => {
      updateCriticalitySelection(button.dataset.criticality);
    });
  });

  const settingsFab = document.getElementById('settingsFab');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettingsPanel = document.getElementById('closeSettingsPanel');
  const settingsOptions = document.querySelectorAll('.settings-option');

  const applyDefaultCriticality = (criticality) => {
    saveDefaultCriticality(criticality);
    updateCriticalitySelection(criticality);
    if (settingsPanel) {
      settingsPanel.classList.add('hidden');
    }
  };

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

  settingsOptions.forEach((button) => {
    button.addEventListener('click', () => {
      applyDefaultCriticality(button.dataset.defaultCriticality);
    });
  });

  const defaultCriticality = getDefaultCriticality();
  updateCriticalitySelection(defaultCriticality);

  document.getElementById('openFormButton').addEventListener('click', startSelectionMode);
  document.getElementById('confirmSelectionButton').addEventListener('click', confirmSelectionMode);
  document.getElementById('cancelSelectionButton').addEventListener('click', cancelSelectionMode);
  document.getElementById('cancelButton').addEventListener('click', closeModal);
  document.getElementById('boOpened').addEventListener('change', toggleBoField);
  document.getElementById('occurrenceModal').addEventListener('click', (event) => {
    if (event.target.id === 'occurrenceModal') {
      closeModal();
    }
  });

  document.getElementById('occurrenceForm').addEventListener('submit', (event) => {
    event.preventDefault();

    if (!selectedPosition) {
      alert('Selecione um ponto no mapa antes de salvar.');
      return;
    }

    const anonymousProfile = initializeAnonymousProfile();
    const occurrence = {
      id: Date.now().toString(),
      description: document.getElementById('description').value.trim(),
      criticality: document.getElementById('criticality').value,
      locationLabel: document.getElementById('locationLabel').value.trim() || 'Ponto selecionado',
      latitude: selectedPosition.lat,
      longitude: selectedPosition.lng,
      occurredAt: document.getElementById('occurredAt').value || new Date().toISOString(),
      boOpened: document.getElementById('boOpened').checked,
      boNumberOrProtocol: document.getElementById('boNumberOrProtocol').value.trim() || '',
      photos: document.getElementById('photos').value.split(',').map((item) => item.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      anonymousDeviceId: anonymousProfile ? anonymousProfile.id : null,
      anonymousDeviceProfile: anonymousProfile ? anonymousProfile.metadata : null,
    };

    occurrences = [occurrence, ...occurrences];
    saveOccurrences(occurrences);
    renderOccurrenceMarker(occurrence);
    refreshClusters();
    closeModal();
  });
}

initializeAnonymousProfile();

function loadGoogleMaps() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDWdaqeGnF7GTBuFqr5fHeDtOW2E4JZI4U&libraries=marker&loading=async&callback=initMap';
  script.defer = true;
  document.head.appendChild(script);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadGoogleMaps);
} else {
  loadGoogleMaps();
}
