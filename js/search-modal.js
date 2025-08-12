function openSearchModal() {
    document.getElementById('searchModal').style.display = 'flex';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchInput').focus();
}

document.getElementById('closeSearch').addEventListener('click', () => {
    document.getElementById('searchModal').style.display = 'none';
});

// Close modal when clicking outside the modal content
document.getElementById('searchModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('searchModal')) {
        document.getElementById('searchModal').style.display = 'none';
    }
});

document.getElementById('searchInput').addEventListener('input', function () {
    const query = this.value.toLowerCase();
    const results = window.allMosaics.filter(m => m.id.toLowerCase().includes(query));

    const list = document.getElementById('searchResults');
    list.innerHTML = '';

    results.forEach(mosaic => {
        const li = document.createElement('li');
        li.textContent = mosaic.id;
        li.style.padding = '5px';
        li.style.cursor = 'pointer';
        li.style.borderRadius = '6px';

        li.classList.add('search-result-item'); // hover via CSS

        li.addEventListener('click', () => {
            li.style.backgroundColor = '#A259FF';
            li.style.color = 'white';
            li.style.fontWeight = "bold";

            focusOnMosaic(mosaic);

            setTimeout(() => {
                document.getElementById('searchModal').style.display = 'none';
            }, 250);
        });

        list.appendChild(li);
    });
});

function focusOnMosaic(mosaic) {
    const lat = parseFloat((mosaic.lat || '').toString().trim().replace(',', '.'));
    const lng = parseFloat((mosaic.lng || '').toString().trim().replace(',', '.'));
    if (!isNaN(lat) && !isNaN(lng)) {
        window.map.setView([lat, lng], 20);
    } else {
        console.warn("Invalid coordinates for mosaic:", mosaic);
    }
}
