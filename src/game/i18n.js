/* WZ.I18n — all UI strings by key. English only in M1 (RU/ES/PT-BR/TR arrive in M4). No text is baked into images. */
(function (WZ) {
  'use strict';

  const dict = {
    en: {
      'logo.tag1': 'TWO SOLDIERS. ONE MISSION.',
      'logo.tag2': 'TOTAL CHAOS.',
      'logo.label': 'FUNNY. EPIC. UNPREDICTABLE.',
      'logo.slogan': 'WHERE STRATEGY MEETS STUPIDITY.',
      'menu.play': 'JOIN THE CHAOS!',
      'menu.level': 'LEVEL {n}',
      'menu.best': 'BEST: MISSION {n}',
      'menu.coins': 'COINS: {n}',
      'menu.hint.touch': 'One thumb to drive. One button to deploy Nana.',
      'menu.hint.keys': 'WASD / ARROWS drive · SPACE deploy Nana · SHIFT boost',
      'menu.sound.on': 'SOUND: ON', 'menu.sound.off': 'SOUND: OFF',

      'brief.mission': 'MISSION {n}',
      'brief.find': 'FIND {n} CRATES',
      'brief.time': 'TIME {t}',
      'brief.tutorial': 'TRAINING DAY',
      'brief.tip1': 'Stop near a crate, then DEPLOY Nana to fetch it.',
      'brief.tip2': 'Standing still makes the gun stronger... and attracts more enemies.',
      'brief.tip3': 'Slow down to pick Nana up. Keep her alive!',
      'brief.tip4': 'Ram weak enemies at full speed for a free KO.',
      'brief.tip5': 'Mines are buried around the map. Watch for blinking red lights!',
      'brief.tip6': 'A tornado is slower than your jeep. Boost away if it catches you!',
      'brief.tip7': 'Mines hide near roads. A red lamp on a post marks each one.',
      'hud.mines': 'MINEFIELD AHEAD!', 'hud.tornado': 'TORNADO! KEEP AWAY!', 'hud.tornadoEscape': 'CAUGHT! BOOST OUT!',
      'brief.go': 'GO!',

      'hud.crates': 'CRATES',
      'hud.deploy': 'DEPLOY', 'hud.recall': 'RECALL', 'hud.boost': 'BOOST',
      'hud.pause': 'PAUSE', 'hud.heat': 'HEAT', 'hud.nana': 'NANA', 'hud.jeep': 'JEEP',
      'hud.obj.find': 'FIND THE CRATES',
      'hud.obj.extract': 'DRIVE TO THE GREEN ZONE',
      'hud.obj.nana': 'PICK UP NANA!',
      'hud.nocrate': 'NO CRATE NEARBY - DRIVE CLOSER',
      'hud.slow': 'SLOW DOWN TO PICK UP NANA!',
      'hud.wait': 'WAIT FOR NANA...',
      'hud.rescue': 'STOP NEXT TO NANA TO REVIVE HER!',
      'hud.key.deploy': 'SPACE', 'hud.key.boost': 'SHIFT',
      'hud.delivered': 'CRATE LOADED!',
      'hud.nanako': 'NANA KO!  -{s}s',
      'hud.bonk': 'BONK!', 'hud.ram': 'RAM!',
      'hud.lowtime': 'HURRY!',

      'tut.drive': 'DRIVE TO THE GLOWING CRATE',
      'tut.deploy': 'GET CLOSE... THEN TAP DEPLOY!',
      'tut.defend': 'NANA IS ON IT - DEFEND HER!',
      'tut.next': 'NICE! NOW THE NEXT CRATE',
      'tut.extract': 'ALL LOADED! REACH THE GREEN ZONE',
      'tut.stick.touch': 'Drag on the left side to steer',
      'tut.stick.keys': 'WASD / ARROWS to steer',

      'pause.title': 'PAUSED', 'pause.resume': 'RESUME', 'pause.restart': 'RESTART RUN', 'pause.menu': 'MAIN MENU',
      'pause.shake.on': 'SCREEN SHAKE: ON', 'pause.shake.off': 'SCREEN SHAKE: OFF',

      'sum.complete': 'MISSION COMPLETE!',
      'sum.failed': 'MISSION FAILED',
      'sum.runover': 'RUN OVER',
      'sum.fail.time': "TIME'S UP!",
      'sum.fail.jeep': 'THE JEEP GAVE UP!',
      'sum.reached': 'YOU REACHED MISSION {n}',
      'sum.crates': 'CRATES', 'sum.kos': 'KO\'S', 'sum.timeleft': 'TIME LEFT',
      'sum.coins.crates': 'CRATE COINS', 'sum.coins.done': 'MISSION BONUS', 'sum.coins.time': 'TIME BONUS', 'sum.coins.total': 'TOTAL COINS',
      'sum.newrecord': 'NEW RECORD!',
      'sum.next': 'NEXT MISSION', 'sum.retry': 'NEW RUN', 'sum.menu': 'MAIN MENU',
      'hud.turret': 'DEFENSE', 'hud.key.turret': 'T', 'hud.turretCd': 'DEFENSE RECHARGING', 'hud.turretMax': 'DEFENSE LIMIT REACHED', 'hud.turretBlocked': 'NO ROOM HERE', 'hud.turretOn': 'DEFENSE ONLINE',
      'brief.tip9': 'Press T (or DEFENSE) to drop an automatic gun turret next to you. It guards the spot for 30 seconds.',
      'hud.mine': 'MINE', 'hud.key.mine': 'F', 'hud.nomines': 'NO MINES - BUY MORE IN THE SHOP', 'hud.maxmines': 'TOO MANY MINES PLANTED', 'hud.planted': 'MINE PLANTED', 'hud.combo': 'COMBO!',
      'brief.tip8': 'Buy landmines in the Shop, then press F (or tap MINE) to plant one behind you.',
      'shop.title': 'SHOP', 'shop.back': 'BACK', 'shop.buy': 'BUY', 'shop.equip': 'EQUIP', 'shop.equipped': 'EQUIPPED', 'shop.owned': 'OWNED', 'shop.need': 'NEED {n} MORE COINS',
      'shop.speed': 'SPEED', 'shop.armor': 'ARMOR', 'shop.handling': 'HANDLING', 'shop.ram': 'RAMMING', 'shop.mines': 'LANDMINES', 'shop.stock': 'IN STOCK {n}', 'shop.full': 'STOCK FULL',
      'shop.mines.how': 'Press F (or tap MINE) to plant one behind your vehicle. Any enemy that steps on it blows up, along with everyone nearby. Used mines are gone for good; unused ones carry over to the next mission.',
      'shop.drag': 'HOLD AND DRAG TO ROTATE',
      'sum.keptcoins': 'Coins from delivered crates are kept.',

      'hud.heavy': 'CANNON', 'hud.key.heavy': 'H', 'hud.heavyOn': 'CANNON ONLINE',
      'hud.noturrets': 'NO TURRETS - BUY MORE IN THE SHOP', 'hud.noheavy': 'NO CANNONS - BUY MORE IN THE SHOP',
      'hud.nanadead': 'NANA IS DOWN!',
      'hud.mine1': 'MINE HIT! HALF YOUR ARMOR IS GONE - ONE MORE AND IT IS OVER!',
      'hud.rush': 'NANA IS EXPOSED - ENEMIES ARE RUSHING HER!',
      'hud.stronger': 'THE ENEMY GROWS STRONGER!',
      'sum.fail.nana': 'NANA DID NOT MAKE IT!',
      'sum.fail.mine': 'TWO MINES - THE JEEP IS GONE!',
      'sum.fail.barrel': 'BLOWN UP BY A RED BARREL!',
      'sum.fail.pit': 'FELL INTO A DEEP PIT!',
      'hud.barrel': 'RED BARREL!',
      'hud.pitfall': 'FELL IN A PIT!',
      'hud.level': 'LVL {n}',
      'shop.defense': 'DEFENSE', 'shop.turret': 'GUN TURRET', 'shop.heavy': 'HEAVY CANNON', 'shop.tech': 'DEFENSE TECH',
      'shop.turret.how': 'Press T (or tap DEFENSE) to drop an automatic twin-gun turret next to your vehicle. It shoots the nearest enemy for about 30 seconds, then packs up. Each deployment uses one turret from your stock.',
      'shop.heavy.how': 'Press H (or tap CANNON) to drop a heavy cannon. Slow fire, but every shell explodes and hurts a whole group. Only one at a time. Each deployment uses one from your stock.',
      'shop.tech.how': 'Permanent upgrade for ALL turrets: more damage, longer lifetime and faster fire.',
      'shop.tech.lvl': 'LEVEL {n}/{m}', 'shop.tech.max': 'MAX LEVEL', 'shop.upgrade': 'UPGRADE',
      'shop.dmg': 'DAMAGE', 'shop.life': 'LIFETIME', 'shop.rate': 'FIRE RATE', 'shop.range': 'RANGE', 'shop.splash': 'SPLASH',
      'brief.tip10': 'Beware: the moment Nana leaves the jeep, enemies rush faster and shoot at her. If Nana dies, the run is over!',
      'brief.tip11': 'Two mines kill the jeep. The first one takes half of its armor.',
      'brief.tip12': 'Enemies grow stronger every mission - and every half minute inside one. Buy turrets in the Shop!',

      'load.title': 'LOADING...',
      'dbg.skip': 'SKIP MISSION',
    },
  };

  const I = {
    lang: 'en',
    dict,
    init() {
      const want = (WZ.Save && WZ.Save.data.settings.lang !== 'auto') ? WZ.Save.data.settings.lang : WZ.Platform.language();
      I.lang = dict[want] ? want : 'en';
    },
    t(key, vars) {
      let s = (dict[I.lang] && dict[I.lang][key]) || dict.en[key] || key;
      if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
      return s;
    },
  };

  WZ.I18n = I;
  WZ.t = I.t;
})(window.WZ = window.WZ || {});
