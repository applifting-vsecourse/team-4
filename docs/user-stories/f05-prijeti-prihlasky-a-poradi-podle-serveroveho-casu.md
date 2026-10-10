---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F05] Přijetí přihlášky a pořadí podle serverového času'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci, aby moje odeslaná přihláška byla uložená s časem přijetí, aby bylo pořadí vyhodnocení spravedlivé a ověřitelné.

## Kontext

Feature [F05 — Přijetí všech přihlášek s časovým pořadím](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Po úspěšném odeslání platné přihlášky účastník vidí potvrzení přijetí a pořadatel vidí přihlášku s přesným časem přijetí serverem.
- [ ] Když je kapacita naplněná, platnou přihlášku lze stále odeslat; formulář ji neodmítne kvůli obsazenosti.
- [ ] Ve výchozím pořadí pořadatel vidí přihlášky seřazené podle času přijetí od nejstarší; změna času na zařízení účastníka toto pořadí nezmění.
- [ ] Při chybě odeslání uživatel nevidí falešné potvrzení přijetí a má možnost odeslání zopakovat.
- [ ] Seznam bez přihlášek zobrazí prázdný stav; žádná osoba nemá přidělené pořadí.

## Mimo rozsah

- Označování duplicit a potvrzování účasti.
- Návaznosti: [F06-1](f06-1-ochrana-formulare-proti-spamu.md), [F06-2](f06-2-soukrome-oznaceni-pravdepodobnych-duplicit.md), [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md), [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 9.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F05 z feature breakdownu akc.io.
