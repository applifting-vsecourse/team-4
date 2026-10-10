---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F36] Dashboard pořadatele s položkami k ručnímu řešení'
labels: 'epic: přehledy, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci vidět účast, kapacitu, dluhy a upozornění na jednom dashboardu, abych rychle poznal stav akce a otevřel věci vyžadující rozhodnutí.

## Kontext

Feature [F36 — Dashboard pořadatele](coverage.md), epic Přehledy. Zpřístupňuje aktuální údaje pro účastníky a rozhodování pořadatele.

## Akceptační kritéria

- [ ] Dashboard zvolené akce zobrazuje potvrzené a náhradníky, volnou využitelnou kapacitu, nezaplacené přihlášky a upozornění k ručnímu zásahu.
- [ ] Po změně přihlášky, obsazenosti či platby odpovídají hodnoty příslušným detailním přehledům.
- [ ] Kliknutí na nezaplacenou položku otevře správnou přihlášku s dostupným ručním řešením podle oprávnění.
- [ ] Dluhová položka není prezentovaná jako automaticky zrušená účast a samotný dluh nesnižuje obsazenost.
- [ ] Akce bez přihlášek má nulové počty; bez dluhů či upozornění je uvedeno, že není co řešit.

## Mimo rozsah

- Nová platební nebo kapacitní pravidla a automatické rušení přihlášek.
- Návaznosti: [F17](f17-obsazenost-a-vyuzitelna-kapacita-po-terminech.md), [F30](f30-rucni-rozhodnuti-o-nezaplacene-prihlasce.md), [F46](f46-upozorneni-organizatorovi-na-dluh-po-splatnosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 40.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F36 z feature breakdownu akc.io.
