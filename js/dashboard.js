import { deleteUsers, getUsers, postUsers, putUsers, updateUserStatus } from "./api.js";

const body = document.querySelector("body");
const table = document.querySelector("table");
const tbody = document.querySelector("tbody");
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector(".search-input");
const limitForm = document.querySelector(".limit-form");
const limitInput = document.querySelector(".limit-input");
const sidebarMode = document.querySelector(".sidebar-mode");
const themeIcon = document.querySelector(".theme-icon");
const mobileMenu = document.querySelector(".mobile-menu");
const sidebarBackdrop = document.querySelector(".sidebar-backdrop");
const usersNavButton = document.querySelector(".sidebar-pages__users");
const tableMessage = document.querySelector(".table-message");
const emptyState = document.querySelector(".empty-state");
const emptyTitle = document.querySelector(".empty-title");
const emptyDescription = document.querySelector(".empty-description");
const emptyReset = document.querySelector(".empty-reset");
const resultCount = document.querySelector(".result-count");
const currentDate = document.querySelector(".current-date");
const visibleUsers = document.querySelector("#visible-users");
const activeUsers = document.querySelector("#active-users");
const inactiveUsers = document.querySelector("#inactive-users");
const countryCount = document.querySelector("#country-count");
const addCustomerButton = document.querySelector(".add-customer");
const editModal = document.querySelector(".edit-modal");
const editTitle = document.querySelector("#edit-title");
const editForm = document.querySelector(".edit-form");
const modalClose = document.querySelector(".modal-close");
const modalCancel = document.querySelector(".modal-cancel");
const modalSaveLabel = document.querySelector(".modal-save-label");
const editId = document.querySelector(".edit-id");
const editName = document.querySelector(".edit-name");
const editPhone = document.querySelector(".edit-phone");
const editEmail = document.querySelector(".edit-email");
const editCountry = document.querySelector(".edit-country");
const confirmModal = document.querySelector(".confirm-modal");
const confirmMessage = document.querySelector(".confirm-message");
const confirmCancel = document.querySelector(".confirm-cancel");
const confirmDelete = document.querySelector(".confirm-delete");
const toastRegion = document.querySelector(".toast-region");
const notificationWrap = document.querySelector(".notification-wrap");
const notificationButton = document.querySelector(".notification-button");
const notificationPopover = document.querySelector(".notification-popover");
const profileWrap = document.querySelector(".profile-wrap");
const profileButton = document.querySelector(".admin-profile");
const profilePopover = document.querySelector(".profile-popover");

let users = [];
let searchTimer;
let latestRequest = 0;
let pendingDeleteId = null;
let editReturnFocus = null;
let confirmReturnFocus = null;
let editStatus = true;

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  body.classList.add("dark");
}

currentDate.textContent = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date());

updateThemeIcon();
loadUsers();

async function loadUsers(name = searchInput.value.trim(), limit = limitInput.value) {
  const requestId = ++latestRequest;
  showLoadingSkeleton();
  showMessage("");

  try {
    const result = await getUsers(name, limit);
    if (!Array.isArray(result)) {
      throw new Error("Unexpected users response");
    }

    if (requestId !== latestRequest) return;
    users = result;
    renderUsers(users);
    if (!users.length) {
      showEmptyState(
        searchInput.value.trim() ? "No customers found" : "No customers yet",
        searchInput.value.trim()
          ? "Try a different search or clear the current filter."
          : "Add your first customer to start building the directory.",
      );
    }
  } catch (error) {
    if (requestId !== latestRequest) return;
    console.error(error);
    users = [];
    renderUsers([]);
    showEmptyState("Could not load customers", "Check your connection and try again.", "Try again");
    showMessage("Users could not be loaded. Please try again.", true);
    showToast("Customers could not be loaded.", "error");
  }
}

function showMessage(message, isError = false) {
  tableMessage.textContent = message;
  tableMessage.classList.toggle("error", isError);
}

function showLoadingSkeleton() {
  table.hidden = false;
  emptyState.hidden = true;
  tbody.replaceChildren();

  for (let rowIndex = 0; rowIndex < 5; rowIndex += 1) {
    const row = document.createElement("tr");
    for (let cellIndex = 0; cellIndex < 6; cellIndex += 1) {
      const cell = document.createElement("td");
      const line = document.createElement("span");
      line.className = `skeleton-line skeleton-line--${cellIndex === 0 ? "name" : "default"}`;
      cell.append(line);
      row.append(cell);
    }
    tbody.append(row);
  }
}

function renderUsers(data) {
  tbody.replaceChildren();
  table.hidden = data.length === 0;
  emptyState.hidden = data.length !== 0;

  data.forEach((user) => {
    const row = document.createElement("tr");

    const customerCell = document.createElement("td");
    const customer = document.createElement("div");
    customer.className = "customer-cell";

    const avatar = document.createElement("span");
    avatar.className = "customer-avatar";
    avatar.textContent = getInitials(user.full_name);

    const name = document.createElement("span");
    name.className = "customer-name";
    name.textContent = user.full_name ?? "Unknown customer";

    customer.append(avatar, name);
    customerCell.append(customer);
    row.append(customerCell);

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

  updateStats(data);
}

function showEmptyState(title, description, actionLabel = "Clear search") {
  emptyTitle.textContent = title;
  emptyDescription.textContent = description;
  emptyReset.textContent = actionLabel;
  emptyState.hidden = false;
  table.hidden = true;
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "-";
  row.append(cell);
}

function getInitials(value = "") {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function updateStats(data) {
  const active = data.filter((user) => Boolean(user.isActive)).length;
  const countries = new Set(
    data
      .map((user) => String(user.country ?? "").trim().toLowerCase())
      .filter(Boolean),
  ).size;

  visibleUsers.textContent = String(data.length);
  activeUsers.textContent = String(active);
  inactiveUsers.textContent = String(data.length - active);
  countryCount.textContent = String(countries);
  resultCount.textContent = `${data.length} ${data.length === 1 ? "user" : "users"} shown`;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const icon = document.createElement("i");
  icon.className = type === "error" ? "fa-solid fa-circle-exclamation" : "fa-solid fa-circle-check";
  icon.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = message;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "toast-close";
  closeButton.setAttribute("aria-label", "Dismiss notification");
  closeButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

  const removeToast = () => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 180);
  };

  closeButton.addEventListener("click", removeToast);
  toast.append(icon, text, closeButton);
  toastRegion.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(removeToast, 4200);
}

tbody.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest(".delete");
  if (deleteButton) {
    const user = users.find((item) => String(item.id) === String(deleteButton.dataset.id));
    openConfirmModal(deleteButton.dataset.id, user?.full_name);
    return;
  }

  const statusButton = event.target.closest(".active-btn");
  if (statusButton) {
    const id = statusButton.dataset.id;
    const currentStatus = statusButton.dataset.active === "true";
    const user = users.find((item) => String(item.id) === String(id));

    if (!user) return;

    statusButton.disabled = true;

    try {
      await updateUserStatus(
        {
          full_name: user.full_name ?? "",
          phone_number: user.phone_number ?? "",
          email: user.email ?? "",
          country: user.country ?? "",
          isActive: !currentStatus,
        },
        id,
      );
      showToast(`User marked ${currentStatus ? "inactive" : "active"}.`);
      await loadUsers();
    } catch (error) {
      console.error(error);
      showMessage("Status could not be updated.", true);
      showToast("Status could not be updated.", "error");
    } finally {
      statusButton.disabled = false;
    }
    return;
  }

  const editButton = event.target.closest(".edit");
  if (editButton) {
    const user = users.find((item) => String(item.id) === String(editButton.dataset.id));
    if (user) openEditModal(user);
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
    showToast("Rows per page must be between 1 and 100.", "error");
    return;
  }

  loadUsers(searchInput.value.trim(), limit);
});

emptyReset.addEventListener("click", () => {
  if (searchInput.value.trim()) {
    searchInput.value = "";
    loadUsers("", limitInput.value);
  } else {
    loadUsers();
  }
});

addCustomerButton.addEventListener("click", () => openAddModal());

sidebarMode.addEventListener("click", () => {
  body.classList.toggle("dark");
  localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
  updateThemeIcon();
});

function updateThemeIcon() {
  const isDark = body.classList.contains("dark");
  themeIcon.classList.toggle("fa-moon", !isDark);
  themeIcon.classList.toggle("fa-sun", isDark);
}

function closeSidebar() {
  body.classList.remove("sidebar-open");
  mobileMenu.setAttribute("aria-expanded", "false");
}

mobileMenu.addEventListener("click", () => {
  const isOpen = body.classList.toggle("sidebar-open");
  mobileMenu.setAttribute("aria-expanded", String(isOpen));
});

sidebarBackdrop.addEventListener("click", closeSidebar);
usersNavButton.addEventListener("click", closeSidebar);

function openEditModal(user) {
  editReturnFocus = document.activeElement;
  editTitle.textContent = "Edit customer";
  modalSaveLabel.textContent = "Save changes";
  editId.value = user.id;
  editStatus = Boolean(user.isActive);
  editName.value = user.full_name ?? "";
  editPhone.value = user.phone_number ?? "";
  editEmail.value = user.email ?? "";
  editCountry.value = user.country ?? "";
  openModal(editModal);
  editName.focus();
}

function openAddModal() {
  editReturnFocus = document.activeElement;
  editTitle.textContent = "Add customer";
  modalSaveLabel.textContent = "Add customer";
  editForm.reset();
  editId.value = "";
  editStatus = true;
  openModal(editModal);
  editName.focus();
}

function closeEditModal() {
  closeModal(editModal);
  editForm.reset();
  editTitle.textContent = "Edit customer";
  modalSaveLabel.textContent = "Save changes";
  restoreFocus(editReturnFocus);
  editReturnFocus = null;
}

function openConfirmModal(id, name = "this customer") {
  pendingDeleteId = id;
  confirmReturnFocus = document.activeElement;
  confirmMessage.textContent = `Delete ${name || "this customer"}? This action cannot be undone.`;
  openModal(confirmModal);
  confirmDelete.focus();
}

function closeConfirmModal() {
  closeModal(confirmModal);
  pendingDeleteId = null;
  confirmDelete.disabled = false;
  restoreFocus(confirmReturnFocus);
  confirmReturnFocus = null;
}

function openModal(modal) {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function restoreFocus(element) {
  if (element && typeof element.focus === "function") element.focus();
}

modalClose.addEventListener("click", closeEditModal);
modalCancel.addEventListener("click", closeEditModal);
editModal.addEventListener("click", (event) => {
  if (event.target === editModal) closeEditModal();
});

confirmCancel.addEventListener("click", closeConfirmModal);
confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) closeConfirmModal();
});

confirmDelete.addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  confirmDelete.disabled = true;

  try {
    await deleteUsers(pendingDeleteId);
    closeConfirmModal();
    showToast("Customer deleted successfully.");
    await loadUsers();
  } catch (error) {
    console.error(error);
    confirmDelete.disabled = false;
    showMessage("User could not be deleted.", true);
    showToast("Customer could not be deleted.", "error");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (editModal.classList.contains("open")) closeEditModal();
  if (confirmModal.classList.contains("open")) closeConfirmModal();
  closePopovers();
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!editForm.checkValidity()) {
    editForm.reportValidity();
    return;
  }

  const saveButton = editForm.querySelector(".modal-save");
  const isEditing = Boolean(editId.value);
  const payload = {
    full_name: editName.value.trim(),
    phone_number: editPhone.value.trim(),
    email: editEmail.value.trim(),
    country: editCountry.value.trim(),
    isActive: editStatus,
  };

  saveButton.disabled = true;

  try {
    if (isEditing) {
      await putUsers(payload, editId.value);
    } else {
      await postUsers({ ...payload, isActive: true });
    }

    closeEditModal();
    showToast(isEditing ? "Customer updated successfully." : "Customer added successfully.");
    await loadUsers();
  } catch (error) {
    console.error(error);
    showMessage(isEditing ? "User could not be updated." : "User could not be added.", true);
    showToast(isEditing ? "Customer could not be updated." : "Customer could not be added.", "error");
  } finally {
    saveButton.disabled = false;
  }
});

function closePopovers() {
  notificationPopover.hidden = true;
  profilePopover.hidden = true;
  notificationButton.setAttribute("aria-expanded", "false");
  profileButton.setAttribute("aria-expanded", "false");
}

notificationButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = notificationPopover.hidden;
  closePopovers();
  notificationPopover.hidden = !isOpen;
  notificationButton.setAttribute("aria-expanded", String(isOpen));
});

profileButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = profilePopover.hidden;
  closePopovers();
  profilePopover.hidden = !isOpen;
  profileButton.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (event) => {
  if (!notificationWrap.contains(event.target) && !profileWrap.contains(event.target)) {
    closePopovers();
  }
});
