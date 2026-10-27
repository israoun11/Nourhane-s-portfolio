// Creates the ADMIN_PASSWORD_HASH value for your .env / hosting settings.
// Usage:  npm run admin:password
// The password is typed without being shown and is never stored — only its hash.
import readline from 'node:readline';
import { hashPassword } from '../lib/auth.js';

function ask(question, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else rl.output.write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const fromArg = process.argv[2];
let password = fromArg;
if (!password) {
  password = await ask('New admin password (min. 12 characters): ', true);
  const again = await ask('Repeat the password: ', true);
  if (password !== again) {
    console.error('\n✖ The two passwords do not match.');
    process.exit(1);
  }
}
if (!password || password.length < 12) {
  console.error('\n✖ Use at least 12 characters (a short sentence works well).');
  process.exit(1);
}
const hash = await hashPassword(password);
console.log('\nAdd this line to your .env file (and to your hosting environment variables):\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
