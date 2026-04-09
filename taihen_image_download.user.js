// ==UserScript==
// @name        Taihen Image Download
// @namespace   TaihenImageDownload
// @match       https://hentaiforce.net/view/*
// @match       https://nhentai.com/*/comic/*
// @exclude     https://nhentai.com/*/comic/*/reader/*
// @match       https://nhentai.xxx/g/*
// @match       https://*.hentai.name/g/*
// @match       https://allporncomic.com/porncomic/*/*
// @grant       GM_xmlhttpRequest
// @connect     *
// @version     1.2.1
// @require     https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js
// @downloadURL https://raw.githubusercontent.com/sirhvd/sirhvd.github.io/refs/heads/main/taihen_image_download.user.js
// @updateURL   https://raw.githubusercontent.com/sirhvd/sirhvd.github.io/refs/heads/main/taihen_image_download.meta.js
// @author      HVD
// ==/UserScript==

(async function () {
    'use strict';

    const MAX_PER_ZIP = 200;
    const MAX_CONCURRENT = 5;

    const siteConfigs = [
        {
            match: (host) => host.includes('hentaiforce.net'),
            imgSelector: '#gallery-pages img',
            titleSelector: '#gallery-main-info h1',
            processUrls: (url) => [url.replace(/t(\.(?:jpg|jpeg|png|webp))(?:\?.*)?$/i, '$1')]
        },
        {
            match: (host) => host.includes('nhentai.com'),
            imgSelector: '.comic-gallery > .gallery-image img',
            titleSelector: '.comic-title',
            onLoad: async () => {
                const wrapHistoryMethod = (method) => {
                    const original = history[method];
                    history[method] = function(...args) {
                        const result = original.apply(this, args);
                        const btnDownload = document.getElementById('custom-btn-download');
                        if (btnDownload) {
                            const isReader = window.location.pathname.includes('/reader/');
                            btnDownload.style.visibility = isReader ? 'hidden' : 'visible';
                        }
                        return result;
                    };
                };
                wrapHistoryMethod('pushState');
                wrapHistoryMethod('replaceState');
            },
            processUrls: (url) => [url.replace('/thumbnails/', '/images/').split('?')[0]]
        },
        {
            match: (host) => host.includes('hentai.name'),
            imgSelector: '#thumbnail-container .gallerythumb img',
            titleSelector: '#info h1',
            processUrls: (url) => [url.replace('_thumb', '').split('?')[0]]
        },
        {
            match: (host) => host.includes('nhentai.xxx'),
            imgSelector: '#thumbs_append img',
            titleSelector: '.info h1',
            beforeQuery: async () => {
                document.querySelector('#show_all').click();
                await new Promise(r => setTimeout(r, 2000));
            },
            processUrls: (url) => {
                const baseUrl = url.replace(/t\.(?:jpg|jpeg|png|webp)(?:\?.*)?$/i, '');
                return ['.png', '.webp', '.jpg', '.jpeg'].map(ext => baseUrl + ext);
            }
        },
        {
            match: (host) => host.includes('allporncomic.com'),
            imgSelector: '.reading-content img',
            titleSelector: '.single-chapter-select option[selected]'
        }
    ];

    const host = window.location.hostname;
    const currentConfig = siteConfigs.find(site => site.match(host));
    if (!currentConfig) return;

    const updateBtnText = (text) => {
        const textSpan = document.getElementById('btn-text-content');
        if (textSpan) textSpan.innerText = text;
    };

    const fetchImageData = (url) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "arraybuffer",
                timeout: 10000,
                onload: (res) => resolve({ data: res.status === 200 ? new Uint8Array(res.response) : null, status: res.status }),
                onerror: () => resolve({ data: null, status: 0 }),
                ontimeout: () => resolve({ data: null, status: 0 }),
                onabort: () => resolve({ data: null, status: 0 })
            });
        });
    };

    const createZipAsync = (zipData, filename, btnEl) => {
        return new Promise((resolve, reject) => {
            updateBtnText(`Đang nén ${filename}...`);
            fflate.zip(zipData, { level: 0 }, (err, zipped) => {
                if (err) return reject(err);

                const blob = new Blob([zipped], { type: 'application/zip' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                link.click();

                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
                resolve();
            });
        });
    };

    const bearSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="20" height="20"><circle cx="110" cy="140" r="70" fill="#a4d3ee" stroke="#000" stroke-width="25"/><circle cx="95" cy="125" r="35" fill="#77b3d4"/><circle cx="390" cy="140" r="70" fill="#a4d3ee" stroke="#000" stroke-width="25"/><circle cx="405" cy="125" r="35" fill="#77b3d4"/><circle cx="250" cy="270" r="190" fill="#a4d3ee" stroke="#000" stroke-width="25"/><circle cx="250" cy="340" r="95" fill="#ffffff" stroke="#000" stroke-width="20"/><path d="M 150 225 L 220 225 C 220 265, 150 265, 150 225 Z" fill="#000"/><path d="M 280 225 L 350 225 C 350 265, 280 265, 280 225 Z" fill="#000"/><path d="M 225 285 C 240 280, 260 280, 275 285 C 285 300, 265 310, 250 310 C 235 310, 215 300, 225 285 Z" fill="#000"/><line x1="250" y1="305" x2="250" y2="345" stroke="#000" stroke-width="15" stroke-linecap="round"/><line x1="215" y1="345" x2="285" y2="345" stroke="#000" stroke-width="18" stroke-linecap="round"/></svg>`;
    const loopySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="20" height="20"><path d="M 250 100 Q 260 50 280 40 Q 265 60 255 100 Z" fill="#eb6b56"/><path d="M 245 90 Q 230 60 260 70 Q 250 80 245 90 Z" fill="#eb6b56"/><circle cx="120" cy="150" r="35" fill="#fca1b0"/><circle cx="120" cy="145" r="15" fill="#e8eef2"/><circle cx="380" cy="150" r="35" fill="#fca1b0"/><circle cx="380" cy="145" r="15" fill="#e8eef2"/><path d="M 150 150 C 200 120 300 120 350 150 C 420 220 480 350 350 450 C 300 480 200 480 150 450 C 20 350 80 220 150 150 Z" fill="#ff94a5"/><circle cx="190" cy="260" r="20" fill="#2b0a0a"/><circle cx="185" cy="255" r="5" fill="#ffffff"/><circle cx="310" cy="260" r="20" fill="#2b0a0a"/><circle cx="305" cy="255" r="5" fill="#ffffff"/><ellipse cx="250" cy="320" rx="45" ry="35" fill="#4a0f35"/><ellipse cx="240" cy="305" rx="15" ry="8" fill="#a2578b" opacity="0.6"/><path d="M 210 390 Q 250 410 290 390" stroke="#3d141e" stroke-width="20" stroke-linecap="round" fill="none"/><rect x="235" y="380" width="30" height="15" rx="5" fill="#ffffff"/></svg>`;

    const btn = document.createElement('button');
    btn.innerHTML = `${bearSvg} <span id="btn-text-content">Download ZIP</span> ${loopySvg}`;
    btn.id = 'custom-btn-download';
    btn.style.cssText = `
        position: fixed; bottom: 10px; right: 10px; z-index: 9999;
        padding: 10px 10px; background: #007bff; color: white;
        border: none; border-radius: 5px; cursor: pointer;
        font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: 0.3s;
        display: flex; align-items: center; gap: 4px;
    `;
    document.body.appendChild(btn);

    if (typeof currentConfig.onLoad=== 'function') {
        try { await currentConfig.onLoad(); } catch (e) { console.error(e); }
    }

    btn.onclick = async () => {
        btn.disabled = true;

        if (typeof currentConfig.beforeQuery=== 'function') {
            updateBtnText('Đang xử lý trang...');
            try { await currentConfig.beforeQuery(); } catch (e) { console.error(e); }
        }

        const imgs = document.querySelectorAll(currentConfig.imgSelector);
        if (!imgs.length) {
            alert('Không tìm thấy ảnh nào!');
            btn.disabled = false;
            updateBtnText('Download ZIP');
            return;
        }

        const titleEl = currentConfig.titleSelector ? document.querySelector(currentConfig.titleSelector) : null;

        let baseZipName = (titleEl ? titleEl.textContent : document.title)
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/[\\/:*?"<>|]/g, '_');

        const totalImages = imgs.length;
        const needsChunking = totalImages > MAX_PER_ZIP;
        let globalErrorCount = 0;
        let globalSuccessCount = 0;

        const tasks = Array.from(imgs).map((img, index) => ({ img, index }));

        const chunks = [];
        for (let i = 0; i < tasks.length; i += MAX_PER_ZIP) {
            chunks.push(tasks.slice(i, i + MAX_PER_ZIP));
        }

        let partNumber = 1;
        for (const chunk of chunks) {
            let zipData = {};
            let completedInChunk = 0;
            await new Promise((resolve) => {
                let currentTaskIndex = 0;
                let activeWorkers = 0;

                const nextTask = async () => {
                    if (currentTaskIndex >= chunk.length) {
                        if (activeWorkers === 0) resolve();
                        return;
                    }

                    const task = chunk[currentTaskIndex++];
                    activeWorkers++;

                    const { img, index: i } = task;
                    const src = img.getAttribute('data-src') || img.getAttribute('src') || img.currentSrc;

                    if (src) {
                        const urlsToTry = currentConfig.processUrls ? currentConfig.processUrls(src) : [src];
                        let downloadedData = null;
                        let finalUrl = '';

                        for (const targetUrl of urlsToTry) {
                            let retries = 3;
                            while (retries > 0) {
                                const res = await fetchImageData(targetUrl);
                                if (res.data) { downloadedData = res.data; finalUrl = targetUrl; break; }
                                if (res.status === 404) break;
                                retries--;
                                if (retries > 0) await new Promise(r => setTimeout(r, 2000));
                            }
                            if (downloadedData) break;
                        }

                        if (downloadedData) {
                            const ext = finalUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.jpg';
                            const filename = `${String(i + 1).padStart(3, '0')}${ext}`;
                            zipData[filename] = downloadedData;
                            globalSuccessCount++;
                        } else {
                            globalErrorCount++;
                            console.warn(`Bỏ qua ảnh ${i + 1}`);
                        }
                    }

                    completedInChunk++;
                    updateBtnText(`Đang tải ${needsChunking ? `Part ${partNumber}` : 'ảnh'}... (${completedInChunk}/${chunk.length}) - Lỗi: ${globalErrorCount}`);

                    activeWorkers--;
                    nextTask();
                };

                for (let w = 0; w < MAX_CONCURRENT && w < chunk.length; w++) {
                    nextTask();
                }
            });

            if (Object.keys(zipData).length > 0) {
                try {
                    let zipName = needsChunking ? `${baseZipName}_Part${partNumber}.zip` : `${baseZipName}.zip`;
                    await createZipAsync(zipData, zipName, btn);
                    zipData = null; // Giải phóng RAM
                } catch (e) {
                    alert('Lỗi nén file: ' + e.message);
                }
            }
            partNumber++;
        }

        if (globalSuccessCount === 0) {
            alert('Không có ảnh nào tải thành công. Vui lòng kiểm tra lại!');
        } else {
            updateBtnText(globalErrorCount > 0 ? `Xong! (Lỗi ${globalErrorCount} ảnh)` : 'Xong!');
        }

        setTimeout(() => {
            updateBtnText('Download ZIP');
            btn.disabled = false;
        }, 4000);
    };
})();
