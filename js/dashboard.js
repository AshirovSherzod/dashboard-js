import { getCustomers, saveCustomer, setCustomerStatus, deleteCustomer, resetDemo, getStorageNotice, STORAGE_KEY } from './api.js';
import { selectCustomers, paginate, validateCustomer, toCSV } from './customers.js';
import { icon, initials, readPreference, writePreference, applyTheme } from './ui.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = { customers: [], activity: [], query: '', status: 'all', country: '', sort: 'full_name', direction: 'asc', page: 1, pageSize: Number(readPreference('pageSize', '10')) };
let filtered = [];
let detailId = '';
let highlightId = '';
let confirmAction;
let busy = false;
const returnFocus = new WeakMap();
const editor = $('.edit-dialog');
const form = $('.customer-form');
const details = $('.detail-dialog');
const confirmation = $('.confirm-dialog');
const sidebar = $('.sidebar');
const mobileQuery = matchMedia('(max-width: 850px)');
const fields = ['full_name', 'email', 'phone_number', 'country', 'company'];

function element(tag, className = '', text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function date(value, options = { dateStyle: 'medium' }) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : new Intl.DateTimeFormat('en', options).format(parsed);
}
function toast(message, error = false) {
  const region = $('.toast-region');
  while (region.children.length >= 3) region.firstElementChild.remove();
  const item = element('div', 'toast' + (error ? ' error' : ''));
  item.innerHTML = icon(error ? 'info' : 'check');
  item.append(element('span', '', message));
  const close = element('button', 'icon-button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.innerHTML = icon('close');
  close.addEventListener('click', () => item.remove());
  item.append(close);
  region.append(item);
  setTimeout(() => item.remove(), 5000);
}
function showStorageNotice() {
  const notice = getStorageNotice();
  $('.storage-notice').textContent = notice;
  $('.storage-notice').hidden = !notice;
}
async function refresh() {
  const data = await getCustomers();
  state.customers = data.customers;
  state.activity = data.activity;
  updateCountries();
  render();
  renderActivity();
  showStorageNotice();
}
function updateCountries() {
  const countries = [...new Set(state.customers.map(c => c.country))].sort((a, b) => a.localeCompare(b));
  const select = $('#country-filter');
  select.replaceChildren(new Option('All countries', ''));
  countries.forEach(country => select.add(new Option(country, country)));
  if (state.country && !countries.includes(state.country)) state.country = '';
  select.value = state.country;
  $('#country-options').replaceChildren(...countries.map(country => new Option(country)));
}
function render() {
  filtered = selectCustomers(state.customers, state);
  const page = paginate(filtered, state.page, state.pageSize);
  state.page = page.page;
  const active = state.customers.filter(c => c.isActive).length;
  $('#total-customers').textContent = state.customers.length;
  $('#active-customers').textContent = active;
  $('#inactive-customers').textContent = state.customers.length - active;
  $('#country-count').textContent = new Set(state.customers.map(c => c.country.toLowerCase())).size;
  $('#active-ratio').textContent = (state.customers.length ? Math.round(active / state.customers.length * 100) : 0) + '% of your customers';
  $('.nav-count').textContent = state.customers.length;
  $('.count-badge').textContent = state.customers.length + ' customers';
  $('.demo-banner p').textContent = 'Sample customers. Your own space to try things out.';
  $('.result-count').textContent = filtered.length
    ? 'Showing ' + page.start + '–' + page.end + ' of ' + filtered.length + ' customer' + (filtered.length === 1 ? '' : 's')
    : '0 customers match your filters';
  if (filtered.length !== state.customers.length && filtered.length) $('.result-count').textContent += ' · ' + state.customers.length + ' total';
  $('.page-indicator').textContent = 'Page ' + page.page + ' of ' + page.pages;
  $('.previous-page').disabled = page.page <= 1;
  $('.next-page').disabled = page.page >= page.pages;
  $('.export-button').disabled = !filtered.length;
  $('.clear-filters').hidden = !state.query && state.status === 'all' && !state.country;
  $('#sort-order').value = state.sort + ':' + state.direction;
  $('#page-size').value = [10, 20, 50].includes(state.pageSize) ? state.pageSize : 10;
  $$('.column-sort').forEach(button => {
    button.closest('th').setAttribute('aria-sort', button.dataset.sort === state.sort ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none');
  });
  $('tbody').replaceChildren(...page.rows.map(renderRow));
  $('.mobile-customer-list').replaceChildren(...page.rows.map(renderCard));
  $('.empty-state').hidden = page.rows.length > 0;
  $('.table-scroll').hidden = !page.rows.length;
  $('.mobile-customer-list').hidden = !page.rows.length;
  $('.empty-state h3').textContent = state.customers.length ? 'No customers found' : 'Your next connection starts here';
  $('.empty-state p').textContent = state.customers.length ? 'Try a different name, email or filter.' : 'Add your first customer, or reset the demo to explore the samples again.';
  $('.empty-action').textContent = state.customers.length ? 'Clear filters' : 'Add customer';
  $('.content-card').setAttribute('aria-busy', 'false');
}
function customerIdentity(customer) {
  const wrap = element('div', 'customer-cell');
  const color = [...customer.full_name].reduce((sum, char) => sum + char.codePointAt(0), 0) % 4;
  wrap.append(element('span', 'customer-avatar avatar-' + color, initials(customer.full_name)));
  const copy = element('div');
  const button = element('button', 'customer-name', customer.full_name);
  button.type = 'button';
  button.dataset.action = 'details';
  button.dataset.id = customer.id;
  button.title = 'View ' + customer.full_name;
  copy.append(button, element('span', 'customer-company', customer.company || 'Independent customer'));
  wrap.append(copy);
  return wrap;
}
function statusButton(customer) {
  const button = element('button', 'status-badge status-button' + (customer.isActive ? '' : ' is-inactive'), customer.isActive ? 'Active' : 'Inactive');
  button.type = 'button';
  button.dataset.action = 'status';
  button.dataset.id = customer.id;
  button.setAttribute('aria-label', 'Mark ' + customer.full_name + (customer.isActive ? ' inactive' : ' active'));
  button.setAttribute('aria-pressed', String(customer.isActive));
  return button;
}
function actions(customer) {
  const wrap = element('div', 'row-actions');
  for (const [action, symbol, label] of [['edit', 'edit', 'Edit '], ['delete', 'trash', 'Delete ']]) {
    const button = element('button', 'row-action ' + action);
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.id = customer.id;
    button.setAttribute('aria-label', label + customer.full_name);
    button.title = label + customer.full_name;
    button.innerHTML = icon(symbol);
    wrap.append(button);
  }
  return wrap;
}
function renderRow(customer) {
  const row = element('tr', customer.id === highlightId ? 'highlighted' : '');
  const identity = element('td');
  identity.append(customerIdentity(customer));
  row.append(identity, element('td', '', customer.phone_number));
  const email = element('td', 'email-cell', customer.email);
  email.title = customer.email;
  row.append(email, element('td', '', customer.country));
  const status = element('td');
  status.append(statusButton(customer));
  const manage = element('td');
  manage.append(actions(customer));
  row.append(status, manage);
  return row;
}
function renderCard(customer) {
  const card = element('article', 'mobile-customer' + (customer.id === highlightId ? ' highlighted' : ''));
  const top = element('div', 'mobile-customer-top');
  top.append(customerIdentity(customer), statusButton(customer));
  const bottom = element('div', 'mobile-customer-bottom');
  bottom.append(element('span', '', customer.country), actions(customer));
  card.append(top, element('p', 'mobile-customer-meta', customer.email), bottom);
  return card;
}
function clearFilters() {
  state.query = ''; state.status = 'all'; state.country = ''; state.page = 1;
  $('#search').value = ''; $('#status-filter').value = 'all'; $('#country-filter').value = '';
}
function focusCustomer(id, action = 'details') {
  const buttons = $$('[data-action="' + action + '"]').filter(button => button.dataset.id === id && button.getClientRects().length);
  (buttons[0] || $('.add-customer')).focus({ preventScroll: true });
}
function openDialog(dialog, focus = null) {
  closePopovers();
  closeSidebar();
  returnFocus.set(dialog, document.activeElement);
  dialog.showModal();
  if (focus) focus.focus();
}
function closeDialog(dialog) {
  if (dialog.dataset.busy === 'true') return;
  dialog.close();
}
$$('dialog').forEach(dialog => {
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not([type="hidden"]):not(:disabled), select:not(:disabled), a[href]')].filter(node => node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-close]')) closeDialog(dialog);
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    }
  });
  dialog.addEventListener('cancel', event => { if (dialog.dataset.busy === 'true') event.preventDefault(); });
  dialog.addEventListener('close', () => {
    const previous = returnFocus.get(dialog);
    if (previous?.isConnected && previous.getClientRects().length) previous.focus({ preventScroll: true });
    else $('.add-customer').focus({ preventScroll: true });
  });
});
function openEditor(customer = null) {
  form.reset();
  fields.forEach(field => {
    const input = form.elements[field];
    input.value = customer?.[field] ?? '';
    input.removeAttribute('aria-invalid');
    $('#error-' + field).textContent = '';
  });
  form.elements.id.value = customer?.id ?? '';
  $('#edit-title').textContent = customer ? 'Edit customer' : 'Add customer';
  $('.save-customer span').textContent = customer ? 'Save changes' : 'Add customer';
  $('.form-error').textContent = '';
  openDialog(editor, form.elements.full_name);
}
function openDetails(customer) {
  detailId = customer.id;
  renderDetails(customer);
  openDialog(details);
}
function renderDetails(customer) {
  $('.detail-avatar').textContent = initials(customer.full_name);
  $('#detail-name').textContent = customer.full_name;
  $('.detail-company').textContent = customer.company || 'Independent customer';
  $('.detail-status').textContent = customer.isActive ? 'Active customer' : 'Inactive customer';
  $('.detail-status').classList.toggle('is-inactive', !customer.isActive);
  $('.detail-status-button').textContent = customer.isActive ? 'Mark inactive' : 'Mark active';
  $('.detail-fields').replaceChildren(...[
    ['Email address', customer.email], ['Phone number', customer.phone_number], ['Country', customer.country],
    ['Joined', date(customer.createdAt)], ['Last updated', customer.updatedAt ? date(customer.updatedAt) : 'No changes yet'],
  ].map(([label, value]) => {
    const row = element('div');
    row.append(element('dt', '', label), element('dd', '', value));
    return row;
  }));
}
function openConfirmation(title, message, label, callback, symbol = 'trash') {
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  $('.confirm-action').textContent = label;
  $('.confirm-icon').innerHTML = icon(symbol);
  $('.confirm-error').textContent = '';
  confirmAction = callback;
  openDialog(confirmation, confirmation.querySelector('[data-close]'));
}
async function changeStatus(customer, trigger) {
  if (busy) return;
  busy = true;
  trigger.disabled = true;
  try {
    await setCustomerStatus(customer.id, !customer.isActive);
    await refresh();
    if (details.open) renderDetails(state.customers.find(c => c.id === detailId));
    else focusCustomer(customer.id, 'status');
    toast(customer.full_name + ' marked ' + (customer.isActive ? 'inactive.' : 'active.'));
  } catch (error) { toast(error.message, true); }
  finally { busy = false; trigger.disabled = false; }
}
$('.content-card').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const customer = state.customers.find(c => c.id === button.dataset.id);
  if (!customer) return;
  switch (button.dataset.action) {
    case 'details': openDetails(customer); break;
    case 'edit': openEditor(customer); break;
    case 'status': changeStatus(customer, button); break;
    case 'delete':
      openConfirmation('Delete customer?', 'Remove ' + customer.full_name + ' from your directory? This cannot be undone.', 'Delete customer', async () => {
        await deleteCustomer(customer.id);
        await refresh();
        toast('Customer deleted.');
      });
      break;
  }
});
$('.add-customer').addEventListener('click', () => openEditor());
$('.detail-edit').addEventListener('click', () => {
  const customer = state.customers.find(c => c.id === detailId);
  details.close();
  if (customer) openEditor(customer);
});
$('.detail-status-button').addEventListener('click', event => {
  const customer = state.customers.find(c => c.id === detailId);
  if (customer) changeStatus(customer, event.currentTarget);
});
form.addEventListener('input', event => {
  if (!fields.includes(event.target.name)) return;
  event.target.removeAttribute('aria-invalid');
  $('#error-' + event.target.name).textContent = '';
  $('.form-error').textContent = '';
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const id = form.elements.id.value;
  const { customer, errors } = validateCustomer(Object.fromEntries(new FormData(form)), state.customers, id);
  fields.forEach(field => {
    form.elements[field].setAttribute('aria-invalid', String(Boolean(errors[field])));
    $('#error-' + field).textContent = errors[field] || '';
  });
  if (Object.keys(errors).length) {
    form.elements[Object.keys(errors)[0]].focus();
    return;
  }
  busy = true;
  editor.dataset.busy = 'true';
  $('.save-customer').disabled = true;
  $('.save-customer span').textContent = 'Saving…';
  try {
    const saved = await saveCustomer(customer, id);
    highlightId = saved.id;
    if (!id) { clearFilters(); state.sort = 'createdAt'; state.direction = 'desc'; }
    await refresh();
    editor.dataset.busy = 'false';
    editor.close();
    focusCustomer(saved.id);
    toast(id ? 'Customer details updated.' : saved.full_name + ' added to your directory.');
  } catch (error) { $('.form-error').textContent = error.message; }
  finally {
    busy = false; editor.dataset.busy = 'false'; $('.save-customer').disabled = false;
    $('.save-customer span').textContent = id ? 'Save changes' : 'Add customer';
  }
});
$('.confirm-action').addEventListener('click', async () => {
  if (busy || !confirmAction) return;
  busy = true; confirmation.dataset.busy = 'true'; $('.confirm-action').disabled = true;
  try {
    await confirmAction();
    confirmation.dataset.busy = 'false';
    confirmation.close();
  } catch (error) { $('.confirm-error').textContent = error.message; }
  finally { busy = false; confirmation.dataset.busy = 'false'; $('.confirm-action').disabled = false; }
});
$$('.reset-demo').forEach(button => button.addEventListener('click', () => {
  openConfirmation('Start fresh?', 'This restores the 40 sample customers and clears your demo changes and activity in this browser.', 'Reset demo', async () => {
    await resetDemo();
    clearFilters(); state.sort = 'full_name'; state.direction = 'asc'; highlightId = '';
    await refresh();
    toast('Your demo is ready for a fresh start.');
  }, 'reset');
}));
$$('.help-button').forEach(button => button.addEventListener('click', () => openDialog($('.help-dialog'))));
$('.filter-bar').addEventListener('submit', event => event.preventDefault());
$('#search').addEventListener('input', event => { state.query = event.target.value.trim(); state.page = 1; highlightId = ''; render(); });
$('#status-filter').addEventListener('change', event => { state.status = event.target.value; state.page = 1; render(); });
$('#country-filter').addEventListener('change', event => { state.country = event.target.value; state.page = 1; render(); });
$('.clear-filters').addEventListener('click', () => { clearFilters(); render(); $('#search').focus(); });
$('.empty-action').addEventListener('click', () => {
  if (!state.customers.length) openEditor();
  else { clearFilters(); render(); $('#search').focus(); }
});
$('#sort-order').addEventListener('change', event => { [state.sort, state.direction] = event.target.value.split(':'); state.page = 1; render(); });
$$('.column-sort').forEach(button => button.addEventListener('click', () => {
  state.direction = state.sort === button.dataset.sort && state.direction === 'asc' ? 'desc' : 'asc';
  state.sort = button.dataset.sort; state.page = 1; render();
}));
$('#page-size').addEventListener('change', event => {
  state.pageSize = Number(event.target.value); state.page = 1;
  writePreference('pageSize', event.target.value); render();
});
$('.previous-page').addEventListener('click', () => { state.page--; render(); if ($('.previous-page').disabled) $('.next-page').focus(); });
$('.next-page').addEventListener('click', () => { state.page++; render(); if ($('.next-page').disabled) $('.previous-page').focus(); });
$('.export-button').addEventListener('click', () => {
  if (!filtered.length) return;
  const blob = new Blob([toCSV(filtered)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = element('a');
  link.href = url;
  link.download = 'dashly-customers-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(filtered.length + ' matching customers exported.');
});
function renderActivity() {
  const list = $('.activity-list');
  list.replaceChildren();
  if (!state.activity.length) list.append(element('li', '', 'All caught up. Add or update a customer to see your activity here.'));
  else state.activity.forEach(item => {
    const row = element('li', '', item.text);
    const time = element('time', '', date(item.at, { dateStyle: 'medium', timeStyle: 'short' }));
    time.dateTime = item.at; row.append(time); list.append(row);
  });
  $('.notification-dot').hidden = !state.activity.length || state.activity[0].at === readPreference('seenActivity');
}
function closePopovers() {
  $$('.popover').forEach(node => { node.hidden = true; });
  $('.activity-toggle').setAttribute('aria-expanded', 'false');
  $('.profile-toggle').setAttribute('aria-expanded', 'false');
}
for (const [buttonSelector, panelSelector] of [['.activity-toggle', '.activity-popover'], ['.profile-toggle', '.profile-popover']]) {
  $(buttonSelector).addEventListener('click', () => {
    const opening = $(panelSelector).hidden;
    closePopovers();
    $(panelSelector).hidden = !opening;
    $(buttonSelector).setAttribute('aria-expanded', String(opening));
    if (opening && buttonSelector === '.activity-toggle' && state.activity.length) {
      writePreference('seenActivity', state.activity[0].at); $('.notification-dot').hidden = true;
    }
  });
}
document.addEventListener('click', event => { if (!event.target.closest('.popover-wrap')) closePopovers(); });
document.addEventListener('focusin', event => { if (!event.target.closest('.popover-wrap')) closePopovers(); });
function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  $('.sidebar-backdrop').hidden = true;
  $('.mobile-menu').setAttribute('aria-expanded', 'false');
  $('main').inert = false;
  sidebar.inert = mobileQuery.matches;
}
function openSidebar() {
  closePopovers();
  document.body.classList.add('sidebar-open');
  $('.sidebar-backdrop').hidden = false;
  $('.mobile-menu').setAttribute('aria-expanded', 'true');
  sidebar.inert = false;
  $('main').inert = true;
  $('.nav-item').focus();
}
$('.mobile-menu').addEventListener('click', openSidebar);
$('.sidebar-backdrop').addEventListener('click', () => { closeSidebar(); $('.mobile-menu').focus(); });
$('.nav-item').addEventListener('click', () => { closeSidebar(); $('#directory').focus(); });
mobileQuery.addEventListener('change', closeSidebar);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('dialog[open]')) {
    if (document.body.classList.contains('sidebar-open')) { closeSidebar(); $('.mobile-menu').focus(); }
    else {
      const active = !$('.profile-popover').hidden ? $('.profile-toggle') : !$('.activity-popover').hidden ? $('.activity-toggle') : null;
      closePopovers(); active?.focus();
    }
  }
  if (event.key === 'Tab' && document.body.classList.contains('sidebar-open')) {
    const focusable = [...sidebar.querySelectorAll('a[href], button:not(:disabled)')].filter(node => node.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
function updateTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const button = $('.theme-toggle');
  button.innerHTML = icon(dark ? 'sun' : 'moon') + '<span>' + (dark ? 'Light appearance' : 'Dark appearance') + '</span>';
  button.setAttribute('aria-label', 'Switch to ' + (dark ? 'light' : 'dark') + ' appearance');
}
$('.theme-toggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme); writePreference('theme', theme); updateTheme();
});
window.addEventListener('storage', async event => {
  if (event.key === 'dashly.theme') { applyTheme(readPreference('theme', 'light')); updateTheme(); }
  if (event.key === STORAGE_KEY || event.key === null) {
    await refresh();
    if (details.open) {
      const customer = state.customers.find(c => c.id === detailId);
      if (customer) renderDetails(customer);
      else { details.close(); toast('This customer was removed in another tab.'); }
    }
  }
});
$('.current-date').textContent = date(new Date(), { month: 'short', day: 'numeric', year: 'numeric' });
$('.current-date').dateTime = new Date().toISOString().slice(0, 10);
closeSidebar(); updateTheme();
$('.content-card').setAttribute('aria-busy', 'true');
for (let index = 0; index < 5; index++) {
  const row = element('tr');
  for (let column = 0; column < 6; column++) { const cell = element('td'); cell.append(element('div', 'skeleton')); row.append(cell); }
  $('tbody').append(row);
}
try { await refresh(); }
catch (error) {
  $('.content-card').setAttribute('aria-busy', 'false');
  $('.result-count').textContent = 'The directory could not be opened. Reload the page to try again.';
  toast(error.message, true);
}
