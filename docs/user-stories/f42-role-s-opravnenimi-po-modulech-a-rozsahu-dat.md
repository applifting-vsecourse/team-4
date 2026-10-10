---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F42] Role s oprávněními po modulech a rozsahu dat'
labels: 'epic: přístupy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci nastavit role podle modulů a nezbytného rozsahu dat, aby členové viděli jen údaje a operace potřebné pro svou práci.

## Kontext

Feature [F42 — Role a oprávnění](coverage.md), epic Přístupy. Umožňuje spolupráci při zachování oprávnění a soukromí dat.

## Akceptační kritéria

- [ ] Nastavení role umožní rozlišit přístup k modulům od povoleného rozsahu jejich dat.
- [ ] Role omezená na konkrétní oddíl v seznamu, detailu ani exportu nezíská účastníky mimo tento oddíl.
- [ ] Role kuchyně podle nastavené matice vidí pouze nezbytné údaje ke stravě, nikoli ostatní soukromé údaje.
- [ ] Nepovolená operace ani přímý odkaz nepřekročí oprávnění role a uživatel vidí srozumitelně odmítnutý přístup.
- [ ] Člen bez oprávnění nevidí cizí nebo citlivá data; v přehledu je vysvětlený nedostupný rozsah.

## Mimo rozsah

- Pozvání a odebrání členů týmu.
- Návaznosti: [F18](f18-soukrome-ubytovaci-potreby-a-preference.md), [F37-1](f37-1-filtrovani-seznamu-ucastniku.md), [F37-2](f37-2-csv-export-opravneneho-seznamu-ucastniku.md), [F38](f38-detail-ucastnika-s-platbami-historii-a-internimi-poznamkami.md), [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md), [F41](f41-oddeleni-dat-organizaci-vcetne-primych-odkazu.md), [F44-1](f44-1-evidence-zneni-a-casu-souhlasu-vcetne-zastupce.md), [F44-2](f44-2-odvolani-souhlasu-se-zachovanim-historie.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 46.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F42 z feature breakdownu akc.io.
