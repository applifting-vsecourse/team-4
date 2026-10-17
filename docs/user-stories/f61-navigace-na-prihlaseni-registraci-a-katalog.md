---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F61] Navigace do účastnické a organizátorské sekce'
labels: 'epic: landing page, priority: MVP'
assignees: ''
---

## User story

Jako návštěvník nebo existující uživatel chci z veřejné stránky otevřít Moje přihlášky nebo sekci Organizátor, abych použil správný způsob přihlášení.

## Kontext

Feature [F61 — Navigace a přihlášení](coverage.md), epic Landing page. Představuje platformu a vede návštěvníka k dalšímu kroku.

## Akceptační kritéria

- [ ] Na landing page jsou funkční vstupy „Moje přihlášky“ a „Organizátor“. První otevře zadání e-mailu pro účastnický magic link bez hesla; druhý přihlášení organizátora e-mailem a heslem s možností registrace. Nejde o společný přihlašovací formulář.
- [ ] Každý odkaz otevře správnou existující cílovou stránku bez neplatného přesměrování.
- [ ] Existující přihlášený uživatel může z veřejné stránky přejít do své oprávněné části systému.
- [ ] Navigace je ovladatelná klávesnicí i na mobilu.
- [ ] I bez akcí v katalogu jsou oba vstupy dostupné. Účastnické přihlášení nezpřístupní správu organizací ani při shodném e-mailu obou rolí.

## Mimo rozsah

- Implementace účtů a oprávnění.
- Návaznosti: [F32](f32-ucet-ucastnika-a-pristup-jednorazovym-odkazem-nebo-kodem.md), [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md), [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md), [F54-1](f54-1-publikovani-akce-do-verejneho-katalogu.md), [F54-2](f54-2-verejny-vypis-akci-s-filtry.md), [F62-1](f62-1-responzivni-a-zakladne-pristupna-landing-page.md), [F62-2](f62-2-paticka-s-kontaktem-ochranou-udaju-a-podminkami.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 65.
- Wireframe: [Landing page · desktop 1 440 px](https://www.figma.com/design/IxX3hZQjTZcGF381RD7h0w/Wireframy?node-id=72-7549).
- Wireframe: [Landing page · mobil 360 px](https://www.figma.com/design/IxX3hZQjTZcGF381RD7h0w/Wireframy?node-id=72-7208).

## Zdroj

- Tým; feature F61 z feature breakdownu akc.io.

**Upřesnění PM — 17. 10. 2026**

Dva vstupy nahrazují původní přímé odkazy na přihlášení, registraci a katalog. Rozsah katalogu zůstává ve F54-2.
