// autocomplete.js
// Works for both new and edit campground forms

(function () {
  const input = document.getElementById('location');
  const flag = document.getElementById('locationValid');
  if (!input || !flag) return; // not on a page with a location field

  let suggestionBox;
  let debounceTimer;

  function clearSuggestions() {
    if (suggestionBox) suggestionBox.innerHTML = '';
  }

  function createSuggestionBox() {
    if (!suggestionBox) {
      suggestionBox = document.createElement('ul');
      suggestionBox.className = 'list-group mt-1';
      input.parentNode.appendChild(suggestionBox);
    }
    return suggestionBox;
  }

  input.addEventListener('input', () => {
    // Every time the user types → mark invalid until they pick a suggestion
    flag.value = "false";
    clearTimeout(debounceTimer);

    const query = input.value.trim();
    if (query.length < 3) {
      clearSuggestions();
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${maptilerApiKey}&autocomplete=true&limit=5`;
        const res = await fetch(url);
        const data = await res.json();

        clearSuggestions();
        if (!data.features || data.features.length === 0) return;

        const box = createSuggestionBox();

        data.features.forEach(feature => {
          const li = document.createElement('li');
          li.className = 'list-group-item list-group-item-action';

          // MapTiler formatted address (fallback to place_name/text)
          const label = (feature.properties && feature.properties.formatted) ||
                        feature.place_name ||
                        feature.text ||
                        'Unknown';

          li.textContent = label;

          li.addEventListener('click', () => {
            input.value = label;
            flag.value = "true"; // mark valid only on pick
            clearSuggestions();
          });

          box.appendChild(li);
        });
      } catch (err) {
        console.error("Geocoding error:", err);
        clearSuggestions();
      }
    }, 300); // debounce delay
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (suggestionBox && e.target !== input && !suggestionBox.contains(e.target)) {
      clearSuggestions();
    }
  });
})();
