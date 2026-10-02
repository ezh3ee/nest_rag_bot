import type { Context } from 'grammy';
import { isAdmin } from './telegram-guards';

const ctxWithFromId = (id?: number): Context =>
  ({ from: id === undefined ? undefined : { id } }) as unknown as Context;

describe('isAdmin', () => {
  const ADMIN_ID = 110159942;

  it('returns true when the sender id matches the admin id', () => {
    expect(isAdmin(ctxWithFromId(ADMIN_ID), ADMIN_ID)).toBe(true);
  });

  it('returns false for another sender', () => {
    expect(isAdmin(ctxWithFromId(ADMIN_ID + 1), ADMIN_ID)).toBe(false);
  });

  it('returns false when there is no sender on the context', () => {
    expect(isAdmin(ctxWithFromId(), ADMIN_ID)).toBe(false);
  });
});
