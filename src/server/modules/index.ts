import { registerCommands as registerAdmin } from './admin';
import { registerCommands as registerCore } from './core';
import { registerCommands as registerCommunication } from './communication';
import { registerCommands as registerExploration } from './exploration';
import { registerCommands as registerItems } from './items';

export const registerCommands = () => {
  registerAdmin();
  registerCore();
  registerCommunication();
  registerExploration();
  registerItems();
};
