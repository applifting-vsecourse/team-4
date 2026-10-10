---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F30] Ruční rozhodnutí o nezaplacené přihlášce'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci ze seznamu dluhů přejít k přihlášce a rozhodnout o prodloužení splatnosti nebo zrušení, abych mohl řešit neuhrazené přihlášky případ od případu.

## Kontext

Feature [F30 — Manuální řešení nezaplacených přihlášek](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] Ze seznamu dluhů lze otevřít správnou přihlášku s dlužnou částkou a splatností.
- [ ] Po platném prodloužení splatnosti je nový termín viditelný v detailu a dluh ani rezervované místo se tím samy nezruší.
- [ ] Při ručním zrušení se použije storno postup a místo se uvolní až po skutečném dokončení zrušení.
- [ ] Bez ručního rozhodnutí nezaplacená přihláška zůstává ve svém stavu i po splatnosti; dostupná rozhodnutí a jejich historie jsou dohledatelná.
- [ ] Seznam bez dluhů ukáže prázdný stav a nevyžaduje žádné rozhodnutí.

## Mimo rozsah

- Automatické rušení přihlášek a refundace.
- Návaznosti: [F10-1](f10-1-rucni-uprava-prihlasky-a-navaznych-stavu.md), [F10-2](f10-2-rucni-zruseni-prihlasky-a-uvolneni-kapacity.md), [F25](f25-odesilani-volitelnych-upominek-po-splatnosti.md), [F29](f29-vypocet-a-evidence-poplatku-pri-rucnim-stornu.md), [F39](f39-nemenna-historie-zmen.md), [F46](f46-upozorneni-organizatorovi-na-dluh-po-splatnosti.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 34.
- Wireframe: bude doplněn později.

## Zdroj

- Upřesnění požadavků; feature F30 z feature breakdownu akc.io.
