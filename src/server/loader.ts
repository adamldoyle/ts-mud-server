import { catalog } from './modules/core/entities/catalog';
import './modules';
import './zones';

catalog.getZones().forEach((zone) => {
  zone.finalize();
});
