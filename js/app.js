// Map background themes
const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | &copy; <a href="https://www.carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
});

const lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | &copy; <a href="https://www.carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
});

// Initializing map, centered on Paris, dark theme by default
window.map = L.map('map', {
    center: [48.8566, 2.3522],
    zoom: 16,
    layers: [darkLayer]
});

// Initializing cluster
document.addEventListener("DOMContentLoaded", function () {
    window.markersLayer = L.markerClusterGroup({
        // Clusters' style depending on number of markers
        iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let color = '#FFD166'; // default yellow
            if (count > 10) color = '#FF9755';       // orange if more than 10

            return L.divIcon({
                html: `<div style="
                        background-color: ${color};
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        box-shadow: 0 0 10px ${color};
                    ">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: [40, 40]
            });
        }
    });
    window.map.addLayer(window.markersLayer);
    updateVisibleMosaics();
});

window.iconOK = null;
window.iconFlashed = null;
window.iconDestroyed = null;
window.iconHidden = null;

window.flashedIDs = new Set();

// Creating 👾 icon from file
async function createInvaderIcon(fillColor = '#A259FF', halo = '#00FF85') {
    const response = await fetch('assets/invader.svg');
    let svgText = await response.text();

    // Replace color in style and fill
    svgText = svgText
        .replace(/fill="[^"]*"/g, `fill="${fillColor}"`)
        .replace(/fill:#([0-9A-Fa-f]{6})/g, `fill:${fillColor}`);

    const svgEncoded = encodeURIComponent(svgText);

    // Generate unique id for the CSS class
    const uniqueClass = `invader-icon-${Math.random().toString(36).substr(2, 9)}`;

    // Iject or update CSS rule for the halo
    const styleId = 'invader-icon-glow-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML += `
    .${uniqueClass} {
      filter:
        drop-shadow(0 0 4px ${halo})
        drop-shadow(0 0 8px ${halo});
      transition: filter 0.3s ease;
    }
  `;

    // Create the Leaflet icon with the corresponding CSS class
    return L.icon({
        iconUrl: `data:image/svg+xml,${svgEncoded}`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17],
        className: uniqueClass,
    });
}

function showSpinner() {
    document.getElementById('loading-spinner').style.display = 'flex';
}
function hideSpinner() {
    document.getElementById('loading-spinner').style.display = 'none';
}

window.allMosaics = [];

// Display/update visible mosaics
function updateVisibleMosaics() {
    // Clear existing markers
    window.markersLayer.clearLayers();

    const bounds = map.getBounds();

    window.allMosaics.forEach(mosaic => {
        // Coordinates conversion
        const lat = parseFloat((mosaic.lat || '').toString().trim().replace(',', '.'));
        const lng = parseFloat((mosaic.lng || '').toString().trim().replace(',', '.'));
        if (isNaN(lat) || isNaN(lng)) return;
        if (!bounds.contains([lat, lng])) return;

        // Icon selection
        let icon;
        if (window.flashedIDs.has(mosaic.id)) {
            icon = iconFlashed;
        } else {
            switch (mosaic.status) {
                case 'OK': icon = iconOK; break;
                case 'destroyed': icon = iconDestroyed; break;
                case 'hidden': icon = iconHidden; break;
                default: icon = iconOK; break;
            }
        }

        // Creating marker with popup
        const marker = L.marker([lat, lng], { icon, mosaicId: mosaic.id })
            .bindPopup(`
                <strong>${mosaic.id}</strong><br>
                ${mosaic.status == "destroyed" ? "Destroyed 😭<br>" : ""}
                ${mosaic.status == "hidden" ? "Hidden 🤫<br>" : ""}
                ${mosaic.hint ? `<i><strong>💡 Hint:</strong> ${mosaic.hint}</i><br>` : ""}
                <i>${mosaic.points} pts</i><br/>
                <a class="text-alien" href="https://www.instagram.com/explore/tags/${mosaic.id.toLowerCase()}/">📷 #${mosaic.id}</a><br/>
                <a class="text-alien" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank">🧭 Get directions</a>
            `);

        // Add marker to cluster
        window.markersLayer.addLayer(marker);
    });
}

// Load and display visible mosaics
(async () => {
    try {
        showSpinner();
        const response = await fetch('data/mosaics.json');
        window.allMosaics = await response.json();

        // Prepare icons
        window.iconOK = await createInvaderIcon('#FFD166', '#FFD166');
        window.iconFlashed = await createInvaderIcon('#00FF85', '#00FF85');
        window.iconDestroyed = await createInvaderIcon('#FF4F4F', '#FF4F4F');
        window.iconHidden = await createInvaderIcon('#A259FF', '#A259FF');

        // First update
        updateVisibleMosaics();

        // Update at each zoom/map movement
        map.on('moveend', updateVisibleMosaics);

    } catch (err) {
        console.error('Error while loading mosaics:', err);
    } finally {
        hideSpinner();
    }
})();

// Switch light/dark
let isDark = true;
document.getElementById('themeToggle').addEventListener('click', () => {
    if (isDark) {
        map.removeLayer(darkLayer);
        lightLayer.addTo(map);
        document.getElementById('themeToggle').textContent = '☀️ Light';
    } else {
        map.removeLayer(lightLayer);
        darkLayer.addTo(map);
        document.getElementById('themeToggle').textContent = '🌙 Dark';
    }
    isDark = !isDark;
});

// Localisation
L.Control.Locate = L.Control.extend({
    onAdd: function (map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        container.style.backgroundColor = 'white';
        container.style.width = '34px';
        container.style.height = '34px';
        container.style.cursor = 'pointer';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.fontSize = '18px';  // Emoji size
        container.title = 'Show my current position';

        container.textContent = '📍';

        // Fixed position marker
        let positionMarker = null;

        function createPositionIcon(color = '#A259FF') {
            // SVG with <polygon> and id="arrow" for rotation
            const svg = `
                <svg id="position-icon" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="6" fill="${color}" stroke="white" stroke-width="2"/>
                <polygon id="arrow" points="15,2 10,12 20,12" fill="${color}" />
                </svg>
            `;
            return L.divIcon({
                className: '',
                html: svg,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            });
        }

        // Apply rotation to the arrow
        function rotateArrow(marker, angle) {
            if (!marker) return;
            const iconEl = marker.getElement();
            if (!iconEl) return;

            const arrow = iconEl.querySelector('#arrow');
            if (!arrow) return;

            // Apply CSS rotation at the center of the SVG (15,15)
            arrow.style.transformOrigin = '15px 15px';
            arrow.style.transform = `rotate(${angle}deg)`;
        }

        // Handling orientation
        function handleOrientation(event) {
            // alpha = angle in degrees [0-360], rotation around z-axis (compass)
            let alpha = event.alpha;
            if (alpha === null) return;

            // Fix depending on screen orientation
            const screenAngle = screen.orientation?.angle || window.orientation || 0;
            // Inverting left/right
            alpha = (-alpha - screenAngle + 180) % 360;

            // Rotate arrow according to alpha
            rotateArrow(positionMarker, alpha);
        }

        // Check permission and locate
        function checkPermissionAndLocate() {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser.');
                return;
            }

            if (navigator.permissions) {
                navigator.permissions.query({ name: 'geolocation' }).then(result => {
                    if (result.state === 'granted' || result.state === 'prompt') {
                        // Permission granted or prompt: request location
                        requestLocation();
                    } else {
                        // Permission denied
                        alert('Location access was denied. Please enable location permissions in your browser settings.');
                    }
                }).catch(() => {
                    // Permissions API failed, fallback
                    requestLocation();
                });
            } else {
                // Permissions API not supported, fallback
                requestLocation();
            }
        }

        // Request location and update map
        function requestLocation() {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const latlng = [position.coords.latitude, position.coords.longitude];
                    map.setView(latlng, 16);

                    // Create or move the position marker
                    if (positionMarker) {
                        positionMarker.setLatLng(latlng);
                    } else {
                        positionMarker = L.marker(latlng, {
                            icon: createPositionIcon('#A259FF'),
                            interactive: false
                        }).addTo(map);

                        // Listen to device orientation events after marker creation
                        function requestDeviceOrientationPermission() {
                            if (
                                typeof DeviceOrientationEvent !== 'undefined' &&
                                typeof DeviceOrientationEvent.requestPermission === 'function'
                            ) {
                                // iOS 13+ requires explicit permission
                                DeviceOrientationEvent.requestPermission()
                                    .then(response => {
                                        if (response === 'granted') {
                                            window.addEventListener('deviceorientation', handleOrientation, true);
                                        } else {
                                            alert('Permission to access device orientation was denied.');
                                        }
                                    })
                                    .catch(console.error);
                            } else {
                                // Other devices/browsers
                                window.addEventListener('deviceorientation', handleOrientation, true);
                            }
                        }

                        requestDeviceOrientationPermission();
                    }

                    // Animated radar
                    const radius = 30;
                    const circle = L.circle(latlng, {
                        radius,
                        color: '#A259FF',
                        fillColor: '#A259FF',
                        fillOpacity: 0.3
                    }).addTo(map);

                    let growing = true;
                    let currentRadius = radius;
                    const maxRadius = radius * 2.5;
                    const minRadius = radius;
                    const step = 1.5;

                    const interval = setInterval(() => {
                        if (growing) {
                            currentRadius += step;
                            if (currentRadius >= maxRadius) growing = false;
                        } else {
                            currentRadius -= step;
                            if (currentRadius <= minRadius) growing = true;
                        }
                        circle.setRadius(currentRadius);
                    }, 30);

                    setTimeout(() => {
                        clearInterval(interval);
                        map.removeLayer(circle);
                    }, 3000);
                },
                error => {
                    if (error.code === error.PERMISSION_DENIED) {
                        alert('Permission to access location was denied.');
                    } else {
                        alert('Error while locating you: ' + error.message);
                    }
                }
            );
        }

        L.DomEvent.on(container, 'click', function (e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);

            function startGeolocation() {
                if (navigator.permissions) {
                    navigator.permissions.query({ name: 'geolocation' }).then(result => {
                        if (result.state === 'denied') {
                            alert('Location access is denied. Please allow location access in your browser settings.');
                            return;
                        }
                        requestLocation();
                    }).catch(() => {
                        requestLocation();
                    });
                } else {
                    requestLocation();
                }
            }

            // Request permission for device orientation **immediately**
            if (
                typeof DeviceOrientationEvent !== 'undefined' &&
                typeof DeviceOrientationEvent.requestPermission === 'function'
            ) {
                DeviceOrientationEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation, true);
                        } else {
                            alert('Permission to access device orientation was denied.');
                        }
                        startGeolocation();
                    })
                    .catch(error => {
                        console.error(error);
                        startGeolocation();
                    });
            } else {
                // No need to request permission on this device/browser
                startGeolocation();
            }
        });

        return container;
    },
    onRemove: function (map) {
        // Nothing to do here
    }
});

L.control.locate = function (opts) {
    return new L.Control.Locate(opts);
};

// Search mosaic by ID
L.Control.SearchMosaic = L.Control.extend({
    onAdd: function (map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        container.style.backgroundColor = 'white';
        container.style.width = '34px';
        container.style.height = '34px';
        container.style.cursor = 'pointer';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.fontSize = '18px';
        container.title = 'Search mosaic by ID';

        container.textContent = '🔎';

        L.DomEvent.on(container, 'click', function (e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            openSearchModal();
        });

        return container;
    }
});

L.control.searchMosaic = function (opts) {
    return new L.Control.SearchMosaic(opts);
};

function applyFlashedIcons(flashedIDsSet) {
    window.flashedIDs = flashedIDsSet;
    updateVisibleMosaics();
}

// Player selection
L.Control.PlayerSelect = L.Control.extend({
    onAdd: function (map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom player-select-control');
        const select = L.DomUtil.create('select', '', container);

        // Default option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'All mosaics';
        defaultOption.textContent = 'All mosaics';
        select.appendChild(defaultOption);

        fetch('data/players.json')
            .then(response => response.json())
            .then(players => {
                players.forEach(player => {
                    const opt = document.createElement('option');
                    opt.value = player.UID;
                    opt.textContent = player.player;
                    select.appendChild(opt);
                });
            })
            .catch(err => console.error('Error while loading players:', err));

        select.addEventListener('change', () => {
            const selectedUID = select.value;
            console.log('Selected player:', selectedUID || 'All mosaics');
            const apiUrl = `https://api.space-invaders.com/flashinvaders_v3_pas_trop_predictif/api/gallery?uid=${encodeURIComponent(selectedUID)}`;

            showSpinner();

            if (selectedUID && selectedUID !== 'All mosaics') {
                fetch(apiUrl)
                    .then(res => res.json())
                    .then(data => {
                        console.log('Received data:', data);
                        window.flashedIDs = new Set(Object.keys(data.invaders || {}));
                        applyFlashedIcons(window.flashedIDs);
                    })
                    .catch(err => console.error('API fetch error:', err))
                    .finally(() => hideSpinner());
            } else {
                applyFlashedIcons(new Set());
                hideSpinner();
            }
        });

        return container;
    }
});

L.control.playerSelect = function (opts) {
    return new L.Control.PlayerSelect(opts);
};

L.control.locate({ position: 'topleft' }).addTo(map);
L.control.searchMosaic({ position: 'topleft' }).addTo(map);
L.control.playerSelect({ position: 'topright' }).addTo(map);

// Masking obsolete Leaflet warnings
const originalWarn = console.warn;
console.warn = (...args) => {
    if (args[0] && (
        args[0].includes('MouseEvent.mozPressure') ||
        args[0].includes('MouseEvent.mozInputSource')
    )) return;
    originalWarn.apply(console, args);
};