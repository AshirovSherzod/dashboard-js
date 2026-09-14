import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedCustomers } from '../js/seed.js';
import { selectCustomers, paginate, validateCustomer, toCSV } from '../js/customers.js';
const seed = createSeedCustomers();

test('seed is stable, independent and suitable for a full paginated demo', () => {
  assert.equal(seed.length, 40);
  assert.equal(new Set(seed.map(c => c.id)).size, 40);
  assert.equal(new Set(seed.map(c => c.email)).size, 40);
  assert.equal(new Set(seed.map(c => c.country)).size, 13);
  assert.equal(seed.filter(c => c.isActive).length, 30);
  const changed = createSeedCustomers(); changed[0].full_name = 'Changed';
  assert.equal(createSeedCustomers()[0].full_name, 'Alex Morgan');
});
test('search matches email and combines country and status without mutating the directory', () => {
  const before = structuredClone(seed);
  const matches = selectCustomers(seed, { query: '  KARIMOV@EXAMPLE.COM ', country: 'Uzbekistan', status: 'inactive' });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].full_name, 'Ali Karimov');
  assert.equal(selectCustomers(seed, { query: 'karimov', status: 'active' }).length, 0);
  assert.deepEqual(seed, before);
});
test('pagination covers all records without overlap and clamps after deletions', () => {
  const sorted = selectCustomers(seed);
  const pages = [1, 2, 3, 4].flatMap(page => paginate(sorted, page, 10).rows);
  assert.deepEqual(pages, sorted);
  assert.equal(paginate(sorted.slice(0, 11), 4, 10).page, 2);
  assert.deepEqual(paginate([], 9, 10), { rows: [], page: 1, pages: 1, start: 0, end: 0 });
});
test('sorting supports both directions, newest first and statuses', () => {
  assert.deepEqual(selectCustomers(seed, { direction: 'desc' }).map(c => c.id), selectCustomers(seed).map(c => c.id).reverse());
  assert.equal(selectCustomers(seed, { sort: 'createdAt', direction: 'desc' })[0].id, 'demo-40');
  assert.equal(selectCustomers(seed, { sort: 'isActive', direction: 'desc' })[0].isActive, true);
});
test('validation rejects whitespace, alphabetic phone numbers and duplicate emails', () => {
  const invalid = validateCustomer({ full_name: '   ', country: '   ', phone_number: 'abcdef', email: 'invalid' });
  assert.deepEqual(Object.keys(invalid.errors).sort(), ['country', 'email', 'full_name', 'phone_number']);
  assert.ok(validateCustomer({ ...seed[0], email: seed[1].email.toUpperCase() }, seed, seed[0].id).errors.email);
  assert.deepEqual(validateCustomer(seed[0], seed, seed[0].id).errors, {});
  assert.equal(validateCustomer({ ...seed[0], country: ' united states ' }, seed, seed[0].id).customer.country, 'United States');
});
test('CSV preserves quotes, commas, newlines and neutralizes spreadsheet formulas', () => {
  const data = [{ ...seed[0], full_name: '=HYPERLINK("unsafe")', company: 'Studio, "North"\nSecond line' }];
  const csv = toCSV(data);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""unsafe"")"'));
  assert.ok(csv.includes('"Studio, ""North""\nSecond line"'));
  assert.ok(csv.includes('"\' +') === false);
  assert.ok(csv.includes('"\'+1 202 555 0100"'));
  assert.equal(toCSV(selectCustomers(seed, { status: 'active' })).split('\r\n').length, 31);
});
