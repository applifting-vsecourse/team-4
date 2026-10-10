---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F10-2] Ruční zrušení přihlášky a uvolnění kapacity'
labels: 'epic: přihlášky, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci ručně zrušit přihlášku včetně nezaplacené a aktualizovat návaznosti, abych mohl vědomě uvolnit místo a vyřešit finanční dopad.

## Kontext

Feature [F10 — Změny přihlášek a návazností](coverage.md), epic Přihlášky. Usnadňuje registraci a správu přihlášek k akcím.

## Akceptační kritéria

- [ ] Když organizátor provede ruční zrušení, detail ukáže zrušenou přihlášku a její skutečně rezervovaná kapacita se uvolní.
- [ ] Samotné překročení splatnosti přihlášku nezruší a kapacitu neuvolní.
- [ ] Před dokončením zrušení organizátor vidí vypočtený storno poplatek; po dokončení je zaznamenaný v přehledu plateb.
- [ ] Po zrušení se aktualizuje stav účasti, historie a příslušné komunikační stavy; další práce s náhradníky odpovídá nastavenému režimu.
- [ ] Opakované zrušení již zrušené přihlášky neuvolní další kapacitu ani nevytvoří druhý storno poplatek.
- [ ] Pokud přihláška nemá rezervované místo, zrušení nesnižuje obsazenost jiných osob.

## Mimo rozsah

- Automatické rušení pro neuhrazení; automatické refundace.
- Návaznosti: [F16-1](f16-1-rucni-vyber-vhodnych-nahradniku-po-uvolneni-mista.md), [F16-2](f16-2-volitelne-automaticke-povysovani-nahradniku.md), [F29](f29-vypocet-a-evidence-poplatku-pri-rucnim-stornu.md), [F30](f30-rucni-rozhodnuti-o-nezaplacene-prihlasce.md), [F39](f39-nemenna-historie-zmen.md), [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 14.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F10 z feature breakdownu akc.io.
