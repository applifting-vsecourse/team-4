---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F44-1] Evidence znění a času souhlasů včetně zástupce'
labels: 'epic: přístupy, priority: MVP'
assignees: ''
---

## User story

Jako účastník nebo zákonný zástupce chci udělit požadované souhlasy s uložením jejich znění a času, aby bylo dohledatelné, s čím a kdo souhlasil.

## Kontext

Feature [F44 — Souhlasy a zákonní zástupci](coverage.md), epic Přístupy. Umožňuje spolupráci při zachování oprávnění a soukromí dat.

## Akceptační kritéria

- [ ] Před udělením každého souhlasu uživatel vidí jeho konkrétní aktuální znění.
- [ ] Po potvrzení oprávněný pořadatel vidí čas a znění uděleného souhlasu a u nezletilého vazbu na zákonného zástupce.
- [ ] Po změně aktuálního textu zůstává dohledatelné znění skutečně uděleného souhlasu.
- [ ] Role bez oprávnění nezíská záznam souhlasu či údaje zástupce přes detail ani export.
- [ ] Bez uděleného souhlasu není záznam zobrazený jako potvrzený; detail uvede, že souhlas nebyl udělen.

## Mimo rozsah

- Tvorba právních textů a výpočet storno poplatků.
- Návaznosti: [F07](f07-potvrzeni-verzovanych-podminek-ucasti-a-storna.md), [F09-1](f09-1-vekove-podminena-pole-a-zakonny-zastupce.md), [F09-2](f09-2-samostatna-registracni-okna-vekovych-skupin.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 48.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F44 z feature breakdownu akc.io.
