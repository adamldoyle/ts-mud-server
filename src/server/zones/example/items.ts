import { Zone } from '@core/entities/zone';
import { Instance } from '@server/GameServerInstance';
import { ItemFlag } from '@core/entities/item';
import { BodyPosition } from '@server/modules/core/entities/equipment';

export const registerItems = (zone: Zone) => {
  if (!Instance.gameServer) {
    return;
  }

  const catalog = Instance.gameServer.catalog;

  catalog.registerItemDefinition(
    {
      key: 'bobble',
      name: 'bobble',
      roomDescription: 'A bobble is lying on the ground.',
      description: 'You see a random bobble.',
    },
    zone
  );

  catalog.registerItemDefinition(
    {
      key: 'bit',
      name: '{texture} {color} bit',
      keywords: ['bit'],
      roomDescription: 'A {texture} {color} bit is here.',
      description: 'You see a {texture} {color} bit.',
      modifications: { texture: 'matte', color: 'green' },
      flags: [ItemFlag.CONTAINER],
    },
    zone
  );
};
