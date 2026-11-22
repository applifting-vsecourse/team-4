# Sprint Review 4 — scénář pro prezentujícího

Scénář používá obnovitelná data [S4-T08](https://github.com/applifting-vsecourse/team-4/issues/483). Hlavní průchod trvá 8:30; posledních 30 sekund je rezerva. Kurz a tábor mají data odvozená od místního dne obnovení, proto se termíny nemění ručně.

## Spuštění

V kořeni repozitáře:

```bash
pnpm frontend demo:v4
```

Průchod se zastavuje po kapitolách; pokračujte šipkou doprava, PageDown nebo tlačítkem **Spustit**. `Alt+P` pozastaví nebo obnoví akce. Konec zůstane na obrazovce do potvrzení prezentujícího. Pro souvislý nácvik spusťte:

```bash
pnpm frontend demo:v4:autoplay
```

Demo otevře přihlášený pohled Marka a mobilní náhled Adama o šířce 360 px. Mobil začíná rovnou na veřejné stránce **Kurzu první pomoci**; Adamova relace se připraví předem bez viditelného přesměrování na **Moje přihlášky**. Na nasazené aplikaci demo vyžádá odkaz pro `team4vse@seznam.cz`; vložte nejnovější odkaz do výzvy před průchodem.

Před promítáním maximalizujte nebo přepněte obě stránky do prezentačního režimu. Nativní kurzor je v obsahu skrytý a žlutý kurzor s tmavým obrysem se řídí výhradně pohyby dema; nereaguje na pohyb myši prezentujícího. Před akcí plynule dojede na cíl a krátce počká. Při přesunu Petra sleduje celý automatický tah od uchopení karty po puštění v podkroví.

## Časovaný průchod

| Čas       | Obraz a akce                                                                                                                                                                                       | Krátká věta k přednesu                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:45 | Marek otevře nastavení **Kurzu první pomoci** a rozbalí **Veřejný přístup**. Ukažte zveřejnění, otevřené přihlašování a text podmínek včetně storna.                                               | „Kurz je veřejně dostupný, přihlášky jsou otevřené a podmínky včetně storna jsou vidět před odesláním.“                                    |
| 0:45–1:35 | Přepněte na mobilní náhled. Adam na veřejném odkazu vybere první termín, ukažte **650 Kč** a předvyplněné jméno, telefon i ověřený e-mail. Rozbalte podmínky.                                      | „Adamovy údaje se doplnily z profilu. Před odesláním zná cenu a potvrzuje podmínky.“                                                       |
| 1:35–2:15 | Adam potvrdí podmínky, odešle přihlášku. Na potvrzení chvíli zůstaňte.                                                                                                                             | „Přihláška je odeslaná. Výsledek zůstává na mobilu.“                                                                                       |
| 2:15–2:55 | Marek otevře **Tábor v Jizerkách → Platby**, vybere Fio výpis `fio-vypis-tabor-dve-platby.csv` a spustí import. Ukažte automaticky přiřazenou Adamovu platbu i Elišku v nespárovaných transakcích. | „Jednu platbu jsme podle variabilního symbolu přiřadili Adamovi. Druhá přišla bez něj, takže ji Marek vidí ve frontě k ručnímu přiřazení.“ |
| 2:55–3:30 | Ukažte Adamův řádek **2 500 Kč** a saldo **0 Kč**, Eliščinou nezařazenou platbu **1 250 Kč** a na Adamově mobilu oznámení **Přijatá platba**.                                                      | „Doplatek je nulový a Adam vidí oznámení o přijaté platbě.“                                                                                |
| 3:30–4:15 | Adam v detailu táborové přihlášky otevře **Upravit přihlášku → Spolubydlící**, zvolí Filipa a uloží. Marek v nastavení tábora ukáže oddělení pokojů podle pohlaví a preferenci spolubydlících.     | „Adam přidal Filipa. Organizátor kombinuje pevné oddělení pokojů a měkké přání.“                                                           |
| 4:15–5:10 | Marek přejde do **Ubytování → Rozdělení**, vybere 2. turnus. V rozbalené Chatce Buk uchopí kartu Petra a plynule ji přetáhne do **Podkroví hlavní budovy**.                                        | „Petra přesouvám do podkroví a jeho rozhodnutí zamykám.“                                                                                   |
| 5:10–6:00 | Otevřete nabídku Petra, zvolte **Zamknout umístění** a ukažte zámek vedle jména. Spusťte **Navrhnout pokoje**. Během čekání na solver popište rozdělení velkých skupin do kapacit.                 | „Návrh rozdělí ostatní podle pravidel a zámek zachová ruční umístění Petra.“                                                               |
| 6:00–6:45 | V návrhu ukažte Petra v podkroví, návrh použijte a ve **Uloženém rozdělení** znovu ukažte Petra v podkroví se zámkem.                                                                              | „Stejné umístění je v návrhu i po jeho uložení.“                                                                                           |
| 6:45–7:25 | Marek přepne na 1. turnus a zveřejní rozdělení.                                                                                                                                                    | „Zveřejňuji pouze první turnus; druhý zůstává neveřejný.“                                                                                  |
| 7:25–8:30 | Adam obnoví detail přihlášky na tábor. Ukažte **Chatka Buk** a u přání Filipa stav **Splněno**. Na výsledku zůstaňte do konce.                                                                     | „Adam vidí své zveřejněné ubytování i splněné přání na Filipa.“                                                                            |
| 8:30–9:00 | Rezerva pro přepnutí oken, pomalý solver nebo dotaz.                                                                                                                                               | „Tohle je celý průchod od přihlášky přes platbu až po pokoj.“                                                                              |

## Příprava a opakování

1. Obnovte demo data podle [`apps/backend/prisma/demo/README.md`](../apps/backend/prisma/demo/README.md). Pro čistý lokální nácvik je příkaz z kořene repozitáře:

   ```bash
   pnpm --filter backend exec prisma db execute --file prisma/demo/demo-create.sql
   ```

   Lokální `.env` musí mířit na lokální Postgres. Produkční verzi skriptu spusťte jen v Admineru podle README, nikoli přes lokální Prisma CLI.

2. Spusťte lokální aplikaci (`pnpm dev`) nebo nastavte `E2E_BASE_URL` na nasazenou verzi. Ověřte, že účet Marka a veřejný odkaz `/e/lipa-kurz` fungují.
3. Spusťte `pnpm frontend demo:v4`. Marek se přihlásí automaticky; na produkci ještě vložte Adamův aktuální magic link.
4. Po průchodu spusťte obnovu dat znovu a přehrajte scénář podruhé. SQL obnoví i nepoužitý Fio import, odstraní novou přihlášku na kurz a vrátí pokoje na výchozí stav. Před každým během ověřte, že import hlásí dvě nové transakce a jedno automatické spárování.
5. Časovaný scénář počítá s mluveným komentářem a ručním tempem při přepínání oken; hlavní část končí v 8:30 a zůstává 30 sekund rezervy. Automatický průchod se třikrát podařil z obnovených dat a trval přibližně 2:30 včetně čekání na solver. Tento čas ověřuje průchodnost, nikoli devítiminutový přednes. Před prezentací proto projděte tabulku nahlas se stopkami; `demo:v4:autoplay` slouží jako technická kontrola.

## Ruční pokračování ze stejné obrazovky

- **Přesun a zámek Petra:** zůstaňte na kartě Petra v Chatce Buk. Uchopte ji myší, přetáhněte do podkroví a pusťte; pak otevřete nabídku karty a vyberte **Zamknout umístění**. Pokud drag-and-drop selže, nabídka karty nabízí **Přesunout do pokoje → Podkroví hlavní budovy**. Spusťte solver až po potvrzení uloženého přesunu a zámku. Po použití návrhu zkontrolujte oba pohledy, než přejdete dál.
- **Zveřejnění na mobilu:** pokud se automatické obnovení neprojeví, zůstaňte na Adamově detailu přihlášky a klikněte na tlačítko pro obnovení stránky. Jestli první turnus ještě nebyl zveřejněný, vraťte se do organizátora, zapněte přepínač **Zveřejnit rozdělení** u 1. turnusu a obnovte mobilní detail znovu. Neopouštějte detail, dokud nejsou vidět **Chatka Buk** a **Splněno**.

## Rychlé vstupy pro dotazy

| Téma                               | Přímý vstup                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Katalog a filtry                   | `/events` — vyhledávání, místo, období a kategorie                            |
| Aktuální a proběhlé akce účastníka | `/my-registrations` — rozbalit **Proběhlé akce**                              |
| Přidání termínu                    | Organizátor → **Akce a turnusy** → akce → **Termíny** → **Přidat termín**     |
| Program                            | Tábor → **Program** → výběr turnusu                                           |
| Ruční párování platby              | Tábor → **Platby** → tabulka nespárovaných transakcí → **Přiřadit transakci** |

## Stav dodávky

Aktuální přehled: [Sprintový board Team 4](https://github.com/orgs/applifting-vsecourse/projects/1). Při kontrole 22. 11. 2026 měl Sprint 4 na boardu 53 karet a všechny byly ve stavu **Done**; včetně [S4-T08](https://github.com/applifting-vsecourse/team-4/issues/483). Stav před prezentací zkontrolujte znovu přímo na boardu.
