/* Motor 3D procedural — Three.js, sem chave de API. */
(function(){
const css=".dai3{font:14px system-ui;color:#202033;background:#f7f7fb;border:1px solid #ddd;border-radius:16px;padding:16px;max-width:1100px;margin:auto}.dai3 *{box-sizing:border-box}.dai3 h3{margin:0 0 6px;color:#5b42d6}.dai3 p{color:#626276;margin:0 0 12px}.dai3-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px}.dai3-controls{background:#fff;border:1px solid #e5e5ef;border-radius:12px;padding:12px}.dai3 label{display:block;font-weight:650;margin:9px 0 4px}.dai3 input,.dai3 select{width:100%;padding:8px;border:1px solid #d8d8e5;border-radius:8px;font:inherit}.dai3 input[type=color]{height:36px;padding:2px}.dai3-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dai3 button{border:0;border-radius:8px;padding:10px 12px;font-weight:700;cursor:pointer;background:#e8e8f2}.dai3 button.primary{background:#5b42d6;color:#fff}.dai3 button:disabled{opacity:.5}.dai3 canvas{width:100%;height:auto;display:block;border-radius:12px;background:#b9e8ff}.dai3-status{padding:10px;background:#eeedf8;border-radius:8px;margin-top:9px;min-height:38px}.dai3 a{display:inline-block;margin-top:10px;font-weight:bold;color:#4b36bc}@media(max-width:700px){.dai3-grid{grid-template-columns:1fr}}";
function mount(root){
 if(!root) return;
 root.innerHTML='<style>'+css+'</style><section class="dai3"><h3>Estúdio de animação 3D</h3><p>Monte um personagem 3D estilizado, escolha um movimento e exporte um clipe WebM. O motor usa Three.js no navegador, sem chave de API.</p><div class="dai3-grid"><form class="dai3-controls"><label>Nome</label><input id="d3-name" value="Luna" maxlength="40"><label>Estilo</label><select id="d3-kind"><option value="girl">Menina cartoon</option><option value="boy">Menino cartoon</option><option value="bunny">Coelhinho</option><option value="robot">Robô amigável</option></select><div class="dai3-row"><div><label>Pele</label><input id="d3-skin" type="color" value="#f2bd9b"></div><div><label>Roupa</label><input id="d3-clothes" type="color" value="#8b5cf6"></div></div><div class="dai3-row"><div><label>Cabelo</label><input id="d3-hair" type="color" value="#51352e"></div><div><label>Cenário</label><input id="d3-bg" type="color" value="#a9e6ff"></div></div><label>Movimento</label><select id="d3-motion"><option value="dance">Dançar</option><option value="walk">Andar</option><option value="jump">Pular</option><option value="wave">Acenar</option><option value="idle">Ficar em cena</option></select><label>Duração</label><select id="d3-duration"><option>4</option><option selected>6</option><option>8</option><option>10</option><option>12</option></select><label>Formato</label><select id="d3-format"><option value="wide">YouTube 16:9</option><option value="vertical">Shorts 9:16</option></select><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button type="button" id="d3-preview">Pré-visualizar</button><button type="button" class="primary" id="d3-export">Gerar vídeo</button></div></form><div><canvas id="d3-canvas" width="960" height="540" aria-label="Pré-visualização do personagem 3D"></canvas><div class="dai3-status" id="d3-status" role="status" aria-live="polite">Carregando motor 3D…</div><a id="d3-download" hidden>Baixar vídeo 3D</a></div></div><p style="font-size:12px;margin-top:12px">Esta é uma primeira versão 3D feita com formas tridimensionais estilizadas, não um modelo humano realista gerado por IA. A primeira carga precisa de internet para obter a biblioteca Three.js.</p></section>';
 const $=id=>root.querySelector('#'+id),canvas=$('d3-canvas'),status=$('d3-status'),download=$('d3-download'),previewBtn=$('d3-preview'),exportBtn=$('d3-export');
 let THREE,renderer,scene,camera,character,raf=0,busy=false,blobUrl='';
 const val=id=>$(id).value;
 function config(){return {name:val('d3-name').trim()||'Personagem',kind:val('d3-kind'),skin:val('d3-skin'),clothes:val('d3-clothes'),hair:val('d3-hair'),bg:val('d3-bg'),motion:val('d3-motion'),duration:+val('d3-duration'),format:val('d3-format')};}
 function mat(color,roughness=.68){return new THREE.MeshStandardMaterial({color,roughness});}
 function sphere(parent,x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 function capsule(parent,a,b,r,material){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.01,delta.length()-2*r),6,12),material);m.position.copy(start.clone().add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(m);return m;}
 function makeCharacter(c){
  const group=new THREE.Group(),skin=mat(c.kind==='robot'?'#a8cbd8':c.skin),clothes=mat(c.kind==='robot'?'#8798ac':c.clothes),hair=mat(c.hair),dark=mat('#392b2a'),white=mat('#fffdf7'),iris=mat('#5b3528'),shoe=mat('#fff6ed'),pink=mat('#ed9eaa'),blush=mat('#ef9b9b'),accent=mat('#ffe08a');
  const head=new THREE.Group();head.position.y=2.18;group.add(head);
  sphere(head,0,0,0,.57,.61,.52,skin);
  if(c.kind==='girl'||c.kind==='boy'){
   sphere(head,0,.30,-.03,.59,.36,.53,hair);
   sphere(head,-.39,.06,.20,.20,.30,.20,hair);sphere(head,.39,.06,.20,.20,.30,.20,hair);
   if(c.kind==='girl'){sphere(head,-.28,.39,.25,.24,.22,.20,hair);sphere(head,.03,.47,.24,.25,.22,.20,hair);sphere(head,.29,.38,.24,.22,.22,.20,hair);sphere(head,-.08,.31,.39,.22,.20,.15,hair);sphere(head,.16,.30,.40,.22,.19,.15,hair);}
  } else if(c.kind==='bunny'){
   sphere(head,-.25,.75,0,.17,.52,.15,skin);sphere(head,.25,.75,0,.17,.52,.15,skin);
   sphere(head,-.25,.77,.13,.08,.34,.05,pink);sphere(head,.25,.77,.13,.08,.34,.05,pink);
  } else {sphere(head,0,.55,0,.27,.12,.27,mat('#738da4'));sphere(head,-.59,.02,0,.12,.16,.12,clothes);sphere(head,.59,.02,0,.12,.16,.12,clothes);}
  for(const x of [-.22,.22]){sphere(head,x,.03,.458,.125,.155,.065,white);sphere(head,x,.025,.512,.078,.105,.045,iris);sphere(head,x,.03,.548,.035,.045,.035,white);sphere(head,x,.205,.46,.09,.035,.045,dark);sphere(head,x,-.16,.445,.105,.055,.025,blush);}
  sphere(head,0,-.12,.50,.055,.04,.035,mat('#d18a78'));
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.13,.018,8,24,Math.PI),mat('#9a4f54'));smile.position.set(0,-.22,.485);smile.rotation.z=Math.PI;head.add(smile);
  const body=sphere(group,0,1.35,0,.43,.57,.30,clothes);
  sphere(group,0,1.78,0,.34,.13,.29,clothes);
  /* Pequenos detalhes dão mais personalidade ao figurino. */
  sphere(group,0,1.48,.294,.10,.10,.035,accent);
  sphere(group,-.20,1.25,.267,.045,.045,.025,accent);sphere(group,.20,1.25,.267,.045,.045,.025,accent);
  sphere(group,0,1.02,0,.31,.16,.24,clothes);
  const arms=[];
  for(const side of [-1,1]){
   const pivot=new THREE.Group();pivot.position.set(side*.38,1.66,0);group.add(pivot);
   capsule(pivot,[0,0,0],[side*.10,-.42,.02],.105,skin);sphere(pivot,side*.10,-.43,.02,.11,.12,.11,skin);arms.push({pivot,side});
  }
  const legs=[];
  for(const side of [-1,1]){
   const pivot=new THREE.Group();pivot.position.set(side*.19,.94,0);group.add(pivot);
   capsule(pivot,[0,0,0],[0,-.58,0],.13,mat('#494351'));
   sphere(pivot,0,-.59,.10,.19,.105,.28,shoe);sphere(pivot,0,-.56,.31,.10,.035,.018,accent);legs.push({pivot,side});
  }
  if(c.kind==='girl'){sphere(group,-.36,2.56,.02,.13,.13,.12,accent);sphere(group,.36,2.56,.02,.13,.13,.12,accent);}
  return {group,head,arms,legs,body};
 }
 function setup(c){
  if(renderer){renderer.dispose();renderer=null;}
  canvas.width=c.format==='vertical'?540:960;canvas.height=c.format==='vertical'?960:540;
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(canvas.width,canvas.height,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(c.bg);
  scene=new THREE.Scene();scene.background=new THREE.Color(c.bg);scene.fog=new THREE.Fog(c.bg,9,22);
  camera=new THREE.PerspectiveCamera(34,canvas.width/canvas.height,.1,100);camera.position.set(0,3.1,9.6);camera.lookAt(0,1.35,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x8290a8,2.1));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-4,7,6);scene.add(key);const fill=new THREE.DirectionalLight(0xffd6b0,1.1);fill.position.set(4,3,-3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(9,64),mat('#72d39a'));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
  const hill=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),mat('#8be0b0'));hill.scale.set(8,.16,2);hill.position.set(0,.05,-3);scene.add(hill);
  for(let i=0;i<7;i++){const cloud=new THREE.Group();for(let j=0;j<3;j++)sphere(cloud,j*.25,.04,0,.23,.15,.15,mat('#ffffff'));cloud.position.set(-4.5+i*1.5,3.3+(i%3)*.42,-2.5);scene.add(cloud);}
  character=makeCharacter(c);scene.add(character.group);character.group.position.y=.08;
 }
 function animateAt(t,c){if(!renderer||!character)return;const ch=character,phase=t*6.2;let bob=0,arm=0,lean=0;
  if(c.motion==='dance'){bob=Math.abs(Math.sin(phase))*.13;arm=Math.sin(phase)*.9;lean=Math.sin(phase*.5)*.12;}
  if(c.motion==='walk'){bob=Math.abs(Math.sin(phase))*.06;arm=Math.sin(phase)*.35;ch.group.position.x=Math.sin(t*1.2)*.48;}
  else ch.group.position.x=0;
  if(c.motion==='jump')bob=(1-Math.abs(Math.sin(t*3)))*.48;
  if(c.motion==='wave')arm=.2+Math.sin(t*7)*.85;
  ch.group.position.y=.08+bob;ch.group.rotation.z=lean;ch.head.rotation.z=lean*.5;
  ch.arms.forEach(({pivot,side})=>{pivot.rotation.x=c.motion==='wave'&&side===1?-1.8:Math.sin(phase+(side>0?Math.PI:0))*arm; pivot.rotation.z=side*(c.motion==='wave'&&side===1?-.35:.08);});
  ch.legs.forEach(({pivot,side})=>{pivot.rotation.x=(c.motion==='walk'||c.motion==='dance')?Math.sin(phase+(side>0?Math.PI:0))*.65:0;});
  renderer.render(scene,camera);
 }
 async function init(){try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');setup(config());status.textContent='Motor 3D pronto. Escolha um movimento.';preview();}catch(e){status.textContent='Não foi possível carregar o motor 3D. Confira a conexão e atualize a página. Detalhe: '+(e.message||'biblioteca indisponível');}}
 function preview(){if(!THREE)return;cancelAnimationFrame(raf);const c=config();setup(c);const start=performance.now();function tick(now){animateAt((now-start)/1000,c);raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);status.textContent='Pré-visualização 3D: '+c.motion+'.';}
 async function exportVideo(){if(busy||!THREE)return;if(!canvas.captureStream||!window.MediaRecorder){status.textContent='Seu navegador não oferece gravação de vídeo neste formato.';return;}busy=true;previewBtn.disabled=true;exportBtn.disabled=true;download.hidden=true;cancelAnimationFrame(raf);const c=config();setup(c);const stream=canvas.captureStream(24),chunks=[];try{const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('WebM não é suportado neste navegador.');const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start(200);const start=performance.now(),total=c.duration*1000;await new Promise(resolve=>{function frame(now){const elapsed=now-start;animateAt(elapsed/1000,c);status.textContent='Renderizando vídeo 3D: '+Math.min(100,Math.floor(elapsed/total*100))+'%';if(elapsed>=total)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)});recorder.stop();await stopped;const blob=new Blob(chunks,{type:mime});if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(blob);download.href=blobUrl;download.download=(c.name.replace(/[^a-z0-9_-]+/gi,'-')||'personagem')+'-3d.webm';download.textContent='Baixar vídeo 3D ('+(blob.size/1048576).toFixed(1)+' MB)';download.hidden=false;status.textContent='Vídeo 3D pronto para baixar.';}catch(e){status.textContent='Falha ao exportar: '+(e.message||'erro inesperado')}finally{stream.getTracks().forEach(t=>t.stop());busy=false;previewBtn.disabled=false;exportBtn.disabled=false;}}
 previewBtn.addEventListener('click',preview);exportBtn.addEventListener('click',()=>void exportVideo());root.querySelector('form').addEventListener('change',()=>{if(!busy&&THREE)preview()});init();
 return {preview,destroy(){cancelAnimationFrame(raf);if(renderer)renderer.dispose();if(blobUrl)URL.revokeObjectURL(blobUrl);root.innerHTML=''}};
}
window.mountCartoon3DStudio=mount;
})();