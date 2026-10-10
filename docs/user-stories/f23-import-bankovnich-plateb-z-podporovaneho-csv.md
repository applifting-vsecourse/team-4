---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F23] Import bankovních plateb z podporovaného CSV'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci nahrát CSV výpis jedné podporované banky, abych mohl načíst úhrady bez ručního přepisování.

## Kontext

Feature [F23 — Načítání plateb z banky](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] Po nahrání platného výpisu podporované banky pořadatel vidí načtené transakce a výsledek importu.
- [ ] Zobrazené částky, variabilní symboly a data transakcí odpovídají řádkům podporovaného výpisu.
- [ ] Při nepodporovaném formátu nebo neplatných datech import ukáže srozumitelnou chybu a nepředstírá úspěšné načtení vadných položek.
- [ ] Opakované nahrání stejného výpisu nesmí zdvojnásobit přijaté platby ani saldo.
- [ ] CSV bez transakcí zobrazí výsledek s nulovým počtem a nezmění saldo přihlášek.

## Mimo rozsah

- Bankovní API a další banky; párování transakcí.
- Návaznosti: [F24](f24-parovani-podle-vs-a-rucni-reseni-nesparovanych-plateb.md), [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 27.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F23 z feature breakdownu akc.io.
