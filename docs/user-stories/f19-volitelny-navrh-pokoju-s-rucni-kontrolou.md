---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F19] Volitelný návrh pokojů s ruční kontrolou'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci získat automatický návrh pokojů a zkontrolovat jej nebo rozřazovat ručně, abych mohl zjednodušit umístění potvrzených osob při zachování kontroly.

## Kontext

Feature [F19 — Volitelný automatický návrh pokojů](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Při zapnutém automatickém rozřazování návrh při konání akce pracuje s potvrzenými účastníky, aktuálními pokoji a aktivními pravidly.
- [ ] Pořadatel vidí navržené umístění a může je zkontrolovat či ručně upravit; z návrhu lze poznat osoby bez nalezeného umístění.
- [ ] Návrh nepřeobsadí žádný pokoj, neporuší aktivní tvrdé omezení a nepřepíše uzamčené ruční rozhodnutí.
- [ ] Při vypnutí automatického rozřazování zůstává dostupné plně ruční přidělování a uložené umístění se samotným vypnutím nezmění.
- [ ] Bez potvrzených osob návrh ukáže prázdný stav; bez vyhovujících pokojů uvede neumisťitelné osoby místo neplatného přiřazení.

## Mimo rozsah

- Potvrzování účasti a přepisování uzamčených rozhodnutí.
- Návaznosti: [F12](f12-zapinani-pravidel-ubytovani-a-priorit-pro-akci.md), [F14-1](f14-1-rucni-potvrzeni-ucasti-nebo-zarazeni-mezi-nahradniky.md), [F14-2](f14-2-rucni-umisteni-do-pokoje-a-ochrana-rozhodnuti-zamkem.md), [F18](f18-soukrome-ubytovaci-potreby-a-preference.md), [F20](f20-nezavisle-automaticke-a-manualni-rezimy-akce.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 23.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F19 z feature breakdownu akc.io.
