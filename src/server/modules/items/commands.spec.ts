import { Instance } from '@server/GameServerInstance';
import { buildCharacter, buildItem, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { Character } from '@core/entities/character';
import { registerCommands } from './commands';
import { Room } from '@core/entities/room';
import { Zone } from '@core/entities/zone';
import { ItemFlag } from '../core/entities/item';

describe('items/commands', () => {
  let zone: Zone;
  let invoker: Character;
  let other1: Character;
  let room: Room;
  beforeEach(() => {
    initializeTestServer();

    zone = buildZone({}, true);
    room = buildRoom(zone, 'room');
    invoker = buildCharacter(zone, 'invoker', room);
    other1 = buildCharacter(zone, 'other1', room);
    registerCommands();
  });

  const callCommand = (invoker: Character, rawInput: string) => {
    Instance.gameServer?.commandHandler.handleCommand(invoker, rawInput, undefined);
  };

  describe('drop', () => {
    test('drops item from inventory to room', () => {
      const item = buildItem(zone, 'item');
      invoker.addItem(item);
      expect(invoker.items).toEqual([item]);
      expect(room.items).toEqual([]);
      callCommand(invoker, 'drop item');
      expect(invoker.items).toEqual([]);
      expect(room.items).toEqual([item]);
      expect(invoker.emitTo).toBeCalledWith(`You drop ${item}.`);
      expect(other1.emitTo).toBeCalledWith(`${invoker} drops ${item}.`);
    });

    test('sends message if no params', () => {
      callCommand(invoker, 'drop');
      expect(invoker.emitTo).toBeCalledWith(`You don't have one.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('sends message if unknown item', () => {
      callCommand(invoker, 'drop item');
      expect(invoker.emitTo).toBeCalledWith(`You don't have one.`);
      expect(other1.emitTo).not.toBeCalled();
    });
  });

  describe('clean', () => {
    test('removes all items from the room', () => {
      const item1 = buildItem(zone, 'item1');
      const item2 = buildItem(zone, 'item2');
      room.addItem(item1);
      room.addItem(item2);
      expect(room.items).toEqual([item1, item2]);
      callCommand(invoker, 'clean');
      expect(room.items).toEqual([]);
      expect(invoker.emitTo).toBeCalledWith(`You tidy up the room.`);
      expect(other1.emitTo).toBeCalledWith(`${invoker} tidies the room.`);
    });
  });

  describe('get', () => {
    test('removes item from room and adds it to invoker inventory', () => {
      const item = buildItem(zone, 'item1');
      room.addItem(item);
      expect(room.items).toEqual([item]);
      expect(invoker.items).toEqual([]);
      callCommand(invoker, `get item1`);
      expect(room.items).toEqual([]);
      expect(invoker.items).toEqual([item]);
      expect(invoker.emitTo).toBeCalledWith(`You pick up ${item}.`);
      expect(other1.emitTo).toBeCalledWith(`${invoker} picks up ${item}.`);
    });

    test('sends message if item not in room', () => {
      callCommand(invoker, `get item1`);
      expect(invoker.emitTo).toBeCalledWith(`You don't see one.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test(`sends message if item is set to no carry`, () => {
      const item = buildItem(zone, 'item1', { flags: [ItemFlag.NOCARRY] });
      room.addItem(item);
      callCommand(invoker, `get item1`);
      expect(invoker.emitTo).toBeCalledWith(`You can't carry that.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('removes item from container if command contains from in it', () => {
      const item = buildItem(zone, 'item1');
      const container = buildItem(zone, 'container1', { flags: [ItemFlag.CONTAINER] });
      room.addItem(container);
      container.addItem(item);
      expect(container.items).toEqual([item]);
      expect(invoker.items).toEqual([]);
      callCommand(invoker, `get item1 from container1`);
      expect(container.items).toEqual([]);
      expect(invoker.items).toEqual([item]);
      expect(invoker.emitTo).toBeCalledWith(`You get ${item} from ${container}.`);
      expect(other1.emitTo).toBeCalledWith(`${invoker} gets ${item} from ${container}.`);
    });

    test('sends message if container not in room', () => {
      callCommand(invoker, `get item1 from container1`);
      expect(invoker.emitTo).toBeCalledWith(`You don't see one.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('sends message if container not a container', () => {
      const container = buildItem(zone, 'container1', { flags: [] });
      room.addItem(container);
      callCommand(invoker, `get item1 from container1`);
      expect(invoker.emitTo).toBeCalledWith(`That doesn't seem to hold anything.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('sends message if item not in container', () => {
      const container = buildItem(zone, 'container1', { flags: [ItemFlag.CONTAINER] });
      room.addItem(container);
      callCommand(invoker, `get item1 from container1`);
      expect(invoker.emitTo).toBeCalledWith(`You don't see that inside ${container}.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('supports getting items by index', () => {
      const item11 = buildItem(zone, 'item1');
      const item12 = buildItem(zone, 'item1');
      const container = buildItem(zone, 'container1', { flags: [ItemFlag.CONTAINER] });
      room.addItem(container);
      container.addItem(item11);
      container.addItem(item12);
      expect(container.items).toEqual([item12, item11]);
      expect(invoker.items).toEqual([]);
      callCommand(invoker, `get item1.2 from container1`);
      expect(container.items).toEqual([item12]);
      expect(invoker.items).toEqual([item11]);
    });

    test('sends message if qty not in container', () => {
      const item1 = buildItem(zone, 'item1');
      const container = buildItem(zone, 'container1', { flags: [ItemFlag.CONTAINER] });
      room.addItem(container);
      container.addItem(item1);
      callCommand(invoker, `get item1.2 from container1`);
      expect(invoker.emitTo).toBeCalledWith(`You don't see that inside ${container}.`);
      expect(other1.emitTo).not.toBeCalled();
    });
  });

  describe('put', () => {
    test('puts item in container', () => {
      const item = buildItem(zone, 'item1');
      const container = buildItem(zone, 'container1', { flags: [ItemFlag.CONTAINER] });
      room.addItem(container);
      invoker.addItem(item);
      expect(container.items).toEqual([]);
      expect(invoker.items).toEqual([item]);
      callCommand(invoker, `put item1 in container1`);
      expect(container.items).toEqual([item]);
      expect(invoker.items).toEqual([]);
      expect(invoker.emitTo).toBeCalledWith(`You put ${item} in ${container}.`);
      expect(other1.emitTo).toBeCalledWith(`${invoker} puts ${item} in ${container}.`);
    });

    test('sends message if container not in room', () => {
      callCommand(invoker, `put item1 in container1`);
      expect(invoker.emitTo).toBeCalledWith(`You don't see one.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('sends message if container not a container', () => {
      const container = buildItem(zone, 'container1', { flags: [] });
      room.addItem(container);
      callCommand(invoker, `put item1 in container1`);
      expect(invoker.emitTo).toBeCalledWith(`That doesn't seem to hold anything.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('sends message if item not in inventory', () => {
      const container = buildItem(zone, 'container1', { flags: [ItemFlag.CONTAINER] });
      room.addItem(container);
      callCommand(invoker, `put item1 in container1`);
      expect(invoker.emitTo).toBeCalledWith(`You don't see one.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('sends message if putting item in itself', () => {
      const container = buildItem(zone, 'container1', { flags: [ItemFlag.CONTAINER] });
      room.addItem(container);
      callCommand(invoker, `put container1 in container1`);
      expect(invoker.emitTo).toBeCalledWith(`You can't put something inside itself.`);
      expect(other1.emitTo).not.toBeCalled();
    });
  });

  describe('give', () => {
    test('moves an item from invoker to target', () => {
      const other2 = buildCharacter(zone, 'other2', room);
      const item = buildItem(zone, 'item');
      invoker.addItem(item);
      expect(invoker.items).toEqual([item]);
      expect(other1.items).toEqual([]);
      callCommand(invoker, 'give item to other');
      expect(invoker.items).toEqual([]);
      expect(other1.items).toEqual([item]);
      expect(invoker.emitTo).toBeCalledWith(`You give a ${item} to ${other1}.`);
      expect(other1.emitTo).toBeCalledWith(`${invoker} gives you a ${item}.`);
      expect(other2.emitTo).toBeCalledWith(`${invoker} gives ${other1} a ${item}.`);
    });

    test('sends message if "to" not in phrase', () => {
      const item = buildItem(zone, 'item');
      invoker.addItem(item);
      callCommand(invoker, 'give item other');
      expect(invoker.emitTo).toBeCalledWith(`Invalid syntax: give {item} to {character}`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('sends message if invalid item', () => {
      callCommand(invoker, 'give item to other');
      expect(invoker.emitTo).toBeCalledWith(`Give what to whom?`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test('sends message if invalid target', () => {
      const item = buildItem(zone, 'item');
      invoker.addItem(item);
      callCommand(invoker, 'give item to nonCharacter');
      expect(invoker.emitTo).toBeCalledWith(`Give what to whom?`);
      expect(other1.emitTo).not.toBeCalled();
    });
  });

  describe('destroy', () => {
    test('removes item from inventory', () => {
      const item = buildItem(zone, 'item');
      invoker.addItem(item);
      expect(invoker.items).toEqual([item]);
      callCommand(invoker, 'destroy item');
      expect(invoker.items).toEqual([]);
      expect(invoker.emitTo).toBeCalledWith(`You destroy a ${item}.`);
      expect(other1.emitTo).toBeCalledWith(`${invoker} destroys a ${item}.`);
    });

    test('sends message if invalid item', () => {
      callCommand(invoker, 'destroy item');
      expect(invoker.emitTo).toBeCalledWith(`You don't have that.`);
      expect(other1.emitTo).not.toBeCalled();
    });

    test(`doesn't destroy items in room`, () => {
      const item = buildItem(zone, 'item');
      room.addItem(item);
      callCommand(invoker, 'destroy item');
      expect(invoker.emitTo).toBeCalledWith(`You don't have that.`);
      expect(other1.emitTo).not.toBeCalled();
    });
  });

  describe('iventory', () => {
    test('shows invoker inventory', () => {
      const item1 = buildItem(zone, 'item1');
      const item2 = buildItem(zone, 'item2');
      invoker.addItem(item1);
      invoker.addItem(item2);
      callCommand(invoker, 'inventory');
      expect(invoker.emitTo).toBeCalledWith(`Inventory:
  <y>item1 name<n>
  <y>item2 name<n>`);
    });
  });
});
