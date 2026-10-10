---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F01-1] Vytvoření a správa více akcí'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci vytvořit a spravovat více samostatných akcí, abych mohl připravovat různé akce v rámci své organizace.

## Kontext

Feature [F01 — Vytvoření akce](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Když oprávněný pořadatel vytvoří akci, vidí ji v seznamu akcí své organizace a může otevřít její detail.
- [ ] Když pořadatel vytvoří druhou akci, obě akce zůstávají samostatně dostupné; změna jedné nezmění údaje druhé.
- [ ] Když při ukládání chybí povinný údaj, formulář jej označí a akce se neuloží; při selhání uložení zůstávají vyplněné údaje dostupné k opravě či opakování.
- [ ] Pokud organizace nemá akce, seznam zobrazí prázdný stav s možností vytvořit první akci.

## Mimo rozsah

- Nastavení jednotlivých termínů, zveřejnění v katalogu a přidělování přístupů.
- Návaznosti: [F01-2](f01-2-terminy-akce-s-vlastni-cenou-a-kapacitou.md), [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md), [F54-1](f54-1-publikovani-akce-do-verejneho-katalogu.md), [F54-2](f54-2-verejny-vypis-akci-s-filtry.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 5.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F01 z feature breakdownu akc.io.
