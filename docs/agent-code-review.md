# Nezávislé agentické code review

Technické zadání: [#78](https://github.com/applifting-vsecourse/team-4/issues/78). Workflow: [`agent-code-review.yml`](../.github/workflows/agent-code-review.yml), kód: [`scripts/agent-review/`](../scripts/agent-review).

## Jak to funguje

1. Karta issue se na boardu **Kemp.io Team 4** přesune do **Ready for Code Review**.
2. Workflow běží každých 5 minut. Projects v2 neumí spustit workflow přesunem karty, proto se board dotazuje pravidelně, takže review začne do několika minut po přesunu.
3. Pro každou issue v tomto sloupci najde všechny **otevřené PR propojené přes `Closes #N`** v popisu PR a každý z nich zrevidují agentem **GitHub Copilot CLI**. Agent dostane diff PR, text issue a pravidla z `CLAUDE.md` a `DESIGN.md` z větve `main`. Nemá žádné nástroje a nespouští kód z PR.
4. Výsledek se zapíše jako komentář **u PR** (revidovaný commit, nálezy) a odkaz na něj jako komentář **u issue**.
5. Pokud **všechny** propojené PR prošly bez nálezů pro svůj aktuální commit, karta se přesune do **Ready for Testing**. Jinak zůstává v Ready for Code Review a komentář u issue uvádí důvod.

Review nenahrazuje testování ani lidského reviewera.

## Co se považuje za úspěch

Úspěch je jen platný verdikt `pass` s prázdným seznamem nálezů pro **aktuální commit** PR. Za neúspěch (karta zůstává) se považuje:

- nálezy (`findings`),
- chyba agenta: neplatný nebo nesoudržný výstup, vypršený čas, chyba kvóty nebo přihlášení, příliš velký diff (limit ~100 kB promptu),
- chybějící propojený PR,
- commit, který se změnil během review (zastaralý výsledek, review proběhne znovu).

Samotné dokončení běhu ani absence komentářů úspěch neznamená.

## Opakování a bezpečnost proti chybnému posunu

- Výsledek se ukládá do komentáře s markerem pro konkrétní PR a **commit SHA**; uznává se jen komentář od `github-actions[bot]`. Opakovaný běh pro stejný commit review neopakuje (nevyčerpává kredity).
- Po nálezech opravte kód a pushněte nový commit. Nový SHA spustí review při dalším běhu, pokud je issue stále v Ready for Code Review. Pokud jste ji mezitím přesunuli jinam, vraťte ji do Ready for Code Review.
- Chyba agenta se pro stejný commit zopakuje nejvýše 3×. Pak pomůže nový commit nebo ruční spuštění s volbou **force**.
- Těsně před přesunem se znovu načte stav karty i commity PR. Pokud mezitím někdo kartu přesunul, automatizace ji nepřepíše. Pokud se změnil commit, výsledek je zastaralý a karta se nepřesune.
- Workflow běží s `concurrency`, takže se dva běhy nepřekrývají.

## Ruční spuštění

Actions → **Agent code review** → Run workflow:

- **dry_run** (výchozí zapnuto): projde board a spustí review, ale nic nekomentuje a nepřesouvá. Výsledek je v logu.
- **issue**: zpracuje jen zadané číslo issue.
- **force**: ignoruje dřívější výsledek pro stejný commit a review provede znovu.

Plánované běhy jsou vždy ostré. Pokud v repozitáři 60 dní nebude žádná aktivita, GitHub plánované workflow vypne; stačí je znovu zapnout v záložce Actions.

## Nastavení (jednorázově)

Repo **Settings → Secrets and variables → Actions → New repository secret**:

| Secret                     | Obsah                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PROJECT_AUTOMATION_TOKEN` | Classic PAT se scopy `project` a `repo`. `GITHUB_TOKEN` nemůže číst ani měnit Projects v2.                                                                                     |
| `COPILOT_GITHUB_TOKEN`     | Fine-grained PAT vlastněný osobním účtem (jako _Resource owner_ zvolte osobní účet, ne organizaci) s oprávněním **Copilot Requests**. Review se účtuje na Copilot tohoto účtu. |

Nikdy tokeny nevkládejte do issue, PR ani chatu. Workflow komentáře píše jako `github-actions[bot]`; přesuny karet se připisují vlastníkovi `PROJECT_AUTOMATION_TOKEN`.

## Omezení

- Nativní tlačítko _Copilot → Reviewers_ se nepoužívá: vrací pouze komentářové review bez verdiktu a u osobní licence selhalo na kvótě. CLI vrací strukturovaný verdikt, který workflow vyhodnocuje.
- Review spotřebovává kredity Copilotu vlastníka `COPILOT_GITHUB_TOKEN`. Když dojdou, agent vrací chybu a karty zůstávají na místě s uvedeným důvodem.
- Diff, text issue i pravidla jsou pro agenta nedůvěryhodná data. Agent nemá nástroje ani přístup k tokenům, ale i tak je možné, že obsah PR ovlivní verdikt. Proto je následující krok Ready for Testing a lidská kontrola.
- Pokud jsou k issue propojeny víc než 20 PR, zpracuje se prvních 20.

## Lokální kontrola

```bash
pnpm agent-review:test   # jednotkové testy rozhodovací logiky (běží i v CI)
```
