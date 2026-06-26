/**
 * Signature to Vector — Script
 * Konversi gambar tanda tangan ke vektor SVG
 * 100% client-side, tanpa backend.
 */

(function () {
  'use strict';

  // ────────────── DOM refs ──────────────
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadSection = document.getElementById('uploadSection');
  const editorSection = document.getElementById('editorSection');
  const originalImage = document.getElementById('originalImage');
  const vectorPreview = document.getElementById('vectorPreview');
  const vectorContainer = document.getElementById('vectorContainer');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');
  const btnDownloadSVG = document.getElementById('btnDownloadSVG');
  const btnCopySVG = document.getElementById('btnCopySVG');
  const btnBack = document.getElementById('btnBack');
  const downloadBadge = document.getElementById('downloadBadge');
  const vectorInfo = document.getElementById('vectorInfo');
  const infoPaths = document.getElementById('infoPaths');
  const infoSize = document.getElementById('infoSize');

  let currentImage = null;
  let currentSVG = null;

  // ────────────── Toast ──────────────
  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ────────────── Upload handling ──────────────
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar (PNG, JPG, dll)!', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file maksimal 10 MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        showEditor(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Paste from clipboard
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        handleFile(blob);
        break;
      }
    }
  });

  // ────────────── Show editor ──────────────
  function showEditor(img) {
    uploadSection.style.display = 'none';
    editorSection.style.display = 'block';
    originalImage.src = img.src;
    setTimeout(() => vectorize(), 100);
  }

  // ────────────── Image processing ──────────────
  function getGrayscaleData(img, threshold) {
    const canvas = document.createElement('canvas');
    // Limit max dimension for performance
    const MAX_DIM = 1200;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > MAX_DIM || h > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;

    // Binary data array
    const binary = new Uint8Array(w * h);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // Convert to grayscale
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      // Invert: signatures are usually dark on light, so dark = foreground
      binary[i / 4] = gray < threshold ? 1 : 0;
    }

    return { binary, width: w, height: h };
  }

  // ────────────── Contour tracing (Moore neighborhood) ──────────────
  function findContours(binary, width, height) {
    const visited = new Uint8Array(width * height);
    const contours = [];

    // 8-connected neighbors
    const dirs = [
      [1, 0], [1, -1], [0, -1], [-1, -1],
      [-1, 0], [-1, 1], [0, 1], [1, 1]
    ];

    function getIdx(x, y) {
      return y * width + x;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = getIdx(x, y);
        if (binary[idx] === 0 || visited[idx]) continue;

        // Found start of a new contour
        const contour = [];
        let cx = x;
        let cy = y;
        let startDir = 0;

        // Find first boundary pixel
        // Walk around the border
        const points = [];

        // Use a simpler approach: collect all connected foreground pixels
        // then extract boundary
        const stack = [[x, y]];
        visited[idx] = 1;
        const blob = [];

        while (stack.length > 0) {
          const [px, py] = stack.pop();
          blob.push([px, py]);

          for (let d = 0; d < 8; d++) {
            const nx = px + dirs[d][0];
            const ny = py + dirs[d][1];
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const nidx = getIdx(nx, ny);
            if (binary[nidx] === 1 && !visited[nidx]) {
              visited[nidx] = 1;
              stack.push([nx, ny]);
            }
          }
        }

        // Skip very small blobs (noise)
        if (blob.length < 5) continue;

        // Find boundary pixels
        const boundary = [];
        for (const [px, py] of blob) {
          let isBoundary = false;
          for (let d = 0; d < 8; d++) {
            const nx = px + dirs[d][0];
            const ny = py + dirs[d][1];
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
              isBoundary = true;
              break;
            }
            if (binary[getIdx(nx, ny)] === 0) {
              isBoundary = true;
              break;
            }
          }
          if (isBoundary) boundary.push([px, py]);
        }

        if (boundary.length < 5) continue;

        // Order boundary points by tracing
        const ordered = traceBoundary(boundary, width, height, binary, visited);
        if (ordered.length >= 5) {
          contours.push(ordered);
        }
      }
    }

    return contours;
  }

  function traceBoundary(points, width, height, binary, visited) {
    if (points.length === 0) return [];

    const dirs = [
      [1, 0], [1, -1], [0, -1], [-1, -1],
      [-1, 0], [-1, 1], [0, 1], [1, 1]
    ];

    const pointSet = new Set(points.map(p => p[0] + ',' + p[1]));
    const ordered = [];

    // Start from leftmost-topmost boundary point
    points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let [cx, cy] = points[0];
    ordered.push([cx, cy]);
    pointSet.delete(cx + ',' + cy);

    while (pointSet.size > 0) {
      let found = false;
      // Search nearby
      for (let d = 0; d < 8; d++) {
        const nx = cx + dirs[d][0];
        const ny = cy + dirs[d][1];
        const key = nx + ',' + ny;
        if (pointSet.has(key)) {
          pointSet.delete(key);
          ordered.push([nx, ny]);
          cx = nx;
          cy = ny;
          found = true;
          break;
        }
      }
      if (!found) {
        // Search wider
        for (let r = 2; r <= 5; r++) {
          for (const p of points) {
            if (pointSet.has(p[0] + ',' + p[1])) {
              const dx = p[0] - cx;
              const dy = p[1] - cy;
              if (Math.abs(dx) <= r && Math.abs(dy) <= r) {
                pointSet.delete(p[0] + ',' + p[1]);
                ordered.push([p[0], p[1]]);
                cx = p[0];
                cy = p[1];
                found = true;
                break;
              }
            }
          }
          if (found) break;
        }
      }
      if (!found) break; // can't continue
    }

    // Close the contour
    if (ordered.length > 0) {
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ordered.push([first[0], first[1]]);
      }
    }

    return ordered;
  }

  // ────────────── Ramer-Douglas-Peucker simplification ──────────────
  function simplifyPath(points, epsilon) {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let maxIdx = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = perpendicularDistance(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
      const right = simplifyPath(points.slice(maxIdx), epsilon);
      return left.slice(0, -1).concat(right);
    }

    return [first, last];
  }

  function perpendicularDistance(point, lineStart, lineEnd) {
    const [x, y] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
    return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / mag;
  }

  // ────────────── SVG Path generation ──────────────
  function pointsToSVGPath(points) {
    if (points.length < 2) return '';
    let d = 'M ' + points[0][0] + ' ' + points[0][1];
    for (let i = 1; i < points.length; i++) {
      d += ' L ' + points[i][0] + ' ' + points[i][1];
    }
    d += ' Z';
    return d;
  }

  // Smooth path using quadratic curves
  function pointsToSmoothSVGPath(points) {
    if (points.length < 2) return '';

    if (points.length === 2) {
      return 'M ' + points[0][0] + ' ' + points[0][1] +
             ' L ' + points[1][0] + ' ' + points[1][1] + ' Z';
    }

    let d = 'M ' + points[0][0] + ' ' + points[0][1];

    for (let i = 0; i < points.length - 2; i++) {
      const xc = (points[i][0] + points[i + 1][0]) / 2;
      const yc = (points[i][1] + points[i + 1][1]) / 2;
      d += ' Q ' + points[i][0] + ' ' + points[i][1] + ', ' + xc + ' ' + yc;
    }

    // Last segment
    const last = points.length - 1;
    d += ' Q ' + points[last - 1][0] + ' ' + points[last - 1][1] + ', ' +
         points[last][0] + ' ' + points[last][1];

    d += ' Z';
    return d;
  }

  // ────────────── Main vectorization ──────────────
  function vectorize() {
    if (!currentImage) return;

    // Show loading
    vectorPreview.innerHTML = '<div class="spinner"></div>';
    vectorInfo.style.display = 'none';

    // Use requestAnimationFrame to let spinner render
    requestAnimationFrame(() => {
      setTimeout(() => {
        runVectorization();
      }, 30);
    });
  }

  function runVectorization() {
    const quality = parseInt(qualitySlider.value);

    // Threshold mapping: quality 1-10 → threshold 60-220
    const threshold = 60 + (10 - quality) * 17.8; // higher quality = lower threshold for more detail
    // Simplify epsilon: lower quality = more simplification
    const epsilon = (10 - quality) * 0.8 + 0.3;

    const { binary, width, height } = getGrayscaleData(currentImage, threshold);
    const contours = findContours(binary, width, height);

    // Build SVG
    const svgParts = [];
    let totalPaths = 0;

    for (const contour of contours) {
      // Simplify
      const simplified = simplifyPath(contour, epsilon);
      if (simplified.length < 3) continue;

      // Generate smooth path
      const pathData = pointsToSmoothSVGPath(simplified);
      if (pathData) {
        svgParts.push('<path d="' + pathData + '" />');
        totalPaths++;
      }
    }

    const svgString =
      '<svg xmlns="http://www.w3.org/2000/svg" ' +
      'viewBox="0 0 ' + width + ' ' + height + '" ' +
      'width="' + width + '" height="' + height + '">\n' +
      '  <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n' +
      '    ' + svgParts.join('\n    ') + '\n' +
      '  </g>\n' +
      '</svg>';

    currentSVG = svgString;

    // Display
    vectorPreview.innerHTML = svgString;

    // Update info
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const sizeKB = (blob.size / 1024).toFixed(1);

    infoPaths.textContent = totalPaths;
    infoSize.textContent = sizeKB + ' KB';
    vectorInfo.style.display = 'flex';
    downloadBadge.style.display = 'inline-block';
  }

  // ────────────── Quality slider ──────────────
  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value;
  });

  qualitySlider.addEventListener('change', () => {
    if (currentImage) vectorize();
  });

  // ────────────── Download ──────────────
  btnDownloadSVG.addEventListener('click', () => {
    if (!currentSVG) return;
    const blob = new Blob([currentSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tanda-tangan.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SVG berhasil diunduh! ✨', 'success');
  });

  // ────────────── Copy SVG ──────────────
  btnCopySVG.addEventListener('click', async () => {
    if (!currentSVG) return;
    try {
      await navigator.clipboard.writeText(currentSVG);
      showToast('Kode SVG disalin ke clipboard! 📋', 'success');
    } catch {
      showToast('Gagal menyalin SVG 😔', 'error');
    }
  });

  // ────────────── Back button ──────────────
  btnBack.addEventListener('click', () => {
    editorSection.style.display = 'none';
    uploadSection.style.display = 'block';
    currentImage = null;
    currentSVG = null;
    downloadBadge.style.display = 'none';
    vectorInfo.style.display = 'none';
    vectorPreview.innerHTML = '';
  });

  // ────────────── Keyboard shortcuts ──────────────
  document.addEventListener('keydown', (e) => {
    // Ctrl+S to download
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && currentSVG) {
      e.preventDefault();
      btnDownloadSVG.click();
    }
  });

})();
