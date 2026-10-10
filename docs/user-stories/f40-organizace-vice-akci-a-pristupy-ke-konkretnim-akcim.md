---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F40] Organizace, více akcí a přístupy ke konkrétním akcím'
labels: 'epic: přístupy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci spravovat akce a členy organizace s přístupem jen k vybraným akcím, abych mohl spolupracovat bez automatického sdílení všech akcí.

## Kontext

Feature [F40 — Organizace, akce a členové týmu](coverage.md), epic Přístupy. Umožňuje spolupráci při zachování oprávnění a soukromí dat.

## Akceptační kritéria

- [ ] V organizaci lze zobrazit více akcí a seznam jejích členů týmu.
- [ ] Po přidělení přístupu jen k akci A člen vidí A a nevidí akci B téže organizace.
- [ ] Člen nezíská přístup k nepřidělené akci přes přímý odkaz a vznik nové akce mu automaticky nepřidá přístup.
- [ ] Po změně povoleného rozsahu člen vidí pouze nově platný výběr akcí.
- [ ] Organizace bez akcí či členů ukáže odpovídající prázdné stavy a oprávněnému pořadateli dostupné kroky vytvoření akce či pozvání člena.

## Mimo rozsah

- Oprávnění po modulech a automatický přístup ke všem akcím organizace.
- Návaznosti: [F01-1](f01-1-vytvoreni-a-sprava-vice-akci.md), [F01-2](f01-2-terminy-akce-s-vlastni-cenou-a-kapacitou.md), [F41](f41-oddeleni-dat-organizaci-vcetne-primych-odkazu.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md), [F43-1](f43-1-pozvani-clena-tymu-e-mailem.md), [F43-2](f43-2-okamzite-odebrani-pristupu-clena-tymu.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 44.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F40 z feature breakdownu akc.io.
