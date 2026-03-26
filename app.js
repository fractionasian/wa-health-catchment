let data = [];

const searchInput = document.getElementById('search');
const suggestionsEl = document.getElementById('suggestions');
const resultsEl = document.getElementById('results');

const HOSPITAL_NAMES = {
  SCGH: 'Sir Charles Gairdner Hospital',
  RPH: 'Royal Perth Hospital',
  FSH: 'Fiona Stanley Hospital',
  RGH: 'Rockingham General Hospital',
  PHC: 'Peel Health Campus',
  'SJOG Midland': 'St John of God Midland Public'
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
    const medOncs = [...new Set(entries.map(e => e.publicMedOnc).filter(Boolean))];
    if (medOncs.length > 1) {
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

  // Health service context line
  if (entry.healthService) {
    const hsDiv = createEl('div', 'health-service-line');
    hsDiv.textContent = HEALTH_SERVICE_NAMES[entry.healthService] + ' (' + entry.healthService + ')';
    card.appendChild(hsDiv);
  }

  // Tags
  const tags = createEl('div', 'tags');
  let hasTags = false;

  if (entry.sjogMidland === 'core') {
    addTag(tags, 'tag-sjog', 'SJOG Midland catchment');
    addTag(tags, 'tag-icon', 'Split-care eligible');
    hasTags = true;
  } else if (entry.sjogMidland === 'inpatient') {
    addTag(tags, 'tag-sjog-inpatient', 'SJOG Midland (inpatient only)');
    hasTags = true;
  } else if (entry.sjogMidland === 'outpatient') {
    addTag(tags, 'tag-sjog-outpatient', 'SJOG Midland (outpatient only)');
    hasTags = true;
  }
  if (entry.rockingham) {
    addTag(tags, 'tag-rockingham', 'Rockingham catchment');
    hasTags = true;
  }
  if (entry.peel) {
    addTag(tags, 'tag-peel', 'Peel catchment');
    hasTags = true;
  }

  if (hasTags) card.appendChild(tags);

  // Routing section
  const routing = createEl('div', 'routing-section');
  routing.appendChild(buildMedOncBlock(entry));
  routing.appendChild(buildRadOncBlock(entry));
  card.appendChild(routing);

  return card;
}

function addTag(container, cls, text) {
  const tag = createEl('span', 'tag ' + cls);
  tag.textContent = text;
  container.appendChild(tag);
}

function hospitalLabel(code) {
  if (!code) return 'Not in metro catchment';
  var name = HOSPITAL_NAMES[code];
  return name ? name + ' (' + code + ')' : code;
}

function buildModalityRow(label, value, note) {
  const row = createEl('div', 'modality-row');
  const labelEl = createEl('span', 'modality-label');
  labelEl.textContent = label;
  const valueEl = createEl('span', 'modality-value');
  valueEl.textContent = value;
  if (note) {
    const noteEl = createEl('span', 'modality-note');
    noteEl.textContent = ' ' + note;
    valueEl.appendChild(noteEl);
  }
  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return row;
}

function buildMedOncBlock(entry) {
  const block = createEl('div', 'modality-block');
  const heading = createEl('div', 'modality-heading');
  heading.textContent = 'Medical Oncology';
  block.appendChild(heading);

  // Public line
  var publicText = hospitalLabel(entry.publicMedOnc);
  var publicNote = null;

  if (entry.sjogMidland === 'core') {
    publicNote = '\u2014 co-located with ICON Midland';
  } else if (entry.publicMedOnc === 'RGH' || entry.publicMedOnc === 'PHC') {
    publicNote = '\u2014 secondary site, tertiary: FSH';
  }

  block.appendChild(buildModalityRow('Public:', publicText, publicNote));

  // Private line
  if (entry.rockingham) {
    block.appendChild(buildModalityRow('Private:', 'ICON Rockingham', null));
  } else if (entry.peel) {
    block.appendChild(buildModalityRow('Private:', 'GenesisCare Mandurah / ICON Rockingham', '\u2014 TBC'));
  } else {
    block.appendChild(buildModalityRow('Private:', 'ICON Midland', null));
  }

  return block;
}

function buildRadOncBlock(entry) {
  const block = createEl('div', 'modality-block');
  const heading = createEl('div', 'modality-heading');
  heading.textContent = 'Radiation Oncology';
  block.appendChild(heading);

  // Public line
  var publicText = hospitalLabel(entry.publicRT);
  var publicNote = null;

  if (entry.publicRT === 'RGH' || entry.publicRT === 'PHC') {
    publicNote = '\u2014 secondary site, tertiary: FSH';
  } else if (entry.sjogMidland && entry.publicRT === 'SCGH') {
    publicNote = '\u2014 no public RT at SJOG Midland';
  }

  if (entry.publicRT) {
    block.appendChild(buildModalityRow('Public:', publicText, publicNote));
  }

  // Private line
  if (entry.rockingham) {
    block.appendChild(buildModalityRow('Private:', 'ICON Rockingham', null));
  } else if (entry.peel) {
    block.appendChild(buildModalityRow('Private:', 'GenesisCare Mandurah / ICON Rockingham', '\u2014 TBC'));
  } else {
    block.appendChild(buildModalityRow('Private:', 'ICON Midland', '\u2014 TBC billing'));
  }

  return block;
}

init();
