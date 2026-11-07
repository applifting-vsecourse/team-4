import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brandLogo, LOGO_CID } from './brand-logo';

describe('brandLogo', () => {
  it('is the frontend touch icon, byte for byte', () => {
    const icon = readFileSync(
      join(__dirname, '../../../../frontend/public/apple-touch-icon.png'),
    );

    expect(brandLogo.cid).toBe(LOGO_CID);
    expect(brandLogo.content.equals(icon)).toBe(true);
  });
});
