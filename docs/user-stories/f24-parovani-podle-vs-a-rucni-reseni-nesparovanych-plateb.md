---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F24] Párování podle VS a ruční řešení nespárovaných plateb'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci spárovat platby podle variabilního symbolu a vyřešit nejednoznačné položky, abych věděl, které přihlášky jsou uhrazené.

## Kontext

Feature [F24 — Párování plateb](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] Transakce s jednoznačně odpovídajícím variabilním symbolem se zobrazí u správné přihlášky.
- [ ] Platba bez odpovídajícího či s nejednoznačným variabilním symbolem zůstane ve frontě nespárovaných, kde ji pořadatel může otevřít k ručnímu řešení.
- [ ] Po spárování pořadatel vidí odpovídající nedoplatek, přeplatek nebo vyrovnané saldo.
- [ ] Jedna transakce není přičtena v plné výši k více přihláškám.
- [ ] Bez nespárovaných transakcí fronta zobrazí prázdný stav; bez plateb přihláška neukazuje uhrazenou částku.

## Mimo rozsah

- Bankovní import a automatické refundace.
- Návaznosti: [F23](f23-import-bankovnich-plateb-z-podporovaneho-csv.md), [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md), [F34](f34-moje-platby-dluh-qr-a-historie.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 28.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F24 z feature breakdownu akc.io.
