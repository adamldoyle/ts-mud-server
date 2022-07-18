import fs from 'fs';
import { TimeOfDay } from '@server/modules/calendar';
import * as zones from './zone';

jest.mock('fs');

describe('core/entities/zone', () => {
  let zone: zones.Zone;
  beforeEach(() => {
    zone = new zones.Zone({ key: 'testZone', zoneName: 'Test zone' });
  });

  describe('buildZonedKey', () => {
    test('builds key from partial key and provided zone', () => {
      expect(zones.buildZonedKey('baseKey', zone)).toEqual('baseKey@testZone');
    });

    test('ignores zone if provided key is a full key', () => {
      expect(zones.buildZonedKey('baseKey@otherZone', zone)).toEqual('baseKey@otherZone');
    });

    test('throws error if no key', () => {
      expect(() => zones.buildZonedKey('', zone)).toThrow();
    });

    test('throws error for too many @ symbols', () => {
      expect(() => zones.buildZonedKey('invalid@key@testZone', zone)).toThrow();
    });
  });

  describe('splitZonedKey', () => {
    test('returns pieces of zoned key', () => {
      expect(zones.splitZonedKey('baseKey@testZone')).toEqual({ key: 'baseKey', zoneKey: 'testZone' });
    });

    test('throws error for too few @ symbols', () => {
      expect(() => zones.splitZonedKey('invalidKey')).toThrow();
    });

    test('throws error for too many @ symbols', () => {
      expect(() => zones.splitZonedKey('invalid@key@testZone')).toThrow();
    });
  });

  describe('KeyedEntity', () => {
    test('wraps class with key and zone info with initializer', () => {
      class TestBase {}
      const TestKeyedEntity = zones.KeyedEntity(TestBase);

      const entity = new TestKeyedEntity();
      entity.initializeKeyedEntity('baseKey', zone);
      expect(entity.key).toEqual('baseKey@testZone');
      expect(entity.zone).toEqual(zone);
      expect(entity.basicKey).toEqual('baseKey');
    });
  });

  describe('BaseKeyedEntity', () => {
    test('is a class with key and zone info with initializer', () => {
      const entity = new zones.BaseKeyedEntity();
      entity.initializeKeyedEntity('baseKey', zone);
      expect(entity.key).toEqual('baseKey@testZone');
      expect(entity.zone).toEqual(zone);
      expect(entity.basicKey).toEqual('baseKey');
    });
  });

  describe('Zone', () => {
    describe('constructor', () => {
      test('initializes info based on definition', () => {
        const definition = { key: 'testZone', zoneName: 'Test zone' };
        const zone = new zones.Zone(definition);
        expect(zone.definition).toEqual(definition);
        expect(zone.key).toEqual(`testZone`);
        expect(zone.zoneName).toEqual(`Test zone`);
        expect(zone.styledName).toEqual(`<R>Test zone<n>`);
      });

      test('initializes zone with empty rooms and characters', () => {
        const zone = new zones.Zone({ key: 'testZone', zoneName: 'Test zone' });
        expect(zone.rooms).toEqual({});
        expect(zone.characters).toEqual([]);
      });
    });

    describe('addRoom', () => {
      test(`adds the room to the zone's room collection and sets the zone on the room`, () => {
        const room = { key: 'testRoom@testZone', zone: undefined }; // Fake room
        zone.addRoom(room as any);
        expect(zone.rooms).toEqual({ 'testRoom@testZone': room });
        expect(room.zone).toEqual(zone);
      });

      test(`does nothing if room already added`, () => {
        const room = { key: 'testRoom@testZone', zone: undefined }; // Fake room
        zone.addRoom(room as any);
        expect(zone.rooms).toEqual({ 'testRoom@testZone': room });
        expect(room.zone).toEqual(zone);
        zone.addRoom(room as any);
        expect(zone.rooms).toEqual({ 'testRoom@testZone': room });
        expect(room.zone).toEqual(zone);
      });
    });

    describe('finalize', () => {
      test('calls finalize on each room in zone', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        const room1 = { key: 'testRoom1@testZone', zone: undefined, finalize: jest.fn() };
        zone.addRoom(room1 as any);
        const room2 = { key: 'testRoom2@testZone', zone: undefined, finalize: jest.fn() };
        zone.addRoom(room2 as any);

        zone.finalize();

        expect(room1.finalize).toBeCalledWith(undefined);
        expect(room2.finalize).toBeCalledWith(undefined);
      });

      test('passes saved data for any matching rooms', () => {
        const room1Data = { key: 'testRoom1@testZone' };
        const room3Data = { key: 'testRoom3@testZone' };
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(
          JSON.stringify({
            rooms: [room1Data, room3Data],
          })
        );
        const room1 = { key: 'testRoom1@testZone', zone: undefined, finalize: jest.fn() };
        zone.addRoom(room1 as any);
        const room2 = { key: 'testRoom2@testZone', zone: undefined, finalize: jest.fn() };
        zone.addRoom(room2 as any);
        const room3 = { key: 'testRoom3@testZone', zone: undefined, finalize: jest.fn() };
        zone.addRoom(room3 as any);

        zone.finalize();

        expect(room1.finalize).toBeCalledWith(room1Data);
        expect(room2.finalize).toBeCalledWith(undefined);
        expect(room3.finalize).toBeCalledWith(room3Data);
      });
    });

    describe('addCharacter', () => {
      test('adds character to zone list', () => {
        const char1 = { key: 'testKey@testZone' };
        zone.addCharacter(char1 as any);
        expect(zone.characters).toEqual([char1]);
        const char2 = { key: 'testKey@testZone' };
        zone.addCharacter(char2 as any);
        expect(zone.characters).toEqual([char1, char2]);
      });

      test('can add multiple characters with same key', () => {
        const char = { key: 'testKey@testZone' };
        zone.addCharacter(char as any);
        zone.addCharacter(char as any);
        expect(zone.characters).toEqual([char, char]);
      });
    });

    describe('removeCharacter', () => {
      test('removes character from zone list', () => {
        const char1 = { key: 'testKey1@testZone' };
        const char2 = { key: 'testKey2@testZone' };
        zone.addCharacter(char1 as any);
        zone.addCharacter(char2 as any);
        expect(zone.characters).toEqual([char1, char2]);
        zone.removeCharacter(char2 as any);
        expect(zone.characters).toEqual([char1]);
      });

      test('no impact if character not in zone', () => {
        const char1 = { key: 'testKey1@testZone' };
        const char2 = { key: 'testKey2@testZone' };
        zone.addCharacter(char1 as any);
        zone.addCharacter(char2 as any);
        expect(zone.characters).toEqual([char1, char2]);
        zone.removeCharacter(char1 as any);
        expect(zone.characters).toEqual([char2]);
        zone.removeCharacter(char1 as any);
        expect(zone.characters).toEqual([char2]);
      });
    });

    describe('reset', () => {
      test('calls reset on each room in zone', () => {
        const room1 = { key: 'testRoom1@testZone', zone: undefined, reset: jest.fn() };
        zone.addRoom(room1 as any);
        const room2 = { key: 'testRoom2@testZone', zone: undefined, reset: jest.fn() };
        zone.addRoom(room2 as any);

        zone.reset();

        expect(room1.reset).toBeCalledWith();
        expect(room2.reset).toBeCalledWith();
      });
    });

    describe('newTimeOfDay', () => {
      test('calls reset and newTimeOfDay on each room in zone', () => {
        const room1 = { key: 'testRoom1@testZone', zone: undefined, reset: jest.fn(), newTimeOfDay: jest.fn() };
        zone.addRoom(room1 as any);
        const room2 = { key: 'testRoom2@testZone', zone: undefined, reset: jest.fn(), newTimeOfDay: jest.fn() };
        zone.addRoom(room2 as any);

        zone.newTimeOfDay(TimeOfDay.AFTERNOON);

        expect(room1.reset).toBeCalledWith();
        expect(room1.newTimeOfDay).toBeCalledWith(TimeOfDay.AFTERNOON);
        expect(room2.reset).toBeCalledWith();
        expect(room2.newTimeOfDay).toBeCalledWith(TimeOfDay.AFTERNOON);
      });
    });

    describe('tick', () => {
      test('calls tick on each room in zone', () => {
        const room1 = { key: 'testRoom1@testZone', zone: undefined, tick: jest.fn() };
        zone.addRoom(room1 as any);
        const room2 = { key: 'testRoom2@testZone', zone: undefined, tick: jest.fn() };
        zone.addRoom(room2 as any);

        zone.tick(27);

        expect(room1.tick).toBeCalledWith(27);
        expect(room2.tick).toBeCalledWith(27);
      });

      test('calls tick on each character in zone', () => {
        const char1 = { key: 'testKey@testZone', tick: jest.fn() };
        zone.addCharacter(char1 as any);
        const char2 = { key: 'testKey@testZone', tick: jest.fn() };
        zone.addCharacter(char2 as any);

        zone.tick(27);

        expect(char1.tick).toBeCalledWith(27);
        expect(char2.tick).toBeCalledWith(27);
      });
    });

    describe('toJson', () => {
      test('builds saved zone based on definition and rooms', () => {
        const room1 = { key: 'testRoom1@testZone', zone: undefined, toJson: jest.fn().mockReturnValue({ key: 'testRoom1@testZone' }) };
        zone.addRoom(room1 as any);
        const room2 = { key: 'testRoom2@testZone', zone: undefined, toJson: jest.fn().mockReturnValue({ key: 'testRoom2@testZone' }) };
        zone.addRoom(room2 as any);

        const savedZone = zone.toJson();

        expect(savedZone).toEqual({
          key: zone.key,
          zoneName: zone.zoneName,
          rooms: [{ key: 'testRoom1@testZone' }, { key: 'testRoom2@testZone' }],
        });
        expect(room1.toJson).toBeCalledWith();
        expect(room2.toJson).toBeCalledWith();
      });
    });

    describe('toStorage', () => {
      test('writes saved zone based on definition and rooms to json file', () => {
        const room1 = { key: 'testRoom1@testZone', zone: undefined, toJson: jest.fn().mockReturnValue({ key: 'testRoom1@testZone' }) };
        zone.addRoom(room1 as any);
        const room2 = { key: 'testRoom2@testZone', zone: undefined, toJson: jest.fn().mockReturnValue({ key: 'testRoom2@testZone' }) };
        zone.addRoom(room2 as any);

        zone.toStorage();

        expect(fs.writeFileSync).toBeCalledWith('data/dumps/testZone.json', expect.any(String), { encoding: 'utf-8' });
        const savedZone = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
        expect(savedZone).toEqual({
          key: zone.key,
          zoneName: zone.zoneName,
          rooms: [{ key: 'testRoom1@testZone' }, { key: 'testRoom2@testZone' }],
        });
        expect(room1.toJson).toBeCalledWith();
        expect(room2.toJson).toBeCalledWith();
      });
    });

    describe('fromStorage', () => {
      test('loads saved zone from storage if it exists', () => {
        const room1Data = { key: 'testRoom1@testZone' };
        const room3Data = { key: 'testRoom3@testZone' };
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(
          JSON.stringify({
            key: 'testZone',
            zoneName: 'Test zone',
            rooms: [room1Data, room3Data],
          })
        );

        const savedZone = zones.Zone.fromStorage('testZone');

        expect(savedZone).toEqual({
          key: 'testZone',
          zoneName: 'Test zone',
          rooms: [{ key: 'testRoom1@testZone' }, { key: 'testRoom3@testZone' }],
        });
      });

      test('returns undefined if file not found', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        expect(zones.Zone.fromStorage('testZone')).toBeUndefined();
      });
    });

    describe('toString', () => {
      test('returns styled name', () => {
        expect(zone.toString()).toEqual('<R>Test zone<n>');
      });
    });
  });
});
