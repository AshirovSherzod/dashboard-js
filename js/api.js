const API_URL = "https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/users";

async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getUsers(name = "", limit = 10) {
  const parsedLimit = Number.parseInt(limit, 10);
  const safeLimit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 10;
  const params = new URLSearchParams({
    page: "1",
    limit: String(safeLimit),
    full_name: name,
  });

  return request(`${API_URL}?${params.toString()}`);
}

export function postUsers(user) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
}

export function deleteUsers(id) {
  return request(`${API_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function putUsers(editedUser, id) {
  return request(`${API_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(editedUser),
  });
}

export function patchUsers(isActive, id) {
  return request(`${API_URL}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isActive),
  });
}
