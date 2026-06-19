import { describe, expect, it } from 'vitest';

import { getChangedFields, hasChangedFields } from '@/lib/form-change-summary';

describe('form change summary', () => {
  it('lists changed fields with readable before and after values', () => {
    const changes = getChangedFields(
      {
        firstName: 'ANA',
        requirements: 'Old requirement',
        amount: 1000,
      },
      {
        firstName: 'ANA',
        requirements: 'Updated requirement',
        amount: 1500,
      },
      {
        firstName: 'First name',
        requirements: 'Description',
        amount: 'Amount',
      }
    );

    expect(changes).toEqual([
      {
        key: 'requirements',
        label: 'Description',
        before: 'Old requirement',
        after: 'Updated requirement',
      },
      {
        key: 'amount',
        label: 'Amount',
        before: '1000',
        after: '1500',
      },
    ]);
    expect(hasChangedFields(changes)).toBe(true);
  });
});
