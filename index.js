import { Client, GatewayIntentBits, PermissionFlagsBits, Events, REST, Routes, EmbedBuilder } from 'discord.js';
import { config } from 'dotenv';
import * as process from 'process';

// Load environment variables
config();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('DISCORD_BOT_TOKEN exists:', !!process.env.DISCORD_BOT_TOKEN);
console.log('DISCORD_CLIENT_ID exists:', !!process.env.DISCORD_CLIENT_ID);

// Check if token is available
if (!process.env.DISCORD_BOT_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN environment variable is not set or is empty.');
  console.error('Please make sure you have set the DISCORD_BOT_TOKEN environment variable.');
  process.exit(1);
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Bot configuration
const PREFIX = '!';
const MOD_ROLE_NAME = 'Moderator'; // Role name for moderators

// Commands setup
const commands = [
  {
    name: 'ban',
    description: 'کاربر را از سرور محروم کنید',
    options: [
      {
        name: 'user',
        description: 'کاربری که باید محروم شود',
        type: 6, // USER type
        required: true,
      },
      {
        name: 'reason',
        description: 'دلیل محرومیت',
        type: 3, // STRING type
        required: false,
      },
    ],
  },
  {
    name: 'kick',
    description: 'کاربر را از سرور اخراج کنید',
    options: [
      {
        name: 'user',
        description: 'کاربری که باید اخراج شود',
        type: 6, // USER type
        required: true,
      },
      {
        name: 'reason',
        description: 'دلیل اخراج',
        type: 3, // STRING type
        required: false,
      },
    ],
  },
  {
    name: 'timeout',
    description: 'کاربر را برای مدت زمان مشخصی محدود کنید',
    options: [
      {
        name: 'user',
        description: 'کاربری که باید محدود شود',
        type: 6, // USER type
        required: true,
      },
      {
        name: 'duration',
        description: 'مدت زمان به دقیقه',
        type: 4, // INTEGER type
        required: true,
      },
      {
        name: 'reason',
        description: 'دلیل محدودیت',
        type: 3, // STRING type
        required: false,
      },
    ],
  },
  {
    name: 'warn',
    description: 'به کاربر اخطار دهید',
    options: [
      {
        name: 'user',
        description: 'کاربری که باید اخطار دریافت کند',
        type: 6, // USER type
        required: true,
      },
      {
        name: 'reason',
        description: 'دلیل اخطار',
        type: 3, // STRING type
        required: true,
      },
    ],
  },
  {
    name: 'purge',
    description: 'چندین پیام را حذف کنید',
    options: [
      {
        name: 'amount',
        description: 'تعداد پیام‌هایی که باید حذف شوند (1-100)',
        type: 4, // INTEGER type
        required: true,
      },
    ],
  },
  {
    name: 'addrole',
    description: 'نقش را به کاربر اضافه کنید',
    options: [
      {
        name: 'user',
        description: 'کاربری که باید نقش به او اضافه شود',
        type: 6, // USER type
        required: true,
      },
      {
        name: 'role',
        description: 'نقشی که باید اضافه شود',
        type: 8, // ROLE type
        required: true,
      },
      {
        name: 'reason',
        description: 'دلیل اضافه کردن نقش',
        type: 3, // STRING type
        required: false,
      },
    ],
  },
];

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.');

    if (!process.env.DISCORD_CLIENT_ID) {
      console.error('ERROR: DISCORD_CLIENT_ID environment variable is not set or is empty.');
      return;
    }

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Banned words filter
const BANNED_WORDS = ['badword1', 'badword2', 'badword3']; // Add your banned words here

// Check if user has moderator permissions
function isModerator(member) {
  return member.permissions.has(PermissionFlagsBits.ModerateMembers) || 
         member.roles.cache.some(role => role.name === MOD_ROLE_NAME);
}

// Create a moderation action embed
function createModActionEmbed(action, user, reason, moderator, color) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`اقدام مدیریتی: ${action}`)
    .addFields(
      { name: 'کاربر', value: `${user.tag} (${user.id})`, inline: true },
      { name: 'مدیر', value: `${moderator.tag} (${moderator.id})`, inline: true },
      { name: 'دلیل', value: reason || 'دلیلی ارائه نشده است' }
    )
    .setTimestamp()
    .setFooter({ text: `${action} | ربات مدیریت` });

  return embed;
}

// Event: Bot is ready
client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  registerCommands();
});

// Event: Message received (for word filtering)
client.on(Events.MessageCreate, async message => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check for banned words
  const content = message.content.toLowerCase();
  if (BANNED_WORDS.some(word => content.includes(word))) {
    try {
      await message.delete();

      const embed = new EmbedBuilder()
        .setColor(0xFF0000) // Red
        .setTitle('پیام حذف شد')
        .setDescription(`${message.author}، پیام شما به دلیل استفاده از زبان نامناسب حذف شد.`)
        .setTimestamp()
        .setFooter({ text: 'Auto-Moderation | ربات مدیریت' });

      await message.channel.send({ embeds: [embed] });

      // Log to mod channel if exists
      const modChannel = message.guild.channels.cache.find(channel => channel.name === 'mod-logs');
      if (modChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xFF0000) // Red
          .setTitle('پیام حذف شد: کلمه ممنوعه')
          .addFields(
            { name: 'کاربر', value: `${message.author.tag} (${message.author.id})` },
            { name: 'کانال', value: `${message.channel.name} (${message.channel.id})` }
          )
          .setTimestamp()
          .setFooter({ text: 'Auto-Moderation | ربات مدیریت' });

        modChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      console.error('Error handling banned word:', error);
    }
  }
});

// Event: Interaction (slash commands)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  // Check if user has moderator permissions
  if (!isModerator(interaction.member)) {
    const noPermEmbed = new EmbedBuilder()
      .setColor(0xFF0000) // Red
      .setTitle('دسترسی رد شد')
      .setDescription('شما اجازه استفاده از دستورات مدیریتی را ندارید.')
      .setTimestamp();

    return interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
  }

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case 'ban': {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'دلیلی ارائه نشده است';
        const member = interaction.guild.members.cache.get(user.id);

        if (!member.bannable) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Red
            .setTitle('خطا')
            .setDescription('من نمی‌توانم این کاربر را محروم کنم. ممکن است دسترسی‌های بالاتری نسبت به من داشته باشد.')
            .setTimestamp();

          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await member.ban({ reason });

        const banEmbed = createModActionEmbed('Ban', user, reason, interaction.user, 0xD70040); // Dark red
        interaction.reply({ embeds: [banEmbed] });
        break;
      }

      case 'kick': {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'دلیلی ارائه نشده است';
        const member = interaction.guild.members.cache.get(user.id);

        if (!member.kickable) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Red
            .setTitle('خطا')
            .setDescription('من نمی‌توانم این کاربر را اخراج کنم. ممکن است دسترسی‌های بالاتری نسبت به من داشته باشد.')
            .setTimestamp();

          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await member.kick(reason);

        const kickEmbed = createModActionEmbed('Kick', user, reason, interaction.user, 0xFF6600); // Orange
        interaction.reply({ embeds: [kickEmbed] });
        break;
      }

      case 'timeout': {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'دلیلی ارائه نشده است';
        const member = interaction.guild.members.cache.get(user.id);

        if (!member.moderatable) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Red
            .setTitle('خطا')
            .setDescription('من نمی‌توانم این کاربر را محدود کنم. ممکن است دسترسی‌های بالاتری نسبت به من داشته باشد.')
            .setTimestamp();

          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Convert minutes to milliseconds
        const durationMs = duration * 60 * 1000;

        await member.timeout(durationMs, reason);

        const timeoutEmbed = new EmbedBuilder()
          .setColor(0xFFCC00) // Yellow
          .setTitle('اقدام مدیریتی: Timeout')
          .addFields(
            { name: 'کاربر', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'مدیر', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: 'مدت زمان', value: `${duration} دقیقه`, inline: true },
            { name: 'دلیل', value: reason }
          )
          .setTimestamp()
          .setFooter({ text: 'Timeout | ربات مدیریت' });

        interaction.reply({ embeds: [timeoutEmbed] });
        break;
      }

      case 'warn': {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        // In a real bot, you might store warnings in a database
        const warnEmbed = createModActionEmbed('Warning', user, reason, interaction.user, 0xFFFF00); // Yellow
        interaction.reply({ embeds: [warnEmbed] });

        // DM the user
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xFFFF00) // Yellow
            .setTitle(`شما در ${interaction.guild.name} اخطار دریافت کرده‌اید`)
            .setDescription(`دلیل: ${reason}`)
            .setTimestamp()
            .setFooter({ text: 'Warning | ربات مدیریت' });

          await user.send({ embeds: [dmEmbed] });
        } catch (error) {
          interaction.followUp({ 
            content: 'نمی‌توان به کاربر در مورد اخطارش پیام خصوصی ارسال کرد.', 
            ephemeral: true 
          });
        }
        break;
      }

      case 'purge': {
        const amount = interaction.options.getInteger('amount');

        if (amount < 1 || amount > 100) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Red
            .setTitle('خطا')
            .setDescription('شما فقط می‌توانید بین 1 تا 100 پیام را یکجا حذف کنید.')
            .setTimestamp();

          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: amount });
        await channel.bulkDelete(messages);

        const purgeEmbed = new EmbedBuilder()
          .setColor(0x00FF00) // Green
          .setTitle('پیام‌ها پاک شدند')
          .setDescription(`${messages.size} پیام با موفقیت حذف شدند.`)
          .setTimestamp()
          .setFooter({ text: 'Purge | ربات مدیریت' });

        interaction.reply({ embeds: [purgeEmbed], ephemeral: true });
        break;
      }

      case 'addrole': {
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const reason = interaction.options.getString('reason') || 'دلیلی ارائه نشده است';
        const member = interaction.guild.members.cache.get(user.id);

        // Check if the bot has permission to manage roles
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Red
            .setTitle('خطا')
            .setDescription('من اجازه مدیریت نقش‌ها را ندارم.')
            .setTimestamp();

          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if the bot's role is higher than the role to add
        if (interaction.guild.members.me.roles.highest.position <= role.position) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Red
            .setTitle('خطا')
            .setDescription('من نمی‌توانم نقشی را اضافه کنم که بالاتر یا برابر با بالاترین نقش من است.')
            .setTimestamp();

          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check if the user already has the role
        if (member.roles.cache.has(role.id)) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Red
            .setTitle('خطا')
            .setDescription(`${user.tag} در حال حاضر نقش ${role.name} را دارد.`)
            .setTimestamp();

          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Add the role to the user
        await member.roles.add(role, reason);

        const addRoleEmbed = new EmbedBuilder()
          .setColor(0x00AAFF) // Blue
          .setTitle('اقدام مدیریتی: Add Role')
          .addFields(
            { name: 'کاربر', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'مدیر', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: 'نقش', value: role.name, inline: true },
            { name: 'دلیل', value: reason }
          )
          .setTimestamp()
          .setFooter({ text: 'Add Role | ربات مدیریت' });

        interaction.reply({ embeds: [addRoleEmbed] });
        break;
      }
    }
  } catch (error) {
    console.error(`Error executing command ${commandName}:`, error);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000) // Red
      .setTitle('خطا')
      .setDescription('در اجرای این دستور خطایی رخ داد.')
      .setTimestamp();

    interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
});

// Login to Discord with error handling
try {
  console.log('Attempting to log in to Discord...');
  client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => {
      console.log('Login successful!');
    })
    .catch(error => {
      console.error('Login failed:', error);
    });
} catch (error) {
  console.error('Exception during login:', error);
}

console.log('Bot startup process initiated...');