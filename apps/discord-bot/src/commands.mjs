import { SlashCommandBuilder, PermissionFlagsBits as P } from 'discord.js';
const admin = (name) =>
  new SlashCommandBuilder().setName(name).setDefaultMemberPermissions(P.ManageGuild).setContexts(0);
export const commands = [
  admin('setup')
    .setDescription('Preview or create Realm of Shadows channels and roles')
    .addBooleanOption((o) =>
      o.setName('apply').setDescription('Create missing channels and roles; default is preview'),
    ),
  new SlashCommandBuilder()
    .setName('links')
    .setDescription('Game and development gallery links')
    .setContexts(0),
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Choose a cosmetic Discord class role')
    .setContexts(0),
  admin('catalog')
    .setDescription('Find a feature or item card')
    .addStringOption((o) =>
      o.setName('search').setDescription('Title, item, or feature to search'),
    ),
  admin('showcase')
    .setDescription('Preview or publish a game showcase card')
    .addStringOption((o) =>
      o
        .setName('id')
        .setDescription('Card ID from /catalog')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addBooleanOption((o) =>
      o.setName('publish').setDescription('Post to #showcase; default is private preview'),
    ),
  admin('update')
    .setDescription('Preview or publish a development update')
    .addStringOption((o) =>
      o.setName('title').setDescription('Update title').setMaxLength(180).setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('message').setDescription('Update details').setMaxLength(3500).setRequired(true),
    )
    .addBooleanOption((o) =>
      o
        .setName('publish')
        .setDescription('Post to #development-updates; default is private preview'),
    ),
  new SlashCommandBuilder()
    .setName('timeout')
    .setContexts(0)
    .setDescription('Temporarily timeout a member')
    .setDefaultMemberPermissions(P.ModerateMembers)
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
    .addIntegerOption((o) =>
      o
        .setName('minutes')
        .setDescription('Minutes, up to 40320')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true),
    )
    .addStringOption((o) =>
      o.setName('reason').setDescription('Reason').setMaxLength(400).setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('purge')
    .setContexts(0)
    .setDescription('Delete recent messages in this channel (older than 14 days skipped)')
    .setDefaultMemberPermissions(P.ManageMessages)
    .addIntegerOption((o) =>
      o
        .setName('count')
        .setDescription('Number of messages')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    ),
].map((c) => c.toJSON());
