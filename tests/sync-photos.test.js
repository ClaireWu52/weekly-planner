/*
 * Tests for LO.photoPlan in js/sync-photos.js: which wardrobe photos to send,
 * fetch or remove when syncing.
 */
(() => {
  'use strict';
  const plan = window.LO.photoPlan;
  const r = (hash, id) => ({ hash, name: `ward-${id}-${hash}.enc` });

  test('photoPlan: new photos here are sent, ones only in the cloud are fetched', () => {
    eq(plan(['a', 'b'], { a: 'aaaaaaaaaaaa' }, { b: r('bbbbbbbbbbbb', 'b') }, {}),
      { upload: ['a'], download: ['b'], remove: [] });
  });

  test('photoPlan: nothing to do when both sides match', () => {
    eq(plan(['a'], { a: '111111111111' }, { a: r('111111111111', 'a') }, { a: '111111111111' }),
      { upload: [], download: [], remove: [] });
  });

  test('photoPlan: a photo replaced on this device is sent and its old version removed', () => {
    eq(plan(['a'], { a: '222222222222' }, { a: r('111111111111', 'a') }, { a: '111111111111' }),
      { upload: ['a'], download: [], remove: ['ward-a-111111111111.enc'] });
  });

  test('photoPlan: a photo replaced on another device is fetched, not overwritten', () => {
    eq(plan(['a'], { a: '111111111111' }, { a: r('333333333333', 'a') }, { a: '111111111111' }),
      { upload: [], download: ['a'], remove: [] });
  });

  test('photoPlan: replaced on both sides, this device wins', () => {
    eq(plan(['a'], { a: '222222222222' }, { a: r('333333333333', 'a') }, { a: '111111111111' }).upload, ['a']);
  });

  test('photoPlan: photos of clothes that were deleted are removed from the cloud', () => {
    eq(plan(['a'], { a: '111111111111', gone: '999999999999' }, { a: r('111111111111', 'a'), gone: r('999999999999', 'gone') }, {}),
      { upload: [], download: [], remove: ['ward-gone-999999999999.enc'] });
  });

  test('photoPlan: an item without its photo anywhere is skipped', () => {
    eq(plan(['a'], {}, {}, {}), { upload: [], download: [], remove: [] });
  });
})();
