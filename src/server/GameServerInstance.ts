import { GameServer } from './GameServer';
import { ICatalog } from '@core/entities/catalog';

export const Instance: { gameServer?: GameServer } = {
  gameServer: undefined,
};

export const getGameServerSafely = (): GameServer => {
  if (!Instance.gameServer) {
    throw new Error('Referencing gameServer before initialization');
  }
  return Instance.gameServer;
};

export const getCatalogSafely = (): ICatalog => {
  const server = getGameServerSafely();
  return server.catalog;
};
