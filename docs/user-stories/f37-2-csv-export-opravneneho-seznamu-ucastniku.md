---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F37-2] CSV export oprávněného seznamu účastníků'
labels: 'epic: přehledy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci exportovat vyfiltrované účastníky do CSV, abych mohl použít potřebný seznam mimo aplikaci.

## Kontext

Feature [F37 — Seznam účastníků s filtry a exportem](coverage.md), epic Přehledy. Zpřístupňuje aktuální údaje pro účastníky a rozhodování pořadatele.

## Akceptační kritéria

- [ ] Po spuštění exportu se stáhne CSV s účastníky odpovídajícími aktivním filtrům a oprávněnému rozsahu dat.
- [ ] CSV obsahuje sloupce dostupné dané roli a jeho hodnoty včetně českých znaků odpovídají seznamu a detailům.
- [ ] Role bez oprávnění exportovat nemůže export získat a export nepřidá citlivé údaje skryté této roli.
- [ ] Pokud export selže, uživatel vidí chybu a možnost opakovat akci místo zprávy o úspěšném stažení.
- [ ] Při nulovém výsledku se zobrazí, že není co exportovat; aplikace nevytvoří seznam cizích či nefiltrovaných osob.

## Mimo rozsah

- Speciální exportní formáty pro externí systémy.
- Návaznosti: [F18](f18-soukrome-ubytovaci-potreby-a-preference.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 41.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F37 z feature breakdownu akc.io.
