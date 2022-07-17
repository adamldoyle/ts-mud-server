import { Player } from '@core/entities/character';
import { Instance } from '@server/GameServerInstance';
import { logger } from '@shared/Logger';
import { calculateTime } from '@server/modules/calendar';

export const registerCommands = () => {
  if (!Instance.gameServer) {
    return;
  }

  Instance.gameServer.commandHandler.registerCommand({
    name: 'quit',
    aliases: ['exit'],
    handler: (invoker) => {
      const player = invoker as Player;
      if (player.accountId) {
        Instance.gameServer?.logoutUser(player.accountId);
      } else {
        logger.error(`Quit command sent for non-player character`, { character: invoker.name });
      }
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'commands',
    handler: (invoker) => {
      const definitions = (Instance.gameServer?.commandHandler.getCommandDefinitions() ?? [])
        .filter((definition) => invoker.admin || !definition.admin)
        .sort((a, b) => a.name.localeCompare(b.name));
      invoker.emitTo(`<G>Commands\n<B>${'-'.repeat(30)}\n<n>${definitions.map((command) => command.name).join('\n')}`);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'save',
    handler: (invoker) => {
      invoker.save();
      invoker.emitTo('Saved');
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'time',
    aliases: ['date'],
    handler: (invoker) => {
      invoker.emitTo(calculateTime().full);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'colors',
    handler: (invoker) => {
      invoker.emitTo(`
        <n>n - None         <N>N - None
        <d>d - Black        <D>D - Black
        <r>r - Red          <R>R - Red
        <g>g - Green        <G>G - Green
        <y>y - Yellow       <Y>Y - Yellow
        <b>b - Blue         <B>B - Blue
        <p>p - Magenta      <P>P - Magenta
        <c>c - Cyan         <C>C - Cyan
        <w>w - White        <W>W - White
      `);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'who',
    handler: (invoker) => {
      const { admins, players } = Object.values(Instance.gameServer?.playersByName ?? {}).reduce<{ admins: Player[]; players: Player[] }>(
        (acc, player) => {
          if (player.admin) {
            acc.admins.push(player);
          } else {
            acc.players.push(player);
          }
          return acc;
        },
        { admins: [], players: [] }
      );
      admins.sort((a, b) => a.key.localeCompare(b.key));
      players.sort((a, b) => a.key.localeCompare(b.key));
      invoker.emitTo(`Admins: ${admins.length > 0 ? admins.join(', ') : 'None'}.\nPlayers: ${players.length > 0 ? players.join(', ') : 'None'}.`);
    },
  });
};
