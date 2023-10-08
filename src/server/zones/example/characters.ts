import { Zone } from '@core/entities/zone';
import { getGameServerSafely } from '@server/GameServerInstance';
import { CharacterFlag } from '@core/entities/character';

export const registerCharacters = (zone: Zone) => {
  const gameServer = getGameServerSafely();
  const catalog = gameServer.catalog;

  catalog.registerCharacterDefinition(
    {
      key: 'dummy',
      name: 'Dummy',
      roomDescription: 'A mostly inanimate dummy is here.',
      description: 'A mostly inanimate dummy.',
      flags: [CharacterFlag.SENTINEL],
    },
    zone
  );
};
