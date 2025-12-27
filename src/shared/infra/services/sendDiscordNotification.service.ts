import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { badRequestResponse, errorResponse, successResponse } from '../../contracts/httpContracts';
import { GetEnviromentVariable } from '../azure';

export interface SendDiscordNotificationProps {
  channelName: string;
  content: string;
}

let discordClient: Client | null = null;

export class SendDiscordNotificationService {
  private async getClient(): Promise<Client> {
    if (discordClient) return discordClient;

    const token = await GetEnviromentVariable('DISCORD_BOT_TOKEN');
    console.log('Discord Bot Token:', token);
    discordClient = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });

    await discordClient.login(token);
    return discordClient;
  }

  public async execute({
    channelName,
    content,
  }: SendDiscordNotificationProps): Promise<any> {
    try {
      const client = await this.getClient();
      const guildId = await GetEnviromentVariable('DISCORD_GUILD_ID');

      const guild = await client.guilds.fetch(guildId);
      if (!guild) {
        return badRequestResponse({ message: 'Discord server not founded'});
      }

      const channels = await guild.channels.fetch();
      const channel = channels.find(
        (ch): ch is TextChannel =>
          ch?.isTextBased() && ch.name === channelName,
      );

      if (!channel) {
        return badRequestResponse({ message: `Canal "${channelName}" não encontrado no servidor Discord.`});
      }

      await channel.send(content);
      console.log('Notification sent to Discord channel:', channelName);
      return successResponse(true)
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}
