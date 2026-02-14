const loginForm = document.querySelector(".login-sect__form");
const usernameInput = document.querySelector(".username-input");
const passwordInp = document.querySelector(".password-input");
const passwordBtn = document.querySelector(".password-btn");

passwordBtn.addEventListener("click", () => {
  if (passwordInp.type === "password") {
    passwordInp.type = "text";
    passwordBtn.innerHTML = `<i class="fa-regular fa-eye-slash"></i>`;
  } else {
    passwordInp.type = "password";
    passwordBtn.innerHTML = `<i class="fa-regular fa-eye"></i>`;
  }
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = usernameInput.value;
  const password = passwordInp.value;

  if (username === "" || password === "") {
    alert("Please fill in all fields");
    return;
  }

  if (username === "admin@gmail.com" && password === "administhebest3467") {
    window.location.href = "../pages/dashboard.html";
    return;
  } else {
    alert("Invalid username or password");
  }
});
