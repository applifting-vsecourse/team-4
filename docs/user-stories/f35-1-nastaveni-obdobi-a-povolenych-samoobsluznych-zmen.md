---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F35-1] Nastavení období a povolených samoobslužných změn'
labels: 'epic: přehledy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci nastavit období a povolená či zamčená pole pro samoobsluhu, abych mohl dát účastníkům kontrolu bez ohrožení kapacitních a citlivých údajů.

## Kontext

Feature [F35 — Samoobslužná správa přihlášky](coverage.md), epic Přehledy. Zpřístupňuje aktuální údaje pro účastníky a rozhodování pořadatele.

## Akceptační kritéria

- [ ] Pořadatel v nastavení určí období a sadu polí, která lze upravit samoobslužně, a vidí uloženou konfiguraci.
- [ ] V účastnickém detailu jsou v povoleném období editovatelná pouze povolená pole; zamčená kapacitní či citlivá pole upravit nelze.
- [ ] Mimo období nelze změnu samoobslužně uložit ani z formuláře otevřeného před vypršením lhůty.
- [ ] Neplatné období se neuloží a nastavení vysvětlí chybu.
- [ ] Pokud není povolené žádné pole, účastník vidí, že samoobslužné změny nejsou dostupné.

## Mimo rozsah

- Provedení samotné změny přihlášky a správa týmových oprávnění.
- Návaznosti: [F35-2](f35-2-samoobsluzna-zmena-nebo-odhlaseni-s-dopadem-do-ceny.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 39.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F35 z feature breakdownu akc.io.
