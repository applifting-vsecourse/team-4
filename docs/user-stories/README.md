# User stories — akc.io

Stories připravené 10. 10. 2026 z celého `Akc.io_feature_breakdown_final.xlsx` podle `.github/ISSUE_TEMPLATE/user-story.md`. Každý soubor má stejné hlavní sekce i metadata šablony a označení `[Fxx]` v názvu issue, pokud feature obsahuje jedinou story; u více stories používá `[Fxx-y]`. Stejné označení používají ID v manifestu, názvy souborů, odkazy i importní markery: například `F03` / `f03-…md` a `F01-1` / `f01-1-…md`.

Celkem **74 stories pro všech 62 features**: **72 MVP stories** pokrývá 60 MVP features a **2 odložené stories** pokrývají F22/F31 mimo rozsah. Rozdělení nevytváří další features ani nemění priority.

- [Mapa pokrytí](coverage.md) uvádí všech 62 features, řádky Excelu a odpovídající stories. Všechny tři listy sešitu byly přečtené.
- [Manifest importu](manifest.json) obsahuje názvy, soubory, labels, prioritu, stav zdroje a stav každé story. Zdrojový Excel identifikuje i SHA-256.
- [Labels z GitHub CLI](labels.json) zachycují skutečných 11 labels repo `applifting-vsecourse/team-4`: 9 epiků a priority MVP / nice to have.
- [Importní skript](import.py) používá Python 3 a nainstalované `gh`, nemá další závislosti. Vytváří issues přes `--body-file`, odstraňuje front matter z těla a propojuje navazující issues až po získání jejich URL.

## Stav stories a rozhodnutí PO

Dle pokynu uživatele z 10. 10. 2026 je **vše, co není zamítnuté, odsouhlasené**. Manifest i stories mají proto stav `approved`, s výjimkou zamítnuté F22, která má stav `rejected`. Původní stav z Excelu je zachovaný jako `original_source_status`; `source_status` uvádí aktuální stav dle tohoto pokynu. Zdrojový Excel nebyl změněný.

Stories neobsahují otevřené otázky ani schvalovací komentáře. Mají šest stručných částí: User story, Kontext, Akceptační kritéria, Mimo rozsah, Podklady a Zdroj. Odkazy na wireframy budou doplněné později.

F22 (platební plán, **Zamítnuto**) a F31 (refundace, **Odsouhlaseno**) jsou nadále **Mimo rozsah MVP** a běžný import je vynechá. Schválení F31 nemění její prioritu ani zařazení do MVP. Obě mají pouze existující epic label, žádný priority label. `priority: nice to have` se nepoužije, protože žádná feature tuto prioritu nemá.

Rozdělení a návaznosti jsou v mapě pokrytí. Technické stories uvádějí browser výsledky i nutné technické ověření, například skutečnou obnovu databáze, kontrolu DNS nebo souběžné databázové operace. Žádná nová produktová obrazovka kvůli tomuto ověření není požadována.

## Náhled a import

Spouštět z kořene repo:

```bash
python3 docs/user-stories/import.py
```

Výchozí běh pouze ověří soubory a vypíše plán; nespouští GitHub zápisy ani nevyžaduje připojení. Po review lze vytvořit MVP backlog a zároveň jej přidat do projektu:

```bash
python3 docs/user-stories/import.py --execute --project 'PŘESNÝ NÁZEV PROJEKTU'
```

Nahraďte název skutečným názvem otevřeného GitHub Project vlastníka `applifting-vsecourse`. Pro import pouze do repo issues vynechte `--project`. Pro tuto sadu stories používáme projekt Kemp.io Team 4 (číslo 1). Přístup k projektu může vyžadovat:

```bash
gh auth refresh -s project
```

Odložené stories lze výslovně zahrnout po rozhodnutí o rozsahu:

```bash
python3 docs/user-stories/import.py --include-deferred
python3 docs/user-stories/import.py --execute --include-deferred --project 'PŘESNÝ NÁZEV PROJEKTU'
```

Před importem nahrajte Excel a dokumenty do repozitáře, aby odkazy na podklady fungovaly. Výchozí cílový ref odkazů je `main`; pro jinou větev přidejte `--ref 'NÁZEV VĚTVE'`. Excel a dokumentace jsou součástí repozitáře. Samotné issues se importují z lokálních souborů, ale odkaz na Excel v issue vyžaduje jeho přítomnost na GitHubu.

## Opakování a bezpečné pokračování

Při zápisu skript nejprve ověří živé labels, přihlášení, existující issues a zvolený projekt. Potom vytváří chybějící issues, zapisuje jejich URL do lokální `.import-state.json`, ve druhém průchodu doplní odkazy mezi issues a případně je přidá do projektu. Pokud už je přidala automatizace repozitáře, ruční přidání přeskočí. Vztahy k vynechaným odloženým stories zůstanou textové. Skript nekopíruje lokální relativní odkazy mezi stories do GitHub issue.

Při přerušení znovu spusťte stejný příkaz se stejným stavovým souborem. Skript existující issues znovu nevytváří a umí dohledat issue podle stabilního markeru nebo přesného názvu i při přerušení mezi vytvořením a uložením URL. Nejednoznačné duplicity zastaví import. Inventář větší než 1 000 issues nebo 100 projektů vyžaduje doplnění stránkování; skript nepokračuje s neúplným inventářem.

Opakovaný zápis **aktualizuje názvy a těla vybraných issues z lokálních stories**, doplní požadované labels a ponechá ostatní labels. Pokud někdo upravil text přímo na GitHubu, před opakováním přeneste jeho změny do lokálních souborů. Projektové položky jsou přidávané pomocí `gh project item-add`; opakované přidání stejného issue do stejného projektu používá existující položku. Skript nemění project status pole a nemaže žádné issues.

Stavový soubor necommitujte, zachovejte jej pro pokračování. Při změně `--state` používejte samostatnou cestu pro tuto sadu stories. Aktuální MVP stories jsou publikované jako issues v projektu Kemp.io Team 4. Lokální stav importu uchovává jejich URL pro další aktualizace.

## Provedená kontrola

Ověřeno úplné pokrytí F01–F62, součty proti listu Epicy, struktura všech 74 souborů proti šabloně, nepřítomnost otevřených otázek ve stories, existující labels a lokální odkazy. Náhled importu vypisuje 72 stories, s `--include-deferred` 74. Import, převod vazeb na URL issues, přidání do projektu a opakování po ztrátě lokálního stavu byly ověřeny se simulovanými odpověďmi `gh`. Po publikování jsou počty, názvy, labels, obsah issues a zařazení do projektu ověřené přes GitHub CLI.
