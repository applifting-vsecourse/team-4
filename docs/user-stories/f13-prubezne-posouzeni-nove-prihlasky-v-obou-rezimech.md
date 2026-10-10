---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F13] Průběžné posouzení nové přihlášky v obou režimech'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako pořadatel chci ihned posoudit ubytovatelnost každé nové přihlášky, aby potvrzení nikdy nepřekročila reálnou kapacitu.

## Kontext

Feature [F13 — Průběžné vyhodnocení přihlášek a náhradníků](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] Po každé nové přihlášce se v detailu zobrazí výsledek posouzení pro zvolené termíny podle dostupných jednotek a aktivních pravidel.
- [ ] Při zapnutém automatickém schvalování systém ubytovatelnou osobu potvrdí a neubytovatelnou zařadí mezi náhradníky.
- [ ] Při vypnutém automatickém schvalování přihláška zůstane čekat na rozhodnutí pořadatele a její výsledek posouzení je dostupný.
- [ ] I při dostatečném součtu volných lůžek nelze potvrdit osobu, pro kterou neexistuje ubytování vyhovující aktivním pravidlům.
- [ ] Potvrzená osoba nemusí mít přidělený konkrétní pokoj, ale její účast je zohledněná při posouzení následujících přihlášek.
- [ ] Bez využitelné kapacity se přihláška stále uloží a podle režimu čeká na rozhodnutí nebo se stane náhradníkem.

## Mimo rozsah

- Povyšování dřívějších náhradníků a přidělení konkrétního pokoje.
- Návaznosti: [F05](f05-prijeti-prihlasky-a-poradi-podle-serveroveho-casu.md), [F14-1](f14-1-rucni-potvrzeni-ucasti-nebo-zarazeni-mezi-nahradniky.md), [F14-2](f14-2-rucni-umisteni-do-pokoje-a-ochrana-rozhodnuti-zamkem.md), [F15](f15-prubezne-dostupny-stav-ucasti.md), [F16-1](f16-1-rucni-vyber-vhodnych-nahradniku-po-uvolneni-mista.md), [F16-2](f16-2-volitelne-automaticke-povysovani-nahradniku.md), [F19](f19-volitelny-navrh-pokoju-s-rucni-kontrolou.md), [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 17.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F13 z feature breakdownu akc.io.
