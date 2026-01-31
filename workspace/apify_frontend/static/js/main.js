// Main client-side logic

function el(q) { return document.querySelector(q); }
function elAll(q) { return document.querySelectorAll(q); }

const state = { filters: {}, jobTitleInclude: [], jobTitleExclude: [] };

// Job title typeahead suggestions
const jobTitleSuggestions = [
  'Intern','Associate','Junior','Senior','Manager','Senior Manager','Director','VP','SVP','C-Level','CEO','CTO','CFO','COO','Owner','Founder','Principal','Lead'
];

function showToast(message){
  const toastEl = document.getElementById('filterToast');
  if (!toastEl) return;
  toastEl.querySelector('.toast-body').innerText = message;
  const t = new bootstrap.Toast(toastEl, {delay: 2000});
  t.show();
}

// Render tag-based filters
function renderTags(containerId, items, removeCallback) {
  const container = el(`#${containerId}`);
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item, idx) => {
    const tag = document.createElement('span');
    tag.className = 'badge bg-secondary px-3 py-2 d-flex align-items-center gap-2';
    tag.innerHTML = `${item} <button type="button" class="btn-close btn-sm" aria-label="Remove"></button>`;
    tag.querySelector('.btn-close').addEventListener('click', () => removeCallback(idx));
    container.appendChild(tag);
  });
}

// Job Title Include handlers
(function(){
  const input = el('#jobTitleIncludeInput');
  
  input.addEventListener('keydown', (ev)=>{
    if (ev.key === 'Enter'){
      ev.preventDefault();
      const v = input.value.trim();
      if (v && !state.jobTitleInclude.includes(v)) {
        state.jobTitleInclude.push(v);
        state.filters['job_title_include'] = state.jobTitleInclude;
        input.value = '';
        renderTags('jobTitleIncludeTags', state.jobTitleInclude, (idx) => {
          state.jobTitleInclude.splice(idx, 1);
          state.filters['job_title_include'] = state.jobTitleInclude;
          renderTags('jobTitleIncludeTags', state.jobTitleInclude, arguments.callee);
        });
      }
    }
  });
})();

elAll('.job-include-dropdown-item').forEach(a => {
  a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const v = a.dataset.value;
    if (v && !state.jobTitleInclude.includes(v)) {
      state.jobTitleInclude.push(v);
      state.filters['job_title_include'] = state.jobTitleInclude;
      renderTags('jobTitleIncludeTags', state.jobTitleInclude, (idx) => {
        state.jobTitleInclude.splice(idx, 1);
        state.filters['job_title_include'] = state.jobTitleInclude;
        renderTags('jobTitleIncludeTags', state.jobTitleInclude, arguments.callee);
      });
    }
    try{ bootstrap.Dropdown.getOrCreateInstance(el('#dropdownJobTitleInclude')).hide(); }catch(e){}
  });
});

// Job Title Exclude handlers
(function(){
  const input = el('#jobTitleExcludeInput');
  
  input.addEventListener('keydown', (ev)=>{
    if (ev.key === 'Enter'){
      ev.preventDefault();
      const v = input.value.trim();
      if (v && !state.jobTitleExclude.includes(v)) {
        state.jobTitleExclude.push(v);
        state.filters['job_title_exclude'] = state.jobTitleExclude;
        input.value = '';
        renderTags('jobTitleExcludeTags', state.jobTitleExclude, (idx) => {
          state.jobTitleExclude.splice(idx, 1);
          state.filters['job_title_exclude'] = state.jobTitleExclude;
          renderTags('jobTitleExcludeTags', state.jobTitleExclude, arguments.callee);
        });
      }
    }
  });
})();

elAll('.job-exclude-dropdown-item').forEach(a => {
  a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const v = a.dataset.value;
    if (v && !state.jobTitleExclude.includes(v)) {
      state.jobTitleExclude.push(v);
      state.filters['job_title_exclude'] = state.jobTitleExclude;
      renderTags('jobTitleExcludeTags', state.jobTitleExclude, (idx) => {
        state.jobTitleExclude.splice(idx, 1);
        state.filters['job_title_exclude'] = state.jobTitleExclude;
        renderTags('jobTitleExcludeTags', state.jobTitleExclude, arguments.callee);
      });
    }
    try{ bootstrap.Dropdown.getOrCreateInstance(el('#dropdownJobTitleExclude')).hide(); }catch(e){}
  });
});



// Add selected states from multi-selects (legacy handlers - guard in case elements missing)
if (el('#btnAddIncludeStates')){
  el('#btnAddIncludeStates').addEventListener('click', ()=>{
    const sel = el('#locInclude'); const values = Array.from(sel.selectedOptions).map(o=>o.value);
    values.forEach(v=> addFilter('location_include', v));
    // clear selection
    sel.selectedIndex = -1;
  });
}

if (el('#btnAddExcludeStates')){
  el('#btnAddExcludeStates').addEventListener('click', ()=>{
    const sel = el('#locExclude'); const values = Array.from(sel.selectedOptions).map(o=>o.value);
    values.forEach(v=> addFilter('location_exclude', v));
    sel.selectedIndex = -1;
  });
}

// New: Add selected from dropdown checkbox menus
function gatherAndAdd(selector, checkboxClass, filterKey, dropdownToggleId){
  const container = el(selector);
  if (!container) return;
  const checked = Array.from(container.querySelectorAll(`.${checkboxClass}:checked`)).map(i=>i.value);
  checked.forEach(v=> addFilter(filterKey, v));
  // uncheck
  container.querySelectorAll(`.${checkboxClass}:checked`).forEach(i=> i.checked = false);
  // hide dropdown
  try{ const btn = el(`#${dropdownToggleId}`); if (btn) bootstrap.Dropdown.getOrCreateInstance(btn).hide(); }catch(e){}
}

function addFilter(key, value) {
  if (!value || value === '') return;
  if (!state.filters[key]) state.filters[key] = [];
  // Prevent duplicates
  if (state.filters[key].includes(value)) return;
  state.filters[key].push(value);
  renderFilterTags(key);
}

function removeFilterItem(key, idx) {
  if (!state.filters[key]) return;
  state.filters[key].splice(idx, 1);
  if (state.filters[key].length === 0) delete state.filters[key];
  renderFilterTags(key);
}

function renderFilterTags(filterKey) {
  const containerMap = {
    'size': 'sizeTags',
    'industry': 'industryTags',
    'min_revenue': 'minRevenueTags',
    'max_revenue': 'maxRevenueTags',
    'funding': 'fundingTags',
    'seniority': 'seniorityTags',
    'functional': 'functionalTags',
    'location_include': 'locationIncludeTags',
    'location_exclude': 'locationExcludeTags',
    'company_website': 'companyWebsiteTags',
    'keywords': 'keywordsTags'
  };
  
  const containerId = containerMap[filterKey];
  if (!containerId) return;
  
  const container = el(`#${containerId}`);
  if (!container) return;
  
  container.innerHTML = '';
  const items = state.filters[filterKey] || [];
  
  items.forEach((item, idx) => {
    const tag = document.createElement('span');
    tag.className = 'badge bg-secondary px-3 py-2 d-flex align-items-center gap-2';
    tag.innerHTML = `${item} <button type="button" class="btn-close btn-sm" aria-label="Remove" data-filter-key="${filterKey}" data-filter-idx="${idx}"></button>`;
    const closeBtn = tag.querySelector('.btn-close');
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = closeBtn.getAttribute('data-filter-key');
      const i = parseInt(closeBtn.getAttribute('data-filter-idx'));
      removeFilterItem(key, i);
    });
    container.appendChild(tag);
  });
}

// Checkbox change listeners for automatic filter addition
document.addEventListener('DOMContentLoaded', ()=>{
  // Location Include
  const includeCheckboxes = document.querySelectorAll('.state-include-checkbox');
  includeCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      if(e.target.checked) {
        addFilter('location_include', e.target.value);
      } else {
        removeFilterByValue('location_include', e.target.value);
      }
    });
  });

  // Location Exclude
  const excludeCheckboxes = document.querySelectorAll('.state-exclude-checkbox');
  excludeCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      if(e.target.checked) {
        addFilter('location_exclude', e.target.value);
      } else {
        removeFilterByValue('location_exclude', e.target.value);
      }
    });
  });

  // Size
  const sizeCheckboxes = document.querySelectorAll('.size-checkbox');
  sizeCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      if(e.target.checked) {
        addFilter('size', e.target.value);
      } else {
        removeFilterByValue('size', e.target.value);
      }
    });
  });

  // Industry
  const industryCheckboxes = document.querySelectorAll('.industry-checkbox');
  industryCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      if(e.target.checked) {
        addFilter('industry', e.target.value);
      } else {
        removeFilterByValue('industry', e.target.value);
      }
    });
  });

  // Revenue
  // Minimum Revenue (single select)
  const minRevenueSelect = el('#minRevenue');
  if(minRevenueSelect) {
    minRevenueSelect.addEventListener('change', (e) => {
      if(state.filters['min_revenue']) {
        delete state.filters['min_revenue'];
      }
      if(e.target.value && e.target.value !== '') {
        state.filters['min_revenue'] = [e.target.value];
      }
      renderFilterTags('min_revenue');
    });
  }

  // Maximum Revenue (single select)
  const maxRevenueSelect = el('#maxRevenue');
  if(maxRevenueSelect) {
    maxRevenueSelect.addEventListener('change', (e) => {
      if(state.filters['max_revenue']) {
        delete state.filters['max_revenue'];
      }
      if(e.target.value && e.target.value !== '') {
        state.filters['max_revenue'] = [e.target.value];
      }
      renderFilterTags('max_revenue');
    });
  }

  // Funding
  const fundingCheckboxes = document.querySelectorAll('.funding-checkbox');
  fundingCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      if(e.target.checked) {
        addFilter('funding', e.target.value);
      } else {
        removeFilterByValue('funding', e.target.value);
      }
    });
  });

  // Seniority
  const seniorityCheckboxes = document.querySelectorAll('.seniority-checkbox');
  seniorityCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      if(e.target.checked) {
        addFilter('seniority', e.target.value);
      } else {
        removeFilterByValue('seniority', e.target.value);
      }
    });
  });

  // Functional
  const functionalCheckboxes = document.querySelectorAll('.functional-checkbox');
  functionalCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      if(e.target.checked) {
        addFilter('functional', e.target.value);
      } else {
        removeFilterByValue('functional', e.target.value);
      }
    });
  });
});

function removeFilterByValue(key, value) {
  if (!state.filters[key]) return;
  const idx = state.filters[key].indexOf(value);
  if (idx > -1) {
    state.filters[key].splice(idx, 1);
    if (state.filters[key].length === 0) delete state.filters[key];
    renderFilterTags(key);
  }
}

if (el('#btnAddIncludeStatesDropdown')){
  el('#btnAddIncludeStatesDropdown').addEventListener('click', ()=>{ gatherAndAdd('#includeStatesMenu','state-include-checkbox','location_include','dropdownIncludeStates'); });
}
if (el('#btnAddExcludeStatesDropdown')){
  el('#btnAddExcludeStatesDropdown').addEventListener('click', ()=>{ gatherAndAdd('#excludeStatesMenu','state-exclude-checkbox','location_exclude','dropdownExcludeStates'); });
}

if (el('#btnAddSizesDropdown')){
  el('#btnAddSizesDropdown').addEventListener('click', ()=>{ gatherAndAdd('#sizeMenu','size-checkbox','size','dropdownSize'); });
}
if (el('#btnAddIndustriesDropdown')){
  el('#btnAddIndustriesDropdown').addEventListener('click', ()=>{ gatherAndAdd('#industryMenu','industry-checkbox','industry','dropdownIndustry'); });
}
if (el('#btnAddRevenuesDropdown')){
  el('#btnAddRevenuesDropdown').addEventListener('click', ()=>{ gatherAndAdd('#revenueMenu','revenue-checkbox','revenue','dropdownRevenue'); });
}
if (el('#btnAddFundingsDropdown')){
  el('#btnAddFundingsDropdown').addEventListener('click', ()=>{ gatherAndAdd('#fundingMenu','funding-checkbox','funding','dropdownFunding'); });
}

// Email status: single selection, replace on change (no tags)
el('#emailStatus').addEventListener('change', ()=>{ 
  const v = el('#emailStatus').value; 
  if(v) { 
    state.filters['email_status'] = [v];
    el('#emailStatus').value=''; 
  } 
});

if (el('#btnAddCompanyWebsite')) {
  el('#btnAddCompanyWebsite').addEventListener('click', ()=>{ 
    const v = el('#companyWebsiteInput').value; 
    if(v) { 
      addFilter('company_website', v); 
      el('#companyWebsiteInput').value=''; 
    } 
  });
}

if (el('#btnAddKeyword')) {
  el('#btnAddKeyword').addEventListener('click', ()=>{ 
    const v = el('#keywordsInput').value; 
    if(v) { 
      addFilter('keywords', v); 
      el('#keywordsInput').value=''; 
    } 
  });
}

// Persist API Key and actor selection
if (localStorage.getItem('apifyApiKey')) el('#apiKey').value = localStorage.getItem('apifyApiKey');
if (localStorage.getItem('apifySelectedActor')) {
  // will be applied after listing actors
}

el('#apiKey').addEventListener('input', (ev)=>{ localStorage.setItem('apifyApiKey', ev.target.value.trim()); });

// List actors
el('#btnListActors').addEventListener('click', async ()=>{
  const apiKey = el('#apiKey').value.trim();
  if (!apiKey) return alert('Enter API Key');
  el('#statusBox').innerHTML = `<div class="spinner-border spinner-border-sm" role="status"></div> Fetching actors...`;
  try{
    const res = await axios.post('/list-actors', { apiKey });
    const actors = res.data.actors || [];
    const sel = el('#actorSelect'); sel.innerHTML = '';
    actors.forEach(a=>{ const o = document.createElement('option'); o.value = a.name || a.id; o.text = a.title || a.name; sel.appendChild(o); });
    // restore previous selection if any
    const prev = localStorage.getItem('apifySelectedActor');
    if (prev) sel.value = prev;
    el('#statusBox').innerText = `Found ${actors.length} actors.`;
  }catch(err){ el('#statusBox').innerText = 'Failed to list actors: ' + (err.response?.data?.error || err.message); }
});

el('#actorSelect').addEventListener('change', ()=>{ localStorage.setItem('apifySelectedActor', el('#actorSelect').value); });

// Run and download
el('#btnRun').addEventListener('click', async ()=>{
  const apiKey = el('#apiKey').value.trim();
  const actor = el('#actorSelect').value;
  if (!apiKey || !actor) return alert('Please provide API Key and select an actor.');

  const form = new FormData();
  form.append('apiKey', apiKey);
  form.append('actor', actor);
  form.append('filters', JSON.stringify(state.filters));

  const btn = el('#btnRun');
  btn.disabled = true; btn.innerText = 'Running...';
  el('#statusBox').innerHTML = `<div class="spinner-border spinner-border-sm me-2" role="status"></div> Actor run in progress...`;
  try{
    const res = await axios.post('/run-actor', form, { responseType: 'blob', timeout: 0 });
    const blob = res.data;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'apify_results.xlsx'; document.body.appendChild(a); a.click(); a.remove();
    el('#statusBox').innerText = 'Download started ✅';
  }catch(err){
    let msg = 'Failed to run actor.';
    try{ const text = await (err.response && err.response.data ? err.response.data.text() : Promise.resolve('')); msg += ' ' + text; }catch(e){}
    el('#statusBox').innerText = msg;
  } finally {
    btn.disabled = false; btn.innerText = 'Run & Download Excel ✅';
  }
});

// Initial empty render
function renderFilters() {
  // This function can be used to update any summary display
  // Currently, individual tag containers are rendered via renderFilterTags()
}

renderFilters();
