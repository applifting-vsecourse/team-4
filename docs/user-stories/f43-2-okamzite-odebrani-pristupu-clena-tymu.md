---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F43-2] Okamžité odebrání přístupu člena týmu'
labels: 'epic: přístupy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci odebrat člena týmu s okamžitým zánikem přístupu, aby bývalý člen nemohl dále používat data organizace.

## Kontext

Feature [F43 — Pozvání a odebrání člena týmu](coverage.md), epic Přístupy. Umožňuje spolupráci při zachování oprávnění a soukromí dat.

## Akceptační kritéria

- [ ] Po odebrání člena jej pořadatel vidí bez aktivního přístupu k odebranému rozsahu.
- [ ] Odebraný člen při dalším požadavku z již otevřeného prohlížeče nezíská data ani neprovede změnu v odebrané organizaci.
- [ ] Přímý odkaz nebo nové přihlášení neobnoví odebraný přístup.
- [ ] Odebrání nesmaže historické záznamy změn provedených tímto členem.
- [ ] Pokud člen již nemá přístup, opakované odebrání nevytvoří nový přístup ani nesmaže data organizace.

## Mimo rozsah

- Smazání účastnických dat a historie změn.
- Návaznosti: [F39](f39-nemenna-historie-zmen.md), [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 47.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F43 z feature breakdownu akc.io.
