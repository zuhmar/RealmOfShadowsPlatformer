import { PermissionFlagsBits as P } from 'discord.js';
const id = process.env.DISCORD_APPLICATION_ID;
if (!/^\d{17,22}$/.test(id ?? '')) {
  console.error(
    'Set DISCORD_APPLICATION_ID to the public application ID from Discord Developer Portal.',
  );
  process.exit(1);
}
const bits = [
  P.ManageChannels,
  P.ManageRoles,
  P.ViewChannel,
  P.SendMessages,
  P.ReadMessageHistory,
  P.EmbedLinks,
  P.AttachFiles,
  P.ManageMessages,
  P.ModerateMembers,
].reduce((a, b) => a | b, 0n);
console.log(
  `https://discord.com/oauth2/authorize?client_id=${id}&permissions=${bits}&scope=bot%20applications.commands`,
);
