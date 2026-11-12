import { Issue } from '../../core/models';
import { toFullColumnIndex } from './board-page';

const col = (...ids: string[]) => ids.map((id) => ({ id }) as Issue);

describe('toFullColumnIndex', () => {
  const full = col('a', 'b', 'c', 'd', 'e');

  it('is the identity when nothing is filtered', () => {
    expect(toFullColumnIndex(full, full, 'x', 2)).toBe(2);
  });

  it('inserts before the visible issue at the drop position', () => {
    // Visible: a, c, e. Dropping at visible index 1 lands just before "c".
    expect(toFullColumnIndex(full, col('a', 'c', 'e'), 'x', 1)).toBe(2);
  });

  it('inserts after the last visible issue when dropped at the end', () => {
    expect(toFullColumnIndex(full, col('a', 'c'), 'x', 2)).toBe(3);
  });

  it('appends to the column when no issues are visible', () => {
    expect(toFullColumnIndex(full, [], 'x', 0)).toBe(5);
  });

  it('ignores the moved issue when it comes from the same column', () => {
    // Moving "a" to the slot before "d" (visible list without "a" is b, d).
    expect(toFullColumnIndex(full, col('a', 'b', 'd'), 'a', 1)).toBe(2);
  });
});
