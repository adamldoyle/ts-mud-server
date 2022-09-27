import { registerCommands as registerAdmin } from './admin';
import { registerCommands as registerCore } from './core';
import { registerCommands as registerCommunication } from './communication';
import { registerCommands as registerExploration } from './exploration';
import { registerCommands as registerItems } from './items';
import { registerCommands as registerBattle } from './battle';

export const registerCommands = () => {
  registerAdmin();
  registerCore();
  registerCommunication();
  registerExploration();
  registerItems();
  registerBattle();
};
