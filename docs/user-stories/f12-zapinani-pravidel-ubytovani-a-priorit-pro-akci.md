---
name: 'User story'
about: 'Popis uživatelské potřeby s ověřitelnými akceptačními kritérii.'
title: '[F12] Zapínání pravidel ubytování a priorit pro akci'
labels: 'epic: ubytování, priority: MVP'
assignees: ''
---

## User story

Jako organizátor chci nastavit a jednotlivě zapínat pravidla ubytování a priorit, aby vyhodnocení odpovídalo potřebám konkrétní akce.

## Kontext

Feature [F12 — Konfigurovatelná pravidla kapacity a priorit](coverage.md), epic Ubytování. Udržuje účast a ubytování v mezích skutečně využitelné kapacity.

## Akceptační kritéria

- [ ] V nastavení akce organizátor vidí dostupná pravidla a u každého pozná, zda je aktivní.
- [ ] Po zapnutí nebo vypnutí konkrétního pravidla zůstane jeho stav uložený pro tuto akci a nastavení jiné akce se nezmění.
- [ ] Nové vyhodnocení používá aktivní pravidla; neaktivní volitelné pravidlo jeho výsledek neomezuje.
- [ ] Ani při vypnutí všech volitelných pravidel nelze potvrdit osoby nad skutečně využitelnou kapacitu; tento limit nelze vypnout.
- [ ] Pokud není aktivní žádné volitelné pravidlo, přehled to výslovně uvede a nadále ukazuje nepřekročitelný kapacitní limit.

## Mimo rozsah

- Vypnutí bezpečnostního limitu kapacity a automatické přepisování potvrzené účasti.
- Návaznosti: [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md), [F20](f20-nezavisle-automaticke-a-manualni-rezimy-akce.md), [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md).

## Podklady

- [Feature breakdown](../../Akc.io_feature_breakdown_final.xlsx), list `Feature breakdown`, řádek 16.
- Wireframe: bude doplněn později.

## Zdroj

- Klient; feature F12 z feature breakdownu akc.io.
