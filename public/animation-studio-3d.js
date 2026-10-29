/* Motor 3D procedural — Three.js, sem chave de API. */
(function(){
const css=".dai3{font:14px system-ui;color:#202033;background:#f7f7fb;border:1px solid #ddd;border-radius:16px;padding:16px;max-width:1100px;margin:auto}.dai3 *{box-sizing:border-box}.dai3 h3{margin:0 0 6px;color:#5b42d6}.dai3 p{color:#626276;margin:0 0 12px}.dai3-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px}.dai3-controls{background:#fff;border:1px solid #e5e5ef;border-radius:12px;padding:12px}.dai3 label{display:block;font-weight:650;margin:9px 0 4px}.dai3 input,.dai3 select{width:100%;padding:8px;border:1px solid #d8d8e5;border-radius:8px;font:inherit}.dai3 input[type=color]{height:36px;padding:2px}.dai3-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dai3 button{border:0;border-radius:8px;padding:10px 12px;font-weight:700;cursor:pointer;background:#e8e8f2}.dai3 button.primary{background:#5b42d6;color:#fff}.dai3 button:disabled{opacity:.5}.dai3 canvas{width:100%;height:auto;display:block;border-radius:12px;background:#b9e8ff}.dai3-status{padding:10px;background:#eeedf8;border-radius:8px;margin-top:9px;min-height:38px}.dai3 a{display:inline-block;margin-top:10px;font-weight:bold;color:#4b36bc}@media(max-width:700px){.dai3-grid{grid-template-columns:1fr}}";
function mount(root){
 if(!root) return;
 root.innerHTML='<style>'+css+'</style><section class="dai3"><h3>Estúdio de animação 3D</h3><p>Importe um modelo OBJ que você já tem, visualize-o no cenário e exporte um clipe WebM. O motor usa Three.js no navegador, sem chave de API.</p><div class="dai3-grid"><form class="dai3-controls"><label>Nome</label><input id="d3-name" value="Meu personagem" maxlength="40"><label>Arquivo do modelo (.OBJ)</label><input id="d3-obj-file" type="file" accept=".obj,model/obj,text/plain"><label>Materiais e texturas (.MTL, PNG, JPG...)</label><input id="d3-assets-file" type="file" accept=".mtl,.png,.jpg,.jpeg,.webp,.bmp,.tga" multiple><button type="button" id="d3-import-model" class="primary" style="margin-top:10px;width:100%">Carregar meu personagem 3D</button><label>Ou escolha um dos 15 modelos já adicionados</label><select id="d3-library-model"><option value="">Escolher personagem da biblioteca…</option></select><button type="button" id="d3-load-library-model" style="margin-top:8px;width:100%">Abrir modelo da biblioteca</button><p style="font-size:12px">Selecione o OBJ e, no segundo campo, o MTL e todas as imagens de textura usadas por ele. Os nomes dos arquivos devem corresponder às referências do MTL.</p><button type="button" id="d3-reset-model">Usar personagem de exemplo</button><label>Estilo</label><select id="d3-kind"><option value="luna" selected>Luna — arco-íris</option><option value="girl">Menina cartoon</option><option value="boy">Menino cartoon</option><option value="bunny">Coelhinho</option><option value="robot">Robô amigável</option></select><div class="dai3-row"><div><label>Pele</label><input id="d3-skin" type="color" value="#f2bd9b"></div><div><label>Roupa</label><input id="d3-clothes" type="color" value="#8b5cf6"></div></div><div class="dai3-row"><div><label>Cabelo</label><input id="d3-hair" type="color" value="#51352e"></div><div><label>Cenário</label><input id="d3-bg" type="color" value="#a9e6ff"></div></div><label>Movimento</label><select id="d3-motion"><option value="dance">Dançar</option><option value="walk">Andar</option><option value="jump">Pular</option><option value="wave">Acenar</option><option value="idle">Ficar em cena</option></select><label>Duração</label><select id="d3-duration"><option>4</option><option selected>6</option><option>8</option><option>10</option><option>12</option></select><label>Formato</label><select id="d3-format"><option value="wide">YouTube 16:9</option><option value="vertical">Shorts 9:16</option></select><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button type="button" id="d3-preview">Pré-visualizar</button><button type="button" class="primary" id="d3-export">Gerar vídeo</button></div></form><div><canvas id="d3-canvas" width="960" height="540" aria-label="Pré-visualização do personagem 3D"></canvas><div class="dai3-status" id="d3-status" role="status" aria-live="polite">Carregando motor 3D…</div><a id="d3-download" hidden>Baixar vídeo 3D</a></div></div><p style="font-size:12px;margin-top:12px">Luna é a personagem principal em 3D estilizado, com touca arco-íris, cabelo cacheado, camiseta colorida, jardineira jeans e mochila; ainda não é um modelo realista gerado por IA. A primeira carga precisa de internet para obter a biblioteca Three.js.</p></section>';
 const $=id=>root.querySelector('#'+id),canvas=$('d3-canvas'),status=$('d3-status'),download=$('d3-download'),previewBtn=$('d3-preview'),exportBtn=$('d3-export');
 let THREE,OBJLoader,MTLLoader,renderer,scene,camera,character,importedModel=null,usingImportedModel=false,raf=0,busy=false,blobUrl='',engineError='';let engineReadyResolve;const engineReady=new Promise(resolve=>{engineReadyResolve=resolve});
 const val=id=>$(id).value;
 function config(){return {name:val('d3-name').trim()||'Personagem',kind:val('d3-kind'),skin:val('d3-skin'),clothes:val('d3-clothes'),hair:val('d3-hair'),bg:val('d3-bg'),motion:val('d3-motion'),duration:+val('d3-duration'),format:val('d3-format')};}
 function mat(color,roughness=.68){return new THREE.MeshStandardMaterial({color,roughness});}
 function sphere(parent,x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 function capsule(parent,a,b,r,material){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.01,delta.length()-2*r),6,12),material);m.position.copy(start.clone().add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(m);return m;}
 function makeCharacter(c){
  const group=new THREE.Group(),skin=mat(c.kind==='robot'?'#a8cbd8':c.skin),clothes=mat(c.kind==='robot'?'#8798ac':c.clothes),hair=mat(c.hair),dark=mat('#392b2a'),white=mat('#fffdf7'),iris=mat('#5b3528'),shoe=mat('#fff6ed'),pink=mat('#ed9eaa'),blush=mat('#ef9b9b'),accent=mat('#ffe08a');
  const head=new THREE.Group();head.position.y=2.18;group.add(head);
  sphere(head,0,0,0,.57,.61,.52,skin);
  if(c.kind==='girl'||c.kind==='boy'||c.kind==='luna'){
   sphere(head,0,.30,-.03,.59,.36,.53,hair);
   sphere(head,-.39,.06,.20,.20,.30,.20,hair);sphere(head,.39,.06,.20,.20,.30,.20,hair);
   if(c.kind==='girl'||c.kind==='luna'){sphere(head,-.28,.39,.25,.24,.22,.20,hair);sphere(head,.03,.47,.24,.25,.22,.20,hair);sphere(head,.29,.38,.24,.22,.22,.20,hair);sphere(head,-.08,.31,.39,.22,.20,.15,hair);sphere(head,.16,.30,.40,.22,.19,.15,hair); if(c.kind==='luna'){for(let i=0;i<18;i++){const a=i*Math.PI*2/18; sphere(head,Math.cos(a)*.49,-.12+Math.sin(i*2.7)*.10,Math.sin(a)*.34+.02,.13,.14,.13,hair);}}}
  } else if(c.kind==='bunny'){
   sphere(head,-.25,.75,0,.17,.52,.15,skin);sphere(head,.25,.75,0,.17,.52,.15,skin);
   sphere(head,-.25,.77,.13,.08,.34,.05,pink);sphere(head,.25,.77,.13,.08,.34,.05,pink);
  } else {sphere(head,0,.55,0,.27,.12,.27,mat('#738da4'));sphere(head,-.59,.02,0,.12,.16,.12,clothes);sphere(head,.59,.02,0,.12,.16,.12,clothes);}
  for(const x of [-.22,.22]){sphere(head,x,.03,.458,.125,.155,.065,white);sphere(head,x,.025,.512,.078,.105,.045,iris);sphere(head,x,.03,.548,.035,.045,.035,white);sphere(head,x,.205,.46,.09,.035,.045,dark);sphere(head,x,-.16,.445,.105,.055,.025,blush);}
  sphere(head,0,-.12,.50,.055,.04,.035,mat('#d18a78'));
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.13,.018,8,24,Math.PI),mat('#9a4f54'));smile.position.set(0,-.22,.485);smile.rotation.z=Math.PI;head.add(smile);
  const shirt=mat(c.kind==='luna'?'#f34f9d':c.clothes),denim=mat('#2878bb'),body=sphere(group,0,1.35,0,.43,.57,.30,c.kind==='luna'?denim:clothes);
  sphere(group,0,1.78,0,.34,.13,.29,c.kind==='luna'?shirt:clothes);
  /* Detalhes do figurino exclusivo da Luna: camiseta arco-íris e jardineira jeans. */
  if(c.kind==='luna'){
   const stripeColors=['#f44768','#ff9f43','#ffe45e','#48c774','#42b9ff','#8664e8'];
   stripeColors.forEach((col,i)=>{const stripe=sphere(group,0,1.72-i*.075,.276,.31,.043,.025,mat(col));stripe.scale.x=0.88;});
   sphere(group,0,1.30,.285,.34,.30,.07,denim);
   capsule(group,[-.25,1.63,.28],[-.19,1.88,.22],.055,denim);capsule(group,[.25,1.63,.28],[.19,1.88,.22],.055,denim);
   sphere(group,0,1.37,.36,.12,.10,.025,mat('#fff0f5'));sphere(group,0,1.37,.39,.08,.035,.018,mat('#ffcf4a'));
   sphere(group,-.22,1.15,.30,.035,.035,.018,accent);sphere(group,.22,1.15,.30,.035,.035,.018,accent);
   /* Mochila rosa visível atrás do ombro. */
   sphere(group,-.42,1.47,-.12,.22,.34,.17,mat('#ed5da8'));
   sphere(group,-.42,1.48,.03,.13,.12,.035,mat('#ffb6d8'));
   /* Touca de lã com faixas coloridas e pompom. */
   sphere(head,0,.49,-.015,.65,.31,.56,mat('#7b55d9'));
   const hatBands=['#f05d9b','#ff9f43','#ffe45e','#4dcc78','#38bdf8','#8b5cf6'];
   hatBands.forEach((col,i)=>{const band=new THREE.Mesh(new THREE.TorusGeometry(.48-i*.006,.055,8,48),mat(col));band.position.set(0,.36+i*.035,.02);band.scale.set(1,.60,1);head.add(band);});
   sphere(head,0,.78,-.02,.13,.12,.13,mat('#f04eaa'));sphere(head,.07,.81,-.01,.10,.10,.10,mat('#ffcf4a'));sphere(head,-.07,.81,-.01,.10,.10,.10,mat('#42b9ff'));
  } else {
   sphere(group,0,1.48,.294,.10,.10,.035,accent);
   sphere(group,-.20,1.25,.267,.045,.045,.025,accent);sphere(group,.20,1.25,.267,.045,.045,.025,accent);
   sphere(group,0,1.02,0,.31,.16,.24,clothes);
  }
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
  if(c.kind==='girl'||c.kind==='luna'){sphere(group,-.36,2.56,.02,.13,.13,.12,accent);sphere(group,.36,2.56,.02,.13,.13,.12,accent);}
  return {group,head,arms,legs,body};
 }
 function setup(c){
  if(renderer){renderer.dispose();renderer=null;}
  canvas.width=c.format==='vertical'?540:960;canvas.height=c.format==='vertical'?960:540;
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(canvas.width,canvas.height,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(c.bg);
  scene=new THREE.Scene();scene.background=new THREE.Color(c.bg);scene.fog=new THREE.Fog(c.bg,9,22);
  camera=new THREE.PerspectiveCamera(32,canvas.width/canvas.height,.1,100);camera.position.set(0,2.65,7.4);camera.lookAt(0,1.28,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x8290a8,2.1));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-4,7,6);scene.add(key);const fill=new THREE.DirectionalLight(0xffd6b0,1.1);fill.position.set(4,3,-3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(9,64),mat('#72d39a'));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
  const hill=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),mat('#8be0b0'));hill.scale.set(8,.16,2);hill.position.set(0,.05,-3);scene.add(hill);
  for(let i=0;i<7;i++){const cloud=new THREE.Group();for(let j=0;j<3;j++)sphere(cloud,j*.25,.04,0,.23,.15,.15,mat('#ffffff'));cloud.position.set(-4.5+i*1.5,3.3+(i%3)*.42,-2.5);scene.add(cloud);}
  if(importedModel){const wrapper=new THREE.Group();const model=importedModel.clone(true);const box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());const maxDim=Math.max(size.x,size.y,size.z)||1;const modelScale=2.55/maxDim;model.scale.setScalar(modelScale);model.position.set(-center.x*modelScale,-box.min.y*modelScale,-center.z*modelScale);model.traverse(node=>{if(!node.isMesh)return;node.castShadow=true;node.receiveShadow=true;const materials=Array.isArray(node.material)?node.material:[node.material];for(const material of materials){if(!material)continue;material.side=THREE.DoubleSide;material.roughness=0.78;material.metalness=0;if(material.map){material.map.colorSpace=THREE.SRGBColorSpace;material.map.needsUpdate=true;}material.needsUpdate=true;}});wrapper.add(model);wrapper.position.y=.035;scene.add(wrapper);character={group:wrapper,head:null,arms:[],legs:[],body:null};usingImportedModel=true;}else{character=makeCharacter(c);scene.add(character.group);character.group.position.y=.08;usingImportedModel=false;}
 }
 function animateAt(t,c){if(!renderer||!character)return;const ch=character,phase=t*6.2;let bob=0,arm=0,lean=0;
  if(c.motion==='dance'){bob=Math.abs(Math.sin(phase))*.13;arm=Math.sin(phase)*.9;lean=Math.sin(phase*.5)*.12;}
  if(c.motion==='walk'){bob=Math.abs(Math.sin(phase))*.06;arm=Math.sin(phase)*.35;ch.group.position.x=Math.sin(t*1.2)*.48;}
  else ch.group.position.x=0;
  if(c.motion==='jump')bob=(1-Math.abs(Math.sin(t*3)))*.48;
  if(c.motion==='wave')arm=.2+Math.sin(t*7)*.85;
  ch.group.position.y=.08+bob;ch.group.rotation.z=lean;if(ch.head)ch.head.rotation.z=lean*.5;if(usingImportedModel){ch.group.rotation.y=c.motion==='dance'?Math.sin(phase*.5)*.35:(c.motion==='walk'?Math.sin(t*1.2)*.3:0);}
  ch.arms.forEach(({pivot,side})=>{pivot.rotation.x=c.motion==='wave'&&side===1?-1.8:Math.sin(phase+(side>0?Math.PI:0))*arm; pivot.rotation.z=side*(c.motion==='wave'&&side===1?-.35:.08);});
  ch.legs.forEach(({pivot,side})=>{pivot.rotation.x=(c.motion==='walk'||c.motion==='dance')?Math.sin(phase+(side>0?Math.PI:0))*.65:0;});
  renderer.render(scene,camera);
 }
 async function init(){try{THREE=await import('https://esm.sh/three@0.160.0');const loaderModule=await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/OBJLoader.js?external=three');const mtlModule=await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/MTLLoader.js?external=three');OBJLoader=loaderModule.OBJLoader;MTLLoader=mtlModule.MTLLoader;setup(config());status.textContent='Motor 3D pronto. Importe seu arquivo OBJ ou escolha um personagem de exemplo.';preview();}catch(e){console.error('Falha ao iniciar motor 3D:',e);engineError=(e.message||'erro de conexão').slice(0,180);status.textContent='Falha ao carregar a biblioteca 3D: '+engineError+'. Tente atualizar a página.';}finally{engineReadyResolve();}}
 function preview(){if(!THREE)return;cancelAnimationFrame(raf);const c=config();setup(c);const start=performance.now();function tick(now){animateAt((now-start)/1000,c);raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);status.textContent='Pré-visualização 3D: '+c.motion+'.';}
 async function exportVideo(){if(busy||!THREE)return;if(!canvas.captureStream||!window.MediaRecorder){status.textContent='Seu navegador não oferece gravação de vídeo neste formato.';return;}busy=true;previewBtn.disabled=true;exportBtn.disabled=true;download.hidden=true;cancelAnimationFrame(raf);const c=config();setup(c);const stream=canvas.captureStream(24),chunks=[];try{const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('WebM não é suportado neste navegador.');const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start(200);const start=performance.now(),total=c.duration*1000;await new Promise(resolve=>{function frame(now){const elapsed=now-start;animateAt(elapsed/1000,c);status.textContent='Renderizando vídeo 3D: '+Math.min(100,Math.floor(elapsed/total*100))+'%';if(elapsed>=total)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)});recorder.stop();await stopped;const blob=new Blob(chunks,{type:mime});if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(blob);download.href=blobUrl;download.download=(c.name.replace(/[^a-z0-9_-]+/gi,'-')||'personagem')+'-3d.webm';download.textContent='Baixar vídeo 3D ('+(blob.size/1048576).toFixed(1)+' MB)';download.hidden=false;status.textContent='Vídeo 3D pronto para baixar.';}catch(e){status.textContent='Falha ao exportar: '+(e.message||'erro inesperado')}finally{stream.getTracks().forEach(t=>t.stop());busy=false;previewBtn.disabled=false;exportBtn.disabled=false;}}
 const objInput=$('d3-obj-file'),assetsInput=$('d3-assets-file'),importModelBtn=$('d3-import-model'),resetModelBtn=$('d3-reset-model'),librarySelect=$('d3-library-model'),loadLibraryBtn=$('d3-load-library-model');let importGeneration=0;
 const libraryModels=[
  {label:'Bebê 1',path:'public/personagens-obj/desenha_bebe/WhatsApp_Image_2026-10-28_at_08_12_0114.obj'},
  {label:'Bebê 2',path:'public/personagens-obj/desenha_bebe/WhatsApp_Image_2026-10-28_at_08_12_04.obj'},
  {label:'Bebê 3',path:'public/personagens-obj/desenha_bebe/WhatsApp_Image_2026-10-28_at_08_12_06.obj'},
  {label:'Bebê 4',path:'public/personagens-obj/desenha_bebe/WhatsApp_Image_2026-10-28_at_0s8_12_06.obj'},
  {label:'Bebê 5',path:'public/personagens-obj/desenha_bebe/WhatsApp_Image_2026-10-28ed_at_08_12_08.obj'},
  {label:'Bebê 6',path:'public/personagens-obj/desenha_bebe/WhatsApp_Image_2026-10as-28_at_08_12_07.obj'},
  {label:'Bebê 7',path:'public/personagens-obj/desenha_bebe/WhatsApp_Image_2026-1asf0-28_at_08_12_07.obj'},
  {label:'Bebê 8',path:'public/personagens-obj/desenha_bebe/WhatsApp_Image_2026-1d0-28_at_08_12_07.obj'},
  {label:'Criança 1',path:'public/personagens-obj/desenho_crianças/WhatsApp_Image_2026-10-28_at_08_12_04.obj'},
  {label:'Criança 2',path:'public/personagens-obj/desenho_crianças/WhatsApp_Image_2026-10-28_at_08_12_05.obj'},
  {label:'Criança 3',path:'public/personagens-obj/desenho_crianças/WhatsApp_Image_2026-10-28_at_08_1c2_05.obj'},
  {label:'Adolescente 1',path:'public/personagens-obj/desenho_teens/WhatsApp_Image_2026-10-28_at_08_12_08.obj'},
  {label:'Adolescente 2',path:'public/personagens-obj/desenho_teens/WhatsApp_Image_2026-10-28_at_08_29_24.obj'},
  {label:'Adolescente 3',path:'public/personagens-obj/desenho_teens/WhatsApp_Image_2026-10-28_at_08_29_442.obj'},
  {label:'Adolescente 4',path:'public/personagens-obj/desenho_teens/WhatsApp_Image_2026-101-28_at_08_29_24.obj'}
 ];
 libraryModels.forEach((model,index)=>{const option=document.createElement('option');option.value=model.path;option.textContent=model.label;librarySelect.appendChild(option);});
librarySelect.value=libraryModels[0].path;
 async function loadLibraryModel(){
  const path=librarySelect.value;if(!path){status.textContent='Escolha um modelo da lista primeiro.';return;}
  const generation=++importGeneration;await engineReady;if(!THREE||!OBJLoader||!MTLLoader){status.textContent='O motor 3D não inicializou. '+(engineError?'Detalhe: '+engineError+'. ':'')+'Confira a conexão e recarregue a página.';return;}
  loadLibraryBtn.disabled=true;status.textContent='Baixando o modelo escolhido e suas texturas…';
  try{
   const assetRoots=['https://cdn.jsdelivr.net/gh/meloameida-coder/Desenhos-Animados@9ec4980ddd530c4ed3184bfb7f70084028dcf862/','https://raw.githubusercontent.com/meloameida-coder/Desenhos-Animados/main/'];let encodedPath='',base='',objResponse=null;const relativePath=path.split('/').map(part=>encodeURIComponent(part)).join('/');
   for(const rootUrl of assetRoots){const candidate=rootUrl+relativePath;try{const response=await fetch(candidate);if(response.ok){encodedPath=candidate;base=encodedPath.slice(0,encodedPath.lastIndexOf('/')+1);objResponse=response;break;}}catch(_){}}
   if(!objResponse)throw Error('Não consegui baixar o modelo 3D. Verifique a conexão e tente novamente.');const stem=path.split('/').pop().replace(/\.obj$/i,'');const objText=await objResponse.text();
   const mtlPath=base+encodeURIComponent(stem+'.mtl'),mtlResponse=await fetch(mtlPath);if(!mtlResponse.ok)throw Error('O arquivo MTL correspondente não foi encontrado.');
   const mtlText=await mtlResponse.text();const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{let file=url.split(/[?#]/)[0].replace(/\\/g,'/').split('/').pop();try{file=decodeURIComponent(file)}catch(_){}return base+encodeURIComponent(file);});
   const materials=new MTLLoader(manager).parse(mtlText,base);materials.preload();const loader=new OBJLoader(manager);loader.setMaterials(materials);const loaded=loader.parse(objText);
   if(generation!==importGeneration)return;let meshCount=0;loaded.traverse(node=>{if(node.isMesh){meshCount++;const mats=Array.isArray(node.material)?node.material:[node.material];mats.forEach(material=>{if(material){material.side=THREE.DoubleSide;material.needsUpdate=true;}})}});
   if(!meshCount)throw Error('O OBJ não contém malha 3D válida.');const box=new THREE.Box3().setFromObject(loaded),size=box.getSize(new THREE.Vector3());if(Math.max(size.x,size.y,size.z)<=0)throw Error('O modelo não tem dimensões válidas.');
   importedModel=loaded;usingImportedModel=true;objInput.value='';assetsInput.value='';$('d3-name').value=librarySelect.options[librarySelect.selectedIndex].text;preview();status.textContent='Modelo novo carregado: '+librarySelect.options[librarySelect.selectedIndex].text+'. Estes arquivos são modelos de relevo 3D; confira a textura e o enquadramento.';
  }catch(e){if(generation===importGeneration)status.textContent='Não consegui abrir esse modelo: '+(e.message||'erro desconhecido')+' Tente outro da lista.';}finally{loadLibraryBtn.disabled=false;}
 }
 loadLibraryBtn.addEventListener('click',()=>void loadLibraryModel());async function importObj(){const generation=++importGeneration;const file=objInput.files&&objInput.files[0];if(!file){status.textContent='Selecione primeiro o arquivo .OBJ do personagem.';return;}status.textContent='Aguardando o motor 3D carregar…';await engineReady;if(!THREE||!OBJLoader||!MTLLoader){status.textContent='O motor 3D não carregou. Atualize a página e aguarde aparecer “Motor 3D pronto” antes de selecionar os arquivos.';return;}if(!file.name.toLowerCase().endsWith('.obj')){status.textContent='Selecione um arquivo com extensão .obj.';objInput.value='';return;}try{status.textContent='Importando modelo e procurando materiais…';const assets=Array.from(assetsInput.files||[]);const urls=new Map();for(const f of assets)urls.set(f.name.toLowerCase(),URL.createObjectURL(f));const mtlFile=assets.find(f=>f.name.toLowerCase().endsWith('.mtl'));const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{let clean=url.split(/[?#]/)[0].replace(/\\\\/g,'/');try{clean=decodeURIComponent(clean);}catch(_){}clean=clean.split('/').pop().toLowerCase();return urls.get(clean)||url;});const loader=new OBJLoader(manager);if(mtlFile){const materials=new MTLLoader(manager).parse(await mtlFile.text(), '');materials.preload();loader.setMaterials(materials);}const loaded=loader.parse(await file.text());if(generation!==importGeneration)return;let meshCount=0;loaded.traverse(node=>{if(node.isMesh){meshCount++;if(!node.geometry||!node.geometry.attributes||!node.geometry.attributes.position)throw Error('O OBJ não contém geometria de malha válida.');const mats=Array.isArray(node.material)?node.material:[node.material];for(const material of mats){if(!material)continue;material.side=THREE.DoubleSide;if(material.color&&!mtlFile)material.color.set(0xb9a6e8);material.needsUpdate=true;}}});if(!meshCount)throw Error('O arquivo foi lido, mas não contém objetos 3D (malhas). Confira se selecionou o OBJ correto e se ele não está vazio.');const bounds=new THREE.Box3().setFromObject(loaded);const dimensions=bounds.getSize(new THREE.Vector3());if(!Number.isFinite(dimensions.x+dimensions.y+dimensions.z)||Math.max(dimensions.x,dimensions.y,dimensions.z)<=0)throw Error('O modelo não tem dimensões válidas. Exporte novamente como OBJ com a geometria incluída.');if(generation!==importGeneration)return;importedModel=loaded;usingImportedModel=true;const nameField=$('d3-name');if(!nameField.value||nameField.value==='Meu personagem')nameField.value=file.name.replace(/\.obj$/i,'');preview();status.textContent='Modelo carregado: '+file.name+' · '+meshCount+' parte(s) 3D'+(mtlFile?' · materiais '+mtlFile.name:' · sem MTL')+'. Se o modelo não aparecer, verifique se o OBJ contém geometria e está em escala válida. '+(mtlFile?'Selecione todas as texturas citadas no MTL.':'Selecione também o MTL e as texturas para preservar as cores.');}catch(e){if(generation===importGeneration)status.textContent='Não foi possível abrir o modelo: '+(e.message||'arquivo inválido');}}objInput.addEventListener('change',()=>{status.textContent=objInput.files&&objInput.files[0]?'OBJ selecionado. Agora clique em “Carregar meu personagem 3D”.':'Selecione o arquivo OBJ do personagem.'});assetsInput.addEventListener('change',()=>{const n=assetsInput.files?assetsInput.files.length:0;status.textContent=n+' arquivo(s) de material/textura selecionado(s). Clique em “Carregar meu personagem 3D” para importar o modelo.'});importModelBtn.addEventListener('click',()=>void importObj());resetModelBtn.addEventListener('click',()=>{importedModel=null;usingImportedModel=false;objInput.value='';assetsInput.value='';preview();status.textContent='Personagem de exemplo carregado.';});previewBtn.addEventListener('click',preview);exportBtn.addEventListener('click',()=>void exportVideo());root.querySelector('form').addEventListener('change',event=>{if(event.target===objInput)return;if(!busy&&THREE)preview()});init();engineReady.then(()=>{if(THREE&&librarySelect.value)void loadLibraryModel();});
 return {preview,destroy(){cancelAnimationFrame(raf);if(renderer)renderer.dispose();if(blobUrl)URL.revokeObjectURL(blobUrl);root.innerHTML=''}};
}
window.mountCartoon3DStudio=mount;
})();