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
    const icon = L.icon({
        iconUrl: `data:image/svg+xml,${svgEncoded}`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17],
        className: uniqueClass,
    });

    return icon;
}

let allMosaics = [];
let markersLayer = L.layerGroup().addTo(map); // All visible markers

(async () => {
    try {
        const response = await fetch('data/mosaics.json');
        allMosaics = await response.json();

        // Prepare icons
        const iconOK = await createInvaderIcon('#FFD166', '#FFD166');
        const iconFlashed = await createInvaderIcon('#00FF85', '#00FF85');
        const iconDestroyed = await createInvaderIcon('#FF4F4F', '#FF4F4F');
        const iconHidden = await createInvaderIcon('#A259FF', '#A259FF');

        // Display visible mosaics
        function updateVisibleMosaics() {
            markersLayer.clearLayers(); // Clear previous display
            const bounds = map.getBounds();

            allMosaics.forEach(mosaic => {
                const latStr = (mosaic.lat || '').toString().trim().replace(',', '.');
                const lngStr = (mosaic.lng || '').toString().trim().replace(',', '.');

                const lat = parseFloat(latStr);
                const lng = parseFloat(lngStr);

                if (isNaN(lat) || isNaN(lng)) return;

                // Check if point is in the current view
                if (!bounds.contains([lat, lng])) return;

                // Icon based on status
                let icon;
                switch (mosaic.status) {
                    case 'OK':
                        icon = iconOK;
                        break;
                    case 'destroyed':
                        icon = iconDestroyed;
                        break;
                    case 'hidden':
                        icon = iconHidden;
                        break;
                    default:
                        icon = iconOK;
                        break;
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