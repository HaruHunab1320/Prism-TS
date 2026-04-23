const names = [];
for (const user of users) {
  names.push(user.name.toUpperCase());
}

let totalAge = 0;
for (const user of users) {
  totalAge += user.age;
}

const usersById = {};
for (const user of users) {
  usersById[user.id] = user;
}
