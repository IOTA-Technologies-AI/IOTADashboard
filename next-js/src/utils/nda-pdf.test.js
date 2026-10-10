import { it, expect, describe } from 'vitest';

import { displaySize, displayToPdf } from './nda-pdf';

// An A4-ish page, unrotated 600 wide x 800 tall.
const W = 600;
const H = 800;

describe('displayToPdf (signatures on rotated / scanned pages)', () => {
  it('leaves an unrotated page as it was (top-left origin flipped to bottom-left)', () => {
    expect(displayToPdf(0, W, H, 0, 0)).toEqual({ x: 0, y: H });
    expect(displayToPdf(0, W, H, 100, 50)).toEqual({ x: 100, y: H - 50 });
  });

  it('maps the displayed corners of a page rotated 90 degrees', () => {
    // Shown 800 wide x 600 tall. Its top-left is the unrotated bottom-left.
    expect(displaySize(90, W, H)).toEqual({ width: H, height: W });
    expect(displayToPdf(90, W, H, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(displayToPdf(90, W, H, H, 0)).toEqual({ x: 0, y: H }); // top-right
    expect(displayToPdf(90, W, H, 0, W)).toEqual({ x: W, y: 0 }); // bottom-left
  });

  it('maps the displayed corners of a page rotated 180 degrees', () => {
    expect(displayToPdf(180, W, H, 0, 0)).toEqual({ x: W, y: 0 });
    expect(displayToPdf(180, W, H, W, H)).toEqual({ x: 0, y: H });
  });

  it('maps the displayed corners of a page rotated 270 degrees', () => {
    expect(displaySize(270, W, H)).toEqual({ width: H, height: W });
    expect(displayToPdf(270, W, H, 0, 0)).toEqual({ x: W, y: H });
    expect(displayToPdf(270, W, H, H, W)).toEqual({ x: 0, y: 0 });
  });

  it('treats -90 like 270', () => {
    expect(displayToPdf(-90, W, H, 10, 20)).toEqual(displayToPdf(270, W, H, 10, 20));
  });
});
