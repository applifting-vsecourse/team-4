# Demo data pro Sprint Review 3

Dva SQL skripty pro produkční databázi akc.io. Spouštějí se ručně v Admineru
(`https://db.vsepractical.applifting.dev` → SQL příkaz): vložte celý obsah souboru a spusťte.

| Soubor            | Co dělá                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo-create.sql` | Smaže předchozí demo sadu a vytvoří ji znovu. Celé proběhne v jedné transakci, takže ho jde pustit kdykoli, třeba před každou zkouškou dema. |
| `demo-delete.sql` | Smaže organizátora `team4vse@seznam.cz`, jeho organizaci, všechny akce, přihlášky, platby, změny i výsledky vyhodnocení a demo účastníky.    |

Data mimo organizace demo organizátora skripty nemění. Demo organizátora poznají podle pevného id
`akcio-demo-organizer`, ne podle e-mailu. Pokud `team4vse@seznam.cz` patří jinému účtu, `demo-create.sql`
skončí chybou a nic nezmění. Termíny se počítají od data spuštění.

## Účty

- **Organizátor:** Alena Pořadatelová, `team4vse@seznam.cz`, heslo `akcio-demo-2026`.
- **Účastnice:** Jana Nováková, `team4vse@seznam.cz`. Do účastnického portálu se přihlásí magic linkem: „Moje přihlášky“ → e-mail přijde do schránky.
- Ostatní účastníci jsou fiktivní (`@example.com`) a přihlásit se nemohou.

## Obsah (organizace Spolek Jasan)

- **Tábor v Jizerkách:** placený, publikovaný, se dvěma turnusy. Pokoje jsou rozdělené podle pohlaví.
  - 1. turnus: 6 potvrzených a 12 čekajících, z toho jeden náhradník a Alex s pohlavím „Neuvedeno“, u kterého musí organizátor určit pokoj ručně.
  - 2. turnus: chatka Javor je nedostupná.
  - Mezi přihláškami jsou uhrazené, částečně uhrazené i neuhrazené. Jana je potvrzená a vidí program.
  - Dvě změnové žádosti čekají na schválení: Petr se chce přesunout do 2. turnusu a Tomáš mění telefon.
- **Víkendový kurz první pomoci:** placený, publikovaný, bez rozdělení podle pohlaví (jedna fronta). První víkend ještě nebyl vyhodnocený, druhý je skoro plný.
- **Výstup na Sněžku:** placený, publikovaný, jednodenní. Přihlášky jsou vyřízené, Janina je uhrazená.
- **Úklid Kunratického lesa:** bezplatný koncept bez bankovního účtu, připravený k živému otevření přihlašování.

Nic není vyhodnocené. Vyhodnocení termínu se na demu spouští poprvé.

## Fotky akcí

SQL skripty fotky nenahrávají, protože soubory leží v objektovém úložišti. Fotky ze složky
`photos/` nahraje nebo smaže skript `demo-photos.mjs` (Node 24, bez závislostí). Přihlásí se
jako demo organizátor a použije API aplikace:

```sh
node apps/backend/prisma/demo/demo-photos.mjs upload   # nahradí fotky demo akcí fotkami z photos/
node apps/backend/prisma/demo/demo-photos.mjs delete   # smaže všechny fotky demo akcí
```

Výchozí cíl je produkce. Jinou instanci zvolíte proměnnou `DEMO_URL`, například
`DEMO_URL=http://localhost:4050`.

Každá akce dostane tři fotky, takže na demu jde živě nahrát čtvrtou (limit jsou čtyři).
První fotka ve složce je náhled akce v katalogu.

Pořadí při obnově dema: `demo-photos.mjs delete` → `demo-create.sql` → `demo-photos.mjs upload`.
Při úplném odstranění: `demo-photos.mjs delete` → `demo-delete.sql`. SQL maže jen záznamy fotek,
ne soubory, takže bez kroku `delete` zůstanou soubory v úložišti.

Všechny fotky jsou CC0 (volné dílo, bez nutnosti uvádět autora). Zdroje:

| Soubor                           | Zdroj                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `tabor/1-stan-na-louce.jpg`      | Markus Spiske, [rawpixel](https://www.rawpixel.com/image/431931)                                 |
| `tabor/2-taborak.jpg`            | [rawpixel](https://www.rawpixel.com/image/6034370)                                               |
| `tabor/3-jizerske-hory.jpg`      | Ted Moravec, [Wikimedia Commons](https://commons.wikimedia.org/w/index.php?curid=143559397)      |
| `kurz/1-resuscitace.jpg`         | [rawpixel](https://www.rawpixel.com/image/9676648)                                               |
| `kurz/2-nacvik-ve-skupine.jpg`   | Frank Schulenburg, [Wikimedia Commons](https://commons.wikimedia.org/w/index.php?curid=66676968) |
| `kurz/3-lekarnicka.jpg`          | ABORISADEADETONA, [Wikimedia Commons](https://commons.wikimedia.org/w/index.php?curid=179860276) |
| `snezka/1-cesta-na-snezku.jpg`   | luciash, [Flickr](https://www.flickr.com/photos/74164296@N00/21261316232)                        |
| `snezka/2-snezka-z-planiny.jpg`  | luciash, [Flickr](https://www.flickr.com/photos/74164296@N00/21261331612)                        |
| `snezka/3-hreben-pri-zapadu.jpg` | Jakub Kriz, [Wikimedia Commons](https://commons.wikimedia.org/w/index.php?curid=61704883)        |
| `uklid/1-sber-u-lesa.jpg`        | U.S. Forest Service, [rawpixel](https://www.rawpixel.com/image/4073276)                          |
| `uklid/2-pytle-s-odpadem.jpg`    | [rawpixel](https://www.rawpixel.com/image/9656807)                                               |
| `uklid/3-potok.jpg`              | [rawpixel](https://www.rawpixel.com/image/9656900)                                               |
