# Demo data pro Sprint Review 3

Dva SQL skripty pro produkční databázi akc.io. Spouštějí se ručně v Admineru
(`https://db.vsepractical.applifting.dev` → SQL příkaz): vložte celý obsah souboru a spusťte.

| Soubor            | Co dělá                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo-create.sql` | Smaže předchozí demo sadu a vytvoří ji znovu. Celé proběhne v jedné transakci, takže ho jde pustit kdykoli, třeba před každou zkouškou dema. |
| `demo-delete.sql` | Smaže organizátora `team4vse@seznam.cz`, jeho organizaci, všechny akce, přihlášky, platby, změny i výsledky vyhodnocení a demo účastníky.                   |

Data mimo organizace demo organizátora skripty nemění. Termíny se počítají od data spuštění.

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

Fotky akcí skripty nenahrávají. Případně je nahrajte v administraci akce. Po smazání
sady zůstanou soubory fotek v úložišti.
