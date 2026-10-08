#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envFiles = [
  { env: 'apps/backend/.env', example: 'apps/backend/.env.example' },
  { env: 'apps/frontend/.env', example: 'apps/frontend/.env.example' },
];

for (const { env, example } of envFiles) {
  const envPath = path.join(root, env);
  const examplePath = path.join(root, example);

  if (!fs.existsSync(envPath)) {
    if (!fs.existsSync(examplePath)) {
      console.warn(`⚠  No .env.example found at ${example}, skipping`);
      continue;
    }
    fs.copyFileSync(examplePath, envPath);
    console.log(`✔  Created ${env} from ${example}`);
  }
}
