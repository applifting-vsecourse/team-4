type PublicEventSharePageInput = {
  title: string;
  description: string;
  detailUrl: string;
  imageUrl: string | null;
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

const previewDescription = (description: string): string =>
  description.replace(/\s+/g, ' ').trim().slice(0, 200);

/** Server-rendered metadata lets social crawlers preview the same public detail URL. */
export function publicEventSharePage(input: PublicEventSharePageInput): string {
  const title = escapeHtml(input.title);
  const description = escapeHtml(previewDescription(input.description));
  const detailUrl = escapeHtml(input.detailUrl);
  const image = input.imageUrl
    ? `<meta property="og:image" content="${escapeHtml(input.imageUrl)}">\n` +
      `<meta name="twitter:card" content="summary_large_image">\n`
    : '<meta name="twitter:card" content="summary">\n';

  return `<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} • akc.io</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${detailUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="akc.io">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${detailUrl}">
    ${image.trimEnd()}
    <meta http-equiv="refresh" content="0;url=${detailUrl}">
  </head>
  <body>
    <p>Otevíráme veřejný detail akce. <a href="${detailUrl}">Pokračovat na akc.io</a></p>
  </body>
</html>`;
}
