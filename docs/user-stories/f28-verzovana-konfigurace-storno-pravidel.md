---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F28] Verzovaná konfigurace storno pravidel'
labels: 'epic: platby, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci nastavit storno pravidla a sazby jednotlivých akcí, aby účastníci před odesláním znali finanční podmínky zrušení.

## Kontext

Feature [F28 — Konfigurace storno poplatků](coverage.md), epic Platby. Zpřehledňuje platební povinnosti a jejich vypořádání.

## Akceptační kritéria

- [ ] Po uložení storno pravidel organizátor v detailu akce vidí jejich sazby a časové podmínky podle nastaveného modelu.
- [ ] Formulář před odesláním zpřístupní aktuální storno podmínky a vyžádá potvrzení této verze.
- [ ] Po změně pravidel lze u dřívější přihlášky stále dohledat původně potvrzenou verzi; změna ji zpětně nepřepíše bez záznamu.
- [ ] Neplatná sazba či konfliktní časové podmínky se neuloží a organizátor vidí důvod.
- [ ] Bez pravidel je chybějící nastavení viditelné; aplikace si nevymyslí nulové storno.

## Mimo rozsah

- Výpočet poplatku při stornu a refundace.
- Návaznosti: [F07](f07-potvrzeni-verzovanych-podminek-ucasti-a-storna.md), [F29](f29-vypocet-a-evidence-poplatku-pri-rucnim-stornu.md), [F39](f39-nemenna-historie-zmen.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 32.
- Wireframe: bude doplněn později.

## Zdroj

- Upřesnění požadavků; feature F28 z feature breakdownu akc.io.
