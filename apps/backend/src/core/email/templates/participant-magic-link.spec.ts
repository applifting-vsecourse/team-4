import * as React from 'react';
import { ParticipantMagicLink } from './participant-magic-link';
import { renderMarkup } from './render-markup';

describe('ParticipantMagicLink', () => {
  it('opens with the akc.io icon next to the wordmark', async () => {
    const out = await renderMarkup(
      React.createElement(ParticipantMagicLink, {
        url: 'http://app.test/my-registrations/verify?token=abc',
      }),
    );
    expect(out).toMatch(
      /<img[^>]+src="http:\/\/app\.test\/apple-touch-icon\.png"[^>]*>[\s\S]*akc\.io/,
    );
  });
});
