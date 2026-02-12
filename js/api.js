export async function getUsers() {
  return await fetch(
    "https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/contacts",
  )
    .then((res) => res.json())
    .then((res) => res.data)
    .catch((err) => {
      console.log("GET ERROR", err);
    });
}

export async function postUsers(user) {
  return await fetch(
    "https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/contacts",
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

export async function postUsers(id) {
  return await fetch(
    `https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/contacts/${id}`,
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

export async function postUsers(editedUser, id) {
  return await fetch(
    `https://686519fe5b5d8d03397fb476.mockapi.io/ap/v1/contacts/${id}`,
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
