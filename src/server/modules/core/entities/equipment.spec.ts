import { Instance, getCatalogSafely } from '@server/GameServerInstance';
import { buildCharacter, buildItem, buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { Character } from './character';
import * as equipment from './equipment';
import { ItemFlag } from './item';
import { Zone } from './zone';

describe('equipment', () => {
  let zone: Zone;
  let invoker: Character;
  beforeEach(() => {
    initializeTestServer();
    zone = buildZone({}, true);
    const room = buildRoom(zone, 'room');
    invoker = buildCharacter(zone, 'invoker', room);
  });

  describe('emptyEquipment', () => {
    test('produces an empty equipment set', () => {
      const empty = equipment.emptyEquipment();
      expect(Object.keys(empty)).toEqual(Object.values(equipment.BodyPosition));
      expect(Object.values(empty).find((item) => item)).toBeUndefined();
    });
  });

  describe('wearItem', () => {
    test(`returns error for item not in player inventory`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      expect(equipment.wearItem(invoker, item1)).toEqual([false, `That's not in your inventory.`]);
    });

    test(`returns error for non wearable item`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [], wearSpots: [equipment.BodyPosition.FEET] });
      const item2 = buildItem(zone, 'item2', { flags: [ItemFlag.WEARABLE], wearSpots: [] });
      invoker.addItem(item1);
      invoker.addItem(item2);
      expect(equipment.wearItem(invoker, item1)).toEqual([false, `It's not wearable.`]);
      expect(equipment.wearItem(invoker, item2)).toEqual([false, `It's not wearable.`]);
    });

    test(`returns error if you try to wear item in a spot it can't be worn`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      invoker.addItem(item1);
      expect(equipment.wearItem(invoker, item1, equipment.BodyPosition.ARMS)).toEqual([false, `You can't wear that there.`]);
    });

    test(`adds item to equipment if invoker can wear it`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      invoker.addItem(item1);
      expect(equipment.wearItem(invoker, item1)).toEqual([true, equipment.BodyPosition.FEET]);
      expect(item1.container).toEqual(invoker);
      expect(invoker.items).toEqual([]);
      expect(invoker.equipment.FEET).toEqual(item1);
    });

    test(`returns error if already wearing item`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      item1.container = invoker;
      invoker.equipment.FEET = item1;
      expect(equipment.wearItem(invoker, item1)).toEqual([false, `That's not in your inventory.`]);
    });

    test(`returns error if wearing item in spot already`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      const item2 = buildItem(zone, 'item2', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      item1.container = invoker;
      invoker.equipment.FEET = item1;
      invoker.addItem(item2);
      expect(equipment.wearItem(invoker, item2)).toEqual([false, `There's no spot to wear it.`]);
    });

    test(`puts item in next equipment spot if first taken`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET, equipment.BodyPosition.HANDS] });
      const item2 = buildItem(zone, 'item2', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET, equipment.BodyPosition.HANDS] });
      invoker.addItem(item1);
      invoker.addItem(item2);
      expect(equipment.wearItem(invoker, item1)).toEqual([true, equipment.BodyPosition.FEET]);
      expect(equipment.wearItem(invoker, item2)).toEqual([true, equipment.BodyPosition.HANDS]);
      expect(invoker.equipment.HANDS).toEqual(item2);
    });

    test(`puts item in desired spot`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET, equipment.BodyPosition.HANDS] });
      invoker.addItem(item1);
      expect(equipment.wearItem(invoker, item1, equipment.BodyPosition.HANDS)).toEqual([true, equipment.BodyPosition.HANDS]);
      expect(invoker.equipment.HANDS).toEqual(item1);
    });
  });

  describe('removeItem', () => {
    test(`returns error if not wearing item`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      expect(equipment.removeItem(invoker, item1)).toEqual([false, `You're not wearing that.`]);
      invoker.addItem(item1);
      expect(equipment.removeItem(invoker, item1)).toEqual([false, `You're not wearing that.`]);
    });

    test(`removes item and adds it to inventory`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      invoker.addItem(item1);
      expect(equipment.wearItem(invoker, item1)).toEqual([true, equipment.BodyPosition.FEET]);
      expect(invoker.equipment.FEET).toEqual(item1);
      expect(invoker.items).toEqual([]);
      expect(equipment.removeItem(invoker, item1)).toEqual([true, equipment.BodyPosition.FEET]);
      expect(invoker.equipment.FEET).toBeUndefined();
      expect(invoker.items).toEqual([item1]);
    });
  });

  describe('buildEquipment', () => {
    test(`throws error if no gameServer registered`, () => {
      Instance.gameServer = undefined;
      expect(() => equipment.buildEquipment(invoker, {})).toThrowError();
      initializeTestServer();
      expect(() => equipment.buildEquipment(invoker, {})).not.toThrowError();
    });

    test(`sets empty equipment if no definitions`, () => {
      equipment.buildEquipment(invoker, {});
      expect(invoker.equipment).toEqual(equipment.emptyEquipment());
    });

    test(`loads and adds equipment to user based on definition`, () => {
      getCatalogSafely().registerItemDefinition({ key: 'item1', name: 'item1', flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] }, zone);
      getCatalogSafely().registerItemDefinition({ key: 'item2', name: 'item2', flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.HANDS] }, zone);
      equipment.buildEquipment(invoker, { FEET: { key: 'item1@testZone' }, HANDS: { key: 'item2@testZone' } });
      expect(invoker.equipment.FEET?.key).toEqual('item1@testZone');
      expect(invoker.equipment.HANDS?.key).toEqual('item2@testZone');
      expect(invoker.items).toEqual([]);
    });

    test(`skips unknown items`, () => {
      equipment.buildEquipment(invoker, { FEET: { key: 'item1@testZone' } });
      expect(invoker.equipment.FEET).toBeUndefined();
      expect(invoker.items).toEqual([]);
    });

    test(`leaves item in inventory if unwearable`, () => {
      getCatalogSafely().registerItemDefinition({ key: 'item1', name: 'item1', flags: [], wearSpots: [] }, zone);
      equipment.buildEquipment(invoker, { FEET: { key: 'item1@testZone' } });
      expect(invoker.equipment.FEET).toBeUndefined();
      expect(invoker.items.map(({ key }) => key)).toEqual(['item1@testZone']);
    });
  });

  describe('lookAtEquipment', () => {
    test('shows nothing if exclude empty and no equipment', () => {
      expect(equipment.lookAtEquipment(invoker, invoker, true)).toEqual(`Equipment:
  nothing`);
    });

    test('shows empty equipment if not exclude empty and no equipment', () => {
      expect(equipment.lookAtEquipment(invoker, invoker, false)).toEqual(`Equipment:
  held (right): nothing
   held (left): nothing
          head: nothing
    about body: nothing
         torso: nothing
          arms: nothing
         hands: nothing
          legs: nothing
          feet: nothing`);
    });

    test(`shows full equipment if not exlcude empty`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      const item2 = buildItem(zone, 'item2', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.HANDS] });
      invoker.addItem(item1);
      invoker.addItem(item2);
      equipment.wearItem(invoker, item1);
      equipment.wearItem(invoker, item2);
      expect(equipment.lookAtEquipment(invoker, invoker, false)).toEqual(`Equipment:
  held (right): nothing
   held (left): nothing
          head: nothing
    about body: nothing
         torso: nothing
          arms: nothing
         hands: ${item2}
          legs: nothing
          feet: ${item1}`);
    });

    test(`shows worn equipment if exclude empty`, () => {
      const item1 = buildItem(zone, 'item1', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.FEET] });
      const item2 = buildItem(zone, 'item2', { flags: [ItemFlag.WEARABLE], wearSpots: [equipment.BodyPosition.HANDS] });
      invoker.addItem(item1);
      invoker.addItem(item2);
      equipment.wearItem(invoker, item1);
      equipment.wearItem(invoker, item2);
      expect(equipment.lookAtEquipment(invoker, invoker, true)).toEqual(`Equipment:
  hands: ${item2}
   feet: ${item1}`);
    });
  });
});
