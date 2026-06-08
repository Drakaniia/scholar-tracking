import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'src/app/(dashboard)/scholarship-flow/page.tsx'),
  'utf8'
);

describe('scholarship flow page UI', () => {
  it('shows explicit five-year window filter labels', () => {
    expect(pageSource).toContain('5-Year Window');
    expect(pageSource).toContain('Start Year');
    expect(pageSource).toContain('Source');
    expect(pageSource).toContain('Showing');
  });

  it('uses a modal number input instead of a start-year dropdown', () => {
    expect(pageSource).toContain('DialogTitle');
    expect(pageSource).toContain('Choose Comparative Data Window');
    expect(pageSource).toContain('type="number"');
    expect(pageSource).toContain('Apply Window');
    expect(pageSource).not.toContain('value={String(startYearFilter)}');
  });

  it('does not render the old scholarship flow header card', () => {
    expect(pageSource).not.toContain('<PageHeader');
    expect(pageSource).not.toContain(
      'Compare scholarship movement and student scholarship load across the last five years'
    );
  });
});
