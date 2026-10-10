---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F17] Obsazenost a využitelná kapacita po termínech'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci vidět aktuální obsazenost, stavy přihlášek a využitelnou kapacitu po termínech, abych měl reálný přehled o možnosti přijmout další osoby.

## Kontext

Feature [F17 — Obsazenost a dostupná kapacita po termínech](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Pro každý termín dashboard ukáže potvrzené, čekající na manuální schválení a náhradníky odděleně.
- [ ] Po potvrzení, skutečném zrušení nebo změně pokoje se v přehledu projeví odpovídající změna obsazenosti.
- [ ] Disponibilní kapacita zohledňuje aktivní pravidla a dostupné ubytovací jednotky; pouhý počet volných lůžek není vydáván za garantovanou ubytovatelnost.
- [ ] Přehled pokojů rozliší obsazená místa, rezervace personálu a dostupná místa pro vybraný termín.
- [ ] Termín bez přihlášek ukáže nulové počty; bez pokojů uvede, že není evidovaná ubytovací kapacita.

## Mimo rozsah

- Automatické umisťování osob do pokojů.
- Návaznosti: [F11](f11-pokoje-luzka-a-rezervace-pro-personal.md), [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md), [F36](f36-dashboard-poradatele-s-polozkami-k-rucnimu-reseni.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 21.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F17 z feature breakdownu akc.io.
