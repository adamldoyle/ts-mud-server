import { getGameServerSafely } from '@server/GameServerInstance';
import { Zone } from '@core/entities/zone';
import { registerRooms } from './rooms';
import { registerCharacters } from './characters';
import { registerItems } from './items';

export const registerZone = () => {
  const gameServer = getGameServerSafely();

  const zone = new Zone({ key: 'example', zoneName: 'Example Zone' });
  gameServer.catalog.registerZone(zone);
  registerRooms(zone);
  registerCharacters(zone);
  registerItems(zone);
};
