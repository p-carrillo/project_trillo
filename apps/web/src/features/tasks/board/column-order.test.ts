import { describe, expect, it } from 'vitest';
import {
  createCustomColumnOrderId,
  createStatusColumnOrderId,
  readCustomColumnIdFromOrderId,
  readStatusFromColumnOrderId,
  reorderColumnOrder,
  resolveColumnOrder
} from './column-order';

describe('column-order', () => {
  it('sanitizes stored column order by removing duplicates and unknown ids', () => {
    const resolved = resolveColumnOrder(
      [
        createStatusColumnOrderId('todo'),
        'unknown:column',
        createStatusColumnOrderId('todo'),
        createCustomColumnOrderId('custom-1')
      ],
      ['todo', 'in_progress', 'done'],
      ['custom-1']
    );

    expect(resolved).toEqual([
      createStatusColumnOrderId('todo'),
      createCustomColumnOrderId('custom-1'),
      createStatusColumnOrderId('in_progress'),
      createStatusColumnOrderId('done')
    ]);
  });

  it('appends missing default columns first and custom columns after that', () => {
    const resolved = resolveColumnOrder(
      [createStatusColumnOrderId('done')],
      ['todo', 'in_progress', 'done'],
      ['custom-1', 'custom-2']
    );

    expect(resolved).toEqual([
      createStatusColumnOrderId('done'),
      createStatusColumnOrderId('todo'),
      createStatusColumnOrderId('in_progress'),
      createCustomColumnOrderId('custom-1'),
      createCustomColumnOrderId('custom-2')
    ]);
  });

  it('reorders a column id relative to a target id', () => {
    const order = [
      createStatusColumnOrderId('todo'),
      createStatusColumnOrderId('in_progress'),
      createStatusColumnOrderId('done')
    ];

    const movedRight = reorderColumnOrder(order, createStatusColumnOrderId('todo'), createStatusColumnOrderId('in_progress'));
    expect(movedRight).toEqual([
      createStatusColumnOrderId('in_progress'),
      createStatusColumnOrderId('todo'),
      createStatusColumnOrderId('done')
    ]);

    const movedLeft = reorderColumnOrder(movedRight, createStatusColumnOrderId('done'), createStatusColumnOrderId('in_progress'));
    expect(movedLeft).toEqual([
      createStatusColumnOrderId('done'),
      createStatusColumnOrderId('in_progress'),
      createStatusColumnOrderId('todo')
    ]);
  });

  it('parses status/custom ids from a column order id', () => {
    expect(readStatusFromColumnOrderId(createStatusColumnOrderId('todo'))).toBe('todo');
    expect(readStatusFromColumnOrderId(createCustomColumnOrderId('custom-1'))).toBeNull();
    expect(readCustomColumnIdFromOrderId(createCustomColumnOrderId('custom-1'))).toBe('custom-1');
    expect(readCustomColumnIdFromOrderId(createStatusColumnOrderId('done'))).toBeNull();
  });
});
