import clone from 'just-clone';
import { logger } from '@shared/Logger';
import { Zone, buildZonedKey, splitZonedKey } from './zone';
import { Room } from './room';
import { Character, ICharacterDefinition } from './character';
import { Item, IItemDefinition } from './item';

export interface ICatalog {
  registerZone: (zone: Zone) => void;
  lookupZone: (key: string) => Zone | undefined;
  getZones: () => Zone[];
  lookupRoom: (rawKey: string, zone?: Zone) => Room | undefined;
  registerCharacterDefinition: (definition: ICharacterDefinition, zone: Zone) => void;
  lookupCharacterDefinition: (key: string, zone: Zone) => ICharacterDefinition | undefined;
  getCharacterDefinitions: (zone: Zone) => ICharacterDefinition[];
  loadCharacter: (key: string, zone: Zone, destination: Room) => Character;
  registerItemDefinition: (definition: IItemDefinition, zone: Zone) => void;
  getItemDefinitions: (zone: Zone) => IItemDefinition[];
  lookupItemDefinition: (key: string, zone: Zone) => IItemDefinition | undefined;
  loadItem: (key: string, zone: Zone, overloadDefinition?: Partial<IItemDefinition>) => Item;
}

export const createCatalog = (): ICatalog => {
  const zones: Record<string, Zone> = {};

  const registerZone = (zone: Zone): void => {
    if (zone.key.includes('@')) {
      throw new Error(`Key includes @: ${zone.key}`);
    }
    if (zones[zone.key]) {
      throw new Error(`Zone already loaded for key: ${zone.key}`);
    }

    zones[zone.key] = zone;
  };

  const lookupZone = (key: string): Zone | undefined => {
    if (!zones[key]) {
      return logger.error(`Zone not found for key: ${key}`);
    }
    return zones[key];
  };

  const getZones = (): Zone[] => {
    return Object.values(zones);
  };

  const lookupRoom = (rawKey: string, zone?: Zone): Room | undefined => {
    const zonedKey = zone ? buildZonedKey(rawKey, zone) : rawKey;
    const { zoneKey } = splitZonedKey(zonedKey);
    const room = lookupZone(zoneKey)?.rooms[zonedKey];
    if (!room) {
      return logger.error(`No room exists for key: ${rawKey}`);
    }
    return room;
  };

  const characterDefinitions: Record<string, ICharacterDefinition> = {};

  const registerCharacterDefinition = (definition: ICharacterDefinition, zone: Zone): void => {
    const key = buildZonedKey(definition.key, zone);
    definition.key = key;
    if (characterDefinitions[key]) {
      throw new Error(`Character key already used: ${key}`);
    }

    characterDefinitions[key] = definition;
  };

  const getCharacterDefinitions = (zone: Zone): ICharacterDefinition[] => {
    return Object.values(characterDefinitions).filter((character) => character.key.endsWith(`@${zone.key}`));
  };

  const lookupCharacterDefinition = (key: string, zone: Zone): ICharacterDefinition | undefined => {
    const zonedKey = buildZonedKey(key, zone);
    const definition = characterDefinitions[zonedKey];
    if (!definition) {
      return logger.error(`Unknown character: ${zonedKey}`);
    }
    return clone(definition);
  };

  const loadCharacter = (key: string, zone: Zone, destination: Room): Character => {
    const definition = lookupCharacterDefinition(key, zone);
    const zonedKey = buildZonedKey(key, zone);
    if (!definition) {
      throw new Error(`Unknown character: ${zonedKey}`);
    }
    const { zoneKey } = splitZonedKey(zonedKey);
    const actualZone = lookupZone(zoneKey);
    if (!actualZone) {
      // Should be impossible since character lookup succeeded
      throw new Error(`Unknown zone: ${zoneKey}`);
    }
    return new Character(definition, actualZone, destination);
  };

  const itemDefinitions: Record<string, IItemDefinition> = {};

  const registerItemDefinition = (definition: IItemDefinition, zone: Zone): void => {
    const key = buildZonedKey(definition.key, zone);
    definition.key = key;
    if (itemDefinitions[key]) {
      throw new Error(`Item key already used: ${key}`);
    }
    itemDefinitions[key] = definition;
  };

  const getItemDefinitions = (zone: Zone): IItemDefinition[] => {
    return Object.values(itemDefinitions).filter((item) => item.key.endsWith(`@${zone.key}`));
  };

  const lookupItemDefinition = (key: string, zone: Zone): IItemDefinition | undefined => {
    const zonedKey = buildZonedKey(key, zone);
    const definition = itemDefinitions[zonedKey];
    if (!definition) {
      return logger.error(`Unknown item: ${zonedKey}`);
    }
    return clone(definition);
  };

  const loadItem = (key: string, zone: Zone, overloadDefinition?: Partial<IItemDefinition>): Item => {
    const definition = lookupItemDefinition(key, zone);
    if (!definition) {
      throw new Error(`No item for key: ${key}`);
    }
    const zonedKey = buildZonedKey(key, zone);
    const { zoneKey } = splitZonedKey(zonedKey);
    const actualZone = lookupZone(zoneKey);
    if (!actualZone) {
      // Should be impossible since item lookup succeeded
      throw new Error(`No zone for key: ${zoneKey}`);
    }
    const item = new Item(
      { ...definition, ...overloadDefinition, modifications: { ...definition.modifications, ...overloadDefinition?.modifications } },
      actualZone
    );
    item.finalize();
    return item;
  };

  return {
    registerZone,
    lookupZone,
    getZones,
    lookupRoom,
    registerCharacterDefinition,
    lookupCharacterDefinition,
    getCharacterDefinitions,
    loadCharacter,
    registerItemDefinition,
    getItemDefinitions,
    lookupItemDefinition,
    loadItem,
  };
};
