import { createSeedCustomers } from './seed.js';
import { validateCustomer } from './customers.js';

export const STORAGE_KEY = 'dashly.customers.v1';
let memory;
let notice = '';
let memoryOnly = false;

function freshState() {
  return { version: 1, customers: createSeedCustomers(), activity: [] };
}
function validState(value) {
  return value?.version === 1 && Array.isArray(value.customers)
    && value.customers.every(c => c && ['id', 'full_name', 'email', 'phone_number', 'country'].every(key => typeof c[key] === 'string') && typeof c.isActive === 'boolean'
      && (c.company == null || typeof c.company === 'string')
      && (c.createdAt == null || typeof c.createdAt === 'string')
      && (c.updatedAt == null || typeof c.updatedAt === 'string'))
    && new Set(value.customers.map(c => c.id)).size === value.customers.length
    && Array.isArray(value.activity)
    && value.activity.every(item => item && typeof item.text === 'string' && typeof item.at === 'string');
}
function readState() {
  if (memoryOnly) return structuredClone(memory);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!validState(parsed)) throw new Error('Invalid saved demo');
      memory = parsed;
      return structuredClone(memory);
    }
  } catch (error) {
    if (error.name === 'SecurityError') {
      memoryOnly = true;
      notice = 'Browser storage is unavailable. Changes last until this page is closed.';
    } else notice = 'Saved demo data could not be read. A fresh sample directory has been restored.';
  }
  memory = freshState();
  writeState(memory);
  return structuredClone(memory);
}
function writeState(state) {
  memory = structuredClone(state);
  if (memoryOnly) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch {
    memoryOnly = true;
    notice = 'Changes are kept for this visit only because browser storage is unavailable or full.';
  }
}
function record(state, text) {
  state.activity.unshift({ text, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 12);
  writeState(state);
}
export async function getCustomers() { return readState(); }
export function getStorageNotice() { return notice; }
export async function saveCustomer(input, id = '') {
  const state = readState();
  const existing = id ? state.customers.find(c => c.id === id) : null;
  if (id && !existing) throw new Error('This customer no longer exists. Refresh the directory and try again.');
  const { customer, errors } = validateCustomer(input, state.customers, id);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const saved = {
    ...existing, ...customer, id: existing?.id ?? crypto.randomUUID(),
    isActive: existing?.isActive ?? true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (existing) state.customers[state.customers.indexOf(existing)] = saved;
  else state.customers.unshift(saved);
  record(state, saved.full_name + (existing ? ' was updated.' : ' was added to the directory.'));
  return structuredClone(saved);
}
export async function setCustomerStatus(id, isActive) {
  const state = readState();
  const customer = state.customers.find(c => c.id === id);
  if (!customer) throw new Error('This customer no longer exists.');
  customer.isActive = Boolean(isActive);
  customer.updatedAt = new Date().toISOString();
  record(state, customer.full_name + ' was marked ' + (customer.isActive ? 'active.' : 'inactive.'));
}
export async function deleteCustomer(id) {
  const state = readState();
  const customer = state.customers.find(c => c.id === id);
  if (!customer) throw new Error('This customer has already been deleted.');
  state.customers = state.customers.filter(c => c.id !== id);
  record(state, customer.full_name + ' was deleted.');
}
export async function resetDemo() {
  const state = freshState();
  record(state, 'Demo reset. The 40 sample customers are ready to explore.');
  return structuredClone(state);
}
