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
    zoom: 13,
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

// Examples
(async () => {
    const invaderIconFlashed = await createInvaderIcon('#00FF85', '#00FF85');
    const invaderIconNotFlashed = await createInvaderIcon('#FFD166', '#FFD166');
    const invaderIconDestroyed = await createInvaderIcon('#FF4F4F', '#FF4F4F');
    L.marker([48.8566, 2.3522], { icon: invaderIconFlashed }).addTo(map)
        .bindPopup('Flashed ✅');
    L.marker([48.8666, 2.3422], { icon: invaderIconNotFlashed }).addTo(map)
        .bindPopup('Not Flashed (yet)');
    L.marker([48.8466, 2.3622], { icon: invaderIconDestroyed }).addTo(map)
        .bindPopup('Destroyed ❌');
})();

// Loading mosaics from JSON file
fetch('/data/mosaics.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                let popupContent = `<strong>${props.name}</strong><br>Status: ${props.status || 'unknown'}`;
                if (props.image) {
                    popupContent += `<br><img src="${props.image}" alt="${props.name}" style="width:100px;">`;
                }
                layer.bindPopup(popupContent);
            }
        }).addTo(map);
    })
    .catch(err => {
        console.error('Error while loading GeoJSON:', err);
    });

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