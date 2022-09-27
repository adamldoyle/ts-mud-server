import { Zone } from '@core/entities/zone';
import { Instance } from '@server/GameServerInstance';
import { CharacterFlag } from '@core/entities/character';

export const registerCharacters = (zone: Zone) => {
  if (!Instance.gameServer) {
    return;
  }

  const catalog = Instance.gameServer.catalog;

  catalog.registerCharacterDefinition(
    {
      key: 'kobold',
      name: 'Kobold',
      roomDescription: 'A growling kobold is here.',
      description: 'A growling kobold.',
      flags: [CharacterFlag.SENTINEL],
    },
    zone
  );
};
