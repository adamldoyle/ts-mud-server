import { Instance } from '@server/GameServerInstance';
import { registerZone as registerLimbo } from './limbo';

export const registerZones = () => {
  if (!Instance.gameServer) {
    return;
  }

  registerLimbo();

  Instance.gameServer?.catalog.getZones().forEach((zone) => {
    zone.finalize();
  });
};
