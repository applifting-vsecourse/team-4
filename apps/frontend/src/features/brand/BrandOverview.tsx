// Brand → Přehled směrů (S5-T03-1, POC): references, problems of the current screens and what
// each direction takes from where. Design only.
import { BrandMark } from "@/components/BrandMark"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PROBLEMS = [
  {
    screen: "Přihláška na akci",
    items: [
      "Formulář, karty i tlačítka mají stejný silný obrys a tvrdý stín: nic nemá vyšší váhu a hlavní akce nevyčnívá.",
      "Pět sekcí se stejnou váhou a štítky Povinné/Nepovinné; není poznat, kolik formuláře zbývá.",
      "Cena vybraných termínů leží mezi termíny a kontaktem s vysvětlujícím odstavcem, daleko od tlačítka Odeslat.",
      "U termínu není před výběrem vidět, že je obsazený a přihláška bude náhradnická.",
      "Na mobilu vnořené rámečky a odsazení ubírají polím šířku.",
    ],
  },
  {
    screen: "Seznam přihlášek",
    items: [
      "Termíny a jejich stavy jsou ve dvou sloupcích, které je nutné číst souběžně po řádcích.",
      "Dlouhý štítek „Čeká na rozhodnutí organizátora“ rozšiřuje sloupec.",
      "E-mail i telefon pod jménem zvyšují každý řádek; tabulka je řídká.",
      "Filtry neukazují počty a chybí rychlé filtry podle stavu.",
      "Řádek nemá vlastní akce, jen proklik na detail.",
      "Rozhodující částka (zbývá zaplatit) se vizuálně neliší od celkové a zaplacené.",
    ],
  },
]

const DIRECTIONS = [
  {
    name: "Směr A „Klid“",
    mood: "Civilní, věcný a tichý nástroj. Studené neutrální plochy, indigová akce, jemné linky a měkké stíny.",
    type: "Inter, JetBrains Mono pro částky",
    icons: "Phosphor",
    composition:
      "Přihláška: formulář vlevo, vpravo lepicí shrnutí akce, termínů a ceny s tlačítkem. Seznam: jeden řádek nástrojů s rychlými filtry a počty, termín i jeho stav na jednom řádku, menu akcí u řádku.",
    references: [
      ["Linear", "tichá navigace, husté řádky, vlasové linky místo rámečků"],
      ["Stripe Dashboard", "částky zarovnané vpravo, stavové štítky, filtry s počty"],
      ["GOV.UK Design System", "skupiny otázek s nadpisem vlevo, krátké popisky"],
    ],
  },
  {
    name: "Směr B „Tábor“",
    mood: "Teplý a komunitní. Písková plocha, lesní zelená akce, terakotové doplňky, výrazné zaoblení.",
    type: "Fraunces pro nadpisy, DM Sans pro text a čísla",
    icons: "Tabler",
    composition:
      "Přihláška: hlavička akce s fakty v pilulkách, číslované sekce v jednom sloupci, termíny jako karty, lepicí spodní lišta s cenou a odesláním. Seznam: tmavě zelená navigace, karty s počty jako rychlé filtry, přepínač termínů, zbývající částka jako hlavní číslo.",
    references: [
      ["Airbnb", "zaoblené karty výběru a lepicí lišta s cenou"],
      ["Headspace", "teplá paleta a přívětivé tvary bez dětskosti"],
      ["Eventbrite checkout", "číslované části registrace, jasné pořadí"],
    ],
  },
  {
    name: "Směr C „Plakát“",
    mood: "Výrazný a redakční. Bílá a téměř černá, rumělková akce, ostré rohy, velká typografie.",
    type: "Space Grotesk pro nadpisy, Geist a Geist Mono",
    icons: "Remix Icon",
    composition:
      "Přihláška: akce jako plakát vedle formuláře (na mobilu nahoře), formulář jako číslovaný dokument s linkami. Seznam: černá navigace, velký nadpis s počtem, textové filtry, stavy jako tečka a text, tři sloupce částek.",
    references: [
      ["Luma", "akce jako plakát vedle přihlášky"],
      ["Vercel Dashboard", "monochrom, mono čísla, tečkové stavy"],
      ["Švýcarský typografický styl", "mřížka, velká typografie, linky místo boxů"],
    ],
  },
  {
    name: "Směr E „Riso“",
    mood: "Tisk dvěma barvami. Novinový papír, modrý inkoust místo černé, fluorescenční růžová, rastrové tečky a lehce posunutý soutisk.",
    type: "Recursive: jedna rodina pro hravé nadpisy, text i čísla (osy Casual a Mono)",
    icons: "Iconoir",
    composition:
      "Přihláška: průvodce ve čtyřech krocích, hotové kroky se sbalí do řádku se Změnit, na mobilu Krok 2 ze 4 s průběhem. Seznam: navigace nahoře místo postranního panelu, filtry jako sloupec zaškrtávátek s počty, tabulka seskupená po termínech.",
    references: [
      ["Risografický tisk (Hato Press)", "dvě barvy, rastr, posunutý soutisk"],
      ["GOV.UK One thing per page", "jeden krok s jedním tématem, hotové kroky jako shrnutí"],
      ["Airtable", "seskupení řádků a filtry s počty"],
    ],
  },
  {
    name: "Směr F „Orientační systém“",
    mood: "Nádražní a městské značení. Betonově šedá, tmavě modrá, signální žlutá, piktogramy ve čtvercích.",
    type: "Overpass (z dálničního písma Highway Gothic), Overpass Mono",
    icons: "Carbon",
    composition:
      "Přihláška: modrý pás s akcí a fakty jako piktogramy, termíny jako jízdní řád, cena na modré tabuli u tlačítka. Seznam: lišta s piktogramy, počty na tabuli jako rychlé filtry, pruhovaná tabulka s textovou akcí Detail.",
    references: [
      ["Orientační systém pražského metra a SBB", "piktogramy ve čtvercích, krátké popisky"],
      ["Odjezdové tabule", "počty jako tabule, číslice stejné šířky"],
      ["Jízdní řád", "termíny v pevných sloupcích, pruhované řádky"],
    ],
  },
]

export function BrandOverview() {
  return (
    <div className="min-h-svh space-y-10 bg-background p-8 text-foreground">
      <header className="space-y-3">
        <BrandMark isLarge />
        <h1 className="text-h2">Směry brandu</h1>
        <p className="max-w-2xl text-muted-foreground">
          Všechny směry používají stejný obsah, data a výchozí stavy, stejný kit komponent a stejný
          význam stavových barev. Liší se kompozicí, barvami, písmem, ikonami a tvarem.
        </p>
      </header>

      <section
        aria-labelledby="problems"
        className="space-y-4"
      >
        <h2
          id="problems"
          className="text-h3"
        >
          Problémy výchozích obrazovek
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {PROBLEMS.map((group) => (
            <Card key={group.screen}>
              <CardHeader>
                <CardTitle>{group.screen}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="directions"
        className="space-y-4"
      >
        <h2
          id="directions"
          className="text-h3"
        >
          Směry a reference
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {DIRECTIONS.map((direction) => (
            <Card key={direction.name}>
              <CardHeader>
                <CardTitle>{direction.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <p>{direction.mood}</p>
                  <dl className="space-y-1">
                    <div className="flex gap-2">
                      <dt className="font-medium">Písmo:</dt>
                      <dd>{direction.type}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium">Ikony:</dt>
                      <dd>{direction.icons}</dd>
                    </div>
                  </dl>
                  <p className="text-muted-foreground">{direction.composition}</p>
                  <div className="space-y-2">
                    <h3 className="text-h4">Reference</h3>
                    <ul className="space-y-1">
                      {direction.references.map(([source, takeaway]) => (
                        <li key={source}>
                          <span className="font-medium">{source}</span>: {takeaway}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
