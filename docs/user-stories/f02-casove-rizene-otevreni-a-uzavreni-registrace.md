---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F02] Časově řízené otevření a uzavření registrace'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci nastavit datum a čas otevření i uzavření přihlašování, aby registrace proběhla v plánovaném období.

## Kontext

Feature [F02 — Naplánované otevření přihlašování](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Když pořadatel uloží platné otevření a uzavření, po návratu do nastavení vidí oba okamžiky včetně jednoznačně uvedeného časového pásma.
- [ ] Před okamžikem otevření návštěvník vidí, že registrace ještě není otevřená, a nemůže odeslat přihlášku; v okamžiku otevření lze přihlášku odeslat bez ručního zásahu pořadatele.
- [ ] Po okamžiku uzavření návštěvník vidí uzavřenou registraci a odeslání ani z dříve otevřeného formuláře nevytvoří novou přihlášku.
- [ ] Když uzavření není později než otevření, nastavení se neuloží a pořadatel vidí vysvětlení chyby.
- [ ] Bez nastaveného registračního okna pořadatel vidí, že je třeba doplnit časové nastavení.

## Mimo rozsah

- Volitelný odpočet a věková okna; odpočet není povinný požadavek breakdownu.
- Návaznosti: [F09-1](f09-1-vekove-podminena-pole-a-zakonny-zastupce.md), [F09-2](f09-2-samostatna-registracni-okna-vekovych-skupin.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 6.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F02 z feature breakdownu akc.io.
