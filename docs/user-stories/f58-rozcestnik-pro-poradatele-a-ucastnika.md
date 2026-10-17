---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F58] Rozcestník pro pořadatele a účastníka'
labels: 'epic: landing page, priority: MVP'
assignees: ''
---

## User story

Jako návštěvník chci rozpoznat cestu k pořádání a cestu k účasti, abych mohl ihned pokračovat podle svého cíle.

## Kontext

Feature [F58 — Cesty pro organizátora a účastníka](coverage.md), epic Landing page. Představuje platformu a vede návštěvníka k dalšímu kroku.

## Akceptační kritéria

- [ ] Na landing page jsou dva srozumitelně odlišené vstupy „Moje přihlášky“ a „Organizátor“.
- [ ] „Moje přihlášky“ otevře účastnickou sekci se zadáním e-mailu pro přístup přes magic link bez hesla; nejde o novou přihlášku na akci.
- [ ] „Organizátor“ otevře organizátorské přihlášení e-mailem a heslem s možností registrace organizátora a nevede na neexistující stránku.
- [ ] Obě CTA lze použít myší, dotykem i klávesnicí a mají popisek vysvětlující další krok.
- [ ] Prázdný katalog neblokuje žádný ze dvou vstupů; účastnický přístup se řídí F32 a jeho prázdnými stavy.

## Mimo rozsah

- Implementace katalogu a registračního formuláře.
- Návaznosti: [F01-1](f01-1-vytvoreni-a-sprava-vice-akci.md), [F01-2](f01-2-terminy-akce-s-vlastni-cenou-a-kapacitou.md), [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md), [F54-1](f54-1-publikovani-akce-do-verejneho-katalogu.md), [F54-2](f54-2-verejny-vypis-akci-s-filtry.md), [F61](f61-navigace-na-prihlaseni-registraci-a-katalog.md), [F62-1](f62-1-responzivni-a-zakladne-pristupna-landing-page.md), [F62-2](f62-2-paticka-s-kontaktem-ochranou-udaju-a-podminkami.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 62.
- Wireframe: [Landing page · desktop 1 440 px](https://www.figma.com/design/IxX3hZQjTZcGF381RD7h0w/Wireframy?node-id=72-7549).
- Wireframe: [Landing page · mobil 360 px](https://www.figma.com/design/IxX3hZQjTZcGF381RD7h0w/Wireframy?node-id=72-7208).

## Zdroj

- Tým; feature F58 z feature breakdownu akc.io.

**Upřesnění PM — 17. 10. 2026**

Dva vstupy a oddělené přihlašovací mechanismy nahrazují původní účastnické CTA do katalogu. Katalog zůstává samostatnou funkcí F54-2.
