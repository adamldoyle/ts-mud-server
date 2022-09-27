import { Zone } from '@core/entities/zone';
import { Instance } from '@server/GameServerInstance';
import { ItemFlag, ItemType } from '@core/entities/item';
import { BodyPosition } from '@server/modules/core/entities/equipment';

export const registerItems = (zone: Zone) => {
  if (!Instance.gameServer) {
    return;
  }

  const catalog = Instance.gameServer.catalog;

  catalog.registerItemDefinition(
    {
      key: 'helm',
      name: 'newbie helm',
      keywords: ['newbie', 'helm'],
      roomDescription: 'A basic helm is here.',
      description: 'You see a basic helm.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.HEAD],
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'armor',
      name: 'newbie armor',
      keywords: ['newbie', 'armor'],
      roomDescription: 'A set of basic armor is here.',
      description: 'You see a set of basic armor.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.TORSO],
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'bracers',
      name: 'newbie bracers',
      keywords: ['newbie', 'bracers'],
      roomDescription: 'A set of basic bracers are here.',
      description: 'You see a set of basic bracers.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.ARMS],
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'gloves',
      name: 'newbie gloves',
      keywords: ['newbie', 'gloves'],
      roomDescription: 'A set of basic gloves are here.',
      description: 'You see a set of basic gloves.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.HANDS],
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'leggings',
      name: 'newbie leggings',
      keywords: ['newbie', 'leggings'],
      roomDescription: 'A set of basic leggings are here.',
      description: 'You see a set of basic leggings.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.LEGS],
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'boots',
      name: 'newbie boots',
      keywords: ['newbie', 'boots'],
      roomDescription: 'A set of basic boots are here.',
      description: 'You see a set of basic boots.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.FEET],
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'cape',
      name: 'newbie cape',
      keywords: ['newbie', 'cape'],
      roomDescription: 'A basic cape is here.',
      description: 'You see a basic cape.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.ABOUT],
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'sword',
      name: 'newbie sword',
      keywords: ['newbie', 'sword'],
      roomDescription: 'A basic sword is here.',
      description: 'You see a basic sword.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.HELD_RIGHT, BodyPosition.HELD_LEFT],
      type: {
        type: ItemType.WEAPON,
        damage: '1d6',
      },
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'shield',
      name: 'newbie shield',
      keywords: ['newbie', 'shield'],
      roomDescription: 'A basic shield is here.',
      description: 'You see a basic shield.',
      flags: [ItemFlag.WEARABLE],
      wearSpots: [BodyPosition.HELD_RIGHT, BodyPosition.HELD_LEFT],
    },
    zone
  );
};
