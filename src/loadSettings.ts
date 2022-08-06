export const loadSettings = () => {
  const settingsIndex = process.argv.findIndex((arg) => arg === '--settings');
  if (settingsIndex === -1) {
    throw new Error('Invalid --settings argument (--settings argument missing)');
  }

  const settingsFile = process.argv[settingsIndex + 1];
  if (!settingsFile) {
    throw new Error('Invalid --settings argument (no filename after --settings)');
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const settings = require(settingsFile);
  if (!settings) {
    throw new Error('Invalid --settings argument (file not found)');
  }

  return settings;
};
