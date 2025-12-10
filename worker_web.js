export default {
    async fetch(request) {
      const url = new URL(request.url);
      const path = url.pathname;
  
      if (path === "/" || path === "/index.html") {
        return new Response(htmlContent(), {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      }
  
      const match = path.match(/^\/(\d+)[mM]?$/);
      if (match) {
        const sizeInMB = parseInt(match[1]);

        if (sizeInMB < 10 || sizeInMB > 1000) {
          return new Response("Range must be between 10MB and 1000MB", { status: 400 });
        }
        const bytesTotal = sizeInMB * 1024 * 1024;
        const chunkSize = 1024 * 1024; 
        const buffer = new Uint8Array(chunkSize); 
        for(let i=0; i<chunkSize; i+=1024) buffer[i] = i % 255;
  
        const stream = new ReadableStream({
          start(controller) {
            let bytesSent = 0;
            function push() {
              if (bytesSent >= bytesTotal) {
                controller.close();
                return;
              }
              const remaining = bytesTotal - bytesSent;
              const currentChunkSize = remaining < chunkSize ? remaining : chunkSize;
              const chunkToSend = currentChunkSize === chunkSize ? buffer : buffer.slice(0, currentChunkSize);
              controller.enqueue(chunkToSend);
              bytesSent += currentChunkSize;
            }
            const interval = setInterval(() => {
               try {
                  if(controller.desiredSize > 0) push();
                  if(bytesSent >= bytesTotal) clearInterval(interval);
               } catch(e) { clearInterval(interval); }
            }, 1);
          }
        });
  
        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": bytesTotal,
            "Content-Disposition": `attachment; filename="speedtest-${sizeInMB}MB.bin"`,
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        });
      }
  
      return new Response("Not Found. Usage: /100m for 100MB file.", { status: 404 });
    },
  };
  

  function htmlContent() {
    return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cloudflare Speed Test</title>
      <style>
          :root {
              --cf-orange: #F38020;
              --cf-black: #000000;
              --bg-color: #ffffff;
          }
          body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: var(--bg-color);
              color: var(--cf-black);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              overflow-x: hidden;
          }
          .container {
              text-align: center;
              width: 100%;
              max-width: 900px;
              padding: 20px 0;
          }
          
          /* Logo 样式：Cloud(黑) Flare(橙) */
          .brand-text {
              font-size: 5rem; /* 增大字体 */
              font-weight: 800;
              margin-bottom: 20px;
              letter-spacing: -2px;
              line-height: 1.2;
          }
          .brand-text .part1 { color: var(--cf-black); }
          .brand-text .part2 { color: var(--cf-orange); }
          
          .speed-box { margin: 10px 0; }
          
          .speed-value {
              font-size: 13rem;
              font-weight: 800;
              line-height: 1;
              color: var(--cf-black);
              font-variant-numeric: tabular-nums;
              letter-spacing: -6px;
          }
          
          /* Mbps 单位样式：黑色 */
          .speed-unit {
              font-size: 2.5rem;
              color: var(--cf-black); 
              font-weight: 500;
              margin-top: -10px;
              display: block;
          }
          
          .control-btn {
              background: none;
              border: 4px solid var(--cf-orange);
              color: var(--cf-orange);
              width: 90px;
              height: 90px;
              border-radius: 50%;
              cursor: pointer;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 50px auto 0;
              outline: none;
              -webkit-tap-highlight-color: transparent;
          }
          .control-btn:hover {
              background-color: var(--cf-orange);
              color: white;
              transform: scale(1.05);
          }
          .control-btn svg {
              width: 36px;
              height: 36px;
              fill: currentColor;
          }
          
          .status-text {
              margin-top: 25px;
              font-size: 1rem;
              color: #999;
              height: 24px;
              font-weight: 400;
          }
          
          .progress-bar {
              width: 60%;
              margin: 30px auto 0;
              height: 4px;
              background: #eee;
              border-radius: 2px;
              overflow: hidden;
          }
          .progress-fill {
              height: 100%;
              background: var(--cf-orange);
              width: 0%;
              transition: width 0.1s linear;
          }
          
          /* 移动端适配 */
          @media (max-width: 600px) {
              .speed-value { font-size: 7rem; letter-spacing: -3px; }
              .brand-text { font-size: 3rem; }
              .speed-unit { font-size: 1.5rem; }
          }
      </style>
  </head>
  <body>
  
  <div class="container">
      <div class="brand-text">
          <span class="part1">Cloud</span><span class="part2">Flare</span>
      </div>
      
      <div class="speed-box">
          <div class="speed-value" id="speedDisplay">0.00</div>
          <span class="speed-unit">Mbps</span>
      </div>
  
      <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
      </div>
      
      <div class="status-text" id="statusText">准备就绪</div>
  
      <div>
          <button class="control-btn" id="actionBtn">
              </button>
      </div>
  </div>
  
  <script>
      const TEST_SIZE_MB = 100; 
      const TEST_URL = '/' + TEST_SIZE_MB + 'm';
      
      const speedDisplay = document.getElementById('speedDisplay');
      const statusText = document.getElementById('statusText');
      const actionBtn = document.getElementById('actionBtn');
      const progressFill = document.getElementById('progressFill');
  
      const ICON_STOP = '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>';
      const ICON_RESET = '<svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
      
      let isRunning = false;
      let isFinished = false;
      let abortController = null;
      let startTime = 0;
      let loadedBytes = 0;
      
      window.onload = () => {
          startTest();
      };
  
      actionBtn.addEventListener('click', () => {
          if (isRunning) {
              stopTest();
          } else {
              resetUI();
              startTest();
          }
      });
  
      function resetUI() {
          speedDisplay.innerText = "0.00";
          progressFill.style.width = "0%";
          isFinished = false;
      }
  
      async function startTest() {
          if (isRunning) return;
          isRunning = true;
          isFinished = false;
          actionBtn.innerHTML = ICON_STOP;
          statusText.innerText = "正在测速...";
          abortController = new AbortController();
          loadedBytes = 0;
          startTime = performance.now();
  
          try {
              const response = await fetch(TEST_URL + '?t=' + Date.now(), {
                  signal: abortController.signal
              });
              if (!response.ok) throw new Error('Network response was not ok');
              
              const reader = response.body.getReader();
              const contentLength = TEST_SIZE_MB * 1024 * 1024;
  
              while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                      finishTest();
                      break;
                  }
                  loadedBytes += value.length;
                  updateSpeed(loadedBytes);

                  const percent = Math.min((loadedBytes / contentLength) * 100, 100);
                  progressFill.style.width = percent + '%';
              }
          } catch (err) {
              if (err.name === 'AbortError') {
                  statusText.innerText = "测速已中止";
              } else {
                  console.error(err);
                  statusText.innerText = "网络错误";
                  stopTest(true);
              }
          }
      }
  
      function updateSpeed(bytes) {
          const now = performance.now();
          const duration = (now - startTime) / 1000;
          if (duration <= 0) return;
          
          const bits = bytes * 8;
          const bps = bits / duration;
          const mbps = bps / (1024 * 1024);
          
          speedDisplay.innerText = mbps.toFixed(2);
      }
  
      function stopTest(isError = false) {
          if (abortController) {
              abortController.abort();
              abortController = null;
          }
          isRunning = false;
          actionBtn.innerHTML = ICON_RESET;
          if (!isError) statusText.innerText = "已手动停止";
      }
  
      function finishTest() {
          isRunning = false;
          isFinished = true;
          actionBtn.innerHTML = ICON_RESET;
          statusText.innerText = "测速完成";
          progressFill.style.width = '100%';
      }
  </script>
  </body>
  </html>`;
  }
