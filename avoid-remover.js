/* Shared edge-connected background removal algorithm from the Top 10 editor. */
function processImageBackgroundRemoval(imgSource, options = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = reject;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) return resolve(imgSource);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const mode = options.mode || 'auto';
      const tolerance = options.tolerance !== undefined ? options.tolerance : 0.28;
      const choke = options.choke !== undefined ? options.choke : 1;
      const crop = options.crop !== undefined ? options.crop : true;

      let tr = 255, tg = 255, tb = 255;
      if (mode === 'white') {
        tr = 255; tg = 255; tb = 255;
      } else if (mode === 'black') {
        tr = 0; tg = 0; tb = 0;
      } else if (mode === 'color' && options.targetColor) {
        tr = options.targetColor.r;
        tg = options.targetColor.g;
        tb = options.targetColor.b;
      } else {
        const cornerCoords = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
        let sumR = 0, sumG = 0, sumB = 0, validSamples = 0;
        cornerCoords.forEach(([cx, cy]) => {
          const idx = (cy * w + cx) * 4;
          if (data[idx + 3] > 20) {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            validSamples++;
          }
        });
        if (validSamples > 0) {
          tr = Math.round(sumR / validSamples);
          tg = Math.round(sumG / validSamples);
          tb = Math.round(sumB / validSamples);
        }
      }

      function colorDist(idx) {
        const dr = data[idx] - tr;
        const dg = data[idx + 1] - tg;
        const db = data[idx + 2] - tb;
        return Math.sqrt(dr * dr + dg * dg + db * db) / 441.673;
      }

      const visited = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let head = 0, tail = 0;

      for (let x = 0; x < w; x++) {
        [0, h - 1].forEach(y => {
          const idx = y * w + x;
          const pIdx = idx * 4;
          if (!visited[idx] && (data[pIdx + 3] === 0 || colorDist(pIdx) <= tolerance)) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        });
      }
      for (let y = 0; y < h; y++) {
        [0, w - 1].forEach(x => {
          const idx = y * w + x;
          const pIdx = idx * 4;
          if (!visited[idx] && (data[pIdx + 3] === 0 || colorDist(pIdx) <= tolerance)) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        });
      }

      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        const neighbors = [
          cx > 0 ? curr - 1 : -1,
          cx < w - 1 ? curr + 1 : -1,
          cy > 0 ? curr - w : -1,
          cy < h - 1 ? curr + w : -1
        ];

        for (let i = 0; i < 4; i++) {
          const nIdx = neighbors[i];
          if (nIdx !== -1 && !visited[nIdx]) {
            const pIdx = nIdx * 4;
            if (data[pIdx + 3] === 0 || colorDist(pIdx) <= tolerance) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            }
          }
        }
      }

      for (let i = 0; i < w * h; i++) {
        if (visited[i]) data[i * 4 + 3] = 0;
      }

      if (choke > 0) {
        for (let pass = 0; pass < choke; pass++) {
          const toErase = [];
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              const pIdx = idx * 4;
              if (data[pIdx + 3] > 0) {
                const hasTrans = 
                  data[(idx - 1) * 4 + 3] === 0 ||
                  data[(idx + 1) * 4 + 3] === 0 ||
                  data[(idx - w) * 4 + 3] === 0 ||
                  data[(idx + w) * 4 + 3] === 0;

                if (hasTrans && colorDist(pIdx) <= tolerance * 1.45) {
                  toErase.push(pIdx);
                }
              }
            }
          }
          toErase.forEach(p => { data[p + 3] = 0; });
        }
      }

      ctx.putImageData(imgData, 0, 0);

      let outCanvas = canvas;
      if (crop) {
        let minX = w, minY = h, maxX = 0, maxY = 0;
        let hasVisible = false;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const a = data[(y * w + x) * 4 + 3];
            if (a > 15) {
              hasVisible = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (hasVisible && (minX > 1 || minY > 1 || maxX < w - 2 || maxY < h - 2)) {
          const cropW = Math.max(1, maxX - minX + 1);
          const cropH = Math.max(1, maxY - minY + 1);
          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = cropW;
          croppedCanvas.height = cropH;
          const croppedCtx = croppedCanvas.getContext('2d');
          croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
          outCanvas = croppedCanvas;
        }
      }

      resolve(outCanvas.toDataURL('image/png'));
    };
    img.src = imgSource;
  });
}
