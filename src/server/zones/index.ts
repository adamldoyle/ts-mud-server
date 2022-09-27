import { getGameServerSafely } from '@server/GameServerInstance';
import { registerZone as registerLimbo } from './limbo';
import { registerZone as registerExample } from './example';
import { registerZone as registerNewbie } from './newbie';

export const registerZones = () => {
  const gameServer = getGameServerSafely();

  registerLimbo();
  registerExample();
  registerNewbie();

  gameServer.catalog.getZones().forEach((zone) => {
    zone.finalize();
  });
};
