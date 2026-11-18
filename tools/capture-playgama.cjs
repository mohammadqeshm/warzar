/* Capture the release itself. Uses the renderer and shipped art, not generated substitute screenshots.
 * Usage: WZ_PLAYGAMA_DIR=... WZ_PLAYWRIGHT=... node tools/capture-playgama.cjs chromium /path/to/raw
 */
const fs=require('node:fs'),path=require('node:path');
const {serve,open,launch,ready}=require('./qa-playgama.cjs');
const out=path.resolve(process.argv[3]||'playgama-captures'); fs.mkdirSync(out,{recursive:true});
const dataFile = (name, url) => fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(url.split(',')[1],'base64'));
(async()=>{
  const addr=await serve();let browser;
  const cap=async()=>{
    const {context,page,frame:f}=await open(browser,addr,{viewport:{width:960,height:540},mock:{ads:false,paused:true,save:{coins:730,settings:{quality:'med',sound:0}}}});
    try{
      await ready(f);
      const shapes=[['landscape',1920,1080],['portrait',1080,1920],['square',800,800]];
      for(const [shape,w,h] of shapes){
        const png=await f.evaluate(({shape,w,h})=>{
          const M=WZ.Main,S=WZ.Scenes.menu,T=THREE, r=M.renderer;
          M.platformPaused=true;WZ.MapPreview.cancel();
          const st=S.st, pos=S.vehPos, aspect=w/h;
          S.t=8.4;S.render(0,0.001);
          const cam=new T.PerspectiveCamera(38,aspect,.18,1850);
          const wide=shape==='landscape', tall=shape==='portrait';
          const dist=wide?11.5:tall?17:11.8, sway=-.9;
          cam.position.set(pos.x-st.dx*dist+st.rx*sway,pos.y+(tall?3.4:3.2),pos.z-st.dz*dist+st.rz*sway);
          const shift=wide?-2.4:0, y=wide?2.75:tall?5.5:3.8;
          cam.lookAt(pos.x+st.rx*shift,pos.y+y,pos.z+st.rz*shift);
          cam.updateMatrixWorld(true);
          if(S.crateBeam)S.crateBeam.rotation.y=Math.atan2(cam.position.x-S.crateBeam.position.x,cam.position.z-S.crateBeam.position.z);
          r.setPixelRatio(1); r.setSize(w,h,false);r.shadowMap.enabled=true;r.shadowMap.needsUpdate=true;
          r.render(S.scene,cam);const url=r.domElement.toDataURL('image/png');M.resize();return url;
        },{shape,w,h});
        dataFile('key-'+shape,png);console.log('captured '+shape);
      }
      // Capture normal in-game screens with their HUD, no image overlays. Advance normal
      // controls with a fixed seed between stills (no relocation, enemies added, or outcomes forced).
      const paused = await f.evaluate(()=>{
        window.captureMission = ({theme,level,seed,tutorial,touch})=>{
          WZ.Main.go('mission',{theme,level,runSeed:seed,tutorial});
          if(touch){WZ.Input.device='touch';WZ.UI.setDevice('touch');}
          const m=WZ.Scenes.mission,C=WZ.Cam,I=WZ.Input;
          m.startPlay();m.camBlend=0;C.snap(m.jeep.rx,m.jeep.ry,m.jeep.rz);
          const j=m.jeep, nav=m.map.nav.jeep;
          const crate=m.crates.list.slice().sort((a,b)=>Math.hypot(j.x-a.x,j.z-a.z)-Math.hypot(j.x-b.x,j.z-b.z))[0];
          const points=tutorial?[crate]:(nav.path(j.x,j.z,crate.x,crate.z)||[crate]);let point=0;
          const step=()=>{m.update(1/60);if(Math.round(m.t*60)%24===0)m.render(1,.12);};
          for(let tick=0;tick<590&&j.alive&&m.phase==='play';tick++){
            const d0=Math.hypot(crate.x-j.x,crate.z-j.z);
            if(d0<23)break;
            let p=points[point], d=Math.hypot(p.x-j.x,p.z-j.z);
            if(d<7&&point<points.length-1){p=points[++point];d=Math.hypot(p.x-j.x,p.z-j.z);}
            if(d<.1)break;
            const s=Math.sin(C.yaw),c=Math.cos(C.yaw),dx=p.x-j.x,dz=p.z-j.z,k=Math.min(1,Math.max(.48,d/20));
            I.bot={x:(-c*dx+s*dz)/d*k,y:(s*dx+c*dz)/d*k};step();
          }
          I.bot=null;
          if(tutorial){
            for(let i=0;i<430&&m.phase==='play'&&!m.crates.nearestAvailable(j.x,j.z,WZ.CFG.nana.deployRadius);i++)step();
            I.press('deploy');
            for(let i=0;i<350&&m.phase==='play'&&m.nana.state!=='RETURNING';i++)step();
          }else{
            // Position after a real approach, while guardian/terrain cues are on screen.
            for(let i=0;i<36&&m.phase==='play';i++)step();
          }
          m.render(1,.08);
          return {theme, time:m.time.toFixed(2), remaining:Math.round(m.timeLeft), nana:m.nana.state, distance:Math.round(Math.hypot(crate.x-j.x,crate.z-j.z)),phase:m.phase};
        };
        return WZ.Main.platformPaused;
      });
      if(!paused)throw Error('Capture requires paused frame scheduling');
      const photo=async(name,width,height,fn)=>{
        await page.setViewportSize({width,height});
        await f.evaluate(()=>WZ.Main.resize());
        await f.evaluate(fn);
        await page.screenshot({path:path.join(out,name+'.png'),timeout:35000});
      };
      await photo('01-main-menu',1600,900,()=>{WZ.Scenes.menu.t=4.5;WZ.Scenes.menu.render(0,0.001);});
      await page.setViewportSize({width:832,height:468});await f.evaluate(()=>WZ.Main.resize());
      console.log(await f.evaluate(args=>captureMission(args),{theme:'village',level:1,seed:219,tutorial:true,touch:false}));
      await photo('02-desert-pickup',1600,900,()=>WZ.Scenes.mission.render(1,.03));
      await page.setViewportSize({width:832,height:468});await f.evaluate(()=>WZ.Main.resize());
      console.log(await f.evaluate(args=>captureMission(args),{theme:'volcanic',level:5,seed:92371,tutorial:false,touch:false}));
      await photo('03-volcanic-run',1600,900,()=>WZ.Scenes.mission.render(1,.04));
      await photo('04-equipment-shop',1600,900,()=>{
        WZ.Main.go('shop');
        document.querySelector('#sh-list [data-id=soldier]').click();
        WZ.Scenes.shop.render(0,.33);
      });
      await page.setViewportSize({width:360,height:640});await f.evaluate(()=>WZ.Main.resize());
      console.log(await f.evaluate(args=>captureMission(args),{theme:'harbor',level:4,seed:202447,tutorial:false,touch:true}));
      await photo('05-harbor-touch',540,960,()=>{WZ.Input.showInitialStick();WZ.Scenes.mission.render(1,.05);});
      console.log('Captured five game screenshots');
    }finally{await context.close();}
  };
  try{browser=await launch(); await cap();} finally{if(browser)await browser.close();addr.server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
