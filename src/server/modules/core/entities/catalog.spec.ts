import { createCatalog, ICatalog } from './catalog';
import { Room } from './room';
import { Zone } from './zone';

describe('core/entities/catalog', () => {
  let catalog: ICatalog;
  beforeEach(() => {
    catalog = createCatalog();
  });

  describe('zones', () => {
    describe('registerZone', () => {
      test('registers provided zone', () => {
        expect(catalog.lookupZone('testZone')).toBeUndefined();
        catalog.registerZone(new Zone({ key: 'testZone', zoneName: 'Test zone' }));
        expect(catalog.lookupZone('testZone')).toBeDefined();
        expect(catalog.lookupZone('testZone')?.key).toEqual('testZone');
      });

      test('throws error if key includes @', () => {
        expect(() => catalog.registerZone(new Zone({ key: 'testZone@', zoneName: 'Test zone' }))).toThrow();
      });

      test('throws error if zone already loaded', () => {
        catalog.registerZone(new Zone({ key: 'testZone', zoneName: 'Test zone' }));
        expect(() => catalog.registerZone(new Zone({ key: 'testZone', zoneName: 'Test zone' }))).toThrow();
      });
    });

    describe('lookupZone', () => {
      test('returns zone if found', () => {
        catalog.registerZone(new Zone({ key: 'testZone', zoneName: 'Test zone' }));
        expect(catalog.lookupZone('testZone')).toBeDefined();
        expect(catalog.lookupZone('testZone')?.key).toEqual('testZone');
      });

      test('returns undefined if not found', () => {
        expect(catalog.lookupZone('testZone')).toBeUndefined();
      });
    });

    describe('getZones', () => {
      test('returns all zones', () => {
        catalog.registerZone(new Zone({ key: 'testZone1', zoneName: 'Test zone 1' }));
        catalog.registerZone(new Zone({ key: 'testZone2', zoneName: 'Test zone 2' }));
        const zones = catalog.getZones();
        expect(zones.length).toEqual(2);
        expect(zones[0].key).toEqual('testZone1');
        expect(zones[1].key).toEqual('testZone2');
      });
    });
  });

  describe('rooms', () => {
    let zone: Zone;
    beforeEach(() => {
      zone = new Zone({ key: 'testZone', zoneName: 'Test zone' });
      catalog.registerZone(zone);
    });

    describe('lookupRoom', () => {
      test('returns undefined if zone not found', () => {
        expect(catalog.lookupRoom('testRoom', zone)).toBeUndefined();
      });

      test('returns room by key and zone', () => {
        const newRoom = new Room({ key: 'testRoom', roomName: 'Test room', description: '', exits: [] }, zone);
        const room = catalog.lookupRoom('testRoom', zone);
        expect(room).toEqual(newRoom);
      });

      test("returns room by just the key if it's a full key", () => {
        const otherZone = new Zone({ key: 'otherZone', zoneName: 'Other zone' });
        catalog.registerZone(otherZone);
        const newRoom = new Room({ key: 'testRoom', roomName: 'Test room', description: '', exits: [] }, zone);
        const room = catalog.lookupRoom('testRoom@testZone', otherZone);
        expect(room).toEqual(newRoom);
        expect(catalog.lookupRoom('testRoom', otherZone)).toBeUndefined();
      });
    });
  });

  describe('characters', () => {
    let zone: Zone;
    beforeEach(() => {
      zone = new Zone({ key: 'testZone', zoneName: 'Test zone' });
      catalog.registerZone(zone);
    });

    describe('registerCharacterDefinition', () => {
      test('registers provided definition', () => {
        expect(catalog.lookupCharacterDefinition('testCharacter', zone)).toBeUndefined();
        catalog.registerCharacterDefinition({ key: 'testCharacter', name: 'Test character' }, zone);
        const character = catalog.lookupCharacterDefinition('testCharacter', zone);
        expect(character).toBeDefined();
        expect(character?.key).toEqual('testCharacter@testZone');
      });

      test('throws error if character already defined', () => {
        catalog.registerCharacterDefinition({ key: 'testCharacter', name: 'Test character' }, zone);
        expect(() => catalog.registerCharacterDefinition({ key: 'testCharacter', name: 'Test character' }, zone)).toThrow();
      });
    });

    describe('lookupCharacterDefinition', () => {
      test('returns character if it exists', () => {
        catalog.registerCharacterDefinition({ key: 'testCharacter', name: 'Test character' }, zone);
        const character = catalog.lookupCharacterDefinition('testCharacter', zone);
        expect(character).toBeDefined();
        expect(character?.key).toEqual('testCharacter@testZone');
      });

      test('returns undefined if no character', () => {
        expect(catalog.lookupCharacterDefinition('testCharacter', zone)).toBeUndefined();
      });
    });

    describe('getCharacterDefinitions', () => {
      test('returns all characters for zone', () => {
        const otherZone = new Zone({ key: 'otherZone', zoneName: 'Other zone' });
        catalog.registerZone(otherZone);
        catalog.registerCharacterDefinition({ key: 'testCharacter1', name: 'Test character' }, zone);
        catalog.registerCharacterDefinition({ key: 'testCharacter2', name: 'Test character' }, zone);
        catalog.registerCharacterDefinition({ key: 'testCharacter3', name: 'Test character' }, otherZone);

        const definitions = catalog.getCharacterDefinitions(zone);
        expect(definitions.length).toEqual(2);
        expect(definitions.map(({ key }) => key)).toEqual(['testCharacter1@testZone', 'testCharacter2@testZone']);
      });
    });

    describe('loadCharacter', () => {
      test('loads character into room', () => {
        const room = new Room({ key: 'testRoom', roomName: 'Test room', description: '', exits: [] }, zone);
        catalog.registerCharacterDefinition({ key: 'testCharacter1', name: 'Test character' }, zone);
        const loadedCharacter = catalog.loadCharacter('testCharacter1', zone, room);
        expect(loadedCharacter.key).toEqual('testCharacter1@testZone');
        expect(room.characters.length).toEqual(1);
        expect(room.characters[0].key).toEqual('testCharacter1@testZone');
        expect(room.characters[0].zone).toEqual(zone);
      });

      test('can load character from different zone', () => {
        const otherZone = new Zone({ key: 'otherZone', zoneName: 'Other zone' });
        catalog.registerZone(otherZone);
        const room = new Room({ key: 'testRoom', roomName: 'Test room', description: '', exits: [] }, otherZone);
        catalog.registerCharacterDefinition({ key: 'testCharacter1', name: 'Test character' }, zone);
        const loadedCharacter = catalog.loadCharacter('testCharacter1@testZone', otherZone, room);
        expect(loadedCharacter.key).toEqual('testCharacter1@testZone');
        expect(room.characters.length).toEqual(1);
        expect(room.characters[0].key).toEqual('testCharacter1@testZone');
        expect(room.characters[0].zone).toEqual(zone);
      });

      test('throws error if unknown character', () => {
        const room = new Room({ key: 'testRoom', roomName: 'Test room', description: '', exits: [] }, zone);
        expect(() => catalog.loadCharacter('testCharacter@testZone', zone, room)).toThrow();
      });
    });
  });

  describe('items', () => {
    let zone: Zone;
    beforeEach(() => {
      zone = new Zone({ key: 'testZone', zoneName: 'Test zone' });
      catalog.registerZone(zone);
    });

    describe('registerItemDefinition', () => {
      test('registers provided definition', () => {
        expect(catalog.lookupItemDefinition('testItem', zone)).toBeUndefined();
        catalog.registerItemDefinition({ key: 'testItem', name: 'Test item' }, zone);
        const item = catalog.lookupItemDefinition('testItem', zone);
        expect(item).toBeDefined();
        expect(item?.key).toEqual('testItem@testZone');
      });

      test('throws error if item already defined', () => {
        catalog.registerItemDefinition({ key: 'testItem', name: 'Test item' }, zone);
        expect(() => catalog.registerItemDefinition({ key: 'testItem', name: 'Test item' }, zone)).toThrow();
      });
    });

    describe('lookupItemDefinition', () => {
      test('returns item if it exists', () => {
        catalog.registerItemDefinition({ key: 'testItem', name: 'Test item' }, zone);
        const item = catalog.lookupItemDefinition('testItem', zone);
        expect(item).toBeDefined();
        expect(item?.key).toEqual('testItem@testZone');
      });

      test('returns undefined if no item', () => {
        expect(catalog.lookupItemDefinition('testItem', zone)).toBeUndefined();
      });
    });

    describe('getItemDefinitions', () => {
      test('returns all items for zone', () => {
        const otherZone = new Zone({ key: 'otherZone', zoneName: 'Other zone' });
        catalog.registerZone(otherZone);
        catalog.registerItemDefinition({ key: 'testItem1', name: 'Test item' }, zone);
        catalog.registerItemDefinition({ key: 'testItem2', name: 'Test item' }, zone);
        catalog.registerItemDefinition({ key: 'testItem3', name: 'Test item' }, otherZone);

        const definitions = catalog.getItemDefinitions(zone);
        expect(definitions.length).toEqual(2);
        expect(definitions.map(({ key }) => key)).toEqual(['testItem1@testZone', 'testItem2@testZone']);
      });
    });

    describe('loadItem', () => {
      test('loads item into room', () => {
        catalog.registerItemDefinition({ key: 'testItem1', name: 'Test item' }, zone);
        const loadedItem = catalog.loadItem('testItem1', zone);
        expect(loadedItem.key).toEqual('testItem1@testZone');
        expect(loadedItem.zone).toEqual(zone);
      });

      test('can load item from different zone', () => {
        const otherZone = new Zone({ key: 'otherZone', zoneName: 'Other zone' });
        catalog.registerZone(otherZone);
        catalog.registerItemDefinition({ key: 'testItem1', name: 'Test item' }, zone);
        const loadedItem = catalog.loadItem('testItem1@testZone', otherZone);
        expect(loadedItem.key).toEqual('testItem1@testZone');
        expect(loadedItem.zone).toEqual(zone);
      });

      test('throws error if unknown item', () => {
        const room = new Room({ key: 'testRoom', roomName: 'Test room', description: '', exits: [] }, zone);
        expect(() => catalog.loadItem('testItem@testZone', zone)).toThrow();
      });
    });
  });
});
