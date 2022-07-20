import { Instance } from '@server/GameServerInstance';
import { buildCharacter, buildItem, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { applyModifications, IItemDefinition, Item, ItemContainer, ItemFlag, matchItems } from './item';
import { Room } from './room';
import { Zone } from './zone';

describe('core/entities/item', () => {
  let zone: Zone;
  let room: Room;
  beforeEach(() => {
    initializeTestServer();
    zone = buildZone({}, true);
    room = buildRoom(zone, 'room');
  });

  describe('ItemContainer', () => {
    class TestBase {}
    const TestItemContainer = ItemContainer(TestBase);

    test('wraps class and adds items to it', () => {
      const itemContainer = new TestItemContainer();
      expect(itemContainer.items).toEqual([]);
    });

    describe('addItem', () => {
      test('adds items to an item container', () => {
        const itemContainer = new TestItemContainer();
        const item = buildItem(zone, 'testItem');
        itemContainer.addItem(item);
        expect(itemContainer.items).toEqual([item]);
        expect(item.container).toEqual(itemContainer);
      });

      test('removes item from existing container when adding to new container', () => {
        const itemContainer1 = new TestItemContainer();
        const itemContainer2 = new TestItemContainer();
        const item = buildItem(zone, 'testItem');
        itemContainer1.addItem(item);
        itemContainer2.addItem(item);
        expect(itemContainer1.items).toEqual([]);
        expect(itemContainer2.items).toEqual([item]);
        expect(item.container).toEqual(itemContainer2);
      });
    });

    describe('removeItem', () => {
      test('removes item from an item container', () => {
        const itemContainer = new TestItemContainer();
        const item = buildItem(zone, 'testItem');
        itemContainer.addItem(item);
        itemContainer.removeItem(item);
        expect(itemContainer.items).toEqual([]);
        expect(item.container).toBeUndefined();
      });

      test('does not remove item if not in container', () => {
        const itemContainer1 = new TestItemContainer();
        const itemContainer2 = new TestItemContainer();
        const item = buildItem(zone, 'testItem');
        itemContainer2.addItem(item);
        itemContainer1.removeItem(item);
        expect(itemContainer1.items).toEqual([]);
        expect(itemContainer2.items).toEqual([item]);
        expect(item.container).toEqual(itemContainer2);
      });
    });

    describe('lookAtInventory', () => {
      test('shows nothing if inventory empty', () => {
        const invoker = buildCharacter(zone, 'invoker', room);
        const itemContainer = new TestItemContainer();
        const output = itemContainer.lookAtInventory(invoker);
        expect(output).toEqual(`Inventory:\n  nothing`);
      });

      test('shows inventory', () => {
        const invoker = buildCharacter(zone, 'invoker', room);
        const itemContainer = new TestItemContainer();
        const item1 = buildItem(zone, 'testItem1');
        const item2 = buildItem(zone, 'testItem2');
        itemContainer.addItem(item1);
        itemContainer.addItem(item2);
        const output = itemContainer.lookAtInventory(invoker);
        expect(output).toEqual(`Inventory:\n  <y>testItem1 name<n>\n  <y>testItem2 name<n>`);
      });
    });
  });

  describe('applyModifications', () => {
    test('applies text modifications to string based on defined syntax', () => {
      const output = applyModifications('this is a {color} item', { color: 'black' });
      expect(output).toEqual('this is a black item');
    });

    test('applies modification as many times as necessary', () => {
      const output = applyModifications('this {color} item is {color}', { color: 'red' });
      expect(output).toEqual('this red item is red');
    });

    test('applies multiple modifications', () => {
      const output = applyModifications('this {color} item is {size}', { color: 'green', size: 'large' });
      expect(output).toEqual('this green item is large');
    });

    test('does not replace syntax modification keys if modification not provided', () => {
      const output = applyModifications('this item is {size}', { color: 'green' });
      expect(output).toEqual('this item is {size}');
    });

    test('returns original string if no modifications', () => {
      const output = applyModifications('this item is {size}');
      expect(output).toEqual('this item is {size}');
    });
  });

  describe('Item', () => {
    describe('constructor', () => {
      test('initializes Item based on definition', () => {
        const definition: IItemDefinition = {
          key: 'testKey',
          name: 'testName',
          roomDescription: 'test room description',
          description: 'test look description',
          keywords: ['keyword1', 'KEYWORD2'],
          modifications: { modKey: 'modValue' },
          workingData: { dataKey: 'dataValue' },
          inventory: [{ key: 'otherItemKey' }],
          flags: [ItemFlag.HEAVY],
        };
        const item = new Item(definition, zone);
        expect(item.id.length).toBeGreaterThan(0);
        expect(item.definition).toEqual(definition);
        expect(item.modifications).toEqual({ modKey: 'modValue' });
        expect(item.name).toEqual('testName');
        expect(item.styledName).toEqual('<y>testName<n>');
        expect(item.roomDescription).toEqual('test room description');
        expect(item.description).toEqual('test look description');
        expect(item.keywords).toEqual(['keyword1', 'keyword2']);
        expect(item.container).toBeUndefined();
        expect(item.workingData).toEqual({ dataKey: 'dataValue' });
        expect(item.flags.flags).toEqual(ItemFlag.HEAVY);
      });

      test('uses reasonable defaults if definition incomplete', () => {
        const definition: IItemDefinition = {
          key: 'testKey',
          name: 'testName',
        };
        const item = new Item(definition, zone);
        expect(item.id.length).toBeGreaterThan(0);
        expect(item.definition).toEqual(definition);
        expect(item.modifications).toEqual({});
        expect(item.name).toEqual('testName');
        expect(item.styledName).toEqual('<y>testName<n>');
        expect(item.roomDescription).toEqual('<y>testName<n> is on the ground here.');
        expect(item.description).toEqual('You see <y>testName<n>.');
        expect(item.keywords).toEqual([]);
        expect(item.container).toBeUndefined();
        expect(item.workingData).toEqual({});
        expect(item.flags.flags).toEqual(0);
      });

      test('applies modifications to name and descriptions', () => {
        const definition: IItemDefinition = {
          key: 'testKey',
          name: '{color} item',
          roomDescription: 'A {color} item on the ground.',
          description: 'You see a {color} item.',
          modifications: { color: 'blue' },
        };
        const item = new Item(definition, zone);
        expect(item.name).toEqual('blue item');
        expect(item.styledName).toEqual('<y>blue item<n>');
        expect(item.roomDescription).toEqual('A blue item on the ground.');
        expect(item.description).toEqual('You see a blue item.');
      });
    });

    describe('finalize', () => {
      test('adds contained items', () => {
        Instance.gameServer?.catalog.registerItemDefinition({ key: 'child1', name: 'Child1' }, zone);
        Instance.gameServer?.catalog.registerItemDefinition({ key: 'child2', name: 'Child2' }, zone);
        const parent = buildItem(zone, 'parent', { inventory: [{ key: 'child1' }, { key: 'child2' }] });
        expect(parent.items).toEqual([]);
        parent.finalize();
        expect(parent.items.length).toEqual(2);
        expect(parent.items.map(({ key }) => key)).toEqual(['child1@testZone', 'child2@testZone']);
      });
    });

    describe('lookAt', () => {
      test('shows item description', () => {
        const invoker = buildCharacter(zone, 'invoker', room);
        const item = buildItem(zone, 'testItem', { description: 'Test item description' });
        const output = item.lookAt(invoker);
        expect(output).toEqual('<y>testItem name<n>\nTest item description');
      });

      test('shows item key if admin', () => {
        const invoker = buildCharacter(zone, 'invoker', room);
        const item = buildItem(zone, 'testItem');
        expect(item.lookAt(invoker)).not.toContain('[testItem@testZone]');
        invoker.admin = true;
        expect(item.lookAt(invoker)).toContain('[testItem@testZone]');
      });

      test('shows inventory if container', () => {
        const invoker = buildCharacter(zone, 'invoker', room);
        const item = buildItem(zone, 'testItem', { flags: [ItemFlag.CONTAINER] });
        const child1 = buildItem(zone, 'child1');
        const child2 = buildItem(zone, 'child2');
        item.addItem(child1);
        item.addItem(child2);
        const output = item.lookAt(invoker);
        expect(output).toEqual('<y>testItem name<n>\nYou see <y>testItem name<n>.\n\nInventory:\n  <y>child1 name<n>\n  <y>child2 name<n>');
      });
    });

    describe('roomLookAt', () => {
      test('shows item room description', () => {
        const invoker = buildCharacter(zone, 'invoker', room);
        const item = buildItem(zone, 'testItem', { roomDescription: 'Test item room description' });
        const output = item.roomLookAt(invoker);
        expect(output).toEqual('Test item room description');
      });
    });

    describe('canCarry', () => {
      test('depends on HEAVY flag', () => {
        let item = buildItem(zone, 'testItem', { flags: [ItemFlag.HEAVY] });
        expect(item.canCarry()).toBeFalsy();
        item = buildItem(zone, 'testItem', { flags: [] });
        expect(item.canCarry()).toBeTruthy();
      });
    });

    describe('canHoldItems', () => {
      test('depends on HEAVY flag', () => {
        let item = buildItem(zone, 'testItem', { flags: [] });
        expect(item.canHoldItems()).toBeFalsy();
        item = buildItem(zone, 'testItem', { flags: [ItemFlag.CONTAINER] });
        expect(item.canHoldItems()).toBeTruthy();
      });
    });

    describe('toJson', () => {
      test('produces definition based on live item', () => {
        const item = buildItem(zone, 'testItem');
        item.modifications['color'] = 'blue';
        item.workingData['dataKey'] = 'dataValue';
        item.keywords.push('keyword1');
        item.description = 'New description';
        item.roomDescription = 'New room description';
        const output = item.toJson();
        expect(output).toEqual({
          key: 'testItem',
          name: 'testItem name',
          modifications: { color: 'blue' },
          workingData: { dataKey: 'dataValue' },
          keywords: ['keyword1'],
          description: 'New description',
          roomDescription: 'New room description',
        });
      });
    });

    describe('toString', () => {
      test('returns styled name', () => {
        const item = buildItem(zone, 'testItem');
        expect(item.toString()).toEqual('<y>testItem name<n>');
      });
    });
  });

  describe('matchItems', () => {
    test('allows matching on item key with case insensitive matching', () => {
      const item1 = buildItem(zone, 'testItem1', {});
      let response = matchItems([item1], 'testItem1');
      expect(response?.[0]).toEqual(item1);
      response = matchItems([item1], 'TESTITEM1');
      expect(response?.[0]).toEqual(item1);
    });

    test('allows matching on item key partial with case insensitive matching', () => {
      const item1 = buildItem(zone, 'testItem1', {});
      let response = matchItems([item1], 'testIt');
      expect(response?.[0]).toEqual(item1);
      response = matchItems([item1], 'TESTIT');
      expect(response?.[0]).toEqual(item1);
    });

    test('allows matching on full item keywords with case insensitive matching', () => {
      const item1 = buildItem(zone, 'testItem1', { keywords: ['other-keyword'] });
      let response = matchItems([item1], 'other-keyword');
      expect(response?.[0]).toEqual(item1);
      response = matchItems([item1], 'OTHER-KEYWORD');
      expect(response?.[0]).toEqual(item1);
      response = matchItems([item1], 'other-key');
      expect(response).toEqual([]);
    });

    test('allows matching on partial item name with case insensitive matching', () => {
      const item1 = buildItem(zone, 'testItem1', { name: 'other-name' });
      let response = matchItems([item1], 'other-na');
      expect(response?.[0]).toEqual(item1);
      response = matchItems([item1], 'OTHER-NA');
      expect(response?.[0]).toEqual(item1);
    });

    test('matching prefers full key to keywords', () => {
      const item1 = buildItem(zone, 'testItem1', { keywords: ['testItem2'] });
      const item2 = buildItem(zone, 'testItem2', {});
      let response = matchItems([item1, item2], 'testItem2');
      expect(response?.[0]).toEqual(item2);
    });

    test('matching prefers keywords to partial key', () => {
      const item1 = buildItem(zone, 'testItem1', {});
      const item2 = buildItem(zone, 'testItem2', { keywords: ['testItem'] });
      let response = matchItems([item1, item2], 'testItem');
      expect(response?.[0]).toEqual(item2);
    });

    test('matching prefers partial key to partial name', () => {
      const item1 = buildItem(zone, 'testItem1', { name: 'itemKey' });
      const item2 = buildItem(zone, 'itemKey2', {});
      let response = matchItems([item1, item2], 'itemKey');
      expect(response?.[0]).toEqual(item2);
    });
  });
});
