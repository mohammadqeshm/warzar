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
import './progress.js';
import './i18n.js';
import './audio.js';
import './assets.js';

import './art/geo.js';
import './art/textures.js';
import './art/props.js';
import './art/heroes.js';
import './art/vehicles.js';
import './art/vehicles_extra.js';
import './art/enemies.js';
import './art/dino.js';
import './art/jurassic.js';
import './art/volcanic.js';
import './art/magma.js';
import './art/frozen.js';
import './art/harbor.js';
import './art/mech.js';

import './world/navgrid.js';
import './world/collision.js';
import './world/gen.js';
import './world/gen_jurassic.js';
import './world/gen_volcanic.js';
import './world/gen_frozen.js';
import './world/gen_harbor.js';
import './world/worldview.js';

import './systems/particles.js';
import './systems/input.js';
import './systems/camera.js';
import './systems/fx.js';
import './systems/quality.js';
import './systems/spawner.js';
import './systems/gun.js';
import './systems/missions.js';
import './systems/fire.js';
import './systems/hazards.js';
import './systems/volcano.js';
import './systems/frost.js';
import './systems/harbor.js';
import './systems/landmines.js';
import './systems/turrets.js';
import './systems/soldiers.js';
import './systems/bullets.js';
import './systems/heli.js';
import './systems/tanks.js';
import './systems/jets.js';
import './systems/pickups.js';
import './systems/weapons.js';

import './entities/smallprops.js';
import './entities/crate.js';
import './entities/jeep.js';
import './entities/enemy.js';
import './entities/giant.js';
import './entities/nana.js';

import './ui.js';
import './scenes/mapview.js';
import './scenes/menu.js';
import './scenes/shop.js';
import './scenes/mission.js';
import './main.js';
