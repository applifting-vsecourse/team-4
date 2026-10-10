---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F31] Odložená evidence vrácení peněz mimo aplikaci'
labels: 'epic: platby'
assignees: ''
---

## User story

Jako organizátor chci v budoucnu případně evidovat platby vrácené mimo aplikaci, abych měl dohledatelný přehled o vypořádání přeplatků.

## Kontext

Feature [F31 — Vrácení plateb (refundace)](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání. Odsouhlaseno; mimo MVP, neimplementovat v MVP.

## Akceptační kritéria

- [ ] V MVP vypočtený přeplatek nebo storno nevyvolá automatické odeslání peněz a detail neukazuje nepodložený stav vráceno.
- [ ] Pokud se v budoucnu realizuje odsouhlasená evidence externí refundace, její záznam bude rozlišený od automatického bankovního převodu.
- [ ] Bez refundace není v přihlášce vymyšlený záznam o vrácení peněz.

## Mimo rozsah

- Realizace v MVP a automatický bankovní převod peněz.
- Návaznosti: [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md), [F29](f29-vypocet-a-evidence-poplatku-pri-rucnim-stornu.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 35.
- Wireframe: bude doplněn později.

## Zdroj

- Upřesnění požadavků; feature F31 z feature breakdownu akc.io.
