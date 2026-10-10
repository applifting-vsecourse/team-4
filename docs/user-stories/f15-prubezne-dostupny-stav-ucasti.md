---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F15] Průběžně dostupný stav účasti'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci průběžně vidět stav své účasti, abych věděl, zda jsem potvrzený, náhradník nebo čekám na schválení.

## Kontext

Feature [F15 — Průběžné zveřejnění stavu přihlášky](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Po vyhodnocení nové přihlášky či rozhodnutí pořadatele je aktuální stav dostupný v účastnickém detailu bez čekání na hromadné uzavření registrace.
- [ ] Detail rozlišuje potvrzenou účast, náhradníka a čekání na manuální schválení.
- [ ] Změna stavu účasti se shoduje se stavem v pořadatelském detailu a neslučuje účast s informací o úhradě.
- [ ] Příslušná notifikace podle nastavené komunikační politiky obsahuje skutečný nový stav, nikoli příslib nepotvrzené účasti.
- [ ] Bez vlastní přihlášky portál zobrazí prázdný stav s cestou do katalogu.

## Mimo rozsah

- Tvorba e-mailových šablon a změny plateb.
- Návaznosti: [F33](f33-prehled-mych-prihlasek-a-terminu.md), [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 19.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F15 z feature breakdownu akc.io.
