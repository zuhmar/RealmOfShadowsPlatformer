import test from 'node:test';
import assert from 'node:assert/strict';
import { Collection, ChannelType, PermissionFlagsBits as P } from 'discord.js';
import {
  isCosmeticRole,
  setupCommunity,
  CHANNEL_GROUPS,
  ROLE_DEFINITIONS,
  trustedGuild,
  gameUrl,
  welcomePayload,
  seedMessage,
} from '../src/community.mjs';
import { loadCatalog, selectCard } from '../src/catalog.mjs';
import { commands } from '../src/commands.mjs';
function fakeGuild() {
  let n = 100;
  const guild = {
    id: '123456789012345678',
    roles: { cache: new Collection() },
    channels: { cache: new Collection() },
  };
  guild.roles.fetch = async () => guild.roles.cache;
  guild.roles.create = async (spec) => {
    const r = { ...spec, id: String(n++), managed: false };
    guild.roles.cache.set(r.id, r);
    return r;
  };
  guild.channels.fetch = async () => guild.channels.cache;
  guild.channels.create = async (spec) => {
    const c = {
      ...spec,
      id: String(n++),
      parentId: spec.parent,
      permissionOverwrites: {
        cache: new Collection(
          (spec.permissionOverwrites ?? []).map((o) => [o.id, { ...o, deny: new Set(o.deny) }]),
        ),
      },
    };
    guild.channels.cache.set(c.id, c);
    return c;
  };
  return guild;
}
test('setup creates intended layout and reruns without duplicate resources or overwriting existing roles', async () => {
  const guild = fakeGuild();
  const a = await setupCommunity(guild, '999999999999999999');
  assert.equal(a.counts.roles, ROLE_DEFINITIONS.length);
  assert.equal(a.counts.categories, CHANNEL_GROUPS.length);
  assert.equal(a.counts.channels, CHANNEL_GROUPS.flatMap((g) => g.channels).length);
  a.roles.get('Adventurer').customSetting = 'preserve';
  const b = await setupCommunity(guild, '999999999999999999');
  assert.deepEqual(b.counts, { roles: 0, categories: 0, channels: 0 });
  assert.equal(b.roles.get('Adventurer').customSetting, 'preserve');
  const staff = guild.channels.cache.find((c) => c.name === 'STAFF');
  assert.ok(staff.permissionOverwrites.cache.get(guild.id).deny.has(P.ViewChannel));
  const start = guild.channels.cache.find((c) => c.name === 'START HERE');
  assert.ok(start.permissionOverwrites.cache.get(guild.id).deny.has(P.SendMessages));
});
test('setup refuses an existing public staff category', async () => {
  const g = fakeGuild();
  g.channels.cache.set('bad', {
    id: 'bad',
    name: 'STAFF',
    type: ChannelType.GuildCategory,
    permissionOverwrites: { cache: new Collection() },
  });
  await assert.rejects(setupCommunity(g, '999999999999999999'), /STAFF category/);
});
test('guild allowlist and welcome mentions cannot spill into other servers or mass mentions', () => {
  assert.equal(trustedGuild('1', '1'), true);
  assert.equal(trustedGuild('2', '1'), false);
  assert.equal(trustedGuild('', ''), false);
  const p = welcomePayload('123456789012345678', 'https://example.com');
  assert.deepEqual(p.allowedMentions, { parse: [], users: ['123456789012345678'] });
  assert.throws(() => welcomePayload('@everyone', 'https://example.com'));
});
test('game URL requires an HTTPS origin without credentials or query strings', () => {
  assert.equal(gameUrl('https://example.com/'), 'https://example.com');
  for (const x of [
    'http://example.com',
    'https://user:pass@example.com',
    'https://example.com/path',
    'https://example.com?token=abc',
  ])
    assert.throws(() => gameUrl(x));
});
test('all showcases resolve locally; arbitrary paths and unknown IDs are rejected', async () => {
  const cards = await loadCatalog();
  assert.equal(cards.length, 72);
  for (const c of cards) assert.ok(selectCard(cards, c.id).path.endsWith('.png'));
  assert.throws(() => selectCard(cards, '../../secret'));
  assert.throws(() => selectCard([{ id: 'bad', file: '../../.env' }], 'bad'));
});
test('setup seed messages are not reposted when markers already exist', async () => {
  let sent = 0;
  const message = { author: { id: 'bot' }, embeds: [{ footer: { text: 'marker' } }] };
  const channel = {
    messages: {
      fetchPins: async () => ({ items: [] }),
      fetch: async () => new Collection([['1', message]]),
    },
    send: async () => {
      sent++;
    },
  };
  assert.equal(await seedMessage(channel, 'marker', {}, 'bot'), false);
  assert.equal(sent, 0);
});
test('public posting is opt-in and administrative commands declare permission requirements', () => {
  for (const name of ['showcase', 'update']) {
    const command = commands.find((c) => c.name === name);
    assert.equal(command.default_member_permissions, String(P.ManageGuild));
    const option = command.options.find((o) => o.name === 'publish');
    assert.ok(option);
    assert.notEqual(option.required, true);
  }
});

test('self-assignment never accepts a privileged or managed class role', () => {
  assert.equal(
    isCosmeticRole({ name: 'Knight', managed: false, permissions: { bitfield: 0n } }),
    true,
  );
  assert.equal(
    isCosmeticRole({ name: 'Knight', managed: false, permissions: { bitfield: P.Administrator } }),
    false,
  );
  assert.equal(
    isCosmeticRole({ name: 'Knight', managed: true, permissions: { bitfield: 0n } }),
    false,
  );
  assert.equal(
    isCosmeticRole({ name: 'Moderator', managed: false, permissions: { bitfield: 0n } }),
    false,
  );
});

test('one-time setup previews offline and refuses to apply without private credentials', async () => {
  const { spawnSync } = await import('node:child_process');
  const path = new URL('../src/setup-once.mjs', import.meta.url);
  const { fileURLToPath } = await import('node:url');
  const preview = spawnSync(process.execPath, [fileURLToPath(path)], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
    timeout: 10000,
  });
  assert.equal(preview.status, 0);
  assert.match(preview.stdout, /Preview only/);
  assert.match(preview.stdout, /START HERE/);
  const apply = spawnSync(process.execPath, [fileURLToPath(path), '--apply'], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH },
    timeout: 10000,
  });
  assert.equal(apply.status, 1);
  assert.match(apply.stderr, /must be configured/);
});

test('full-library publishing is preview-only by default and requires credentials to apply', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const path = fileURLToPath(new URL('../src/publish-once.mjs', import.meta.url));
  for (const [args, status, expected] of [
    [[], 0, /72 cards/],
    [['--apply'], 1, /Configure private bot token/],
  ]) {
    const result = spawnSync(process.execPath, [path, ...args], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH },
      timeout: 10000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, status);
    assert.match(result.stdout + result.stderr, expected);
  }
});

test('mobile-visible publishing requires both plain text and a normal image attachment', async () => {
  const { hasDirectPublishedImage } = await import('../src/publish-verification.mjs');
  const files = new Collection([['file', { name: 'preview.png', width: 1600, height: 1000 }]]);
  assert.equal(hasDirectPublishedImage({ content: 'Showcase', attachments: files }), true);
  assert.equal(hasDirectPublishedImage({ content: '', attachments: files }), false);
  assert.equal(
    hasDirectPublishedImage({
      content: 'Showcase',
      attachments: new Collection(),
      embeds: [{ image: { width: 1600, height: 1000 } }],
    }),
    false,
  );
});
