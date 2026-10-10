---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F14-1] Ruční potvrzení účasti nebo zařazení mezi náhradníky'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci ručně rozhodnout o účasti při zachování kapacitních pravidel, abych mohl spravovat přihlášky i bez automatického schvalování.

## Kontext

Feature [F14 — Ruční schvalování a úpravy umístění](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Když pořadatel ručně potvrdí ubytovatelnou přihlášku, její detail a přehled termínu ukážou potvrzenou účast.
- [ ] Když ji zařadí mezi náhradníky, detail a přehled ukážou stav náhradníka a aktualizovanou obsazenost.
- [ ] Při pokusu potvrdit osobu bez vyhovující kapacity či v konfliktu s aktivním tvrdým omezením změna neproběhne a pořadatel vidí důvod.
- [ ] Ruční rozhodnutí je dostupné i při vypnuté automatizaci a každá operace znovu ověří aktuální kapacitu.
- [ ] Pokud není žádná přihláška k rozhodnutí, přehled zobrazí prázdný stav bez nabídky operace nad neexistující osobou.

## Mimo rozsah

- Přiřazení konkrétního pokoje a změny oprávnění rolí.
- Návaznosti: [F12](f12-zapinani-pravidel-ubytovani-a-priorit-pro-akci.md), [F15](f15-prubezne-dostupny-stav-ucasti.md), [F20](f20-nezavisle-automaticke-a-manualni-rezimy-akce.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md), [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 18.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F14 z feature breakdownu akc.io.
