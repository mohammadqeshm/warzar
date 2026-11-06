/* Ordered module manifest. Every game file is a classic IIFE that attaches to window.WZ (no imports/exports),
 * so this list is the equivalent of the ordered <script> tags. Order matters. */
import './three-global.js';
import './game.css';

import './config.js';
import './rng.js';
import './events.js';
import './util.js';
import './platform.js';
import './save.js';
import './i18n.js';
import './audio.js';
import './assets.js';

import './art/geo.js';
import './art/textures.js';
import './art/props.js';
import './art/heroes.js';
import './art/vehicles.js';
import './art/enemies.js';

import './world/navgrid.js';
import './world/collision.js';
import './world/gen.js';
import './world/worldview.js';

import './systems/particles.js';
import './systems/input.js';
import './systems/camera.js';
import './systems/fx.js';
import './systems/quality.js';
import './systems/spawner.js';
import './systems/gun.js';
import './systems/missions.js';
import './systems/hazards.js';

import './entities/smallprops.js';
import './entities/crate.js';
import './entities/jeep.js';
import './entities/enemy.js';
import './entities/nana.js';

import './ui.js';
import './scenes/menu.js';
import './scenes/mission.js';
import './main.js';
