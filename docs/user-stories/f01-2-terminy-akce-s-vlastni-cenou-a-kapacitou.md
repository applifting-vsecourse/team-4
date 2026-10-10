---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F01-2] Termíny akce s vlastní cenou a kapacitou'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci přidat k akci jeden nebo více termínů a nastavit je samostatně, abych mohl nabízet různé termíny s odpovídající cenou a kapacitou.

## Kontext

Feature [F01 — Vytvoření akce](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Když pořadatel přidá termín, vidí jej v detailu příslušné akce s jeho daty, cenou a kapacitou.
- [ ] Když u dvou termínů uloží rozdílné ceny a kapacity, po opětovném otevření vidí hodnoty u správného termínu.
- [ ] Když zadá konec před začátkem, zápornou cenu nebo zápornou kapacitu, formulář označí chybu a změnu neuloží.
- [ ] Akce bez termínů vysvětlí, že je nutné přidat termín, a nabídne jeho vytvoření.

## Mimo rozsah

- Model pokojů a posuzování ubytovatelnosti.
- Návaznosti: [F11](f11-pokoje-luzka-a-rezervace-pro-personal.md), [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 5.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F01 z feature breakdownu akc.io.
