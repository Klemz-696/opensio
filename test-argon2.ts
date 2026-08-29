import * as argon2 from 'argon2';

const hash = '<copie le hash retourné par la requête SQL>';
const password = 'StudentOpenSIO2026!';

async function test() {
  const valid = await argon2.verify(hash, password);
  console.log('Hash valide:', valid);
}

test();