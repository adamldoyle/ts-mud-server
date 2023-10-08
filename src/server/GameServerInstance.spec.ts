import { Instance, getCatalogSafely, getGameServerSafely } from './GameServerInstance';

describe('GameServerInstance', () => {
  describe('getGameServerSafely', () => {
    test('throws error if no game server registered with the Instance', () => {
      Instance.gameServer = undefined;

      expect(() => getGameServerSafely()).toThrowError();
    });

    test('returns game server registered with the Instance', () => {
      const gameServer = { gameServer: true } as any;
      Instance.gameServer = gameServer;
      expect(getGameServerSafely()).toEqual(gameServer);
    });
  });

  describe('getCatalogSafely', () => {
    test('throws error if no game server registered with the Instance', () => {
      Instance.gameServer = undefined;

      expect(() => getCatalogSafely()).toThrowError();
    });

    test('returns catalog from game server registered with the Instance', () => {
      const gameServer = { catalog: { catalog: true } } as any;
      Instance.gameServer = gameServer;
      expect(getCatalogSafely()).toEqual(gameServer.catalog);
    });
  });
});
