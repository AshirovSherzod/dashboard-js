import test from 'node:test';
import assert from 'node:assert/strict';
class Storage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}
test('CRUD persists, retains inactive status on edit, records activity and resets', async () => {
  globalThis.localStorage = new Storage();
  const api = await import('../js/api.js?crud');
  const initial = await api.getCustomers();
  const inactive = initial.customers.find(c => !c.isActive);
  await api.saveCustomer({ ...inactive, full_name: 'Renamed Customer' }, inactive.id);
  assert.equal((await api.getCustomers()).customers.find(c => c.id === inactive.id).isActive, false);
  const saved = await api.saveCustomer({ full_name: 'Test Customer', email: 'test@example.com', phone_number: '+998 90 123 45 67', country: 'Uzbekistan' });
  assert.equal((await api.getCustomers()).customers.length, 41);
  await api.setCustomerStatus(saved.id, false);
  const afterStatus = await api.getCustomers();
  assert.equal(afterStatus.customers.find(c => c.id === saved.id).isActive, false);
  await api.deleteCustomer(saved.id);
  assert.equal((await api.getCustomers()).customers.length, 40);
  assert.ok((await api.getCustomers()).activity[0].text.includes('deleted'));
  await assert.rejects(api.saveCustomer(inactive, 'missing'), /no longer exists/);
  const reset = await api.resetDemo();
  assert.equal(reset.customers[0].full_name, 'Alex Morgan');
  assert.equal(reset.activity.length, 1);
});
test('corrupt data recovers to a complete demo with a visible notice', async () => {
  globalThis.localStorage = new Storage();
  localStorage.setItem('dashly.customers.v1', 'broken json');
  const api = await import('../js/api.js?corrupt');
  assert.equal((await api.getCustomers()).customers.length, 40);
  assert.match(api.getStorageNotice(), /restored/);
  assert.equal(JSON.parse(localStorage.getItem(api.STORAGE_KEY)).version, 1);
});
test('blocked browser storage keeps the demo usable in memory', async () => {
  globalThis.localStorage = { getItem() { throw new DOMException('Denied', 'SecurityError'); }, setItem() { throw new Error('Denied'); } };
  const api = await import('../js/api.js?blocked');
  assert.equal((await api.getCustomers()).customers.length, 40);
  await api.deleteCustomer('demo-01');
  assert.equal((await api.getCustomers()).customers.length, 39);
  assert.match(api.getStorageNotice(), /unavailable/);
});
test('full storage keeps edits for the visit and explains their lifetime', async () => {
  globalThis.localStorage = { getItem() { return null; }, setItem() { throw new DOMException('Full', 'QuotaExceededError'); } };
  const api = await import('../js/api.js?full');
  await api.getCustomers();
  await api.deleteCustomer('demo-01');
  assert.equal((await api.getCustomers()).customers.length, 39);
  assert.match(api.getStorageNotice(), /visit only/);
});
