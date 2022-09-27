import { Instance } from '@server/GameServerInstance';
import { Zone } from '@core/entities/zone';
import { registerRooms } from './rooms';

export const registerZone = () => {
  if (!Instance.gameServer) {
    return;
  }

  const zone = new Zone({ key: 'limbo', zoneName: 'Limbo' });
  Instance.gameServer.catalog.registerZone(zone);
  registerRooms(zone);
};
