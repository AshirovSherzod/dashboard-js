const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
export const SORT_KEYS = ['full_name', 'email', 'phone_number', 'country', 'isActive', 'createdAt'];

export function selectCustomers(customers, { query = '', status = 'all', country = '', sort = 'full_name', direction = 'asc' } = {}) {
  const term = query.trim().toLocaleLowerCase();
  const key = SORT_KEYS.includes(sort) ? sort : 'full_name';
  return customers.filter(c => (!term || (c.full_name + ' ' + c.email).toLocaleLowerCase().includes(term))
    && (status === 'all' || c.isActive === (status === 'active')) && (!country || c.country === country))
    .sort((a, b) => {
      const order = collator.compare(String(a[key] ?? ''), String(b[key] ?? ''));
      return (direction === 'desc' ? -order : order) || collator.compare(a.id, b.id);
    });
}
export function paginate(customers, page = 1, pageSize = 10) {
  const size = [10, 20, 50].includes(Number(pageSize)) ? Number(pageSize) : 10;
  const pages = Math.max(1, Math.ceil(customers.length / size));
  const current = Math.max(1, Math.min(Number.isInteger(page) ? page : 1, pages));
  const start = (current - 1) * size;
  return { rows: customers.slice(start, start + size), page: current, pages,
    start: customers.length ? start + 1 : 0, end: Math.min(start + size, customers.length) };
}
export function validateCustomer(input, customers = [], id = '') {
  const customer = Object.fromEntries(['full_name', 'email', 'phone_number', 'country', 'company'].map(key => [key, String(input[key] ?? '').trim()]));
  const errors = {};
  if (customer.full_name.length < 2 || customer.full_name.length > 80) errors.full_name = 'Enter a name between 2 and 80 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.email.length > 120) errors.email = 'Enter a valid email address, such as alex@example.com.';
  else if (customers.some(c => c.id !== id && c.email.toLowerCase() === customer.email.toLowerCase())) errors.email = 'A customer with this email already exists.';
  const digits = customer.phone_number.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(customer.phone_number) || digits.length < 7 || digits.length > 15) errors.phone_number = 'Use 7–15 digits, with an optional +, spaces, brackets or dashes.';
  if (customer.country.length < 2 || customer.country.length > 60 || !/\p{L}/u.test(customer.country)) errors.country = 'Enter a country name between 2 and 60 characters.';
  if (customer.company.length > 100) errors.company = 'Keep the company name under 100 characters.';
  const knownCountry = customers.find(c => c.country.toLowerCase() === customer.country.toLowerCase());
  if (knownCountry) customer.country = knownCountry.country;
  return { customer, errors };
}
export function toCSV(customers) {
  const escape = value => {
    let text = String(value ?? '');
    // Keep spreadsheet imports from interpreting customer text as formulas.
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const rows = [['Customer', 'Email', 'Phone', 'Country', 'Company', 'Status', 'Joined'],
    ...customers.map(c => [c.full_name, c.email, c.phone_number, c.country, c.company, c.isActive ? 'Active' : 'Inactive', c.createdAt?.slice(0, 10)])];
  return '\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n');
}
