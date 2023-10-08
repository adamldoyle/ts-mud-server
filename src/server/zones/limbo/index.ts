import { getGameServerSafely } from '@server/GameServerInstance';
import { Zone } from '@core/entities/zone';
import { registerRooms } from './rooms';

export const registerZone = () => {
  const gameServer = getGameServerSafely();

  const zone = new Zone({ key: 'limbo', zoneName: 'Limbo' });
  gameServer.catalog.registerZone(zone);
  registerRooms(zone);
};
