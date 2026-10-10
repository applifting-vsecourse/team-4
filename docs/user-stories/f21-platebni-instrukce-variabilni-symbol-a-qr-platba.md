---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F21] Platební instrukce, variabilní symbol a QR platba'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci vidět platební instrukce a QR kód pro svou platbu, abych mohl zaplatit správnou částku se správným označením.

## Kontext

Feature [F21 — Platební instrukce a QR](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] V platebním detailu účastník vidí číslo účtu, variabilní symbol a příslušnou částku pro svou přihlášku.
- [ ] Po načtení QR kódu v bankovní aplikaci se zobrazí stejný účet, variabilní symbol a částka jako v detailu.
- [ ] Účastník má dostupnou informaci o možnosti hotovostní úhrady podle nastavení pořadatele.
- [ ] Platební instrukce jiné osoby nejsou dostupné změnou adresy detailu.
- [ ] Pokud instrukce nejsou nakonfigurované, účastník vidí jejich nedostupnost a pořadatel chybějící nastavení; nezobrazí se neplatný QR kód.

## Mimo rozsah

- Bankovní import, párování plateb, splátkový plán a refundace.
- Návaznosti: [F22](f22-odlozeny-platebni-plan-se-zalohou-a-splatkami.md), [F23](f23-import-bankovnich-plateb-z-podporovaneho-csv.md), [F24](f24-parovani-podle-vs-a-rucni-reseni-nesparovanych-plateb.md), [F31](f31-odlozena-evidence-vraceni-penez-mimo-aplikaci.md), [F34](f34-moje-platby-dluh-qr-a-historie.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 25.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F21 z feature breakdownu akc.io.
