---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F43-1] Pozvání člena týmu e-mailem'
labels: 'epic: přístupy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci pozvat nového člena týmu e-mailem, abych mu mohl zpřístupnit přidělenou část správy akce.

## Kontext

Feature [F43 — Pozvání a odebrání člena týmu](coverage.md), epic Přístupy. Umožňuje spolupráci při zachování oprávnění a soukromí dat.

## Akceptační kritéria

- [ ] Po zadání platného e-mailu a přiděleného rozsahu přístupu pořadatel vidí odeslané pozvání a v testovací schránce je odpovídající zpráva.
- [ ] Po přijetí platného pozvání člen vidí pouze přidělené akce a moduly organizace.
- [ ] Neplatný e-mail nelze odeslat a formulář zobrazí chybu.
- [ ] Neplatné nebo odvolané pozvání neudělí přístup a příjemce vidí vysvětlení.
- [ ] Tým bez členů nabídne oprávněnému pořadateli možnost pozvat prvního člena.

## Mimo rozsah

- Odebrání přístupu a automatické udělení přístupu ke všem akcím.
- Návaznosti: [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md), [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 47.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F43 z feature breakdownu akc.io.
