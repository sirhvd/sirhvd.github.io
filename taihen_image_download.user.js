// ==UserScript==
// @name        Taihen Image Download
// @namespace   TaihenImageDownload
// @match       https://hentaiforce.net/*
// @match       https://nhentai.com/*
// @match       https://*.hentai.name/*
// @match       https://nhentai.net/*
// @match       https://nhentai.xxx/*
// @match       https://allporncomic.com/*
// @match       https://kissmanga.in/kissmanga/*/*/
// @match       https://asmhentai.com/*
// @match       https://www.pixiv.net/*
// @match       https://www.hentaivnx.com/*
// @match       https://hentai18.net/*
// @include     /^[^:]*?:\/\/[^\/]*?hentai[^\/]*?\/.*?$/
// @grant       GM_xmlhttpRequest
// @version     1.7.0
// @require     https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js
// @downloadURL https://raw.githubusercontent.com/sirhvd/sirhvd.github.io/refs/heads/main/taihen_image_download.user.js
// @updateURL   https://raw.githubusercontent.com/sirhvd/sirhvd.github.io/refs/heads/main/taihen_image_download.meta.js
// @author      HVD
// ==/UserScript==

(async function () {
    'use strict';

    const MAX_PER_ZIP = 250;
    const MAX_CONCURRENT = 15;

    const siteConfigs = [
        {
            match: (host) => host.includes('hentaiforce.net'),
            imgSelector: '#gallery-pages img',
            titleSelector: '#gallery-main-info h1',
            showWhen: (url) => /\/view\/\d+\/?$/.test(url.split(/[?#]/)[0]),
            processUrls: (url) => [url.replace(/t(\.(?:jpg|jpeg|png|webp))(?:\?.*)?$/i, '$1')],
            fallbackServers: true
        },
        {
            match: (host) => host.includes('nhentai.com'),
            imgSelector: '.comic-gallery > .gallery-image img',
            titleSelector: '.comic-title',
            showWhen: (url) => /\/comic\/[a-zA-Z0-9\-]+\/?$/.test(url.split(/[?#]/)[0]),
            processUrls: (url) => [url.replace('/thumbnails/', '/images/').split('?')[0]]
        },
        {
            match: (host) => host.includes('hentai.name'),
            imgSelector: '#thumbnail-container .gallerythumb img',
            titleSelector: '#info h1',
            showWhen: (url) => /\/g\/\d+\/?$/.test(url.split(/[?#]/)[0]),
            processUrls: (url) => [url.replace('_thumb', '').split('?')[0]]
        },
        {
            match: (host) => host.includes('nhentai.net'),
            imgSelector: '#thumbnail-container .gallerythumb img',
            titleSelector: '#info h1',
            showWhen: (url) => /\/g\/\d+\/?$/.test(url.split(/[?#]/)[0]),
            processUrls: (url) => [url.replace(/\/\/t(\d+)/, '//i$1').replace(/t(\.[a-zA-Z]+)$/, '$1')],
            fallbackServers: true
        },
        {
            match: (host) => host.includes('nhentai.xxx'),
            imgSelector: '#thumbs_append img',
            titleSelector: '.info h1',
            showWhen: (url) => /\/g\/\d+\/?$/.test(url.split(/[?#]/)[0]),
            beforeQuery: async () => {
                const showAllBtn = document.querySelector('#show_all');
                if (showAllBtn) {
                    showAllBtn.click();
                    await new Promise(r => setTimeout(r, 2000));
                }
            },
            processUrls: (url) => {
                const baseUrl = url.replace(/t\.(?:jpg|jpeg|png|webp)(?:\?.*)?$/i, '');
                return ['.png', '.webp', '.jpg', '.jpeg'].map(ext => baseUrl + ext);
            },
            fallbackServers: true
        },
        {
            match: (host) => host.includes('allporncomic.com'),
            imgSelector: '.reading-content img',
            titleSelector: '.single-chapter-select option[selected]',
            showWhen: (url) => /\/porncomic\/[a-zA-Z0-9\-]+\/[a-zA-Z0-9\-]+\/?$/.test(url.split(/[?#]/)[0]),
        },
        {
            match: (host) => host.includes('kissmanga.in'),
            imgSelector: '.reading-content img.wp-manga-chapter-img',
            titleSelector: 'title',
            showWhen: (url) => /\/kissmanga\/[a-zA-Z0-9\-]+\/[a-zA-Z0-9\-]+\/?$/.test(url.split(/[?#]/)[0]),
        },
        {
            match: (host) => host.includes('asmhentai.com'),
            imgSelector: '#append_thumbs img',
            titleSelector: 'title',
            showWhen: (url) => /\/g\/\d+\/?$/.test(url.split(/[?#]/)[0]),
            beforeQuery: async () => {
                const showAllBtn = document.querySelector('#load_all');
                if (showAllBtn) {
                    showAllBtn.click();
                    await new Promise(r => setTimeout(r, 2000));
                }
            },
            processUrls: (url) => {
                const baseUrl = url.replace(/t\.(?:jpg|jpeg|png|webp)(?:\?.*)?$/i, '');
                return ['.png', '.webp', '.jpg', '.jpeg'].map(ext => baseUrl + ext);
            },
        },
        {
            match: (host) => host.includes('pixiv.net'),
            imgSelector: 'a.gtm-expand-full-size-illust',
            titleSelector: 'h1',
            showWhen: (url) => /\/artworks\/\d+\/?$/.test(url.split(/[?#]/)[0]),
            beforeQuery: async () => {
                const showAllBtn = document.querySelector('.sc-f8e29b57-2.kvdUW');
                if (showAllBtn) {
                    showAllBtn.click();
                    await new Promise(r => setTimeout(r, 2000));
                }
            },
        },
        {
            match: (host) => host.includes('hentaivnx.com'),
            imgSelector: '.page-chapter img',
            titleSelector: 'h1',
            showWhen: (url) => /\/truyen-hentai\/[^\/]+\/[^\/]+\/\d+\/?$/.test(url.split(/[?#]/)[0]),
        },
        {
            match: (host) => host.includes('hentai18.net'),
            imgSelector: '.chapter-content .item-photo img',
            titleSelector: 'h1',
            showWhen: (url) => /\/read-hentai\/[a-zA-Z0-9\-]+?$/.test(url.split(/[?#]/)[0]),
        },
        {
            match: (host) => host.includes('vi-hentai.pro'),
            imgSelector: '.image-container img',
            showWhen: (url) => /\/truyen\/[a-zA-Z0-9\-]+\/[a-zA-Z0-9\-]+\/?$/.test(url.split(/[?#]/)[0]),
        },
        // Fallback config cho mọi trang có "hentai" trong tên miền
        {
            match: (host) => host.includes('hentai'),
            imgSelector: 'img',
            titleSelector: 'title',
            showWhen: (url) => true,
        }
    ];

    const host = window.location.hostname;
    const currentConfig = siteConfigs.find(site => site.match(host));
    if (!currentConfig) return;

    let isDownloading = false;
    let pickerActive = false;

    const updateBtnText = (text) => {
        const textSpan = document.getElementById('btn-text-content');
        if (textSpan) textSpan.innerText = text;
    };

    const bearSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="20" height="20"><circle cx="110" cy="140" r="70" fill="#a4d3ee" stroke="#000" stroke-width="25"/><circle cx="95" cy="125" r="35" fill="#77b3d4"/><circle cx="390" cy="140" r="70" fill="#a4d3ee" stroke="#000" stroke-width="25"/><circle cx="405" cy="125" r="35" fill="#77b3d4"/><circle cx="250" cy="270" r="190" fill="#a4d3ee" stroke="#000" stroke-width="25"/><circle cx="250" cy="340" r="95" fill="#ffffff" stroke="#000" stroke-width="20"/><path d="M 150 225 L 220 225 C 220 265, 150 265, 150 225 Z" fill="#000"/><path d="M 280 225 L 350 225 C 350 265, 280 265, 280 225 Z" fill="#000"/><path d="M 225 285 C 240 280, 260 280, 275 285 C 285 300, 265 310, 250 310 C 235 310, 215 300, 225 285 Z" fill="#000"/><line x1="250" y1="305" x2="250" y2="345" stroke="#000" stroke-width="15" stroke-linecap="round"/><line x1="215" y1="345" x2="285" y2="345" stroke="#000" stroke-width="18" stroke-linecap="round"/></svg>`;
    const loopySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="20" height="20"><path d="M 250 100 Q 260 50 280 40 Q 265 60 255 100 Z" fill="#eb6b56"/><path d="M 245 90 Q 230 60 260 70 Q 250 80 245 90 Z" fill="#eb6b56"/><circle cx="120" cy="150" r="35" fill="#fca1b0"/><circle cx="120" cy="145" r="15" fill="#e8eef2"/><circle cx="380" cy="150" r="35" fill="#fca1b0"/><circle cx="380" cy="145" r="15" fill="#e8eef2"/><path d="M 150 150 C 200 120 300 120 350 150 C 420 220 480 350 350 450 C 300 480 200 480 150 450 C 20 350 80 220 150 150 Z" fill="#ff94a5"/><circle cx="190" cy="260" r="20" fill="#2b0a0a"/><circle cx="185" cy="255" r="5" fill="#ffffff"/><circle cx="310" cy="260" r="20" fill="#2b0a0a"/><circle cx="305" cy="255" r="5" fill="#ffffff"/><ellipse cx="250" cy="320" rx="45" ry="35" fill="#4a0f35"/><ellipse cx="240" cy="305" rx="15" ry="8" fill="#a2578b" opacity="0.6"/><path d="M 210 390 Q 250 410 290 390" stroke="#3d141e" stroke-width="20" stroke-linecap="round" fill="none"/><rect x="235" y="380" width="30" height="15" rx="5" fill="#ffffff"/></svg>`;

    // Tạo nút
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        position: fixed; bottom: 10px; right: 10px; z-index: 9999;
        display: flex; gap: 8px; align-items: center;
    `;

    const btn = document.createElement('button');
    btn.innerHTML = `${bearSvg} <span id="btn-text-content">Download ZIP</span> ${loopySvg}`;
    btn.id = 'custom-btn-download';
    btn.style.cssText = `
        padding: 10px 10px; background: #007bff; color: white;
        border: none; border-radius: 5px; cursor: pointer;
        font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: 0.3s;
        display: flex; align-items: center; gap: 4px;
    `;
    buttonContainer.appendChild(btn);

    const pickBtn = document.createElement('button');
    pickBtn.innerHTML = '🎯 Pick Element';
    pickBtn.id = 'pick-btn';
    pickBtn.style.cssText = `
        padding: 10px; background: #28a745 !important;
        color: white !important;
        border: none; border-radius: 5px; cursor: pointer;
        font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        outline: none !important;
        transition: 0.3s;
    `;
    pickBtn.addEventListener('focus', () => {
        pickBtn.style.background = '#28a745';
        pickBtn.style.color = 'white';
    });
    pickBtn.addEventListener('mousedown', () => {
        pickBtn.style.background = '#28a745';
        pickBtn.style.color = 'white';
    });
    buttonContainer.appendChild(pickBtn);

    document.body.appendChild(buttonContainer);

    // === Hàm fetchImageData với cookie và header đầy đủ ===
    const fetchImageData = (url) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "arraybuffer",
                timeout: 15000,
                headers: {
                    "Referer": window.location.href,
                    "Origin": window.location.origin,
                    "User-Agent": navigator.userAgent,
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    "Cache-Control": "no-cache",
                    "Cookie": document.cookie
                },
                onload: (res) => resolve({ data: res.status === 200 ? new Uint8Array(res.response) : null, status: res.status }),
                onerror: () => resolve({ data: null, status: 0 }),
                ontimeout: () => resolve({ data: null, status: 0 }),
                onabort: () => resolve({ data: null, status: 0 })
            });
        });
    };

    const createZipAsync = (zipData, filename) => {
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

    // === Hàm tải ảnh chính ===
    async function downloadImages(imageElements = null, mode = 'all') {
        if (isDownloading) return;
        isDownloading = true;
        btn.disabled = true;

        let imgs;
        if (imageElements) {
            imgs = imageElements instanceof NodeList ? Array.from(imageElements) : imageElements;
        } else {
            if (typeof currentConfig.beforeQuery === 'function') {
                updateBtnText('Đang xử lý trang...');
                try { await currentConfig.beforeQuery(); } catch (e) { console.error(e); }
            }
            imgs = document.querySelectorAll(currentConfig.imgSelector);
        }

        if (!imgs || !imgs.length) {
            alert('Không tìm thấy ảnh nào!');
            btn.disabled = false;
            isDownloading = false;
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
        let lastSuccessfulExt = null;
        let failedImages = [];

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
                    const src = img.getAttribute('data-src') || img.getAttribute('src') || img.currentSrc || img.href;

                    if (src) {
                        let urlsToTry = currentConfig.processUrls ? currentConfig.processUrls(src) : [src];
                        const originalUrlsCount = urlsToTry.length;

                        if (lastSuccessfulExt && urlsToTry.length > 1) {
                            urlsToTry.sort((a, b) => {
                                const aHasExt = a.includes(lastSuccessfulExt);
                                const bHasExt = b.includes(lastSuccessfulExt);
                                if (aHasExt && !bHasExt) return -1;
                                if (!aHasExt && bHasExt) return 1;
                                return 0;
                            });
                        }

                        if (currentConfig.fallbackServers && urlsToTry.length > 0) {
                            const match = urlsToTry[0].match(/\/\/([a-z]+)(\d*)\./i);
                            if (match) {
                                const [_, prefix, num] = match;
                                const subdomains = [prefix + num, ...['1', '2', '3', '4', '5'].filter(n => n !== num).map(n => prefix + n)];
                                urlsToTry = subdomains.flatMap(sub => urlsToTry.map(u => u.replace(`//${prefix + num}.`, `//${sub}.`)));
                            }
                        }

                        let downloadedData = null;
                        let finalUrl = '';

                        for (let urlIdx = 0; urlIdx < urlsToTry.length; urlIdx++) {
                            const targetUrl = urlsToTry[urlIdx];
                            let retries = urlIdx < originalUrlsCount ? 3 : 1;

                            while (retries > 0) {
                                const res = await fetchImageData(targetUrl);
                                if (res.data) { downloadedData = res.data; finalUrl = targetUrl; break; }
                                if (res.status === 404) break;
                                retries--;
                                if (retries > 0) await new Promise(r => setTimeout(r, 2000));
                            }

                            if (downloadedData) {
                                const extMatch = finalUrl.match(/\.(jpg|jpeg|png|webp)/i);
                                if (extMatch) lastSuccessfulExt = extMatch[0];
                                break;
                            }
                        }

                        if (downloadedData) {
                            const ext = finalUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.jpg';
                            const filename = `${String(i + 1).padStart(3, '0')}${ext}`;
                            zipData[filename] = downloadedData;
                            globalSuccessCount++;
                        } else {
                            globalErrorCount++;
                            const processedUrlLog = (currentConfig.processUrls ? currentConfig.processUrls(src) : [src])[0];
                            failedImages.push(`Ảnh ${i + 1} - Link process: ${processedUrlLog}`);
                            console.warn(`Bỏ qua ảnh ${i + 1} (Link: ${processedUrlLog})`);
                        }
                    }

                    completedInChunk++;
                    const modeText = mode === 'picker' ? 'element đã chọn' : 'toàn bộ';
                    updateBtnText(`Đang tải ${modeText} ${needsChunking ? `Part ${partNumber}` : ''}... (${completedInChunk}/${chunk.length}) - Lỗi: ${globalErrorCount}`);

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
                    await createZipAsync(zipData, zipName);
                    zipData = null;
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

        if (failedImages.length > 0) {
            console.warn('--- DANH SÁCH ẢNH TẢI LỖI ---');
            console.warn(failedImages.join('\n'));
            alert(`Có ${globalErrorCount} ảnh bị lỗi không tải được. Vui lòng mở Console (F12) để xem danh sách link chi tiết!`);
        }

        setTimeout(() => {
            updateBtnText('Download ZIP');
            btn.disabled = false;
            isDownloading = false;
        }, 4000);
    }

    // === Hàm tìm parent tối ưu (gần nhất có ≥2 ảnh, leo tối đa 3 cấp) ===
    function findBestParent(element) {
        let img = element;
        if (img.tagName !== 'IMG') {
            const firstImg = img.querySelector('img');
            if (firstImg) img = firstImg;
            else return element;
        }

        let current = img;
        let maxLevel = 3;
        let level = 0;

        while (current && current !== document.body && level < maxLevel) {
            const imgCount = current.querySelectorAll('img').length;
            if (imgCount >= 2) {
                return current;
            }
            current = current.parentElement;
            level++;
        }

        return img.parentElement || img;
    }

    // === Hàm chọn element (Picker) với tooltip hiển thị parent ===
    function startElementPicker() {
        if (pickerActive || isDownloading) return;
        pickerActive = true;

        // Overlay mờ
        const overlay = document.createElement('div');
        overlay.id = 'picker-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.1); z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(overlay);

        // Hướng dẫn
        const hint = document.createElement('div');
        hint.textContent = 'Click vào ảnh hoặc container chứa ảnh (ESC để hủy)';
        hint.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #000; color: #fff; padding: 10px 20px;
            border-radius: 5px; z-index: 10001;
            font-size: 16px; font-family: sans-serif;
            pointer-events: none;
        `;
        document.body.appendChild(hint);

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'picker-tooltip';
        tooltip.style.cssText = `
            position: fixed; bottom: 80px; right: 10px;
            background: rgba(0,0,0,0.85); color: #fff;
            padding: 8px 12px; border-radius: 4px;
            font-size: 13px; font-family: monospace;
            z-index: 10002; pointer-events: none;
            max-width: 500px; white-space: pre-wrap;
            display: none;
            border: 2px solid #ff0000;
            box-shadow: 0 0 10px rgba(255,0,0,0.5);
        `;
        document.body.appendChild(tooltip);

        let highlightedElement = null;
        const parentCache = new WeakMap();

        const clearHighlight = () => {
            if (highlightedElement) {
                highlightedElement.style.outline = '';
                highlightedElement.style.backgroundColor = '';
                highlightedElement = null;
            }
            tooltip.style.display = 'none';
        };

        const getBestParentInfo = (el) => {
            if (parentCache.has(el)) return parentCache.get(el);
            const parent = findBestParent(el);
            const imgCount = parent.querySelectorAll('img').length;
            const tag = parent.tagName.toLowerCase();
            const id = parent.id ? `#${parent.id}` : '';
            let classes = parent.className ? `.${parent.className.split(' ').join('.')}` : '';
            if (classes.length > 60) classes = classes.substring(0, 60) + '…';
            const info = { parent, imgCount, tag, id, classes };
            parentCache.set(el, info);
            return info;
        };

        const updateTooltipWithParent = (el) => {
            const info = getBestParentInfo(el);
            const text = `<${info.tag}${info.id}${info.classes}> – ${info.imgCount} ảnh`;
            tooltip.textContent = text;
            tooltip.style.display = 'block';
        };

        const onMouseMove = (e) => {
            if (!pickerActive) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (!el ||
                el === overlay || el === hint ||
                el.closest('#picker-overlay') || el.closest('#picker-hint') || el.closest('#picker-tooltip') ||
                el.closest('#custom-btn-download') || el.closest('#pick-btn')) {
                clearHighlight();
                return;
            }
            if (el !== highlightedElement) {
                clearHighlight();
                highlightedElement = el;
                el.dataset.oldOutline = el.style.outline;
                el.dataset.oldBg = el.style.backgroundColor;
                el.style.outline = '3px solid #ff0000';
                el.style.backgroundColor = 'rgba(255,0,0,0.1)';
                updateTooltipWithParent(el);
            }
        };

        const onPick = (e) => {
            if (!pickerActive) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (!el ||
                el === overlay || el === hint ||
                el.closest('#picker-overlay') || el.closest('#picker-hint') || el.closest('#picker-tooltip') ||
                el.closest('#custom-btn-download') || el.closest('#pick-btn')) {
                return;
            }

            e.stopPropagation();
            e.preventDefault();

            let parent, images;
            if (parentCache.has(el)) {
                parent = parentCache.get(el).parent;
            } else {
                parent = findBestParent(el);
            }
            images = parent.querySelectorAll('img');
            if (!images.length) {
                alert('Không tìm thấy ảnh nào trong vùng chọn!');
                return;
            }

            // Dọn dẹp
            clearHighlight();
            document.body.removeChild(overlay);
            document.body.removeChild(hint);
            document.body.removeChild(tooltip);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('click', onPick, true);
            document.removeEventListener('keydown', onKey);
            pickerActive = false;

            downloadImages(images, 'picker');
        };

        const onKey = (e) => {
            if (e.key === 'Escape') {
                clearHighlight();
                document.body.removeChild(overlay);
                document.body.removeChild(hint);
                document.body.removeChild(tooltip);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('click', onPick, true);
                document.removeEventListener('keydown', onKey);
                pickerActive = false;
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('click', onPick, true);
        document.addEventListener('keydown', onKey);
    }

    // Gán sự kiện
    btn.onclick = async () => {
        if (isDownloading) return;
        await downloadImages(null, 'all');
    };

    pickBtn.onclick = startElementPicker;

    // History hook
    const setupHistoryHook = () => {
        const wrapHistoryMethod = (method) => {
            const original = history[method];
            history[method] = function (...args) {
                const result = original.apply(this, args);
                window.dispatchEvent(new Event('urlchange'));
                return result;
            };
        };
        wrapHistoryMethod('pushState');
        wrapHistoryMethod('replaceState');

        const checkBtnVisibility = () => {
            const btnDownload = document.getElementById('custom-btn-download');
            if (btnDownload && typeof currentConfig.showWhen === 'function') {
                const shouldShow = currentConfig.showWhen(window.location.href);
                btnDownload.style.visibility = shouldShow ? 'visible' : 'hidden';
            }
        };

        window.addEventListener('urlchange', checkBtnVisibility);
        window.addEventListener('popstate', checkBtnVisibility);

        checkBtnVisibility();
    };

    setupHistoryHook();
})();
