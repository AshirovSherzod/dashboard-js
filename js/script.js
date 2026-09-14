import { icon } from './ui.js';
const form = document.querySelector('.login-sect__form');
const email = document.querySelector('.username-input');
const password = document.querySelector('.password-input');
const message = document.querySelector('.login-message');
const passwordButton = document.querySelector('.password-btn');
const enter = () => { window.location.href = './pages/dashboard.html'; };
document.querySelector('.try-demo').addEventListener('click', enter);
passwordButton.addEventListener('click', () => {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  passwordButton.innerHTML = icon(visible ? 'eye-off' : 'eye');
  passwordButton.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
});
form.addEventListener('submit', event => {
  event.preventDefault();
  message.textContent = '';
  if (!form.checkValidity() || !email.value.trim() || !password.value) {
    message.textContent = 'Please enter a valid email and password.';
    (!email.validity.valid || !email.value.trim() ? email : password).focus();
    return;
  }
  if (email.value.trim().toLowerCase() === 'admin@gmail.com' && password.value === 'administhebest3467') enter();
  else message.textContent = 'Those demo credentials do not match. You can also use Try demo above.';
});
