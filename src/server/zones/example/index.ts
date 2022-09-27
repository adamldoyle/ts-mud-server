import { Instance } from '@server/GameServerInstance';
import { Zone } from '@core/entities/zone';
import { registerRooms } from './rooms';
import { registerCharacters } from './characters';
import { registerItems } from './items';

export const registerZone = () => {
  if (!Instance.gameServer) {
    return;
  }

  const zone = new Zone({ key: 'example', zoneName: 'Example Zone' });
  Instance.gameServer.catalog.registerZone(zone);
  registerRooms(zone);
  registerCharacters(zone);
  registerItems(zone);
};
