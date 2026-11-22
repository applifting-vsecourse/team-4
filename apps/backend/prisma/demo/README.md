# Demo data pro Sprint Review 4

Dva SQL skripty pro produkční databázi akc.io. Spouštějí se ručně v Admineru
(`https://db.vsepractical.applifting.dev` → SQL příkaz): vložte celý obsah souboru a spusťte.

| Soubor            | Co dělá                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `demo-create.sql` | Smaže předchozí demo sadu a vytvoří ji znovu. Celé proběhne v jedné transakci, takže ho jde pustit kdykoli, třeba před každou zkouškou dema nebo po ní. |
| `demo-delete.sql` | Smaže organizátora Marka, jeho organizaci, všechny její akce a všechno, co k nim na demu přibylo, a demo účastníky, kteří nemají jiné přihlášky.        |

Obnovení výchozího stavu: spusťte `demo-create.sql` a potom `demo-photos.mjs upload` (viz níže).
Skripty pouštějte, když nikdo nepracuje s ubytováním akcí: po dobu běhu krátce zamknou jeho
tabulky. Pokud skript přesto skončí chybou zablokování, nic nezměnil a jde ho pustit znovu.

Reset projde i po běžném použití dema, například po nové přihlášce, importu výpisu, návrhu
pokojů, jeho použití a zveřejnění, přání na spolubydlící, změnové žádosti nebo nové akci.
Data mimo organizace demo organizátora skripty nemění. Demo organizátora poznají podle pevného
id `akcio-demo-s4-organizer`, ne podle e-mailu. Pokud `team4vse@seznam.cz` patří jinému účtu,
`demo-create.sql` skončí chybou a nic nezmění.

`demo-create.sql` zároveň odstraní demo sadu ze Sprint Review 3 (organizátorka s id
`akcio-demo-organizer`, Spolek Jasan). Tento jednorázový krok jde ze skriptu odebrat, až ta sada
z produkce zmizí.

## Termíny

**D** je místní datum v časové zóně Europe/Prague při spuštění `demo-create.sql`. Všechny termíny
se při každém obnovení odvodí znovu od D.

| Akce                                   | Místo         | Termín                                       | Výchozí stav                                                            |
| -------------------------------------- | ------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| Výstup na Sněžku                       | Krkonoše      | D − 14, 450 Kč                               | Proběhlá akce, Adamova přihláška je uhrazená.                           |
| Dobrovolnický týden v Kunratickém lese | Praha         | D − 3 až D + 3, zdarma                       | Probíhající zveřejněná akce, přihlašování uzavřené, Adam je potvrzený.  |
| Kurz první pomoci                      | Liberec       | D + 4 za 650 Kč, D + 17 za 850 Kč            | Zveřejněná, přihlašování otevřené, volná místa, Adam nemá přihlášku.    |
| Tábor v Jizerkách                      | Jizerské hory | D + 7 až D + 13 a D + 21 až D + 27, 4 500 Kč | Zveřejněná budoucí akce s přihláškami, platbou a ubytováním (viz níže). |

## Účty

- **Organizátor:** Marek Pořadatel, `team4vse@seznam.cz`, heslo `akcio-demo-2026`. Je vlastníkem
  organizace Spolek Lípa.
- **Účastník:** Adam Král, `team4vse@seznam.cz`. Do účastnického portálu se přihlásí magic linkem:
  „Moje přihlášky“ → e-mail přijde do schránky. Má uložené jméno, příjmení a telefon, které se
  spolu s e-mailem předvyplní v nové přihlášce.
- Ostatní účastníci jsou fiktivní (`@example.com`). Přihlásit se nemohou a aplikace jim e-maily
  neposílá.

## Tábor v Jizerkách

- Tvrdé pravidlo: pokoje rozdělené podle pohlaví. Měkká preference: přání na spolubydlící.
- U obou turnusů je rozdělení nezveřejněné a návrh pokojů se spouští ručně.
- Všichni účastníci jsou potvrzení.

| Pokoj                  | 1. turnus  | 2. turnus |
| ---------------------- | ---------- | --------- |
| Chatka Buk             | 2 lůžka    | 2 lůžka   |
| Chatka Javor           | 2 lůžka    | 3 lůžka   |
| Podkroví hlavní budovy | Nedostupné | 1 lůžko   |

| Turnus | Účastníci                                                           | Umístění              |
| ------ | ------------------------------------------------------------------- | --------------------- |
| 1.     | Adam Král, Filip Veselý                                             | Chatka Buk            |
| 1.     | Eliška Novotná, Tereza Malá                                         | Chatka Javor          |
| 2.     | Petr Svoboda                                                        | Chatka Buk, bez zámku |
| 2.     | Lukáš Černý, Viktor Král, Nina Dvořáková, Barbora Malá, Zuzana Nová | Bez pokoje            |

Lukáš a Viktor si přejí bydlet spolu. Návrh pokojů 2. turnusu proto přesune Petra do podkroví a
dá je spolu do Chatky Buk. Adam zatím žádné přání nemá.

## Platba z Fio výpisu

Adamova cena za 1. turnus je 4 500 Kč, zaevidováno je 2 000 Kč a zbývá 2 500 Kč. Jeho přihláška
na tábor má vždy variabilní symbol `9000000001`. `fio-vypis-tabor.csv` obsahuje jednu příchozí
platbu 2 500 Kč s tímto VS. Po importu ve správě tábora (Platby → Import výpisu) se platba
spáruje s Adamovou přihláškou. Po každém obnovení jde výpis importovat znovu.

Na rozdíl od termínů je datum platby ve výpisu pevné (21. 11. 2026). Pokud demo proběhne po 21. 12. 2026, platba by byla starší než Adamova přihláška (D − 30). V tom případě předem upravte
ve výpisu sloupec `Datum` a období v hlavičce na dny po D − 30.

## Fotky akcí

SQL skripty fotky nenahrávají, aby nemusely obsahovat jejich binární data. Fotky ze složky
`photos/` nahraje nebo smaže skript `demo-photos.mjs` (Node 24, bez závislostí). Přihlásí se
jako demo organizátor a použije API aplikace, takže platí stejná kontrola formátu a limitů
jako při nahrání v administraci:

```sh
node apps/backend/prisma/demo/demo-photos.mjs upload   # nahradí fotky demo akcí fotkami z photos/
node apps/backend/prisma/demo/demo-photos.mjs delete   # smaže všechny fotky demo akcí
```

Výchozí cíl je produkce. Jinou instanci zvolíte proměnnou `DEMO_URL`, například
`DEMO_URL=http://localhost:4050`.

Každá akce dostane tři fotky, takže na demu jde živě nahrát čtvrtou (limit jsou čtyři).
První fotka ve složce je náhled akce v katalogu.

Fotky jsou uložené v databázi, takže je `demo-create.sql` i `demo-delete.sql` smažou spolu
s akcemi. Po každém `demo-create.sql` proto znovu spusťte `demo-photos.mjs upload`.

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
