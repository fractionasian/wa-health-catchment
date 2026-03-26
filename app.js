let data = [];

const searchInput = document.getElementById('search');
const suggestionsEl = document.getElementById('suggestions');
const resultsEl = document.getElementById('results');

const CATCHMENT_NAMES = {
  SCGH: 'Sir Charles Gairdner Hospital',
  RPH: 'Royal Perth Hospital',
  FSH: 'Fiona Stanley Hospital'
};

const HEALTH_SERVICE_NAMES = {
  NMHS: 'North Metropolitan Health Service',
  EMHS: 'East Metropolitan Health Service',
  SMHS: 'South Metropolitan Health Service'
};

let activeSuggestion = -1;

async function init() {
  const res = await fetch('data/postcodes.json');
  data = await res.json();
  searchInput.addEventListener('input', onInput);
  searchInput.addEventListener('keydown', onKeydown);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) hideSuggestions();
  });
}

function onInput() {
  const q = searchInput.value.trim().toLowerCase();
  activeSuggestion = -1;

  if (q.length < 2) {
    hideSuggestions();
    clearResults();
    return;
  }

  const isPostcode = /^\d+$/.test(q);
  let matches;

  if (isPostcode) {
    matches = data.filter(d => d.postcode.startsWith(q));
  } else {
    matches = data.filter(d => d.suburb.toLowerCase().includes(q));
  }

  // Deduplicate for suggestions — show unique suburb+postcode combos
  const seen = new Set();
  const unique = matches.filter(d => {
    const key = d.suburb + '-' + d.postcode;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (unique.length === 0) {
    hideSuggestions();
    clearResults();
    const notice = createEl('div', 'split-notice');
    notice.textContent = 'No matching suburb or postcode found in the metro catchment data.';
    resultsEl.appendChild(notice);
    return;
  }

  // If exact postcode match, show results directly
  if (isPostcode && q.length === 4) {
    hideSuggestions();
    showResults(matches);
    return;
  }

  showSuggestions(unique.slice(0, 12));
}

function onKeydown(e) {
  const items = suggestionsEl.querySelectorAll('.suggestion-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestion = Math.min(activeSuggestion + 1, items.length - 1);
    updateActiveSuggestion(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestion = Math.max(activeSuggestion - 1, 0);
    updateActiveSuggestion(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeSuggestion >= 0) {
      items[activeSuggestion].click();
    } else if (items.length > 0) {
      items[0].click();
    }
  }
}

function updateActiveSuggestion(items) {
  items.forEach((item, i) => {
    item.classList.toggle('active', i === activeSuggestion);
  });
  if (activeSuggestion >= 0) {
    items[activeSuggestion].scrollIntoView({ block: 'nearest' });
  }
}

function showSuggestions(items) {
  suggestionsEl.replaceChildren();

  items.forEach(d => {
    const el = createEl('div', 'suggestion-item');
    el.dataset.postcode = d.postcode;
    el.dataset.suburb = d.suburb;

    el.appendChild(document.createTextNode(d.suburb + ' '));
    const span = createEl('span', 'postcode');
    span.textContent = d.postcode;
    el.appendChild(span);

    el.addEventListener('click', () => {
      searchInput.value = d.suburb;
      hideSuggestions();
      const matches = data.filter(entry => entry.postcode === d.postcode);
      showResults(matches, d.suburb);
    });

    suggestionsEl.appendChild(el);
  });

  suggestionsEl.classList.remove('hidden');
}

function hideSuggestions() {
  suggestionsEl.classList.add('hidden');
  activeSuggestion = -1;
}

function clearResults() {
  resultsEl.replaceChildren();
}

function showResults(entries, highlightSuburb) {
  clearResults();

  // Check if this postcode is split between catchments
  const postcodes = [...new Set(entries.map(e => e.postcode))];

  if (postcodes.length === 1) {
    const catchments = [...new Set(entries.map(e => e.catchment).filter(Boolean))];
    if (catchments.length > 1) {
      const notice = createEl('div', 'split-notice');
      notice.textContent = 'Postcode ' + postcodes[0] + ' is split between catchments \u2014 routing depends on suburb.';
      resultsEl.appendChild(notice);
    }
  }

  if (highlightSuburb) {
    const highlighted = entries.find(e => e.suburb === highlightSuburb);
    if (highlighted) {
      resultsEl.appendChild(renderCard(highlighted, true));
      const others = entries.filter(e => e !== highlighted);
      if (others.length > 0) {
        const label = createEl('div', 'catchment-label');
        label.style.marginTop = '0.5rem';
        label.style.marginBottom = '0.25rem';
        label.textContent = 'Other suburbs in ' + highlighted.postcode;
        resultsEl.appendChild(label);
        others.forEach(e => resultsEl.appendChild(renderCard(e, false)));
      }
    }
  } else {
    entries.forEach(e => resultsEl.appendChild(renderCard(e, false)));
  }
}

function createEl(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function renderCard(entry, highlighted) {
  const cssClass = entry.healthService ? entry.healthService.toLowerCase() : 'regional';
  const catchmentName = entry.catchment
    ? CATCHMENT_NAMES[entry.catchment] + ' (' + entry.catchment + ')'
    : 'Regional \u2014 not in metro tertiary catchment';
  const hsName = entry.healthService
    ? HEALTH_SERVICE_NAMES[entry.healthService] + ' (' + entry.healthService + ')'
    : null;

  const card = createEl('div', 'result-card ' + cssClass);
  if (highlighted) card.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)';

  // Header
  const header = createEl('div', 'result-header');
  const suburbSpan = createEl('span', 'result-suburb');
  suburbSpan.textContent = entry.suburb;
  const postcodeSpan = createEl('span', 'result-postcode');
  postcodeSpan.textContent = entry.postcode;
  header.appendChild(suburbSpan);
  header.appendChild(postcodeSpan);
  card.appendChild(header);

  // Catchment
  const catchmentDiv = createEl('div', 'result-catchment');
  const catchmentLabel = createEl('div', 'catchment-label');
  catchmentLabel.textContent = 'Public hospital catchment';
  const catchmentValue = createEl('div', 'catchment-value ' + cssClass);
  catchmentValue.textContent = catchmentName;
  catchmentDiv.appendChild(catchmentLabel);
  catchmentDiv.appendChild(catchmentValue);
  if (hsName) {
    const hsDiv = createEl('div');
    hsDiv.style.fontSize = '0.8125rem';
    hsDiv.style.color = '#888';
    hsDiv.style.marginTop = '0.125rem';
    hsDiv.textContent = hsName;
    catchmentDiv.appendChild(hsDiv);
  }
  card.appendChild(catchmentDiv);

  // Tags
  const tags = createEl('div', 'tags');
  let hasTags = false;

  if (entry.sjogMidland === 'core') {
    const tag = createEl('span', 'tag tag-sjog');
    tag.textContent = 'SJOG Midland Public';
    tags.appendChild(tag);
    const iconTag = createEl('span', 'tag tag-icon');
    iconTag.textContent = 'ICON Midland split-care eligible';
    tags.appendChild(iconTag);
    hasTags = true;
  } else if (entry.sjogMidland === 'inpatient') {
    const tag = createEl('span', 'tag tag-sjog-inpatient');
    tag.textContent = 'SJOG Midland (inpatient only)';
    tags.appendChild(tag);
    hasTags = true;
  } else if (entry.sjogMidland === 'outpatient') {
    const tag = createEl('span', 'tag tag-sjog-outpatient');
    tag.textContent = 'SJOG Midland (outpatient only)';
    tags.appendChild(tag);
    hasTags = true;
  }

  if (hasTags) card.appendChild(tags);

  // Routing notes
  const notes = getRoutingNotes(entry);
  if (notes.length > 0) {
    const notesDiv = createEl('div', 'routing-notes');
    notes.forEach(text => {
      const p = createEl('p');
      // Handle bold text by splitting on ** markers
      const parts = text.split(/\*\*(.*?)\*\*/);
      parts.forEach((part, i) => {
        if (i % 2 === 1) {
          const strong = document.createElement('strong');
          strong.textContent = part;
          p.appendChild(strong);
        } else {
          p.appendChild(document.createTextNode(part));
        }
      });
      notesDiv.appendChild(p);
    });
    card.appendChild(notesDiv);
  }

  return card;
}

function getRoutingNotes(entry) {
  const notes = [];

  if (entry.sjogMidland === 'core' && entry.healthService === 'EMHS') {
    notes.push('**Split-care pathway available:** Public med onc at SJOG Midland + private rad onc at ICON Midland (co-located campus).');
    notes.push('Private rad onc and med onc also available at ICON Midland.');
  } else if (entry.healthService === 'EMHS' && !entry.sjogMidland) {
    notes.push('Public med onc at RPH (not SJOG Midland \u2014 outside Midland catchment).');
    notes.push('Private rad onc at ICON Midland available regardless of catchment.');
  } else if (entry.sjogMidland === 'inpatient') {
    notes.push('SJOG Midland inpatient services available if relevant services are provided at the hospital.');
    notes.push('Private rad onc at ICON Midland available regardless of catchment.');
  } else if (entry.sjogMidland === 'outpatient') {
    notes.push('SJOG Midland outpatient services only. Not in metro tertiary catchment.');
    notes.push('Private rad onc at ICON Midland available regardless of catchment.');
  } else if (entry.healthService === 'NMHS' || entry.healthService === 'SMHS') {
    notes.push('Private rad onc at ICON Midland available regardless of catchment.');
  }

  return notes;
}

init();
