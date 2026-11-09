import {
  Client,
  ClientUser,
  Routes,
  AttachmentBuilder,
  PermissionFlagsBits as P,
} from 'discord.js';
import { EnvHttpProxyAgent } from 'undici';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import { loadCatalog, selectCard } from './catalog.mjs';

const root = new URL('../../../docs/community/discord/', import.meta.url);
const cards = await loadCatalog();
const groups = [
  ['features', 'Feature previews'],
  ['classes', 'Class spotlights'],
  ['monsters', 'Monster spotlights'],
  ['items', 'Item showcases'],
];
if (!process.argv.includes('--apply')) {
  console.log(
    `Preview: post welcome banner and icon in #welcome, then ${cards.length} cards in #showcase. Existing marked posts are reused. No role or channel changes.`,
  );
} else {
  const {
    DISCORD_BOT_TOKEN: token,
    DISCORD_GUILD_ID: guildId,
    DISCORD_APPLICATION_ID: applicationId,
  } = process.env;
  if (!token || !/^\d{17,22}$/.test(guildId ?? '') || !/^\d{17,22}$/.test(applicationId ?? '')) {
    console.error('Configure private bot token and public server/application IDs before posting.');
    process.exitCode = 1;
  } else {
    const client = new Client({ intents: [], shardCount: 1, allowedMentions: { parse: [] } });
    const agent = new EnvHttpProxyAgent();
    try {
      client.rest.setAgent(agent).setToken(token);
      const user = await client.rest.get(Routes.user('@me'));
      if (!user.bot || user.id !== applicationId) throw new Error('Wrong bot identity');
      client.user = new ClientUser(client, user);
      const guild = await client.guilds.fetch(guildId);
      await guild.channels.fetch();
      const welcome = guild.channels.cache.find(
        (c) => c.name === 'welcome' && c.parent?.name === 'START HERE',
      );
      const showcase = guild.channels.cache.find(
        (c) => c.name === 'showcase' && c.parent?.name === 'THE REALM',
      );
      if (!welcome?.isTextBased() || !showcase?.isTextBased())
        throw new Error('Missing community channels');
      await guild.roles.fetch();
      const me = await guild.members.fetch(user.id);
      for (const ch of [welcome, showcase])
        if (
          ![P.SendMessages, P.AttachFiles, P.EmbedLinks, P.ReadMessageHistory].every((p) =>
            ch.permissionsFor(me)?.has(p),
          )
        )
          throw new Error('Missing posting permissions');
      // Preflight every file before publishing anything. Keep requests below Discord upload limits.
      const paths = [
        fileURLToPath(new URL('server-icon.png', root)),
        fileURLToPath(new URL('welcome-banner.png', root)),
        ...cards.map((c) => selectCard(cards, c.id).path),
      ];
      for (const path of paths)
        if ((await stat(path)).size > 9 * 1024 * 1024)
          throw new Error('Image exceeds conservative upload size');
      async function markers(channel) {
        const found = new Map();
        let before;
        for (let page = 0; page < 50; page++) {
          const messages = await channel.messages.fetch({
            limit: 100,
            ...(before ? { before } : {}),
          });
          for (const message of messages.values())
            if (message.author.id === user.id)
              for (const embed of message.embeds)
                if (embed.footer?.text?.startsWith('ros:publish:'))
                  found.set(embed.footer.text, message);
          if (messages.size < 100) return found;
          before = messages.last().id;
        }
        throw new Error('History exceeds safe scan limit; inspect before posting');
      }
      const histories = new Map([
        [welcome.id, await markers(welcome)],
        [showcase.id, await markers(showcase)],
      ]);
      let sent = 0,
        reused = 0;
      async function post(channel, id, title, description, path) {
        const key = 'ros:publish:' + id,
          history = histories.get(channel.id);
        if (history.has(key)) {
          reused++;
          return history.get(key);
        }
        const message = await channel.send({
          allowedMentions: { parse: [] },
          embeds: [
            {
              title,
              description,
              color: 0xa768e5,
              footer: { text: key },
              ...(path ? { image: { url: 'attachment://preview.png' } } : {}),
            },
          ],
          ...(path ? { files: [new AttachmentBuilder(path, { name: 'preview.png' })] } : {}),
        });
        history.set(key, message);
        sent++;
        await setTimeout(1250);
        return message;
      }
      const rules = guild.channels.cache.find(
        (c) => c.name === 'rules' && c.parent?.name === 'START HERE',
      );
      const introductions = guild.channels.cache.find(
        (c) => c.name === 'introductions' && c.parent?.name === 'TAVERN',
      );
      const welcomeText = `Follow the development, meet other adventurers, and help shape the journey. Read ${rules ? `<#${rules.id}>` : '#rules'} and introduce yourself in ${introductions ? `<#${introductions.id}>` : '#introductions'}.`;
      const banner = await post(
        welcome,
        'welcome-banner-v1',
        'Welcome to Realm of Shadows',
        welcomeText,
        paths[1],
      );
      const icon = await post(
        welcome,
        'server-icon-v1',
        'Realm of Shadows — community icon',
        'The server icon artwork. Open the image to save it at full size.',
        paths[0],
      );
      const intro = await post(
        showcase,
        'library-intro-v1',
        'Realm of Shadows — showcase library',
        `Browse ${cards.length} development previews below: features, classes, monsters, and items. Gameplay captures are staged in the actual game renderer. Later-island equipment and portal images are artwork previews, not a claim that those islands are fully playable. No story spoilers.`,
      );
      for (const [group, title] of groups) {
        const selected = cards.filter((c) => c.file.startsWith(group + '/'));
        await post(
          showcase,
          'section-' + group + '-v1',
          title,
          `${selected.length} cards · Open any image to view or save the full-size artwork.`,
        );
        for (const c of selected) {
          await post(
            showcase,
            'card-' + c.id + '-v1',
            c.title,
            c.intro + '\n\n*' + c.kind + '*',
            selectCard(cards, c.id).path,
          );
          console.log('Published or verified:', c.id);
        }
      }
      for (const message of [banner, intro]) {
        try {
          if (!message.pinned) await message.pin();
        } catch {
          console.log('Could not pin index; post remains available.');
        }
      }
      // Verify the remote channel history independently after the upload run.
      const verified = await markers(showcase);
      const missing = cards.filter(
        (c) => !verified.get('ros:publish:card-' + c.id + '-v1')?.attachments.size,
      );
      if (missing.length) throw new Error('Some remote card attachments did not verify');
      const welcomeVerified = await markers(welcome);
      if (
        !welcomeVerified.get('ros:publish:welcome-banner-v1')?.attachments.size ||
        !welcomeVerified.get('ros:publish:server-icon-v1')?.attachments.size
      )
        throw new Error('Welcome artwork did not verify');
      console.log(
        JSON.stringify(
          {
            verifiedCards: cards.length,
            newPosts: sent,
            reusedPosts: reused,
            welcome: banner.url,
            icon: icon.url,
            showcase: intro.url,
            serverIconChanged: false,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.error('Publishing stopped; existing marked posts will be reused on retry.', {
        name: error?.name ?? 'Error',
        code: error?.code ?? 'unknown',
        status: error?.status ?? null,
      });
      process.exitCode = 1;
    } finally {
      await client.destroy();
      await agent.close();
    }
  }
}
