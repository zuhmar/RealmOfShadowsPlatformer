import test from 'node:test';
import assert from 'node:assert/strict';
import { classSkinSheet } from '@ros/game-data';
import { createPlayer, normalizeSkin, equipSkin } from '@ros/shared';
test('class sheets select the equipped starter/Woods/Crystal weapon and unarmed ladder/tool states', () => {
  for (const [cls, kind] of [
    ['knight', 'sword'],
    ['archer', 'bow'],
    ['mage', 'staff'],
    ['rogue', 'dagger'],
  ] as const) {
    for (const tier of ['woods', 'crystal']) {
      const p = { skin: cls, classId: cls, weapon: `${tier}-${kind}` };
      const s = classSkinSheet(p);
      assert.equal(s.armed, true);
      assert.ok(s.path.endsWith(`${cls}-armed-${tier}`));
      assert.ok(classSkinSheet({ ...p, climbing: true }).path.endsWith(`${cls}-unarmed`));
      assert.ok(classSkinSheet({ ...p, gathering: {} }).path.endsWith(`${cls}-unarmed`));
      assert.ok(classSkinSheet(p, true).path.endsWith(`${cls}-unarmed`));
    }
    assert.ok(
      classSkinSheet({
        skin: cls,
        classId: cls,
        weapon: `${cls === 'knight' ? 'elderwood-blade' : cls === 'archer' ? 'elderwood-bow' : cls === 'mage' ? 'elderwood-staff' : 'elderwood-dagger'}`,
      }).path.endsWith(`${cls}-armed`),
    );
    assert.ok(
      classSkinSheet({ skin: cls, classId: cls, weapon: `shadow-${kind}` }).path.endsWith(
        `${cls}-unarmed`,
      ),
    );
  }
  assert.equal(
    classSkinSheet({ skin: 'mage', classId: 'knight', weapon: 'woods-staff' }).key,
    'skin-base-staff-woods',
  );
  assert.equal(
    classSkinSheet({ skin: 'golden-test', classId: 'knight', weapon: 'woods-sword' }).key,
    'skin-base-sword-woods',
  );
});
test('old saves adopt the class outfit once; later Celestial base choices persist', () => {
  const p = createPlayer('p', 'Hero');
  p.classId = 'mage';
  delete p.skinConceptVersion;
  assert.equal(normalizeSkin(p), true);
  assert.equal(p.skin, 'mage');
  assert.equal(p.skinConceptVersion, 2);
  equipSkin(p, 'golden-test');
  assert.equal(normalizeSkin(p), false);
  assert.equal(p.skin, 'golden-test');
  equipSkin(p, 'mage');
  assert.equal(normalizeSkin(p), false);
  assert.equal(p.skin, 'mage');
  assert.throws(() => equipSkin(p, 'rogue'), /matching class/);
});

test('plain Celestial sheets cover all twelve weapon variants without requiring a class', () => {
  const starter = {
    sword: 'elderwood-blade',
    bow: 'elderwood-bow',
    staff: 'elderwood-staff',
    dagger: 'elderwood-dagger',
  };
  for (const kind of ['sword', 'bow', 'staff', 'dagger'] as const)
    for (const tier of ['starter', 'woods', 'crystal']) {
      const weapon = tier === 'starter' ? starter[kind] : `${tier}-${kind}`;
      const p = { skin: 'golden-test', weapon };
      const sheet = classSkinSheet(p);
      assert.equal(sheet.key, `skin-base-${kind}-${tier}`);
      assert.equal(sheet.armed, true);
      assert.equal(classSkinSheet({ ...p, climbing: true }).key, 'skin-golden-test');
      assert.equal(classSkinSheet({ ...p, gathering: {} }).key, 'skin-golden-test');
      assert.equal(classSkinSheet(p, true).key, 'skin-golden-test');
    }
  assert.equal(classSkinSheet({ skin: 'golden-test', weapon: null }).key, 'skin-golden-test');
  assert.equal(classSkinSheet({ skin: 'golden-test', weapon: 'shadow-sword' }).armed, false);
});
