(() => {
  const canvas = document.getElementById("lomiWaveCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const input = document.getElementById("lomiCharacterUpload");
  const status = document.getElementById("lomiWaveStatus");
  const play = document.getElementById("lomiWavePlay");
  const pause = document.getElementById("lomiWavePause");
  const reset = document.getElementById("lomiWaveReset");
  let character = null, running = true, start = performance.now(), raf = 0;

  function park(t) {
    const w=canvas.width,h=canvas.height;
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#82d8ff"); sky.addColorStop(1,"#e5f8ff");
    ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);
    ctx.fillStyle="#ffe27a"; ctx.beginPath(); ctx.arc(455,92,43,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#a8df9a"; ctx.beginPath(); ctx.moveTo(0,360); ctx.quadraticCurveTo(150,265,285,355); ctx.quadraticCurveTo(430,260,560,345); ctx.lineTo(560,640); ctx.lineTo(0,640); ctx.fill();
    ctx.fillStyle="#72c96c"; ctx.fillRect(0,455,w,185);
    ctx.fillStyle="#f7d9a8"; ctx.beginPath(); ctx.ellipse(285,565,220,43,0,0,Math.PI*2); ctx.fill();
    // Trees
    for (const x of [62,490]) {
      ctx.fillStyle="#9a633b"; ctx.fillRect(x-9,250,18,190);
      ctx.fillStyle="#3baf72"; ctx.beginPath(); ctx.arc(x,225,54,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#58c982"; ctx.beginPath(); ctx.arc(x-26,205,30,0,Math.PI*2); ctx.arc(x+25,205,31,0,Math.PI*2); ctx.fill();
    }
    // Flowers
    for (let i=0;i<9;i++) {
      const x=22+i*64, y=475+(i%3)*34;
      ctx.strokeStyle="#398c4e";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y+20);ctx.lineTo(x,y+42);ctx.stroke();
      ctx.fillStyle=["#ff7fa8","#fff1a1","#b89cff"][i%3];ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.arc(x-7,y+5,6,0,Math.PI*2);ctx.arc(x+7,y+5,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#ffd65e";ctx.beginPath();ctx.arc(x,y+4,4,0,Math.PI*2);ctx.fill();
    }
  }
  function drawWave(t, x, y, scale) {
    const swing=Math.sin(t*0.008)*0.34;
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.lineCap="round";ctx.lineJoin="round";
    ctx.strokeStyle="#9b553c";ctx.lineWidth=27;
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(42,-27,54,-76);ctx.stroke();
    ctx.strokeStyle="#b96f50";ctx.lineWidth=21;
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(42,-27,54,-76);ctx.stroke();
    ctx.save();ctx.translate(54,-78);ctx.rotate(swing);
    ctx.fillStyle="#c98261";ctx.beginPath();ctx.ellipse(0,0,15,19,-0.25,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#c98261";ctx.lineWidth=7;
    for(let i=0;i<4;i++){const a=-2.45+i*0.34;ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(Math.cos(a)*22,Math.sin(a)*22-8);ctx.stroke();}
    ctx.restore();ctx.restore();
  }
  function render(now) {
    const t=running?now-start:0;
    park(t);
    if(character) {
      const maxW=365,maxH=535,ratio=Math.min(maxW/character.width,maxH/character.height);
      const dw=character.width*ratio,dh=character.height*ratio;
      const bob=running?Math.sin(t*0.004)*5:0;
      const sway=running?Math.sin(t*0.0025)*0.018:0;
      const dx=(canvas.width-dw)/2,dy=canvas.height-dh-26+bob;
      ctx.save();ctx.translate(canvas.width/2,dy+dh*0.55);ctx.rotate(sway);ctx.translate(-canvas.width/2,-(dy+dh*0.55));
      ctx.drawImage(character,dx,dy,dw,dh);
      // Aceno ilustrativo sobreposto junto ao ombro direito; será substituído pelo rig articulado.
      drawWave(t,dx+dw*0.79,dy+dh*0.34,Math.max(.72,ratio*1.05));
      ctx.restore();
      ctx.fillStyle="rgba(28,77,58,.85)";ctx.font="bold 18px Arial";ctx.textAlign="center";ctx.fillText("Olá, amiguinhos!",280,610);
    } else {
      ctx.fillStyle="#24543f";ctx.font="bold 23px Arial";ctx.textAlign="center";ctx.fillText("Seu parque está pronto!",280,555);
      ctx.font="17px Arial";ctx.fillText("Envie a imagem da personagem para animar",280,585);
    }
    raf=requestAnimationFrame(render);
  }
  function loadImage(file) {
    if(!file) return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){status.textContent="Escolha uma imagem PNG, JPG ou WebP.";return;}
    if(file.size>15*1024*1024){status.textContent="A imagem deve ter até 15 MB.";return;}
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{
      const temp=document.createElement("canvas");temp.width=img.naturalWidth;temp.height=img.naturalHeight;
      const c=temp.getContext("2d",{willReadFrequently:true});c.drawImage(img,0,0);
      const pixels=c.getImageData(0,0,temp.width,temp.height),d=pixels.data;
      // Torna transparente apenas o branco quase puro do fundo de estúdio, preservando tons claros da personagem.
      for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(r>248&&g>248&&b>248)d[i+3]=0;}
      c.putImageData(pixels,0,0);character=temp;start=performance.now();running=true;
      status.textContent="Personagem preparada. Prévia de aceno e balanço corporal em execução — processamento local, sem cota de IA.";
      URL.revokeObjectURL(url);
    };
    img.onerror=()=>{status.textContent="Não foi possível abrir essa imagem.";URL.revokeObjectURL(url);};
    img.src=url;
  }
  input.addEventListener("change",e=>loadImage(e.target.files?.[0]));
  play.addEventListener("click",()=>{running=true;start=performance.now();status.textContent=character?"Aceno em reprodução.":"Envie primeiro a imagem da personagem.";});
  pause.addEventListener("click",()=>{running=false;status.textContent="Prévia pausada.";});
  reset.addEventListener("click",()=>{running=true;start=performance.now();status.textContent="Prévia reiniciada.";});
  cancelAnimationFrame(raf);raf=requestAnimationFrame(render);
})();