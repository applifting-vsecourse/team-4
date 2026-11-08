#!/usr/bin/env node
// akc.io demo photos (S3-T5): uploads or removes the photos of the demo events.
//
//   node apps/backend/prisma/demo/demo-photos.mjs upload   # replace the photos with ./photos
//   node apps/backend/prisma/demo/demo-photos.mjs delete   # remove every photo of the demo events
//
// It signs in as the demo organizer and goes through the public API, so the
// application's own validation and storage handling apply. `upload` first
// removes the event's current photos, so every run ends in the same state.
//
// Environment (optional): DEMO_URL (default: production), DEMO_EMAIL,
// DEMO_PASSWORD (default: the demo organizer from README.md).
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = (
  process.env.DEMO_URL ?? 'https://team-4.vsepractical.applifting.dev'
).replace(/\/$/, '');
const EMAIL = process.env.DEMO_EMAIL ?? 'team4vse@seznam.cz';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'akcio-demo-2026';
const PHOTOS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'photos');

// Demo event name (demo-create.sql) → folder in ./photos. Files upload in
// name order; the first one is the photo shown in the catalog.
const EVENTS = {
  'Tábor v Jizerkách': 'tabor',
  'Víkendový kurz první pomoci': 'kurz',
  'Výstup na Sněžku': 'snezka',
  'Úklid Kunratického lesa': 'uklid',
};

const command = process.argv[2];
if (command !== 'upload' && command !== 'delete') {
  console.error('Usage: node demo-photos.mjs <upload|delete>');
  process.exit(1);
}

let cookie = '';

async function api(method, path, body) {
  const response = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: {
      Origin: BASE_URL,
      Cookie: cookie,
      ...(body && !(body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    body: body instanceof FormData ? body : body && JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(
      `${method} ${path} → ${response.status} ${await response.text()}`,
    );
  }
  return { response, data: await response.json().catch(() => null) };
}

async function signIn() {
  const { response } = await api('POST', '/auth/sign-in/email', {
    email: EMAIL,
    password: PASSWORD,
  });
  cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ');
  if (!cookie) throw new Error('Sign-in returned no session cookie');
}

async function demoEvents() {
  const { data: organizations } = await api('GET', '/organizations');
  const found = [];
  for (const organization of organizations) {
    const { data: events } = await api(
      'GET',
      `/organizations/${organization.id}/events`,
    );
    for (const event of events) {
      if (event.name in EVENTS) {
        found.push({
          ...event,
          path: `/organizations/${organization.id}/events/${event.id}`,
        });
      }
    }
  }
  const missing = Object.keys(EVENTS).filter(
    (name) => !found.some((event) => event.name === name),
  );
  if (missing.length) {
    console.warn(
      `Not found (run demo-create.sql first?): ${missing.join(', ')}`,
    );
  }
  return found;
}

async function removePhotos(event) {
  const { data: detail } = await api('GET', event.path);
  for (const photo of detail.photos) {
    await api('DELETE', `${event.path}/photos/${photo.id}`);
  }
  return detail.photos.length;
}

async function uploadPhotos(event) {
  const folder = join(PHOTOS_DIR, EVENTS[event.name]);
  const files = (await readdir(folder))
    .filter((file) => file.endsWith('.jpg'))
    .sort();
  for (const file of files) {
    const form = new FormData();
    const bytes = await readFile(join(folder, file));
    form.append('file', new Blob([bytes], { type: 'image/jpeg' }), file);
    await api('POST', `${event.path}/photos`, form);
  }
  return files.length;
}

await signIn();
console.log(`Signed in to ${BASE_URL} as ${EMAIL}`);
for (const event of await demoEvents()) {
  const removed = await removePhotos(event);
  const added = command === 'upload' ? await uploadPhotos(event) : 0;
  console.log(`${event.name}: removed ${removed}, uploaded ${added}`);
}
