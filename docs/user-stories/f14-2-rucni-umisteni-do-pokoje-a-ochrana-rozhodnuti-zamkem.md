---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F14-2] Ruční umístění do pokoje a ochrana rozhodnutí zámkem'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci během akce ručně přidělit či změnit pokoj a uzamknout rozhodnutí, abych mohl reagovat na potřeby účastníků bez přepsání automatikou.

## Kontext

Feature [F14 — Ruční schvalování a úpravy umístění](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Když pořadatel přiřadí potvrzené osobě dostupný vyhovující pokoj, její umístění a obsazenost pokoje se aktualizují.
- [ ] Po změně pokoje je osoba vedená pouze v novém umístění a původní místo se uvolní.
- [ ] Při pokusu přeobsadit pokoj nebo porušit aktivní tvrdé omezení se změna neuloží a zobrazí se důvod.
- [ ] Uzamčené ruční umístění je viditelně označené a automatický návrh jej nepřepíše.
- [ ] Pokud není vyhovující pokoj, pořadatel vidí vysvětlení a osoba nedostane neplatné umístění.

## Mimo rozsah

- Automatický návrh pokojů a správa oprávnění.
- Návaznosti: [F11](f11-pokoje-luzka-a-rezervace-pro-personal.md), [F18](f18-soukrome-ubytovaci-potreby-a-preference.md), [F19](f19-volitelny-navrh-pokoju-s-rucni-kontrolou.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 18.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F14 z feature breakdownu akc.io.
