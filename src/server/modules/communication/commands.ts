import { parseArguments } from '@core/commands/CommandHandler';
import { Instance } from '@server/GameServerInstance';
import { Character } from '@core/entities/character';

export const registerCommands = () => {
  if (!Instance.gameServer) {
    return;
  }
  Instance.gameServer.commandHandler.registerCommand({
    name: 'chat',
    handler: (invoker, command) => {
      invoker.emitTo(`You chat, "${command.rest}"`);
      Object.values(Instance.gameServer?.playersByName ?? []).forEach((other) => {
        if (other !== invoker) {
          other.emitTo(`${invoker} chats, "${command.rest}"`);
        }
      });
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'shout',
    handler: (invoker, command) => {
      invoker.emitTo(`You shout, "${command.rest}"`);
      invoker.room.zone.characters.forEach((other) => {
        if (other !== invoker) {
          other.emitTo(`${invoker} shouts, "${command.rest}"`);
        }
      });
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'say',
    handler: (invoker, command) => {
      invoker.emitTo(`You say, "${command.rest}"`);
      invoker.room.emitTo(`${invoker} says, "${command.rest}"`, [invoker]);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'whisper',
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, 'char.room.noself string');
      if (!response) {
        return invoker.emitTo(`Whisper to whom what?`);
      }
      const target = response[0] as Character;
      const message = response[1] as string;

      invoker.emitTo(`You whisper to ${target}, "${message}"`);
      target.emitTo(`${invoker} whispers to you, "${message}"`);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: 'tell',
    handler: (invoker, command) => {
      if (command.params.length < 2) {
        return invoker.emitTo(`Tell whom what?`);
      }

      const [targetName, ...messageParts] = command.params;
      const target = Instance.gameServer?.playersByName[targetName.toLowerCase()];
      if (!target) {
        return invoker.emitTo(`They're not around.`);
      }
      const message = messageParts.join(' ');

      invoker.emitTo(`You tell ${target}, "${message}"`);
      target.emitTo(`${invoker} tells you, "${message}"`);
    },
  });
};
