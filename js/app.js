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
const map = L.map('map', {
    center: [48.8566, 2.3522],
    zoom: 16,
    layers: [darkLayer]
});

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

let allMosaics = [];
let markersLayer = L.layerGroup().addTo(map); // All visible markers

// Load and display visible mosaics
(async () => {
    try {
        const response = await fetch('data/mosaics.json');
        allMosaics = await response.json();

        // Prepare icons
        const iconOK = await createInvaderIcon('#FFD166', '#FFD166');
        const iconFlashed = await createInvaderIcon('#00FF85', '#00FF85');
        const iconDestroyed = await createInvaderIcon('#FF4F4F', '#FF4F4F');
        const iconHidden = await createInvaderIcon('#A259FF', '#A259FF');

        // Display/update visible mosaics
        function updateVisibleMosaics() {
            markersLayer.clearLayers();
            const bounds = map.getBounds();

            allMosaics.forEach(mosaic => {
                const lat = parseFloat((mosaic.lat || '').toString().trim().replace(',', '.'));
                const lng = parseFloat((mosaic.lng || '').toString().trim().replace(',', '.'));
                if (isNaN(lat) || isNaN(lng)) return;

                // Check if point is in the current view
                if (!bounds.contains([lat, lng])) return;

                // Icon based on status
                let icon;
                switch (mosaic.status) {
                    case 'OK': icon = iconOK; break;
                    case 'destroyed': icon = iconDestroyed; break;
                    case 'hidden': icon = iconHidden; break;
                    default: icon = iconOK; break;
                }

                // Adding marker
                L.marker([lat, lng], { icon })
                    .bindPopup(`
                        <strong>${mosaic.id}</strong><br>
                        ${mosaic.status == "destroyed" ? "Destroyed 😭<br>" : ""}
                        ${mosaic.status == "hidden" ? "Hidden 🤫<br>" : ""}
                        ${mosaic.hint ? `<i><strong>💡 Hint:</strong> ${mosaic.hint}</i><br>` : ""}
                        <i>${mosaic.points} pts</i>
                    `)
                    .addTo(markersLayer);
            });
        }

        // First update
        updateVisibleMosaics();

        // Update at each zoom/map movement
        map.on('moveend', updateVisibleMosaics);

    } catch (err) {
        console.error('Error while loading mosaics:', err);
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

L.control.locate({ position: 'topleft' }).addTo(map);

// Masking obsolete Leaflet warnings
const originalWarn = console.warn;
console.warn = (...args) => {
    if (args[0] && (
        args[0].includes('MouseEvent.mozPressure') ||
        args[0].includes('MouseEvent.mozInputSource')
    )) return;
    originalWarn.apply(console, args);
};