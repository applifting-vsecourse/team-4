---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F46] Upozornění organizátorovi na dluh po splatnosti'
labels: 'epic: připomínky, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci vidět upozornění v aplikaci a dostat notifikaci o dluhu po splatnosti, abych mohl ručně rozhodnout o nezaplacené přihlášce.

## Kontext

Feature [F46 — Upozornění organizátora na nezaplacené přihlášky](coverage.md), epic Připomínky. Informuje o změnách a položkách vyžadujících řešení.

## Akceptační kritéria

- [ ] Po vzniku dluhu po splatnosti podle nastaveného pravidla organizátor vidí upozornění v aplikaci s vazbou na správnou přihlášku.
- [ ] Současně se odešle notifikace určeným příjemcům; v testovací schránce či schváleném kanálu lze ověřit její obsah.
- [ ] Kliknutí na upozornění otevře přihlášku a dostupné ruční řešení podle oprávnění.
- [ ] Vznik upozornění nemění stav účasti ani obsazenost a není podmíněný zapnutím účastnických automatických upomínek.
- [ ] Bez dluhů po splatnosti přehled uvede, že není co řešit, a nevytváří dluhová upozornění.

## Mimo rozsah

- Automatické rušení přihlášek a uvolňování kapacity pro dluh.
- Návaznosti: [F25](f25-odesilani-volitelnych-upominek-po-splatnosti.md), [F30](f30-rucni-rozhodnuti-o-nezaplacene-prihlasce.md), [F36](f36-dashboard-poradatele-s-polozkami-k-rucnimu-reseni.md), [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 50.
- Wireframe: bude doplněn později.

## Zdroj

- Upřesnění požadavků; feature F46 z feature breakdownu akc.io.
