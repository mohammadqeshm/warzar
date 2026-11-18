/* Test the extracted upload over HTTP in a cross-origin, sandboxed iframe, not Vite/dev.
 * WZ_PLAYGAMA_DIR=/tmp/warzar-extracted WZ_PLAYWRIGHT=/path/to/playwright node tools/qa-playgama.cjs chromium
 * Repeat with webkit / firefox. Flags --stock (real local SDK only), --core, --layout, --scenes, --fullscreen, --assets, --failure.
 * Mocks are QA fixtures served in place of the Bridge file; the stock run always uses the real file.
 */
const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const engines = require(process.env.WZ_PLAYWRIGHT || 'playwright');
const dir = path.resolve(process.env.WZ_PLAYGAMA_DIR || path.join(__dirname, '../dist-playgama'));
const kind = process.argv[2] || 'chromium', stockOnly = process.argv.includes('--stock');
const key = 'warzar_crate_rush_save_v1';
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8'};
const nesting = '/u/qa/games/warzar-100/';
const wait = (f, fn, arg, timeout = 14000) => f.waitForFunction(fn, arg, {timeout,polling:90});
const click = (f, sel) => f.locator(sel).click({timeout:16000});

async function serve() {
  const server=http.createServer((req,res) => {
    const u = new URL(req.url,'http://localhost'), p=u.pathname;
    if (p.startsWith('/host')) {
      res.setHeader('Content-Type',MIME['.html']);
      res.end(`<!DOCTYPE html><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}</style><iframe title="Game" sandbox="allow-scripts allow-same-origin" allow="autoplay; fullscreen" allowfullscreen src="http://127.0.0.1:${server.address().port}${nesting}index.html${u.search}"></iframe>`);
      return;
    }
    if (p==='/outside') { res.setHeader('Content-Type',MIME['.html']); res.end('<!DOCTYPE html><title>Outside</title>'); return; }
    if(p==='/favicon.ico'){res.writeHead(204).end();return;}
    const rel=p.startsWith(nesting)&&p.slice(nesting.length);
    if(!rel || !/^(?:[\w.-]+\/)*[\w.-]+$/.test(rel)){res.writeHead(404).end();return;}
    const full=path.resolve(dir,rel);
    if(!full.startsWith(dir+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404).end();return;}
    const info=fs.statSync(full);
    res.writeHead(200,{ 'Content-Type':MIME[path.extname(rel)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store' });
    fs.createReadStream(full).pipe(res);
  });
  await new Promise((r) => server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  return {server,host:`http://localhost:${port}`,game:`http://127.0.0.1:${port}${nesting}`};
}

function makeMock(o) {
  const qa = window.qaMock = {events:[],localeReads:0,reads:0,writes:0,initCalls:0,adCalls:[],held:o.paused,muted:o.muted,initDone:false,failInit:o.failInit,failStorage:o.failStorage};
  const ls=window.localStorage; // mock host implementation, not game code
  const H=Object.getOwnPropertyDescriptor(Document.prototype,'hidden').get.bind(document);
  let hidden=false;
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden||H()});
  qa.hide=(state)=>{hidden=state;document.dispatchEvent(new Event('visibilitychange'));};
  if(o.save && !ls.getItem(o.key)) ls.setItem(o.key,JSON.stringify(o.save));
  const listeners=new Map();
  const emit=(ev,data)=>listeners.get(ev)?.(data), on=(ev,fn)=>listeners.set(ev,fn);
  const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
  const saved=()=>ls.getItem(o.key);
  qa.saved=()=>JSON.parse(saved()||'null');
  qa.audio=(state)=>{qa.muted=!state;emit('audio_state_changed',state);};
  qa.pause=(state)=>{qa.held=state;emit('pause_state_changed',state);};
  qa.ad=(type,state)=>{window.bridge.advertisement[type+'State']=state;emit(type+'_state_changed',state);};
  const runAd=(type,placement)=>{
    qa.adCalls.push([type,placement]);
    if (type==='rewarded') window.bridge.advertisement.rewardedPlacement=placement;
    qa.ad(type,'loading');
    const how=qa.behavior || 'failed';
    if(how==='throw'){qa.ad(type,'failed');throw Error('Fixture failure');}
    if(how==='stuck') return;
    if(how==='held'){qa.ad(type,'opened');return;}
    qa.ad(type,how==='closed'?'closed':'failed');
  };
  window.bridge={
    isInitialized:false,
    async initialize(){ qa.initCalls++; if(o.initDelay) await sleep(o.initDelay); if(qa.failInit)throw Error('Fixture offline'); this.isInitialized=true;qa.initDone=true; },
    platform:{ id:'playgama',get language(){qa.localeReads++;return o.locale||'en-US';},get isAudioEnabled(){return !qa.muted;},get isPaused(){return qa.held;},on,
      sendMessage(msg,data){
        const l=document.querySelector('#wz-load'), b=document.querySelector('#btn-play');
        qa.events.push({msg,data,readyUI:!!l&&l.classList.contains('hidden')&&!!b&&!b.disabled&&!!b.offsetWidth,
           draws:window.WZ.Main.renderer.info.render.calls, coins:window.WZ.Save.data.coins,storageReads:qa.reads});
      }},
    storage:{
      async get(keys){if(!qa.initDone)throw Error('premature SDK use');qa.reads++; if(o.saveDelay) await sleep(o.saveDelay); if(qa.failStorage)throw Error('Fixture storage failure'); return keys.map((k)=>ls.getItem(k));},
      async set(keys,values){if(!qa.initDone)throw Error('premature write');qa.writes++;if(o.writeDelay) await sleep(o.writeDelay); keys.forEach((k,i)=>ls.setItem(k,values[i]));}
    },
    advertisement:{isInterstitialSupported:o.ads!==false,isRewardedSupported:o.ads!==false,interstitialState:'closed',rewardedState:'closed',on,
      showInterstitial(placement){runAd('interstitial',placement);},showRewarded(placement){runAd('rewarded',placement);}}
  };
  // No synth even on gameplay branches. Track source audio so the test can assert a real decoded sample plays.
  qa.samples=0;
  if(window.BaseAudioContext){const proto=BaseAudioContext.prototype, base=proto.createBufferSource;
    const decode=proto.decodeAudioData, known=new WeakSet();
    proto.createOscillator=proto.createPeriodicWave=()=>{throw Error('Runtime synthesis');};
    proto.decodeAudioData=function(b){return decode.call(this,b).then((a)=>{known.add(a);return a;});};
    proto.createBufferSource=function(){const s=base.call(this),start=s.start;s.start=function(...args){if(!known.has(s.buffer))throw Error('Untracked sample');qa.samples++;return start.apply(this,args);};return s;};
  }
}

const getFrame = (page, addr) => page.frames().find(f=>f.url().startsWith(addr.game)) || page.waitForEvent('framenavigated', {predicate:f=>f.url().startsWith(addr.game),timeout:15000});

async function open(browser, addr, opts={}) {
  const context=await browser.newContext({viewport:opts.viewport||{width:640,height:430},deviceScaleFactor:1,hasTouch:!!opts.touch,isMobile:!!opts.touch&&kind!=='firefox',locale:'de-DE',reducedMotion:'reduce'});
  const page=await context.newPage(), traffic=[], issues=[];
  page.on('pageerror',e=>issues.push(e.toString()));
  page.on('console',m=>{if(m.text().includes('[WARZAR] Audio asset unavailable'))issues.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)issues.push(`${r.status()} ${r.url()}`);});
  await page.route('**/*',async r=>{
    const u=r.request().url();
    if(!u.startsWith(addr.game)&&!u.startsWith(addr.host)&&!u.startsWith(addr.game.split(nesting)[0]+'/favicon.ico')){
      issues.push('external request: '+u);return r.abort();
    }
    traffic.push(u);
    if(opts.mock&&u.endsWith('/playgama-bridge.js'))return r.fulfill({contentType:MIME['.js'],body:`(${makeMock})(${JSON.stringify({key,...opts.mock})});`});
    return r.continue();
  });
  await page.goto(addr.host+'/host'+(opts.query||''),{waitUntil:'domcontentloaded'});
  const frame=await getFrame(page,addr);
  assert(frame,'game frame');
  return {context,page,frame,traffic,issues};
}
async function ready(f){await wait(f,()=>window.WZ?.Platform?._readySent && document.querySelector('#wz-load.hidden'),null,28000);}
async function menuAudio(f){await wait(f,()=>WZ.Audio.ctx?.state==='running'&&WZ.Audio.musicFile==='music_menu');}
async function missionAudio(f){await wait(f,()=>WZ.Audio.ctx?.state==='running'&&WZ.Audio.musicFile==='music_mission',null,22000).catch(async e=>{console.log('mission audio',await f.evaluate(()=>[WZ.Main.cur.name,WZ.Audio.ctx?.state,WZ.Audio.musicFile,WZ.Audio.blocked, WZ.Main.platformPaused, document.hidden, new Audio().canPlayType('audio/mpeg')]));throw e;});}
async function saved(f,expr){return wait(f,expr);}

async function stock(browser,addr){
  const {context,page,frame:f,issues,traffic}=await open(browser,addr,{query:'?debug=1&unlock=1&m=9&pkdebug=1'});
  try{
    await ready(f);
    const state=await f.evaluate(()=>({sdk:bridge.version,id:WZ.Platform.platformId,internal:WZ.Platform.bridge===bridge,initialized:bridge.isInitialized,open:WZ.Progress.allOpen,lang:document.documentElement.lang,scene:WZ.Main.cur.name,debug:WZ.UI.dbgOn,title:document.title,draws:WZ.Main.renderer.info.render.calls,mem:performance.memory?.usedJSHeapSize||null}));
    assert.equal(state.sdk,'2.4.3');assert.ok(state.internal&&state.initialized&&state.draws>0);
    assert.equal(state.open,false);assert.equal(state.debug,false);assert.equal(state.scene,'menu');assert.equal(state.title,'WARZAR: Crate Rush');
    await f.evaluate(()=>{WZ.Quality.auto=false;WZ.Quality.setLevel(0);WZ.MapPreview.cancel();});
    // Unsupported-offer visibility is checked in scenes() with the capability-controlled fixture.
    await click(f,'#btn-play'); await missionAudio(f);
    await click(f,'#btn-pause'); await click(f,'#btn-pause-mute'); await wait(f,()=>!WZ.Save._write);
    assert.equal(await f.evaluate(()=>WZ.Save.data.settings.sound),0);
    await page.reload({waitUntil:'domcontentloaded'}); const reload=await getFrame(page,addr); await ready(reload);
    assert.equal(await reload.evaluate(()=>WZ.Save.data.settings.sound),0,'real Bridge persists across reload');
    assert.ok(traffic.some(x=>x.endsWith('playgama-bridge-config.json')));assert.ok(traffic.some(x=>x.includes('/audio/music_mission-')));
    assert.deepEqual(issues,[]);
    console.log('PASS stock SDK / cross-origin iframe / actual reload / audio / disabled debug',JSON.stringify(state));
  }finally{await context.close();}
}

// Drive the seeded tutorial through the normal input, collision, combat, crate, and extraction
// code. Run fixed simulation steps so the pilot is independent of CI GPU frame rate. No relocation,
// health/stat adjustments, reward injection, debug commands, or calls to complete()/showResult().
async function firstWin(f){
  const result=await f.evaluate(()=>{
    const M=WZ.Scenes.mission,J=M.jeep,C=WZ.Cam,I=WZ.Input,dt=1/60;
    const crate=M.crates.list[0],exit=M.map.extract;
    let step=0;
    const tick=()=>{M.update(dt);if((++step%42)===0)M.render(1,.12);};
    const range=t=>Math.hypot(t.x-J.x,t.z-J.z);
    const steer=(target,dist,direct=false)=>{
      const nav=WZ.NavGrid.build(M.map,3);
      const points=direct||nav.los(J.x,J.z,target.x,target.z)?[target]:nav.path(J.x,J.z,target.x,target.z);
      if(!points?.length)throw Error('Pilot has no path to objective');
      points[points.length-1]=target;
      let i=0;
      for(let j=0;j<60*52&&M.phase==='play'&&range(target)>dist;j++){
        if(range(points[i])<7&&i<points.length-1)i++;
        const p=points[i],dx=p.x-J.x,dz=p.z-J.z,d=Math.hypot(dx,dz);
        if(d<.01)break;
        const s=Math.sin(C.yaw),c=Math.cos(C.yaw),k=Math.min(1,Math.max(.5,d/19));
        I.bot={x:(-c*dx+s*dz)/d*k,y:(s*dx+c*dz)/d*k};
        tick();
      }
      I.bot=null;
      return {range:range(target),waypoint:i,waypoints:points.length};
    };
    const approach=steer(crate,23,true);
    const accessible=()=>M.crates.nearestAvailable(J.x,J.z,WZ.CFG.nana.deployRadius);
    for(let i=0;i<540&&M.phase==='play'&&(!accessible()||J.speed>3);i++)tick();
    if(!accessible()||M.phase!=='play')throw Error('Crate unavailable: '+JSON.stringify({approach,range:range(crate),phase:M.phase,c:M.crates.list.map(c=>[c.state,c.locked])}));
    // Exercise the same Space handler as desktop, inside this tick to avoid overshooting before input.
    window.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));
    if(!I.pressed.deploy)throw Error('Space did not reach the mission input');
    tick();
    window.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));
    if(!M.deployedOnce)throw Error('Mission did not deploy Nana');
    for(let i=0;i<900&&M.phase==='play'&&!(M.landed===1&&M.nana.state==='IN_JEEP');i++){
      tick();
      // The crate's short landing animation notifies the mission from its real render step.
      if(crate.state==='flying')M.render(1,.06);
    }
    if(M.landed!==1||M.nana.state!=='IN_JEEP')throw Error('Crate not boarded: '+JSON.stringify({approach,state:M.nana.state,phase:M.phase,landed:M.landed,crate:crate.state,landing:crate.ft,range:range(crate),timer:M.timeLeft}));
    const extraction=steer(exit,10.5);
    if(M.endKind!=='complete'||WZ.Save.data.prog.village[0]<1)throw Error('Extraction did not trigger: '+JSON.stringify({extraction,phase:M.phase,end:M.endKind,xy:[J.x,J.z],seconds:M.timeLeft}));
    return {approach,extraction,missionSeconds:M.time,landed:M.landed};
  });
  console.log('  real tutorial approach, guardian, pickup/boarding and extraction:',JSON.stringify(result));
}

async function core(browser,addr){
  const {context,page,frame:f,issues,traffic}=await open(browser,addr,{mock:{locale:'en-US',muted:true,paused:true,initDelay:1700,saveDelay:1100,writeDelay:190,save:{settings:{quality:'low'}}},query:'?m=10&unlock=1&debug=1'});
  try{
    await wait(f,()=>!!window.qaMock&&!qaMock.initDone);
    assert(!traffic.some(u=>/\/assets\/main|\/audio\//.test(u)));assert.equal(await f.evaluate(()=>window.WZ),undefined);
    await wait(f,()=>window.qaMock.reads===1);assert.equal(await f.locator('#btn-play').count(),0,'DOM withheld while save loads');
    await ready(f);
    const info=await f.evaluate(()=>({e:qaMock.events.filter(x=>x.msg==='game_ready'),init:qaMock.initCalls,writes:qaMock.writes,paused:WZ.Main.platformPaused,muted:WZ.Audio.platformMuted,localeReads:qaMock.localeReads}));
    assert.equal(info.init,1);assert.equal(info.localeReads,1);assert.equal(info.e.length,1);assert.equal(info.e[0].storageReads,1);assert(info.e[0].readyUI&&info.e[0].draws>0);assert(info.paused&&info.muted);
    assert.equal(info.writes,0);assert(!traffic.some(u=>u.includes('/audio/')),'no audio download when initially host-muted');
    // A reproducible, legitimately generated layout; only steer through normal inputs after Start.
    await f.evaluate(()=>{qaMock.pause(false);qaMock.audio(true);WZ.Save.newRunSeed=()=>219;});
    await click(f,'#btn-play'); await wait(f,()=>WZ.Scenes.mission.phase==='play'&&WZ.Scenes.mission.mission.tutorial); await missionAudio(f);
    await page.keyboard.press('Escape');assert.equal(await f.evaluate(()=>WZ.Main.paused),false);
    const t0=await f.evaluate(()=>WZ.Scenes.mission.timeLeft);
    await page.keyboard.press('p');await f.locator('#btn-resume').waitFor({timeout:5000});
    try{await wait(f,()=>WZ.Audio.master.gain.value===0&&WZ.Audio.ctx.state==='suspended');}catch(e){console.log(await f.evaluate(()=>[WZ.Audio.ctx.state,WZ.Audio.master.gain.value,WZ.Main.paused]));throw e;}
    const at=await f.evaluate(()=>WZ.Scenes.mission.timeLeft);assert(t0-at<3);
    await f.evaluate(()=>{qaMock.hide(true);qaMock.ad('rewarded','opened');qaMock.pause(true);qaMock.audio(false);});
    await page.setViewportSize({width:480,height:480});
    await wait(f,()=>WZ.Main.w===480&&WZ.Main.h===480);
    await f.evaluate(()=>{qaMock.hide(false);qaMock.pause(false);qaMock.ad('rewarded','closed');qaMock.audio(true);});
    assert.equal(await f.evaluate(()=>WZ.Main.userPaused),true);
    assert.equal(await f.evaluate(()=>WZ.Scenes.mission.timeLeft),at);
    await click(f,'#btn-resume');await missionAudio(f);
    assert(await f.evaluate(()=>qaMock.samples>0));
    await firstWin(f);
    await saved(f,()=>qaMock.saved()?.prog?.village?.[0]>0&&qaMock.saved().coins>0);
    await f.locator('#btn-sum-main').waitFor({timeout:17000});
    const won=await f.evaluate(()=>({coins:WZ.Save.data.coins,p:WZ.Progress.current('village'),landed:WZ.Scenes.mission.landed,secs:WZ.Scenes.mission.time,ad:document.querySelector('#btn-sum-ad span').textContent}));
    assert.equal(won.landed,1);assert.equal(won.p,2);
    const bonus=+won.ad.match(/\+(\d+)/)[1];
    await f.evaluate(()=>{qaMock.behavior='held';});
    await click(f,'#btn-sum-ad');
    await wait(f,()=>WZ.Main.platformPaused&&WZ.Audio.master.gain.value===0);
    await f.evaluate(()=>qaMock.ad('rewarded','closed'));
    await wait(f,()=>!document.querySelector('#btn-sum-ad').disabled);assert.equal(await f.evaluate(()=>WZ.Save.data.coins),won.coins);
    await click(f,'#btn-sum-ad');
    await f.evaluate(()=>{qaMock.ad('rewarded','rewarded');qaMock.ad('rewarded','rewarded');});
    assert.equal(await f.evaluate(()=>WZ.Save.data.coins),won.coins+bonus,'earned before close, once only');
    assert.equal(await f.evaluate(()=>WZ.Main.platformPaused),true,'still paused until close');
    await f.evaluate(()=>qaMock.ad('rewarded','closed'));
    await wait(f,()=>!document.querySelector('#btn-sum-ad'));
    assert.equal(await f.evaluate(()=>WZ.Save.data.coins),won.coins+bonus);
    assert.equal(await f.locator('#sum-wallet-val').textContent(),String(won.coins+bonus));
    assert.equal(await f.locator('#sum-wallet-val').getAttribute('data-count'),null,'earned balance cancels pending count-up');
    await f.evaluate(()=>{qaMock.behavior='failed';});
    await click(f,'#btn-sum-main');await f.locator('#btn-go').waitFor({timeout:14000});
    assert.equal(await f.evaluate(()=>WZ.Scenes.mission.data.level),2);
    assert.deepEqual(await f.evaluate(()=>qaMock.adCalls),[['rewarded','bonus_coins'],['rewarded','bonus_coins'],['interstitial','level_completed']]);
    await saved(f,()=>qaMock.saved()?.coins===WZ.Save.data.coins);
    await page.reload({waitUntil:'domcontentloaded'}); const f2=await getFrame(page,addr);await ready(f2);
    assert.equal(await f2.evaluate(()=>WZ.Progress.current('village')),2);assert.equal(await f2.evaluate(()=>WZ.Save.data.coins),won.coins+bonus);
    assert.deepEqual(issues,[]);
    console.log('PASS delayed init/save / ready order / pause gates / real Level 1 win / skipped or earned reward / no-fill to level 2 / reload',JSON.stringify(won));
  }finally{await context.close();}
}

async function failures(browser,addr){
  for(const opts of [{failInit:true},{failStorage:true,locale:'ru'}]){
    const {context,frame:f,traffic}=await open(browser,addr,{mock:opts});
    try{
      await f.locator('#wz-start-retry').waitFor({timeout:14000});
      assert.equal(await f.locator('#btn-play').count(),0);
      assert.equal(await f.evaluate(()=>qaMock.writes),0);
      if(opts.failInit)assert(!traffic.some(u=>/\/assets\/main|\/audio\//.test(u)));
      if(opts.failStorage)assert.match(await f.locator('#wz-start-status').textContent(),/Попробуйте/);
    }finally{await context.close();}
  }
  console.log('PASS init or save failure: visible retry and no premature game/overwritten save');
}

async function bounds(f, sels){
  return f.evaluate((sels)=>{
    const bad=[];
    for(const sel of sels){const e=document.querySelector(sel);if(!e){bad.push('missing '+sel);continue;}const r=e.getBoundingClientRect();if(!e.offsetWidth||r.left< -2||r.top< -2||r.right>innerWidth+2||r.bottom>innerHeight+2)bad.push(`${sel} ${[r.left,r.top,r.right,r.bottom].map(x=>Math.round(x))}`);}
    if (document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)bad.push('page scroll');
    const a=document.querySelector('#wz-root')?.getBoundingClientRect(), c=document.querySelector('#wz-canvas')?.getBoundingClientRect();
    if(!a||!c||Math.abs(a.width-innerWidth)>1||Math.abs(a.height-innerHeight)>1||Math.abs(c.width-a.width)>1||Math.abs(c.height-a.height)>1)bad.push('not full viewport');
    return bad;
  },sels);
}
async function layout(browser,addr){
  const {context,page,frame:f,issues}=await open(browser,addr,{touch:true,viewport:{width:360,height:640},mock:{locale:'ru-RU',ads:true,save:{coins:7000,inv:{mines:0},flags:{tutorialDone:true},settings:{sound:0,quality:'low'}}}});
  const tap=(selector)=>f.locator(selector).tap({timeout:14000});
  const sizes=[[320,440],[360,640],[393,740],[320,320],[600,600],[568,320],[740,393],[1120,740]];
  const viewport=async(width,height)=>{ await page.setViewportSize({width,height});
    await wait(f,([w,h])=>innerWidth===w&&innerHeight===h&&Math.abs(WZ.Main.w-w)<=1&&Math.abs(WZ.Main.h-h)<=1,[width,height],16000).catch(async e=>{console.log('resize',width,height,await f.evaluate(()=>[innerWidth,innerHeight,WZ.Main.w,WZ.Main.h,document.documentElement.clientWidth,document.documentElement.clientHeight,visualViewport?.height]));throw e;});
    await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))); };
  try{
    await ready(f); console.log('  Russian viewport initialized'); assert.equal(await f.evaluate(()=>document.documentElement.lang),'ru');assert.match(await f.locator('#btn-play').innerText(),/ИГРАТЬ/);
    for(const [width,height] of sizes){
      await viewport(width,height);
      const check=async(sels)=>{const bad=await bounds(f,sels);assert.deepEqual(bad,[],`${kind} ${width}x${height}: ${bad.join(' ')}`);};
      await check(['#btn-play','#btn-maps','#btn-garage','#btn-mute','#logo-canvas']);
    }
    await viewport(320,440);
    await click(f,'#btn-maps');await wait(f,()=>!!document.querySelector('#ms-back'));assert.deepEqual(await bounds(f,['#ms-back','#ms-ok']),[]);await click(f,'#ms-back');
    await click(f,'#btn-garage');await f.locator('.shop-detail').waitFor({timeout:12000});
    assert.equal(await f.evaluate(()=>bridge.advertisement.isRewardedSupported),true);
    assert.equal(await f.locator('.shop .ad-btn, .shop [data-act=adcoins]').count(),0,'no rewarded offer in Shop even when the host supports it');
    for(const [width,height] of sizes){
      await viewport(width,height);
      const bad=await bounds(f,['[data-act=back]','#sh-coins','.dact-pinned .buy-single','.dact-pinned [data-act=wupgrade]']);assert.deepEqual(bad,[],`${width}x${height} ${bad.join(' ')}`);
    }
    await viewport(320,440);
    assert.equal(await f.locator('#sh-coins').textContent(),'7000');
    await tap('.shop .buy-single');
    assert.equal(await f.evaluate(()=>WZ.Save.data.inv.mines),1);
    const afterBuy=await f.evaluate(()=>WZ.Save.data.coins);
    assert(afterBuy<7000);assert.equal(await f.locator('#sh-coins').textContent(),String(afterBuy));
    await tap('.shop [data-act=wupgrade]');
    assert.equal(await f.evaluate(()=>WZ.Save.data.weaponLevels.mines),2);
    assert(await f.evaluate(()=>WZ.Save.data.coins)<afterBuy);
    assert.deepEqual(await f.evaluate(()=>qaMock.adCalls),[]);
    await tap('[data-act=back]');await tap('#btn-play');await f.locator('#btn-go').waitFor({timeout:14000});
    await f.evaluate(()=>{WZ.Main.platformPaused=true;});
    for(const [width,height] of sizes){await viewport(width,height);assert.deepEqual(await bounds(f,['#btn-go','#btn-brief-back']),[]);}
    await viewport(320,440); await tap('#btn-brief-back'); await tap('#btn-play');
    await f.evaluate(()=>{WZ.Main.platformPaused=false;}); await tap('#btn-go');
    assert.equal(await f.evaluate(()=>WZ.Scenes.mission.phase),'play');
    const before=await f.evaluate(()=>({x:WZ.Scenes.mission.jeep.x,z:WZ.Scenes.mission.jeep.z}));
    await f.evaluate(()=>{
      const z=document.querySelector('#wz-touch');
      for(const [type,dy] of [['pointerdown',0],['pointermove',-64]])z.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:17,pointerType:'touch',clientX:65,clientY:325+dy}));
    });
    await wait(f,({x,z})=>Math.hypot(x-WZ.Scenes.mission.jeep.x,z-WZ.Scenes.mission.jeep.z)>2,before);
    await f.evaluate(()=>document.querySelector('#wz-touch').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:17,pointerType:'touch'})));
    assert.equal(await f.evaluate(()=>WZ.Input._touchId),-1);
    const noLongPress=await f.evaluate(()=>['contextmenu','selectstart','dragstart'].every(type=>!document.querySelector('#wz-canvas').dispatchEvent(new Event(type,{bubbles:true,cancelable:true}))));assert(noLongPress);
    for(const [width,height] of sizes){
      await viewport(width,height);
      const bad=await bounds(f,['#btn-pause','#btn-deploy','#btn-boost','#btn-weapon','#hud-left','#hud-top']);assert.deepEqual(bad,[],`${width}x${height} ${bad.join(' ')}`);
    }
    await viewport(320,320);await tap('#btn-pause');await f.locator('#btn-resume').waitFor({timeout:11000});
    assert.deepEqual(await bounds(f,['#btn-resume','#btn-pause-mute','#btn-tomenu']),[]);await tap('#btn-resume');
    assert.deepEqual(issues,[]);
    console.log('PASS Russian menu/maps/shop/briefing/HUD/pause / no Shop ad despite host support; purchase and upgrade / touch input + cancellation / long-press event guards /',sizes.map(x=>x.join('x')).join(', '));
  }finally{await context.close();}
}

async function assets(browser,addr){
  const {checkAllClips}=require('./qa-audio.cjs');
  const {context,frame:f,traffic,issues}=await open(browser,addr,{mock:{muted:true,paused:true,save:{settings:{quality:'low'}}}});
  try{
    await ready(f);
    assert.equal(traffic.filter(u=>u.endsWith('.mp3')).length,0);
    assert.deepEqual(await checkAllClips(f),[]);
    const ids=new Set(traffic.filter(u=>u.endsWith('.mp3')));
    assert.equal(ids.size,88);
    assert.deepEqual(issues,[]);
    console.log('PASS 88 exact-archive MP3 files / decoded lengths, peaks and loop seams');
  }finally{await context.close();}
}

async function fullscreen(browser,addr){
  const {context,page,frame:f,issues}=await open(browser,addr,{mock:{save:{settings:{sound:0,quality:'low'}}}});
  try{
    await ready(f);
    const allowed=await f.evaluate(()=>!!(document.fullscreenEnabled&&document.documentElement.requestFullscreen));
    if(allowed){
      await click(f,'#btn-fullscreen'); await wait(f,()=>document.fullscreenElement===document.documentElement);
      assert.equal(await f.locator('#btn-fullscreen').getAttribute('aria-pressed'),'true');
      // Verify exit control/label independently of browser UI (headless Escape may not leave fullscreen).
      await click(f,'#btn-fullscreen'); await wait(f,()=>!document.fullscreenElement);
      assert.equal(await f.locator('#btn-fullscreen').getAttribute('aria-pressed'),'false');
    }else assert.equal(await f.locator('#btn-fullscreen').count(),0);
    await click(f,'#btn-play');
    const escape=await f.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',cancelable:true,bubbles:true})));
    assert.equal(escape,true);
    await page.keyboard.press('Escape');
    assert.equal(await f.evaluate(()=>WZ.Main.userPaused),false);
    assert.deepEqual(issues,[]);
    console.log('PASS Escape unbound; '+(allowed?'native fullscreen entry and exit button in permitted iframe':'fullscreen button hidden without browser support'));
  }finally{await context.close();}
}

async function scenes(browser,addr){
  const {context,page,frame:f,issues}=await open(browser,addr,{viewport:{width:600,height:410},mock:{ads:false,locale:process.argv.includes('--ru')?'ru':'es',save:{settings:{quality:'low',sound:0},flags:{tutorialDone:true}}}});
  try{
    await ready(f);
    const order=await f.evaluate(()=>WZ.CFG.maps.order);
    assert.equal(await f.evaluate(()=>document.documentElement.lang),process.argv.includes('--ru')?'ru':'en');
    // Fixtures test scene wiring and terminal states. Only --core claims an unforced mission clear.
    for(const [i,theme] of order.entries()){
      const meta=await f.evaluate(({theme,i})=>{
        qaMock.pause(true);WZ.MapPreview.cancel();
        const m=WZ.Scenes.mission, d=WZ.Save.data;
        for(const [j,name] of WZ.CFG.maps.order.entries()) if(j<i)d.prog[name].fill(3);
        WZ.Main.go('mission',{theme,level:5,runSeed:7919,tutorial:false});
        m.startPlay();m.camBlend=0;WZ.Cam.snap(m.jeep.rx,m.jeep.ry,m.jeep.rz);
        for(let k=0;k<60;k++)m.update(1/60);
        m.render(1,.016);
        return {theme:m.theme,level:m.data.level,crates:m.crates.list.length,guardians:WZ.Giants.list.length,draws:WZ.Main.renderer.info.render.calls};
      },{theme,i});
      assert(meta.theme===theme&&meta.level===5&&meta.crates===5&&meta.guardians===5&&meta.draws>0,JSON.stringify(meta));
      await f.evaluate(()=>{const m=WZ.Scenes.mission;m.fail('time');m.showResult();});
      assert.equal(await f.locator('#btn-sum-ad').count(),0);
      assert.deepEqual(await bounds(f,['#btn-sum-main','#btn-sum-menu','#btn-sum-shop']),[]);
      console.log('  rendered',JSON.stringify(meta));
    }
    await page.setViewportSize({width:320,height:320});
    await wait(f,()=>WZ.Main.w===320&&WZ.Main.h===320);
    assert.deepEqual(await bounds(f,['#btn-sum-main','#btn-sum-menu','#btn-sum-shop']),[]);
    await click(f,'#btn-sum-main');
    assert.equal(await f.evaluate(()=>WZ.Scenes.mission.phase),'briefing');
    assert.equal(await f.evaluate(()=>qaMock.adCalls.length),0);
    await click(f,'#btn-brief-back');await click(f,'#btn-garage');
    assert.equal(await f.locator('#sh-ad').count(),0);
    assert.deepEqual(issues,[]);
    console.log('PASS five shipped maps / render and update / failed results and retry / unsupported ads hidden');
  }finally{await context.close();}
}

async function launch(){
  const opts=kind==='chromium'?{args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']}:kind==='firefox'?{headless:!process.env.DISPLAY,firefoxUserPrefs:{'webgl.disabled':false,'webgl.force-enabled':true,'media.autoplay.default':0}}:{};
  return engines[kind].launch(opts);
}
module.exports={serve,open,launch,ready,wait,click};
if(require.main===module)(async()=>{
  const addr=await serve();let b;
  try{b=await launch();console.log(kind,b.version(),dir);
    if(process.argv.includes('--layout'))await layout(b,addr);
    else if(process.argv.includes('--failure'))await failures(b,addr);
    else if(process.argv.includes('--core'))await core(b,addr);
    else if(process.argv.includes('--assets'))await assets(b,addr);
    else if(process.argv.includes('--fullscreen'))await fullscreen(b,addr);
    else if(process.argv.includes('--scenes'))await scenes(b,addr);
    else {await stock(b,addr);if(!stockOnly)await core(b,addr);}
  }finally{if(b)await b.close();addr.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
