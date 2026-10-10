# Pokrytí feature breakdownu

Zpracovány všechny listy: `Feature breakdown` (62 features), `Epicy` (9 epiků) a `Návod`. V sešitu nejsou skryté listy, skryté řádky, komentáře ani vzorce s dalšími požadavky. Součty na listu `Epicy` odpovídají jednotlivým features: 60 MVP, 2 Mimo rozsah.

## Součty podle epiků

| Epic             | Features | MVP features | Stories | MVP stories |
| ---------------- | -------: | -----------: | ------: | ----------: |
| Přihlášky        |       10 |           10 |      14 |          14 |
| Ubytování        |       10 |           10 |      12 |          12 |
| Platby           |       11 |            9 |      11 |           9 |
| Přehledy         |        8 |            8 |      10 |          10 |
| Přístupy         |        5 |            5 |       7 |           7 |
| Připomínky       |        2 |            2 |       2 |           2 |
| Technický základ |        7 |            7 |       7 |           7 |
| Katalog akcí     |        3 |            3 |       4 |           4 |
| Landing page     |        6 |            6 |       7 |           7 |
| **Celkem**       |   **62** |       **60** |  **74** |      **72** |

## Mapa jednotlivých features

| Feature | Řádek | Název                                                | Priorita    | Aktuální stav | Stories                                                                                                                                        |
| ------- | ----: | ---------------------------------------------------- | ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| F01     |     5 | Vytvoření akce                                       | MVP         | Odsouhlaseno  | [F01-1](f01-1-vytvoreni-a-sprava-vice-akci.md), [F01-2](f01-2-terminy-akce-s-vlastni-cenou-a-kapacitou.md)                                     |
| F02     |     6 | Naplánované otevření přihlašování                    | MVP         | Odsouhlaseno  | [F02](f02-casove-rizene-otevreni-a-uzavreni-registrace.md)                                                                                     |
| F03     |     7 | Mobilní přihláškový formulář                         | MVP         | Odsouhlaseno  | [F03](f03-vyplneni-prihlasky-na-mobilu.md)                                                                                                     |
| F04     |     8 | Výběr termínu                                        | MVP         | Odsouhlaseno  | [F04](f04-vyber-vice-terminu-a-okamzity-prehled-ceny.md)                                                                                       |
| F05     |     9 | Přijetí všech přihlášek s časovým pořadím            | MVP         | Odsouhlaseno  | [F05](f05-prijeti-prihlasky-a-poradi-podle-serveroveho-casu.md)                                                                                |
| F06     |    10 | Ochrana proti duplicitám a spamu                     | MVP         | Odsouhlaseno  | [F06-1](f06-1-ochrana-formulare-proti-spamu.md), [F06-2](f06-2-soukrome-oznaceni-pravdepodobnych-duplicit.md)                                  |
| F07     |    11 | Potvrzení podmínek účasti                            | MVP         | Odsouhlaseno  | [F07](f07-potvrzeni-verzovanych-podminek-ucasti-a-storna.md)                                                                                   |
| F08     |    12 | Typy účastníků                                       | MVP         | Odsouhlaseno  | [F08](f08-typ-ucastnika-s-odpovidajici-cenou-a-pravidly.md)                                                                                    |
| F09     |    13 | Věková pravidla registrace                           | MVP         | Odsouhlaseno  | [F09-1](f09-1-vekove-podminena-pole-a-zakonny-zastupce.md), [F09-2](f09-2-samostatna-registracni-okna-vekovych-skupin.md)                      |
| F10     |    14 | Změny přihlášek a návazností                         | MVP         | Odsouhlaseno  | [F10-1](f10-1-rucni-uprava-prihlasky-a-navaznych-stavu.md), [F10-2](f10-2-rucni-zruseni-prihlasky-a-uvolneni-kapacity.md)                      |
| F11     |    15 | Ubytovací kapacita a jednotky                        | MVP         | Odsouhlaseno  | [F11](f11-pokoje-luzka-a-rezervace-pro-personal.md)                                                                                            |
| F12     |    16 | Konfigurovatelná pravidla kapacity a priorit         | MVP         | Odsouhlaseno  | [F12](f12-zapinani-pravidel-ubytovani-a-priorit-pro-akci.md)                                                                                   |
| F13     |    17 | Průběžné vyhodnocení přihlášek a náhradníků          | MVP         | Odsouhlaseno  | [F13](f13-prubezne-posouzeni-nove-prihlasky-v-obou-rezimech.md)                                                                                |
| F14     |    18 | Ruční schvalování a úpravy umístění                  | MVP         | Odsouhlaseno  | [F14-1](f14-1-rucni-potvrzeni-ucasti-nebo-zarazeni-mezi-nahradniky.md), [F14-2](f14-2-rucni-umisteni-do-pokoje-a-ochrana-rozhodnuti-zamkem.md) |
| F15     |    19 | Průběžné zveřejnění stavu přihlášky                  | MVP         | Odsouhlaseno  | [F15](f15-prubezne-dostupny-stav-ucasti.md)                                                                                                    |
| F16     |    20 | Volitelné automatické povyšování náhradníků          | MVP         | Odsouhlaseno  | [F16-1](f16-1-rucni-vyber-vhodnych-nahradniku-po-uvolneni-mista.md), [F16-2](f16-2-volitelne-automaticke-povysovani-nahradniku.md)             |
| F17     |    21 | Obsazenost a dostupná kapacita po termínech          | MVP         | Odsouhlaseno  | [F17](f17-obsazenost-a-vyuzitelna-kapacita-po-terminech.md)                                                                                    |
| F18     |    22 | Individuální ubytovací potřeby a soukromé preference | MVP         | Odsouhlaseno  | [F18](f18-soukrome-ubytovaci-potreby-a-preference.md)                                                                                          |
| F19     |    23 | Volitelný automatický návrh pokojů                   | MVP         | Odsouhlaseno  | [F19](f19-volitelny-navrh-pokoju-s-rucni-kontrolou.md)                                                                                         |
| F20     |    24 | Nastavení automatických a manuálních režimů          | MVP         | Odsouhlaseno  | [F20](f20-nezavisle-automaticke-a-manualni-rezimy-akce.md)                                                                                     |
| F21     |    25 | Platební instrukce a QR                              | MVP         | Odsouhlaseno  | [F21](f21-platebni-instrukce-variabilni-symbol-a-qr-platba.md)                                                                                 |
| F22     |    26 | Platební plán akce                                   | Mimo rozsah | Zamítnuto     | [F22](f22-odlozeny-platebni-plan-se-zalohou-a-splatkami.md)                                                                                    |
| F23     |    27 | Načítání plateb z banky                              | MVP         | Odsouhlaseno  | [F23](f23-import-bankovnich-plateb-z-podporovaneho-csv.md)                                                                                     |
| F24     |    28 | Párování plateb                                      | MVP         | Odsouhlaseno  | [F24](f24-parovani-podle-vs-a-rucni-reseni-nesparovanych-plateb.md)                                                                            |
| F25     |    29 | Automatické upomínky                                 | MVP         | Odsouhlaseno  | [F25](f25-odesilani-volitelnych-upominek-po-splatnosti.md)                                                                                     |
| F26     |    30 | Výpočet salda                                        | MVP         | Odsouhlaseno  | [F26](f26-jednotne-saldo-pro-poradatele-a-ucastnika.md)                                                                                        |
| F27     |    31 | Konfigurace automatických upomínek                   | MVP         | Odsouhlaseno  | [F27](f27-konfigurace-upominek-pro-jednotlive-akce.md)                                                                                         |
| F28     |    32 | Konfigurace storno poplatků                          | MVP         | Odsouhlaseno  | [F28](f28-verzovana-konfigurace-storno-pravidel.md)                                                                                            |
| F29     |    33 | Výpočet storno poplatku                              | MVP         | Odsouhlaseno  | [F29](f29-vypocet-a-evidence-poplatku-pri-rucnim-stornu.md)                                                                                    |
| F30     |    34 | Manuální řešení nezaplacených přihlášek              | MVP         | Odsouhlaseno  | [F30](f30-rucni-rozhodnuti-o-nezaplacene-prihlasce.md)                                                                                         |
| F31     |    35 | Vrácení plateb (refundace)                           | Mimo rozsah | Odsouhlaseno  | [F31](f31-odlozena-evidence-vraceni-penez-mimo-aplikaci.md)                                                                                    |
| F32     |    36 | Účet účastníka a bezheslové přihlášení               | MVP         | Odsouhlaseno  | [F32](f32-ucet-ucastnika-a-pristup-jednorazovym-odkazem-nebo-kodem.md)                                                                         |
| F33     |    37 | Moje přihláška                                       | MVP         | Odsouhlaseno  | [F33](f33-prehled-mych-prihlasek-a-terminu.md)                                                                                                 |
| F34     |    38 | Moje platby                                          | MVP         | Odsouhlaseno  | [F34](f34-moje-platby-dluh-qr-a-historie.md)                                                                                                   |
| F35     |    39 | Samoobslužná správa přihlášky                        | MVP         | Odsouhlaseno  | [F35-1](f35-1-nastaveni-obdobi-a-povolenych-samoobsluznych-zmen.md), [F35-2](f35-2-samoobsluzna-zmena-nebo-odhlaseni-s-dopadem-do-ceny.md)     |
| F36     |    40 | Dashboard pořadatele                                 | MVP         | Odsouhlaseno  | [F36](f36-dashboard-poradatele-s-polozkami-k-rucnimu-reseni.md)                                                                                |
| F37     |    41 | Seznam účastníků s filtry a exportem                 | MVP         | Odsouhlaseno  | [F37-1](f37-1-filtrovani-seznamu-ucastniku.md), [F37-2](f37-2-csv-export-opravneneho-seznamu-ucastniku.md)                                     |
| F38     |    42 | Detail účastníka                                     | MVP         | Odsouhlaseno  | [F38](f38-detail-ucastnika-s-platbami-historii-a-internimi-poznamkami.md)                                                                      |
| F39     |    43 | Historie změn                                        | MVP         | Odsouhlaseno  | [F39](f39-nemenna-historie-zmen.md)                                                                                                            |
| F40     |    44 | Organizace, akce a členové týmu                      | MVP         | Odsouhlaseno  | [F40](f40-organizace-vice-akci-a-pristupy-ke-konkretnim-akcim.md)                                                                              |
| F41     |    45 | Izolace dat pořadatelů                               | MVP         | Odsouhlaseno  | [F41](f41-oddeleni-dat-organizaci-vcetne-primych-odkazu.md)                                                                                    |
| F42     |    46 | Role a oprávnění                                     | MVP         | Odsouhlaseno  | [F42](f42-role-s-opravnenimi-po-modulech-a-rozsahu-dat.md)                                                                                     |
| F43     |    47 | Pozvání a odebrání člena týmu                        | MVP         | Odsouhlaseno  | [F43-1](f43-1-pozvani-clena-tymu-e-mailem.md), [F43-2](f43-2-okamzite-odebrani-pristupu-clena-tymu.md)                                         |
| F44     |    48 | Souhlasy a zákonní zástupci                          | MVP         | Odsouhlaseno  | [F44-1](f44-1-evidence-zneni-a-casu-souhlasu-vcetne-zastupce.md), [F44-2](f44-2-odvolani-souhlasu-se-zachovanim-historie.md)                   |
| F45     |    49 | Transakční e-maily a šablony                         | MVP         | Odsouhlaseno  | [F45](f45-transakcni-e-maily-s-promennymi-ze-skutecne-udalosti.md)                                                                             |
| F46     |    50 | Upozornění organizátora na nezaplacené přihlášky     | MVP         | Odsouhlaseno  | [F46](f46-upozorneni-organizatorovi-na-dluh-po-splatnosti.md)                                                                                  |
| F47     |    51 | Monitoring a upozornění na výpadek                   | MVP         | Odsouhlaseno  | [F47](f47-monitoring-dostupnosti-chyb-a-vykonu-s-upozornenim-tymu.md)                                                                          |
| F48     |    52 | Automatické zálohy a test obnovy                     | MVP         | Odsouhlaseno  | [F48](f48-denni-zalohy-a-overena-obnova-databaze.md)                                                                                           |
| F49     |    53 | Prostředí a automatické nasazení                     | MVP         | Odsouhlaseno  | [F49](f49-oddelene-testovaci-a-produkcni-prostredi-s-ci-cd.md)                                                                                 |
| F50     |    54 | Doručitelnost e-mailů                                | MVP         | Odsouhlaseno  | [F50](f50-overena-odesilaci-domena-a-dorucitelnost-zprav.md)                                                                                   |
| F51     |    55 | Špičková zátěž při otevření registrací               | MVP         | Odsouhlaseno  | [F51](f51-bezpecne-prijeti-registraci-pri-spickove-zatezi.md)                                                                                  |
| F52     |    56 | Automatizované testy kritických toků                 | MVP         | Odsouhlaseno  | [F52](f52-kriticke-end-to-end-testy-jako-podminka-nasazeni.md)                                                                                 |
| F53     |    57 | Atomická rezervace kapacity při souběhu              | MVP         | Odsouhlaseno  | [F53](f53-atomicka-ochrana-kapacity-pri-soubeznych-operacich.md)                                                                               |
| F54     |    58 | Veřejný výpis akcí                                   | MVP         | Odsouhlaseno  | [F54-1](f54-1-publikovani-akce-do-verejneho-katalogu.md), [F54-2](f54-2-verejny-vypis-akci-s-filtry.md)                                        |
| F55     |    59 | Veřejná stránka akce                                 | MVP         | Odsouhlaseno  | [F55](f55-verejny-detail-akce-s-odkazem-na-prihlasku.md)                                                                                       |
| F56     |    60 | Sdílení odkazu na akci                               | MVP         | Odsouhlaseno  | [F56](f56-trvaly-odkaz-a-nahled-sdilene-akce.md)                                                                                               |
| F57     |    61 | Hero sekce a představení platformy                   | MVP         | Odsouhlaseno  | [F57](f57-hero-s-nazvem-akc-io-a-hlavnim-sdelenim.md)                                                                                          |
| F58     |    62 | Cesty pro organizátora a účastníka                   | MVP         | Odsouhlaseno  | [F58](f58-rozcestnik-pro-poradatele-a-ucastnika.md)                                                                                            |
| F59     |    63 | Prezentace hlavních přínosů                          | MVP         | Odsouhlaseno  | [F59](f59-prezentace-prinosu-pro-poradatele-i-ucastniky.md)                                                                                    |
| F60     |    64 | Ukázka typů podporovaných akcí                       | MVP         | Odsouhlaseno  | [F60](f60-priklady-ruznych-typu-akci.md)                                                                                                       |
| F61     |    65 | Navigace a přihlášení                                | MVP         | Odsouhlaseno  | [F61](f61-navigace-na-prihlaseni-registraci-a-katalog.md)                                                                                      |
| F62     |    66 | Responzivita a základní informace                    | MVP         | Odsouhlaseno  | [F62-1](f62-1-responzivni-a-zakladne-pristupna-landing-page.md), [F62-2](f62-2-paticka-s-kontaktem-ochranou-udaju-a-podminkami.md)             |

## Rozhodnutí a návaznosti

- F22 je Mimo rozsah a Zamítnuto; F31 je Mimo rozsah a Odsouhlaseno. Obě jsou vyřazené z běžného importu a nejsou označené jako Nice to have ani MVP.
- Stories neobsahují otevřené otázky. Aktuální schválení všech nezamítnutých stories vychází z pokynu uživatele z 10. 10. 2026; původní stav zdroje zůstává v manifestu.
- Souhlasy, role, bankovní formát, storno sazby, šablony, limity zátěže a provozní cíle potřebují doplnění od PO/týmu; návrh jim nepřiděluje smyšlené hodnoty.
- Pokyn uživatele sjednocuje aktuální schválení: vše kromě zamítnuté F22 je Odsouhlaseno. Chybějící podklady nemění tento stav; zdrojový Excel zůstává beze změny.
- Přijetí formuláře (F05) není potvrzení účasti (F13/F14); volná lůžka nejsou automaticky využitelná kapacita (F11–F13/F17/F53).
- Nezaplacení ani upomínka neuvolňuje místo; místo uvolní až skutečné zrušení (F10/F25/F30/F46).
- Tři ubytovací automatiky (F20) a platební upomínky (F27) mají oddělené nastavení. Žádná automatika nesmí vypnout bezpečnostní limit kapacity.
- Technické požadavky F41 a F47–F53 mají vedle browser výsledků také technické ověření; samotné UI neprokáže databázovou izolaci, atomickou operaci, obnovitelnost zálohy ani výkon pod zátěží.
