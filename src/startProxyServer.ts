process.env.mudServiceName = 'proxy-server';
import { ProxyServer, Instance } from '@proxy/ProxyServer';
import { logger } from '@shared/Logger';
import { loadSettings } from './loadSettings';

let settings;
try {
  settings = loadSettings();
} catch (err) {
  logger.error(err);
  process.exit(1);
}

process.on('uncaughtException', function (err) {
  logger.error('Uncaught exception:', err.stack);
  process.exit(1);
});

const handleExit = async () => {
  logger.info('Shutting down proxy server');
  process.exit(0);
};

process.on('SIGINT', handleExit);

const proxyServer = new ProxyServer(settings);
Instance.proxyServer = proxyServer;
proxyServer.start();
