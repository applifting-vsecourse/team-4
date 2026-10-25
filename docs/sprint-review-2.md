# Sprint Review 2 — 26. října 2026

Cíl: Alena ze Spolku Jasan připraví víkend první pomoci pro vedoucí. Jana se na telefonu přihlásí na oba dny a později vidí zaevidovanou platbu. Organizátor se ukazuje pouze na desktopu; účastník na mobilním viewportu 360 × 800.

## Spuštění

Z kořene repozitáře:

```bash
pnpm frontend demo:v2
```

Šipka doprava, PageDown nebo tlačítko Spustit spustí další kapitolu. Po spuštění je samostatné úvodní zastavení na landing page (S2-01). Další kliknutí pouze posune landing page ke dvěma vstupům „Moje přihlášky“ a „Organizátor“ a zůstane na ní. Teprve následující samostatné kliknutí na Spustit nebo šipku doprava otevře přihlášení organizátora. V autoplay zůstane nahoře i u vstupů vždy alespoň 6 sekund. Uvnitř kapitoly se kliká automaticky. **Alt+P pozastaví nebo obnoví průchod i při zaměření pole.** Mimo textová pole funguje také mezerník. V titulku se zobrazí „Pauza“. Právě běžící kliknutí, posun nebo vypsání pole může doběhnout; následující akce už čeká. Pauza platí pro obě okna a zachová se po navigaci. Během pauzy šipka doprava ani Spustit další krok nespustí. Výchozí tempo je 1 sekunda mezi akcemi, 100 ms mezi znaky a alespoň 4 sekundy po přechodu na stránku. Automatické posunutí k prvku trvá 1,8 sekundy, s pozvolným rozjezdem i zastavením. Pro ještě pomalejší průchod přidej před spouštěcí příkaz `DEMO_SLOWMO=1500`; tato hodnota je v milisekundách. Následující zastavení nechá výsledek předchozí kapitoly na obrazovce, aby byl čas na komentář. Titulek už přitom pojmenuje následující kapitolu.

```bash
# Souvislá zkouška bez zastavení
pnpm frontend demo:v2:autoplay
# Původní podrobná ukázka včetně negativních scénářů
pnpm frontend demo:v2:full
# Rychlé funkční ověření proti již běžící lokální aplikaci
pnpm frontend exec playwright test e2e/sprint-review.spec.ts
```

`demo:v2:record` nadále nahrává původní podrobný scénář s jeho časovou osou. Krátký scénář vlastní sestřih videí zatím nemá.

Pro nasazenou aplikaci nastav její skutečnou URL a přístupnou demo schránku:

```bash
E2E_BASE_URL=https://team-4.vsepractical.applifting.dev DEMO_PARTICIPANT_EMAIL=team4vse@seznam.cz pnpm frontend demo:v2
```

Vzdálený běh nestartuje lokální servery a nepoužívá přímý přístup do databáze. V poslední kapitole si vyžádá skutečný magic link. Doručený odkaz otevři do adresního řádku **stejného mobilního okna dema**; skript počká maximálně tři minuty a naváže otevřením detailu. E-mail ani token nepatří do repozitáře. Autoplay bez obsluhy schránky tedy na nasazené aplikaci nestačí.

Každý běh vytvoří nového organizátora a organizaci s jednou akcí; každý odeslaný formulář zakládá skutečnou přihlášku. Na vzdáleném prostředí odešle zprávy do zadané schránky. Data zůstávají uložená, scénář je nemaže.

## Režie do 9 minut

Před příslušnou kapitolou ukaž skutečná GitHub issues z odkazů níže: krátce zadání, potom odpovídající výsledek v aplikaci. Samotné číslo v titulku nenahrazuje ukázku issue. Odkazy otevři předem v prezentačním prohlížeči; přepínání do GitHubu skript neautomatizuje.

| Čas       | Kapitola a issues                                                                                                                                                                                                             | Komentář k výsledku                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:25 | Úvod                                                                                                                                                                                                                          | „Organizátor zvládne přípravu akce, účastník přihlášení a kontrolu platby.“                                                                                                  |
| 0:25–1:10 | 1. Organizátor a organizace — [S2-01](https://github.com/applifting-vsecourse/team-4/issues/80), [S2-02](https://github.com/applifting-vsecourse/team-4/issues/81)                                                            | Dva rozdílné vstupy; Alena má vlastní organizaci a její akce.                                                                                                                |
| 1:10–2:20 | 2. Akce a termíny — [S2-04](https://github.com/applifting-vsecourse/team-4/issues/83), [Kontextová navigace](https://github.com/applifting-vsecourse/team-4/issues/133)                                                       | Konkrétní akce, dva dny, dvě ceny. Navigace drží kontext organizace a akce.                                                                                                  |
| 2:20–3:10 | 3. Platby a pokoje — [S2-09](https://github.com/applifting-vsecourse/team-4/issues/88), [S2-05](https://github.com/applifting-vsecourse/team-4/issues/84)                                                                     | Organizátor nastaví účet a datum připomenutí; 12 lůžek je dostupných oba dny. Nejde o přiřazování lidí do pokojů.                                                            |
| 3:10–3:35 | 4. Otevření — [S2-06](https://github.com/applifting-vsecourse/team-4/issues/85)                                                                                                                                               | Organizátor sdílí přímý odkaz, veřejný katalog není součástí sprintu.                                                                                                        |
| 3:35–4:40 | 5. Mobilní přihláška — [S2-07](https://github.com/applifting-vsecourse/team-4/issues/86), [S2-08](https://github.com/applifting-vsecourse/team-4/issues/87)                                                                   | Jana zvolí oba termíny a vidí cenu 2 500 Kč před odesláním.                                                                                                                  |
| 4:40–5:10 | 6. Výsledek — [S2-14](https://github.com/applifting-vsecourse/team-4/issues/93), [S2-16](https://github.com/applifting-vsecourse/team-4/issues/128)                                                                           | Potvrzeny oba dny, vznikly platební instrukce a VS. Datum připomenutí není deadline ani automatická upomínka.                                                                |
| 5:10–6:00 | 7. Obsazenost a detail — [S2-10](https://github.com/applifting-vsecourse/team-4/issues/89), [S2-11](https://github.com/applifting-vsecourse/team-4/issues/90)                                                                 | Oba dny mají 1 účastníka a 11 volných míst; Alena otevře Janinu přihlášku. Filtry existují v podrobném průchodu, krátký je neproklikává.                                     |
| 6:00–6:35 | 8. Platba — [S2-12](https://github.com/applifting-vsecourse/team-4/issues/91)                                                                                                                                                 | Ruční evidence přijatých 2 500 Kč vyrovná dluh. Bankovní import není součástí sprintu.                                                                                       |
| 6:35–7:50 | 9. Návrat účastnice — [S2-13](https://github.com/applifting-vsecourse/team-4/issues/92), [S2-14](https://github.com/applifting-vsecourse/team-4/issues/93), [S2-15](https://github.com/applifting-vsecourse/team-4/issues/94) | Jana se vrací přes e-mailový odkaz a vidí aktuální platbu. V demo schránce samostatně ukaž také potvrzovací e-mail po registraci (S2-15); skript jeho doručení nekontroluje. |
| 7:50–8:20 | Neviditelná práce — [S2-03](https://github.com/applifting-vsecourse/team-4/issues/82), [S2-T4](https://github.com/applifting-vsecourse/team-4/issues/77)                                                                      | Izolace organizací a automatické testování. Dokládat konkrétními výsledky CI; krátký happy path bezpečnostní kontroly nepředvádí.                                            |
| 8:20–9:00 | Stav a rezerva                                                                                                                                                                                                                | Známé chyby, částečné dodávky, co čeká na akceptaci PO. Otevřený stav uvést podle aktuálního boardu a evidence.                                                              |

Časy jsou rozpočet pro zkoušku, nikoli naměřená délka prezentace. Pokud bude doručení e-mailu pomalé, využij čekání pro komentář k neviditelné práci.

## Před review

- Ověřit aktuální nasazenou verzi a projet stejný scénář na ní; lokální úspěch není produkční dry run.
- Změřit celý průchod včetně řeči, GitHub issues a práce se schránkou. Cíl je 8:20, zbytek rezerva.
- Zkontrolovat skutečný potvrzovací e-mail i magic link. Lokálně se magic link vytváří přímo v databázi; to není ověření odeslání ani doručení.
- Vyzkoušet účastnický formulář, výsledek a vlastní detail také na fyzickém telefonu. Automatické kontroly šířky neprokazují celou mobilní UX kvalitu.
- Připravit aktuální známé chyby a nedodělky. Při kontrole 25. 10. byla produktová issues S2-01–S2-16 a kontextová navigace uzavřená; některé checkboxy zůstaly nevyplněné. To samo neprokazuje chybu ani splnění všech kritérií. Board a evidence vyžadují finální kontrolu, skript je nemění.
- Nezaměňovat neaktivní položky „Připravujeme“ za dokončené funkce. Povyšování náhradníků, storna, upomínky a bankovní párování nejsou součástí této ukázky.

## Dry run 25. října

- Nasazený kalendář při prvním pokusu nenabízel rok 2027. Lokální větev už obsahuje opravu `2a9cbc3`, ale první vzdálený průchod ji nedokládá jako nasazenou. Demo proto používá skutečný nejbližší listopadový víkend 7.–8. 11. 2026.
- Scénář má omezené čekání na jednotlivé akce; nezůstane neomezeně viset na nedostupném ovládacím prvku.
- Opakované běhy se stejnou schránkou mohou mít stejně pojmenované akce. Závěrečný krok proto otevírá přesně přihlášku vytvořenou v daném běhu.

### Výsledek na nasazené aplikaci

- URL: https://team-4.vsepractical.applifting.dev, schránka `team4vse@seznam.cz`.
- Automaticky prošly kapitoly 1–8: organizátor, organizace, dva termíny a ceny, pokoj, otevření registrace, mobilní přihláška, výsledek, obsazenost, detail a zápis platby.
- Ve schránce ve školním profilu Chrome dorazilo potvrzení přihlášky (18:15) i samostatně vyžádaný magic link (18:16). Potvrzení obsahovalo oba potvrzené termíny, částku 2 500 Kč, účet, VS a datum připomenutí. Odesílatel byl `onboarding@resend.dev`.
- Automatická kapitola 9 vypršela při čekání na ruční vložení doručeného odkazu do mobilního okna. Ovládání Google Chrome for Testing tehdy neodpovídalo. Celý automatický vzdálený test tedy **neprošel**.
- Tentýž doručený odkaz byl následně otevřen v běžném Chrome. Ručně ověřená přihláška `01a1740f-cfc9-75ee-a21d-88aad84c63fd` ukázala oba potvrzené termíny, zaplaceno 2 500 Kč, zbývá 0 Kč a přijatou platbu z 25. 10. 2026. Tato závěrečná kontrola byla na desktopu, nikoli mobilním viewportu.
- Lokální automatický průchod upraveným scénářem prošel. Testovací data zůstala na nasazeném prostředí; předchozí neúspěšné pokusy ponechaly i rozpracované koncepty.

Před prezentací je třeba nacvičit předání e-mailového odkazu do úzkého okna dema. Samostatný ruční průchod nesmí být prezentován jako úspěšný automatický test.
