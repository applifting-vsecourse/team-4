---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F27] Konfigurace upomínek pro jednotlivé akce'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci nastavit zapnutí, počet a intervaly upomínek pro každou akci, abych mohl přizpůsobit připomínání plateb.

## Kontext

Feature [F27 — Konfigurace automatických upomínek](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] V nastavení akce lze zapnout či vypnout upomínky a zadat jejich počet a intervaly od splatnosti.
- [ ] Po uložení a opětovném otevření jsou hodnoty zachované a nastavení jiné akce se nezmění.
- [ ] Neplatné intervaly či počet se neuloží a formulář ukáže chybu u příslušného nastavení.
- [ ] Vypnutí upomínek neblokuje zobrazení dluhu, prodloužení splatnosti ani ruční zrušení přihlášky.
- [ ] Nová akce zřetelně ukáže aktuální nastavení.

## Mimo rozsah

- Odesílání e-mailů a automatické zrušení přihlášky.
- Návaznosti: [F25](f25-odesilani-volitelnych-upominek-po-splatnosti.md), [F30](f30-rucni-rozhodnuti-o-nezaplacene-prihlasce.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 31.
- Wireframe: bude doplněn později.

## Zdroj

- Upřesnění požadavků; feature F27 z feature breakdownu akc.io.
