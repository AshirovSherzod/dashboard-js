const loginForm = document.querySelector(".login-sect__form");
const usernameInput = document.querySelector(".username-input");
const passwordInp = document.querySelector(".password-input");
const passwordBtn = document.querySelector(".password-btn");
const loginMessage = document.querySelector(".login-message");

passwordBtn.addEventListener("click", () => {
  if (passwordInp.type === "password") {
    passwordInp.type = "text";
    passwordBtn.innerHTML = `<i class="fa-regular fa-eye-slash"></i>`;
    passwordBtn.setAttribute("aria-label", "Hide password");
  } else {
    passwordInp.type = "password";
    passwordBtn.innerHTML = `<i class="fa-regular fa-eye"></i>`;
    passwordBtn.setAttribute("aria-label", "Show password");
  }
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInp.value;
  loginMessage.textContent = "";

  if (!loginForm.checkValidity() || username === "" || password === "") {
    loginMessage.textContent = "Please enter a valid email and password.";
    return;
  }

  if (username === "admin@gmail.com" && password === "administhebest3467") {
    window.location.href = "./pages/dashboard.html";
    return;
  }

  loginMessage.textContent = "That demo email or password is not correct.";
});
