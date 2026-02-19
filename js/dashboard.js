import { deleteUsers, getUsers, patchUsers } from "./api.js";

const tbody = document.querySelector("tbody");
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector(".search-input");

getUsers().then((res) => renderUsers(res));

function renderUsers(data) {
  const newUsers = data
    .map(
      (user) => `
      <tr>
        <td>${user.full_name}</td>
        <td>${user.phone_number}</td>
        <td>${user.email}</td>
        <td>${user.country}</td>
        <td>
          <button 
            data-id="${user.id}"
            data-active="${user.isActive}"
            class="${user.isActive ? "active" : "inactive"} active-btn">
            ${user.isActive ? "Active" : "Inactive"}
          </button>
        </td>
        <td>
          <button class="edit">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button data-id="${user.id}" class="delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
      `,
    )
    .join("");

  tbody.innerHTML = newUsers;
}

tbody.addEventListener("click", (event) => {
  if (event.target.closest(".delete")) {
    const id = event.target.closest(".delete").dataset.id;
    if (confirm("Rostdan ham bu userni o'chirmoqchimisiz ?")) {
      deleteUsers(id).then((res) => {
        getUsers().then((res) => renderUsers(res));
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
      getUsers().then((res) => renderUsers(res));
    });
  }
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

searchInput.addEventListener("input", (event) => {
  let searchValue = event.target.value.trim();
  getUsers(searchValue).then((res) => renderUsers(res));
});
