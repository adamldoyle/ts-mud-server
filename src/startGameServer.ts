process.env.mudServiceName = 'game-server';
import { logger } from '@shared/Logger';
import { Instance } from '@server/GameServerInstance';
import { GameServer } from '@server/GameServer';
import { loadSettings } from './loadSettings';

let settings;
try {
  settings = loadSettings();
} catch (err) {
  logger.error(err);
  process.exit(1);
}

process.on('uncaughtException', function (err) {
  logger.error('Uncaught exception', err.stack);
  process.exit(1);
});

const saveGame = () => {
  logger.info('Saving game');
  getGameServerSafely().save();
};

const handleExit = async () => {
  logger.info('Shutting down game server');
  saveGame();
  process.exit(0);
};

process.once('SIGUSR2', () => {
  saveGame();
});

process.on('SIGINT', () => {
  handleExit();
});

const gameServer = new GameServer(settings);
Instance.gameServer = gameServer;
gameServer.start();
