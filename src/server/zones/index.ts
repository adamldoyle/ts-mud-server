import { Instance } from '@server/GameServerInstance';
import { registerZone as registerLimbo } from './limbo';
import { registerZone as registerExample } from './example';

export const registerZones = () => {
  if (!Instance.gameServer) {
    return;
  }

  registerLimbo();
  registerExample();

  Instance.gameServer?.catalog.getZones().forEach((zone) => {
    zone.finalize();
  });
};
