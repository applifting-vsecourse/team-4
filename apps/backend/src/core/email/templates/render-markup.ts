import { Writable } from 'node:stream';
import * as React from 'react';
import { renderToPipeableStream } from 'react-dom/server';

/**
 * Test-only: the markup of a template. `renderEmail` cannot run under jest
 * (its dynamic import needs --experimental-vm-modules), and the Tailwind
 * wrapper suspends, so the stream is read once everything has resolved.
 */
export const renderMarkup = (element: React.ReactElement): Promise<string> =>
  new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk: Buffer, _encoding, done): void {
        html += chunk.toString();
        done();
      },
    });
    sink.on('finish', () => resolve(html));
    const stream = renderToPipeableStream(element, {
      onAllReady: () => stream.pipe(sink),
      onError: reject,
    });
  });
