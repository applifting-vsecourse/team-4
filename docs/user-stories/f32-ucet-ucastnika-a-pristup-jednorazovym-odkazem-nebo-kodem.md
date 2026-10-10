---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F32] Účet účastníka a přístup jednorázovým odkazem nebo kódem'
labels: 'epic: přehledy, priority: MVP'
assignees: ''
---

## User story

Jako účastník chci po první přihlášce získat účet a přistupovat k němu bez hesla, abych měl své přihlášky pod jedním e-mailem.

## Kontext

Feature [F32 — Účet účastníka a bezheslové přihlášení](coverage.md), epic Přehledy. Zpřístupňuje aktuální údaje pro účastníky a rozhodování pořadatele.

## Akceptační kritéria

- [ ] Po první přihlášce vznikne účet navázaný na e-mail; další přihláška se stejným e-mailem nevytvoří druhý účet.
- [ ] Po ověření platného jednorázového odkazu nebo kódu se zobrazí vlastní účastnický portál bez požadavku na heslo.
- [ ] Použitý, neplatný nebo expirovaný přístupový údaj portál neotevře a uživatel dostane možnost vyžádat nový.
- [ ] Po přihlášení jsou dostupné přihlášky tohoto účtu a změnou odkazu nelze získat přihlášku cizího účtu.
- [ ] Účet bez přihlášek zobrazí prázdný stav a možnost najít akci v katalogu.

## Mimo rozsah

- Přihlášení organizátorů a správa týmových rolí.
- Návaznosti: [F33](f33-prehled-mych-prihlasek-a-terminu.md), [F34](f34-moje-platby-dluh-qr-a-historie.md), [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md), [F61](f61-navigace-na-prihlaseni-registraci-a-katalog.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 36.
- Wireframe: bude doplněn později.

## Zdroj

- Tým; feature F32 z feature breakdownu akc.io.
