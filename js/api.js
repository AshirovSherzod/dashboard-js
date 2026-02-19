export async function getUsers(name = "") {
  return await fetch(
    `https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/users?page=1&limit=15&full_name=${name}`,
  )
    .then((res) => res.json())
    .then((res) => res)
    .catch((err) => {
      console.log("GET ERROR", err);
    });
}

export async function postUsers(user) {
  return await fetch(
    "https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/users",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    },
  )
    .then((res) => res.json())
    .then((res) => res.data)
    .catch((err) => {
      console.log("POST ERROR", err);
    });
}

export async function deleteUsers(id) {
  return await fetch(
    `https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/users/${id}`,
    {
      method: "DELETE",
    },
  )
    .then((res) => res.json())
    .then((res) => res.data)
    .catch((err) => {
      console.log("DELETE ERROR", err);
    });
}

export async function putUsers(editedUser, id) {
  return await fetch(
    `https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/users/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editedUser),
    },
  )
    .then((res) => res.json())
    .then((res) => res.data)
    .catch((err) => {
      console.log("PUT ERROR", err);
    });
}

export async function patchUsers(isActive, id) {
  return await fetch(
    `https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/users/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(isActive),
    },
  )
    .then((res) => res.json())
    .then((res) => res.data)
    .catch((err) => {
      console.log("PATCH ERROR", err);
    });
}
