import { deleteUsers, getUsers, patchUsers, putUsers } from "./api.js";

const body = document.querySelector("body");
const tbody = document.querySelector("tbody");
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector(".search-input");
const limitForm = document.querySelector(".limit-form");
const limitInput = document.querySelector(".limit-input");
const sidebarMode = document.querySelector(".sidebar-mode");
const tableMessage = document.querySelector(".table-message");
const editModal = document.querySelector(".modal");
const editForm = document.querySelector(".edit-form");
const modalClose = document.querySelector(".modal-close");
const modalCancel = document.querySelector(".modal-cancel");
const editId = document.querySelector(".edit-id");
const editName = document.querySelector(".edit-name");
const editPhone = document.querySelector(".edit-phone");
const editEmail = document.querySelector(".edit-email");
const editCountry = document.querySelector(".edit-country");

let users = [];
let searchTimer;
let latestRequest = 0;

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  body.classList.add("dark");
}

loadUsers();

async function loadUsers(name = searchInput.value.trim(), limit = limitInput.value) {
  const requestId = ++latestRequest;
  showMessage("Loading users...");

  try {
    const result = await getUsers(name, limit);
    if (!Array.isArray(result)) {
      throw new Error("Unexpected users response");
    }

    if (requestId !== latestRequest) return;
    users = result;
    renderUsers(users);
    showMessage(users.length ? "" : "No users found.");
  } catch (error) {
    console.error(error);
    renderUsers([]);
    showMessage("Users could not be loaded. Please try again.", true);
  }
}

function showMessage(message, isError = false) {
  tableMessage.textContent = message;
  tableMessage.classList.toggle("error", isError);
}

function renderUsers(data) {
  tbody.replaceChildren();

  data.forEach((user) => {
    const row = document.createElement("tr");
    addCell(row, user.full_name);
    addCell(row, user.phone_number);
    addCell(row, user.email);
    addCell(row, user.country);

    const statusCell = document.createElement("td");
    const statusButton = document.createElement("button");
    statusButton.type = "button";
    statusButton.dataset.id = user.id;
    statusButton.dataset.active = String(Boolean(user.isActive));
    statusButton.className = `${user.isActive ? "active" : "inactive"} active-btn`;
    statusButton.textContent = user.isActive ? "Active" : "Inactive";
    statusButton.setAttribute("aria-label", `Set ${user.full_name} ${user.isActive ? "inactive" : "active"}`);
    statusCell.append(statusButton);
    row.append(statusCell);

    const manageCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit";
    editButton.dataset.id = user.id;
    editButton.setAttribute("aria-label", `Edit ${user.full_name}`);
    editButton.innerHTML = '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>';

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.dataset.id = user.id;
    deleteButton.className = "delete";
    deleteButton.setAttribute("aria-label", `Delete ${user.full_name}`);
    deleteButton.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';

    manageCell.append(editButton, deleteButton);
    row.append(manageCell);
    tbody.append(row);
  });
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";
  row.append(cell);
}

tbody.addEventListener("click", (event) => {
  if (event.target.closest(".delete")) {
    const id = event.target.closest(".delete").dataset.id;
    if (confirm("Rostdan ham bu userni o'chirmoqchimisiz ?")) {
      deleteUsers(id).then(() => {
        loadUsers();
      }).catch((error) => {
        console.error(error);
        showMessage("User could not be deleted.", true);
      });
    }
  }
});

tbody.addEventListener("click", (event) => {
  const btn = event.target.closest(".active-btn");

  if (btn) {
    const id = btn.dataset.id;
    const currentStatus = btn.dataset.active === "true";

    patchUsers(
      {
        isActive: !currentStatus,
      },
      id,
    ).then(() => {
      loadUsers();
    }).catch((error) => {
      console.error(error);
      showMessage("Status could not be updated.", true);
    });
  }

  if (event.target.closest(".edit")) {
    const id = event.target.closest(".edit").dataset.id;
    const user = users.find((item) => String(item.id) === String(id));

    if (user) {
      openEditModal(user);
    }
  }
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(searchTimer);
  loadUsers(searchInput.value.trim(), limitInput.value);
});

searchInput.addEventListener("input", (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadUsers(event.target.value.trim(), limitInput.value), 350);
});

limitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const limit = Number.parseInt(limitInput.value, 10);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    showMessage("Rows per page must be between 1 and 100.", true);
    return;
  }

  loadUsers(searchInput.value.trim(), limit);
});

sidebarMode.addEventListener("click", () => {
  body.classList.toggle("dark");

  if (body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
});

function openEditModal(user) {
  editId.value = user.id;
  editName.value = user.full_name ?? "";
  editPhone.value = user.phone_number ?? "";
  editEmail.value = user.email ?? "";
  editCountry.value = user.country ?? "";
  editModal.classList.add("open");
  editModal.setAttribute("aria-hidden", "false");
  editName.focus();
}

function closeEditModal() {
  editModal.classList.remove("open");
  editModal.setAttribute("aria-hidden", "true");
  editForm.reset();
}

modalClose.addEventListener("click", closeEditModal);
modalCancel.addEventListener("click", closeEditModal);
editModal.addEventListener("click", (event) => {
  if (event.target === editModal) closeEditModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editModal.classList.contains("open")) {
    closeEditModal();
  }
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!editForm.checkValidity()) {
    editForm.reportValidity();
    return;
  }

  const saveButton = editForm.querySelector(".modal-save");
  saveButton.disabled = true;

  try {
    await putUsers(
      {
        full_name: editName.value.trim(),
        phone_number: editPhone.value.trim(),
        email: editEmail.value.trim(),
        country: editCountry.value.trim(),
      },
      editId.value,
    );
    closeEditModal();
    await loadUsers();
  } catch (error) {
    console.error(error);
    showMessage("User could not be updated.", true);
  } finally {
    saveButton.disabled = false;
  }
});
