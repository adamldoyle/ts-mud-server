import { parseArguments } from '@core/commands/CommandHandler';
import { Item, matchItems } from '@core/entities/item';
import { Instance } from '@server/GameServerInstance';
import { Character } from '@core/entities/character';

export const registerCommands = () => {
  if (!Instance.gameServer) {
    return;
  }

  const commandHandler = Instance.gameServer.commandHandler;

  commandHandler.registerCommand({
    name: 'drop',
    requiresBalance: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, [command.rest], 'item.inv');
      if (response?.length !== 1) {
        return invoker.emitTo("You don't have one.");
      }

      const item = response[0] as Item;
      invoker.room.addItem(item);
      invoker.emitTo(`You drop ${item}.`);
      invoker.room.emitTo(`${invoker} drops ${item}.`, [invoker]);
    },
  });

  commandHandler.registerCommand({
    name: 'clean',
    requiresBalance: true,
    handler: (invoker) => {
      [...invoker.room.items].forEach((item) => {
        invoker.room.removeItem(item);
      });
      invoker.emitTo(`You tidy up the room.`);
      invoker.room.emitTo(`${invoker} tidies the room.`, [invoker]);
    },
  });

  const getItemFromRoom = (invoker: Character, itemKey: string) => {
    const response = parseArguments(invoker, [itemKey], 'item.room');
    if (response?.length !== 1) {
      return invoker.emitTo("You don't see one.");
    }

    const item = response[0] as Item;

    if (!item.canCarry()) {
      return invoker.emitTo(`You can't carry that.`);
    }

    invoker.addItem(item);
    invoker.emitTo(`You pick up ${item}.`);
    invoker.room.emitTo(`${invoker} picks up ${item}.`, [invoker]);
  };

  const getItemFromContainer = (invoker: Character, itemId: string, containerKey: string) => {
    const response = parseArguments(invoker, [containerKey], 'item');
    if (response?.length !== 1) {
      return invoker.emitTo("You don't see one.");
    }

    const container = response[0] as Item;
    if (!container.canHoldItems()) {
      return invoker.emitTo(`That doesn't seem to hold anything.`);
    }

    const [itemKey, itemIndex] = itemId.split('.');
    const desiredIndex = itemIndex ? parseInt(itemIndex) - 1 : 0;
    const items = matchItems(container.items, itemKey);
    if (items.length === 0 || desiredIndex >= container.items.length) {
      return invoker.emitTo(`You don't see that inside ${container}.`);
    }

    const item = items[desiredIndex];
    invoker.addItem(item);
    invoker.emitTo(`You get ${item} from ${container}.`);
    invoker.room.emitTo(`${invoker} gets ${item} from ${container}.`, [invoker]);
  };

  const putItemInContainer = (invoker: Character, itemKey: string, containerKey: string) => {
    let response = parseArguments(invoker, [containerKey], 'item');
    if (response?.length !== 1) {
      return invoker.emitTo("You don't see one.");
    }

    const container = response[0] as Item;
    if (!container.canHoldItems()) {
      return invoker.emitTo(`That doesn't seem to hold anything.`);
    }

    response = parseArguments(invoker, [itemKey], 'item');
    if (response?.length !== 1) {
      return invoker.emitTo("You don't see one.");
    }
    const item = response[0] as Item;

    if (container === item) {
      return invoker.emitTo(`You can't put something inside itself.`);
    }

    container.addItem(item);
    invoker.emitTo(`You put ${item} in ${container}.`);
    invoker.room.emitTo(`${invoker} puts ${item} in ${container}.`, [invoker]);
  };

  commandHandler.registerCommand({
    name: 'get',
    requiresBalance: true,
    handler: (invoker, command) => {
      const pieces = command.rest.split(' from ');
      if (pieces.length === 2) {
        return getItemFromContainer(invoker, pieces[0], pieces[1]);
      }

      getItemFromRoom(invoker, command.rest);
    },
  });

  commandHandler.registerCommand({
    name: 'put',
    requiresBalance: true,
    handler: (invoker, command) => {
      const pieces = command.rest.split(' in ');
      if (pieces.length !== 2) {
        return invoker.emitTo(`Invalid syntax: put {item} in {character}`);
      }
      putItemInContainer(invoker, pieces[0], pieces[1]);
    },
  });

  commandHandler.registerCommand({
    name: 'give',
    requiresBalance: true,
    handler: (invoker, command) => {
      const pieces = command.rest.split(' to ');
      if (pieces.length !== 2) {
        return invoker.emitTo(`Invalid syntax: give {item} to {character}`);
      }
      const [itemLookup, charLookup] = pieces;
      const response = parseArguments(invoker, [itemLookup, charLookup], 'item.inv char.room.noself');
      if (response?.length !== 2) {
        return invoker.emitTo(`Give what to whom?`);
      }

      const item = response[0] as Item;
      const character = response[1] as Character;
      character.addItem(item);
      invoker.emitTo(`You give a ${item} to ${character}.`);
      character.emitTo(`${invoker} gives you a ${item}.`);
      invoker.room.emitTo(`${invoker} gives ${character} a ${item}.`, [invoker, character]);
    },
  });

  commandHandler.registerCommand({
    name: 'destroy',
    requiresBalance: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, [command.rest], 'item.inv');
      if (response?.length !== 1) {
        return invoker.emitTo("You don't have that.");
      }

      const item = response[0] as Item;
      invoker.removeItem(item);
      invoker.emitTo(`You destroy a ${item}.`);
      invoker.room.emitTo(`${invoker} destroys a ${item}.`, [invoker]);
    },
  });

  commandHandler.registerCommand({
    name: 'inventory',
    aliases: ['i', 'inv'],
    handler: (invoker) => {
      invoker.emitTo(invoker.lookAtInventory(invoker));
    },
  });
};
