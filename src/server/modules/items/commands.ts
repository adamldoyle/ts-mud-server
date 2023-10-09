import { parseArguments } from '@core/commands/CommandHandler';
import { Item, matchItems } from '@core/entities/item';
import { getGameServerSafely } from '@server/GameServerInstance';
import { Character } from '@core/entities/character';
import { BodyPosition, BodyPositionInfo, lookAtEquipment, removeItem, wearItem } from '@core/entities/equipment';

export const registerCommands = () => {
  const gameServer = getGameServerSafely();
  const commandHandler = gameServer.commandHandler;

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
      const target = invoker;
      invoker.emitTo(target.lookAtInventory(invoker));
    },
  });

  commandHandler.registerCommand({
    name: '@inventory',
    aliases: ['@i', '@inv'],
    admin: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, 'char.room');
      if (response?.length !== 1) {
        return invoker.emitTo(`Whose inventory do you want to see?`);
      }

      const target = response[0] as Character;
      invoker.emitTo(`${target} [${target.key}]\n${target.lookAtInventory(invoker)}`);
    },
  });

  commandHandler.registerCommand({
    name: 'equipment',
    aliases: ['eq'],
    handler: (invoker) => {
      const target = invoker;
      invoker.emitTo(lookAtEquipment(invoker, target));
    },
  });

  commandHandler.registerCommand({
    name: '@equipment',
    aliases: ['@eq'],
    admin: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, 'char.room');
      if (response?.length !== 1) {
        return invoker.emitTo(`Whose equipment do you want to see?`);
      }

      const target = response[0] as Character;
      invoker.emitTo(`${target} [${target.key}]\n${lookAtEquipment(invoker, target)}`);
    },
  });

  commandHandler.registerCommand({
    name: 'wear',
    requiresBalance: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, [command.rest], 'item.inv');
      if (response?.length !== 1) {
        return invoker.emitTo(`You don't have that.`);
      }

      const item = response[0] as Item;
      const wearResponse = wearItem(invoker, item);
      if (!wearResponse[0]) {
        return invoker.emitTo(wearResponse[1]);
      }

      const spotDisplay = BodyPositionInfo[wearResponse[1]].display;
      invoker.emitTo(`You wear ${item} on your ${spotDisplay}.`);
      invoker.room.emitTo(`${invoker} wears ${item} on their ${spotDisplay}.`, [invoker]);
    },
  });

  commandHandler.registerCommand({
    name: 'remove',
    requiresBalance: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, [command.rest], 'item.eq');
      if (response?.length !== 1) {
        return invoker.emitTo(`You're not wearing that.`);
      }

      const item = response[0] as Item;
      const removeResponse = removeItem(invoker, item);
      if (!removeResponse[0]) {
        // Shouldn't happen until we add some kind of restrictions on removing an item
        return invoker.emitTo(removeResponse[1]);
      }

      const spotDisplay = BodyPositionInfo[removeResponse[1]].display;
      invoker.emitTo(`You remove ${item} from your ${spotDisplay}.`);
      invoker.room.emitTo(`${invoker} removes ${item} from their ${spotDisplay}.`, [invoker]);
    },
  });

  commandHandler.registerCommand({
    name: 'swap',
    requiresBalance: true,
    handler: (invoker) => {
      if (!invoker.equipment.HELD_RIGHT && !invoker.equipment.HELD_LEFT) {
        return invoker.emitTo(`You're not holding anything.`);
      }
      if (invoker.equipment.HELD_RIGHT && !invoker.equipment.HELD_RIGHT.definition.wearSpots?.includes(BodyPosition.HELD_LEFT)) {
        return invoker.emitTo(`${invoker.equipment.HELD_RIGHT} can't be held in your left hand.`);
      }
      if (invoker.equipment.HELD_LEFT && !invoker.equipment.HELD_LEFT.definition.wearSpots?.includes(BodyPosition.HELD_RIGHT)) {
        return invoker.emitTo(`${invoker.equipment.HELD_LEFT} can't be held in your right hand.`);
      }
      const rightItem = invoker.equipment.HELD_RIGHT;
      invoker.equipment.HELD_RIGHT = invoker.equipment.HELD_LEFT;
      invoker.equipment.HELD_LEFT = rightItem;
      invoker.emitTo(`You swap what's in your hands.`);
      invoker.room.emitTo(`${invoker} swaps what's in their hands.`, [invoker]);
    },
  });
};
