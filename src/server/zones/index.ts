import { getGameServerSafely } from '@server/GameServerInstance';
import { registerZone as registerLimbo } from './limbo';
import { registerZone as registerExample } from './example';

export const registerZones = () => {
  const gameServer = getGameServerSafely();

  registerLimbo();
  registerExample();

  gameServer.catalog.getZones().forEach((zone) => {
    zone.finalize();
  });
};
