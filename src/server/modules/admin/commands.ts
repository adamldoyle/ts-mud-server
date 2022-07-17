import { parseArguments } from '@core/commands/CommandHandler';
import { Character } from '@core/entities/character';
import { Zone, buildZonedKey } from '@core/entities/zone';
import { Instance } from '@server/GameServerInstance';

export const registerCommands = () => {
  if (!Instance.gameServer) {
    return;
  }

  Instance.gameServer.commandHandler.registerCommand({
    name: '@force',
    admin: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, 'char.room [to] string');
      if (response?.length !== 2) {
        return invoker.emitTo('Force who to do what?');
      }

      const target = response[0] as Character;
      const forcedCommand = response[1] as string;
      invoker.emitTo(`You force ${target} to "${command}"`);
      target.emitTo(`${invoker} forces you to "${command}"`);
      target.sendCommand(forcedCommand);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@zlist',
    admin: true,
    handler: (invoker) => {
      const zones = Instance.gameServer?.catalog.getZones() ?? [];
      zones.sort((a, b) => a.key.localeCompare(b.key));

      const buffer = zones.map((zone) => `[${zone.key}] ${zone}`).join('\n');
      invoker.emitTo(`<G>Zones\n<B>${'-'.repeat(30)}\n<n>${buffer.length > 0 ? buffer : 'None'}`);
    },
  });

  const clearZone = (invoker: Character, invokerMsg: string, otherMsg: string) => {
    invoker.emitTo(invokerMsg);
    invoker.room.zone.characters.forEach((character) => {
      if (character.npc) {
        if (character.conversation) {
          character.conversation?.endConversation();
        }
        character.room.removeCharacter(character);
      } else if (character !== invoker) {
        character.emitTo(otherMsg);
      }
    });
    Object.values(invoker.room.zone.rooms).forEach((room) => {
      room.items.forEach((item) => {
        room.removeItem(item);
      });
    });
  };

  Instance.gameServer.commandHandler.registerCommand({
    name: '@zclear',
    admin: true,
    handler: (invoker) => {
      clearZone(invoker, `You clap your hands and the zone empties.`, `You hear a defening thunderclap and everything around you disappears.`);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@zreset',
    admin: true,
    handler: (invoker) => {
      clearZone(invoker, `You clap your hands and the zone returns to normal.`, `You hear a defening thunderclap and everything around you returns to normal.`);
      invoker.room.zone.reset();
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@rlist',
    admin: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, '| zone');
      const zone = response?.length === 1 ? (response[0] as Zone) : invoker.room.zone;

      const definitions = Object.values(zone.rooms);
      definitions.sort((a, b) => a.key.localeCompare(b.key));

      const buffer = definitions.map((definition) => `[${definition.key}] <y>${definition.name}<n>`).join('\n');
      invoker.emitTo(`<G>Rooms for ${zone}\n<B>${'-'.repeat(30)}\n<n>${buffer.length > 0 ? buffer : 'None'}`);
    },
  });

  const clearRoom = (invoker: Character, invokerMsg: string, otherMsg: string) => {
    invoker.emitTo(invokerMsg);
    invoker.room.characters.forEach((character) => {
      if (character.npc) {
        if (character.conversation) {
          character.conversation?.endConversation();
        }
        character.room.removeCharacter(character);
      } else if (character !== invoker) {
        character.emitTo(otherMsg);
      }
    });
    invoker.room.items.forEach((item) => {
      invoker.room.removeItem(item);
    });
  };

  Instance.gameServer.commandHandler.registerCommand({
    name: '@rclear',
    admin: true,
    handler: (invoker) => {
      clearRoom(invoker, `You clap your hands and the room empties.`, `You hear a thunderclap and the room empties.`);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@rreset',
    aliases: ['@reset'],
    admin: true,
    handler: (invoker) => {
      clearRoom(invoker, `You clap your hands and the room returns to normal.`, `You hear a thunderclap and the room returns to normal.`);
      invoker.room.reset();
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@rgoto',
    admin: true,
    handler: (invoker, command) => {
      const room = Instance.gameServer?.catalog.lookupRoom(command.rest, invoker.room.zone);
      if (!room) {
        return invoker.emitTo('Unknown room.');
      }
      invoker.room.emitTo(`${invoker} disappears in a cloud of smoke...`, [invoker]);
      invoker.room.removeCharacter(invoker);
      room.addCharacter(invoker);
      invoker.sendCommand('look');
      room.emitTo(`${invoker} appears in a cloud of smoke...`, [invoker]);
    },
  });

  const findCharacter = (invoker: Character, key: string): Character | undefined => {
    const fullKey = buildZonedKey(key, invoker.zone);
    const characters = Instance.gameServer?.catalog
      .getZones()
      .map((zone) => zone.characters.find((character) => character.key === fullKey || character.key === key))
      .flat()
      .filter((character) => character) as Character[];
    if (characters.length !== 1) {
      return undefined;
    }
    return characters[0];
  };

  Instance.gameServer.commandHandler.registerCommand({
    name: '@clist',
    admin: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, '| zone');
      const zone = response?.length === 1 ? (response[0] as Zone) : invoker.room.zone;

      const definitions = Instance.gameServer?.catalog.getCharacterDefinitions(zone) ?? [];
      definitions.sort((a, b) => a.key.localeCompare(b.key));

      const buffer = definitions.map((definition) => `[${definition.key}] <y>${definition.name}<n>`).join('\n');
      invoker.emitTo(`<G>Characters for ${zone}\n<B>${'-'.repeat(30)}\n<n>${buffer.length > 0 ? buffer : 'None'}`);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@cload',
    admin: true,
    handler: (invoker, command) => {
      if (!command.rest) {
        return invoker.emitTo('Load which character?');
      }
      const character = Instance.gameServer?.catalog.loadCharacter(command.rest, invoker.room.zone, invoker.room);
      if (!character) {
        return invoker.emitTo(`Unknown character: ${command.rest}`);
      }
      character.finalize();
      invoker.room.emitTo(`${character} appears in a cloud of smoke.`, [character]);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@cwhere',
    admin: true,
    handler: (invoker, command) => {
      const target = findCharacter(invoker, command.rest);
      if (!target) {
        return invoker.emitTo(`Character not found: ${command.rest}`);
      }
      const room = target.room;
      invoker.emitTo(`${target} [${target.key}] at [${room.key}] ${room}`);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@cgoto',
    admin: true,
    handler: (invoker, command) => {
      const target = findCharacter(invoker, command.rest);
      if (!target) {
        return invoker.emitTo(`Character not found: ${command.rest}`);
      }
      invoker.room.emitTo(`${invoker} disappears in a cloud of smoke...`, [invoker]);
      invoker.room.removeCharacter(invoker);
      target.room.addCharacter(invoker);
      invoker.sendCommand('look');
      target.room.emitTo(`${invoker} appears in a cloud of smoke...`, [invoker]);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@ilist',
    admin: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, '| zone');
      const zone = response?.length === 1 ? (response[0] as Zone) : invoker.room.zone;

      const definitions = Instance.gameServer?.catalog.getItemDefinitions(zone) ?? [];
      definitions.sort((a, b) => a.key.localeCompare(b.key));

      const buffer = definitions.map((definition) => `[${definition.key}] <y>${definition.name}\n<D>${definition.description}<n>`).join('\n\n');
      invoker.emitTo(`<G>Items for ${zone}\n<B>${'-'.repeat(30)}\n<n>${buffer.length > 0 ? buffer : 'None'}`);
    },
  });

  Instance.gameServer.commandHandler.registerCommand({
    name: '@iload',
    admin: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, 'word | string');
      if (!response) {
        return invoker.emitTo('Load which item?');
      }
      const itemKey = (response[0] as string) ?? '';
      let modifications: Record<string, string> | undefined;
      if (response.length === 2) {
        try {
          const modificationPieces = (response[1] as string).split(' ');
          modifications = modificationPieces
            .filter((piece) => piece)
            .reduce<Record<string, string>>((acc, piece) => {
              const parts = piece.split('=');
              if (parts.length !== 2) {
                throw new Error('Invalid syntax: @iload {key} | {modification=value} {modification=value}');
              }
              acc[parts[0]] = parts[1];
              return acc;
            }, {});
        } catch (err: any) {
          return invoker.emitTo(err?.message ?? 'Error parsing item modifications.');
        }
      }

      try {
        const item = Instance.gameServer?.catalog.loadItem(itemKey, invoker.room.zone, { modifications });
        if (item) {
          invoker.addItem(item);
          return invoker.emitTo(`${item} loaded to your inventory.`);
        }
      } catch (err) {
        //
      }
      return invoker.emitTo(`Unknown item: ${itemKey}`);
    },
  });
};
