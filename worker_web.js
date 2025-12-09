addEventListener('fetch', e => {
  e.respondWith(handle(e.request))
})

const MIN_MB = 100
const MAX_MB = 1000
const DEFAULT_MB = 100
const CHUNK = 64 * 1024

async function handle(req) {
  const url = new URL(req.url)
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (path === '/') {
    return new Response(html(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    })
  }

  const m = path.match(/^\/(\d{1,4})[mM]$/)
  if (!m) return new Response('Bad Request', { status: 400 })

  const mb = +m[1]
  if (mb < MIN_MB || mb > MAX_MB) {
    return new Response('Invalid size', { status: 400 })
  }

  const total = mb * 1024 * 1024

  const stream = new ReadableStream({
    start(c) {
      let sent = 0
      const buf = new Uint8Array(CHUNK)
      for (let i = 0; i < buf.length; i++) buf[i] = i % 256

      function push() {
        if (sent >= total) return c.close()
        const n = Math.min(CHUNK, total - sent)
        c.enqueue(buf.subarray(0, n))
        sent += n
        setTimeout(push, 0)
      }
      push()
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

function html() {
return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Speed Test</title>

<style>
html,body{
  margin:0;
  height:100%;
  background:#fff;
  color:#000;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto;
}
.main{
  height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
}
.logo{
  font-size:84px;
  font-weight:800;
  margin-bottom:70px;
}
.logo span{ color:#f48120; }

.speed{
  font-size:140px;
  font-weight:700;
  line-height:1;
}
.unit{
  margin-top:10px;
  font-size:26px;
  font-weight:900; /* 黑体感 */
  letter-spacing:2px;
  font-family:black, Arial Black, Impact, sans-serif;
}

.progress{
  width:320px;
  height:4px;
  background:#eee;
  margin-top:28px;
  overflow:hidden;
}
.bar{
  height:100%;
  width:0%;
  background:#f48120;
  transition:width 120ms linear;
}

.buttons{
  position:absolute;
  bottom:70px;
  display:flex;
  gap:26px;
}
button{
  padding:14px 42px;
  border-radius:40px;
  border:none;
  font-size:15px;
  font-weight:600;
  cursor:pointer;
}
.start{ background:#f48120; color:#fff }
.stop{ background:#eee; color:#666 }
button:disabled{ opacity:.4 }
</style>
</head>

<body>
<div class="main">
  <div class="logo">cloud<span>flare</span></div>

  <div id="speed" class="speed">0</div>
  <div class="unit">Mbps</div>

  <div class="progress">
    <div class="bar" id="bar"></div>
  </div>

  <div class="buttons">
    <button class="start" id="start">开始</button>
    <button class="stop" id="stop">停止</button>
  </div>
</div>

<script>
let controller
let running=false

const FILE_MB=${DEFAULT_MB}
const TOTAL_BYTES=FILE_MB*1024*1024

const speedEl=document.getElementById('speed')
const barEl=document.getElementById('bar')
const startBtn=document.getElementById('start')
const stopBtn=document.getElementById('stop')

startBtn.onclick=()=>start()
stopBtn.onclick=()=>controller && controller.abort()

// 打开即自动测速
start()

async function start(){
  if(running)return
  running=true
  speedEl.textContent='0'
  barEl.style.width='0%'
  controller=new AbortController()

  const res=await fetch('/'+FILE_MB+'m',{signal:controller.signal})
  const reader=res.body.getReader()

  let recv=0
  let lastTime=performance.now()
  let windowBytes=0
  let speeds=[]
  let display=0

  while(true){
    const {value,done}=await reader.read()
    if(done)break

    recv+=value.length
    windowBytes+=value.length

    const now=performance.now()

    // 500ms 统计一次真实速度
    if(now-lastTime>500){
      const dt=(now-lastTime)/1000
      const mbps=windowBytes*8/1024/1024/dt
      speeds.push(mbps)
      if(speeds.length>8) speeds.shift()
      windowBytes=0
      lastTime=now
    }

    // UI 平滑更新
    if(speeds.length){
      const avg=speeds.reduce((a,b)=>a+b,0)/speeds.length
      display+= (avg-display)*0.25
      speedEl.textContent=display.toFixed(1)
    }

    // 进度条
    const percent=Math.min(100,recv/TOTAL_BYTES*100)
    barEl.style.width=percent+'%'
  }

  running=false
}
</script>
</body>
</html>`
}
