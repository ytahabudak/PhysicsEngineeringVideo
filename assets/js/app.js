/**
 * GAÜN Fizik Mühendisliği – Deney ve Ders Arşivi
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. GÜVENLİK VE YARDIMCI FONKSİYONLAR
     -------------------------------------------------------------------------- */
  const Security = {
    isValidSlug(slug) {
      if (typeof slug !== 'string' || !slug.trim()) return false;
      if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) return false;
      return /^[a-zA-Z0-9._-]+$/.test(slug.trim());
    },

    extractYouTubeId(url) {
      if (typeof url !== 'string') return null;
      const trimmed = url.trim();
      const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
      ];
      for (const p of patterns) {
        const match = trimmed.match(p);
        if (match && match[1]) return match[1];
      }
      return null;
    },

    normalizeTr(str) {
      if (!str) return '';
      return str
        .toLocaleLowerCase('tr-TR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .trim();
    },

    el(tag, attrs = {}, children = []) {
      const node = document.createElement(tag);
      for (const [key, val] of Object.entries(attrs)) {
        if (val === null || val === undefined) continue;
        if (key === 'className') node.className = val;
        else if (key === 'text') node.textContent = val;
        else if (key.startsWith('data-')) node.setAttribute(key, val);
        else if (
          key === 'href' ||
          key === 'src' ||
          key === 'alt' ||
          key === 'title' ||
          key === 'id' ||
          key === 'type' ||
          key === 'placeholder' ||
          key === 'aria-label' ||
          key === 'download' ||
          key === 'target' ||
          key === 'rel'
        ) {
          node.setAttribute(key, val);
        }
      }
      const list = Array.isArray(children) ? children : [children];
      for (const child of list) {
        if (child === null || child === undefined) continue;
        if (typeof child === 'string') node.appendChild(document.createTextNode(child));
        else node.appendChild(child);
      }
      return node;
    }
  };

  /* --------------------------------------------------------------------------
     2. STATİK TXT DOSYA PARSER MOTORU (ders.txt ve deney.txt)
     -------------------------------------------------------------------------- */
  const Parser = {
    numericSort(a, b) {
      const numA = parseInt((a.match(/^(\d+)/) || [])[1], 10);
      const numB = parseInt((b.match(/^(\d+)/) || [])[1], 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.localeCompare(b, 'tr');
    },

    parseDers(rawText, folderName) {
      const data = {
        folder: folderName,
        kod: folderName.split('-')[0] || 'DERS',
        ad: folderName,
        donem: '',
        ozet: ''
      };

      if (!rawText) return data;
      const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;

        const key = trimmed.slice(0, colonIdx).trim().toUpperCase();
        const val = trimmed.slice(colonIdx + 1).trim();

        if (key === 'KOD' && val) data.kod = val;
        else if (key === 'AD' && val) data.ad = val;
        else if ((key === 'DONEM' || key === 'DÖNEM') && val) data.donem = val;
        else if ((key === 'OZET' || key === 'ÖZET') && val) data.ozet = val;
      }
      return data;
    },

    parseDeney(rawText, courseFolder, expFolder) {
      const data = {
        courseFolder,
        expFolder,
        baslik: expFolder.replace(/^\d+-/, '').replace(/-/g, ' '),
        sure: '',
        zorluk: '',
        kategori: 'Genel Fizik',
        olculen: [],
        uyari: '',
        amac: '',
        teori: '',
        malzeme: [],
        adimlar: [],
        not: '',
        video: '',
        pdf: ''
      };

      if (!rawText) return data;
      const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      let currentSection = null;
      const sectionBuffers = {
        AMAC: [],
        TEORI: [],
        MALZEME: [],
        ADIMLAR: [],
        NOT: []
      };

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (trimmed.startsWith('#')) continue;

        const secMatch = trimmed.match(/^\[([A-ZÇĞİÖŞÜ]+)\]$/i);
        if (secMatch) {
          const secName = secMatch[1]
            .toUpperCase()
            .replace(/Ç/g, 'C')
            .replace(/Ğ/g, 'G')
            .replace(/İ/g, 'I')
            .replace(/Ö/g, 'O')
            .replace(/Ş/g, 'S')
            .replace(/Ü/g, 'U');
          if (Object.prototype.hasOwnProperty.call(sectionBuffers, secName)) {
            currentSection = secName;
            continue;
          }
        }

        const kvMatch = trimmed.match(
          /^(BASLIK|BAŞLIK|SURE|SÜRE|ZORLUK|KATEGORI|KATEGORİ|OLCULEN|ÖLÇÜLEN|UYARI|VIDEO|VİDEO|PDF|FOY|FÖY)\s*:\s*(.*)$/i
        );
        if (kvMatch) {
          currentSection = null;
          const rawKey = kvMatch[1]
            .toUpperCase()
            .replace(/Ş/g, 'S')
            .replace(/Ü/g, 'U')
            .replace(/İ/g, 'I')
            .replace(/Ö/g, 'O')
            .replace(/Ç/g, 'C');
          const val = kvMatch[2].trim();

          if (rawKey === 'BASLIK' && val) data.baslik = val;
          else if (rawKey === 'SURE' && val) data.sure = val;
          else if (rawKey === 'ZORLUK' && val) data.zorluk = val;
          else if (rawKey === 'KATEGORI' && val) data.kategori = val;
          else if (rawKey === 'OLCULEN' && val) {
            data.olculen = val
              .split(';')
              .map((s) => s.trim())
              .filter(Boolean);
          } else if (rawKey === 'UYARI') data.uyari = val;
          else if (rawKey === 'VIDEO') data.video = val;
          else if ((rawKey === 'PDF' || rawKey === 'FOY') && val) data.pdf = val;
          continue;
        }

        if (currentSection) {
          if (currentSection === 'MALZEME' || currentSection === 'ADIMLAR') {
            if (trimmed) {
              const cleanItem = trimmed.replace(/^([-*•]|\d+[.)])\s*/, '').trim();
              if (cleanItem) sectionBuffers[currentSection].push(cleanItem);
            }
          } else {
            sectionBuffers[currentSection].push(rawLine);
          }
        }
      }

      data.amac = sectionBuffers.AMAC.join('\n').trim();
      data.teori = sectionBuffers.TEORI.join('\n').trim();
      data.malzeme = sectionBuffers.MALZEME;
      data.adimlar = sectionBuffers.ADIMLAR;
      data.not = sectionBuffers.NOT.join('\n').trim();

      return data;
    }
  };

  /* --------------------------------------------------------------------------
     3. STATİK VERİ ERİŞİM KATMANI (liste.json + Autoindex Fallback)
     -------------------------------------------------------------------------- */
  const DataStore = {
    cache: null,

    async fetchTextSafe(url) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) return null;
        return await res.text();
      } catch (err) {
        console.warn('Dosya okunamadı:', url, err);
        return null;
      }
    },

    async fetchJsonSafe(url) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.warn('JSON okunamadı:', url, err);
        return null;
      }
    },

    async fileExists(url) {
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        return res.ok;
      } catch {
        return false;
      }
    },

    async discoverFromAutoindex(baseUrl) {
      const html = await this.fetchTextSafe(baseUrl);
      if (!html || !html.includes('<a ')) return [];
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const links = Array.from(doc.querySelectorAll('a'))
        .map((a) => a.getAttribute('href') || '')
        .filter((href) => href.endsWith('/') && !href.startsWith('/') && !href.startsWith('..') && !href.startsWith('?'))
        .map((href) => href.replace(/\/$/, ''))
        .filter((slug) => Security.isValidSlug(slug));
      return [...new Set(links)];
    },

    async loadAll() {
      if (this.cache) return this.cache;

      let manifest = await this.fetchJsonSafe('dersler/liste.json');
      let courseEntries = [];

      if (manifest && Array.isArray(manifest.dersler)) {
        courseEntries = manifest.dersler;
      } else {
        const folders = await this.discoverFromAutoindex('dersler/');
        for (const f of folders) {
          const exps = await this.discoverFromAutoindex(`dersler/${f}/`);
          courseEntries.push({ klasor: f, deneyler: exps });
        }
      }

      const courses = [];
      const allExperiments = [];

      for (const entry of courseEntries) {
        const cFolder = typeof entry === 'string' ? entry : entry.klasor;
        if (!Security.isValidSlug(cFolder)) continue;

        const dersTxt = await this.fetchTextSafe(`dersler/${cFolder}/ders.txt`);
        const courseObj = Parser.parseDers(dersTxt, cFolder);

        const rawExpList = Array.isArray(entry.deneyler) ? [...entry.deneyler] : [];
        rawExpList.sort(Parser.numericSort);

        const courseExperiments = [];
        for (const eFolder of rawExpList) {
          if (!Security.isValidSlug(eFolder)) continue;
          const deneyTxt = await this.fetchTextSafe(`dersler/${cFolder}/${eFolder}/deney.txt`);
          if (!deneyTxt) continue;

          const expObj = Parser.parseDeney(deneyTxt, cFolder, eFolder);
          expObj.dersKod = courseObj.kod;
          expObj.dersAd = courseObj.ad;

          courseExperiments.push(expObj);
          allExperiments.push(expObj);
        }

        courseObj.deneyler = courseExperiments;
        courses.push(courseObj);
      }

      this.cache = { courses, experiments: allExperiments };
      return this.cache;
    }
  };

  /* --------------------------------------------------------------------------
     4. GÖRSEL EFEKTLER
     -------------------------------------------------------------------------- */
  const VisualFX = {
    initHeader() {
      const header = document.querySelector('.site-header');
      const toggle = document.querySelector('.mobile-toggle');
      const nav = document.querySelector('.nav-links');

      if (header) {
        window.addEventListener(
          'scroll',
          () => {
            header.classList.toggle('scrolled', window.scrollY > 24);
          },
          { passive: true }
        );
      }

      if (toggle && nav) {
        toggle.addEventListener('click', () => {
          const isOpen = nav.classList.toggle('open');
          toggle.setAttribute('aria-expanded', String(isOpen));
        });
      }
    },

    initCardSpotlight() {
      document.addEventListener(
        'mousemove',
        (e) => {
          const card = e.target.closest('.card');
          if (!card) return;
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
          card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        },
        { passive: true }
      );
    },

    initScrollReveal() {
      const els = document.querySelectorAll('.reveal');
      if (!els.length) return;
      if (!('IntersectionObserver' in window)) {
        els.forEach((el) => el.classList.add('visible'));
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08 }
      );
      els.forEach((el) => obs.observe(el));
    },

    initHeroCanvas() {
      const canvas = document.getElementById('physics-canvas');
      if (!canvas) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const ctx = canvas.getContext('2d');
      let width = 0;
      let height = 0;
      let animId = null;
      let mouse = { x: -1000, y: -1000 };
      const isMobile = window.innerWidth < 768;

      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      resize();
      window.addEventListener('resize', resize, { passive: true });

      if (!isMobile) {
        window.addEventListener(
          'mousemove',
          (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
          },
          { passive: true }
        );
      }

      const particleCount = isMobile ? 22 : 46;
      const particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * (width || 1200),
        y: Math.random() * (height || 700),
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.8
      }));

      let phase = 0;
      function render() {
        ctx.clearRect(0, 0, width, height);
        phase += 0.012;

        const waveCount = 3;
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath();
          const amp = 26 + w * 14;
          const freq = 0.0045 + w * 0.0015;
          const baseY = height * (0.58 + w * 0.08);
          ctx.strokeStyle =
            w === 0
              ? 'rgba(56, 189, 248, 0.22)'
              : w === 1
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(139, 92, 246, 0.11)';
          ctx.lineWidth = 1.25;

          for (let x = 0; x <= width; x += 12) {
            const distMouse = Math.hypot(x - mouse.x, baseY - mouse.y);
            const mouseBoost = distMouse < 180 ? (1 - distMouse / 180) * 18 : 0;
            const y = baseY + Math.sin(x * freq + phase + w * 1.3) * (amp + mouseBoost);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(125, 211, 252, 0.45)';
          ctx.fill();

          if (!isMobile) {
            for (let j = i + 1; j < particles.length; j++) {
              const p2 = particles[j];
              const d = Math.hypot(p.x - p2.x, p.y - p2.y);
              if (d < 130) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - d / 130) * 0.14})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
              }
            }
          }
        }

        animId = requestAnimationFrame(render);
      }

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && animId) {
          cancelAnimationFrame(animId);
          animId = null;
        } else if (!document.hidden && !animId) {
          render();
        }
      });

      render();
    }
  };

  /* --------------------------------------------------------------------------
     5. BİLEŞEN OLUŞTURUCULAR (Kartlar, Video Oynatıcı & PDF Butonu)
     -------------------------------------------------------------------------- */
  const Components = {
    createCourseCard(course) {
      const url = `dersler.html?ders=${encodeURIComponent(course.folder)}`;
      return Security.el('a', { href: url, className: 'card reveal' }, [
        Security.el('div', {}, [
          Security.el('div', { className: 'card-meta-top' }, [
            Security.el('span', { className: 'code-badge', text: course.kod })
          ]),
          Security.el('h3', { className: 'card-title', text: course.ad }),
          Security.el('p', {
            className: 'card-desc',
            text: course.ozet || 'Bu derse ait deney föyleri ve uygulama kayıtları.'
          })
        ]),
        Security.el('div', { className: 'card-footer' }, [
          Security.el('span', { text: `${course.deneyler.length} Kayıtlı Deney` }),
          Security.el('span', { className: 'card-action', text: 'Dersi İncele →' })
        ])
      ]);
    },

    createExperimentCard(exp) {
      const url = `deneyler.html?ders=${encodeURIComponent(exp.courseFolder)}&deney=${encodeURIComponent(exp.expFolder)}`;
      return Security.el('a', { href: url, className: 'card reveal' }, [
        Security.el('div', {}, [
          Security.el('div', { className: 'card-meta-top' }, [
            Security.el('span', { className: 'code-badge', text: exp.dersKod }),
            Security.el('span', { className: 'term-badge', text: exp.kategori })
          ]),
          Security.el('h3', { className: 'card-title', text: exp.baslik }),
          Security.el('p', {
            className: 'card-desc',
            text: exp.amac || exp.teori || 'Deney amacı, teorik altyapı ve uygulama adımları.'
          })
        ]),
        Security.el('div', { className: 'card-footer' }, [
          Security.el('span', { text: exp.dersAd }),
          Security.el('span', { className: 'card-action', text: 'Deneyi Aç →' })
        ])
      ]);
    },

    async renderPdfButton(container, exp) {
      if (!container) return;
      container.innerHTML = '';

      const baseDir = `dersler/${exp.courseFolder}/${exp.expFolder}`;
      let pdfUrl = null;
      let downloadName = `${exp.dersKod}-${exp.expFolder}-foy.pdf`;

      if (exp.pdf) {
        if (/^https?:\/\//i.test(exp.pdf)) {
          pdfUrl = exp.pdf;
        } else if (Security.isValidSlug(exp.pdf)) {
          const candidate = `${baseDir}/${exp.pdf}`;
          if (await DataStore.fileExists(candidate)) {
            pdfUrl = candidate;
            downloadName = exp.pdf;
          }
        }
      } else {
        const defaultCandidate = `${baseDir}/foy.pdf`;
        if (await DataStore.fileExists(defaultCandidate)) {
          pdfUrl = defaultCandidate;
        }
      }

      if (!pdfUrl) return;

      const btn = Security.el(
        'a',
        {
          href: pdfUrl,
          download: downloadName,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'btn btn-primary'
        },
        ['Deney Föyünü İndir (PDF)']
      );
      container.appendChild(btn);
    },

    renderVideoPlayer(container, exp) {
      container.innerHTML = '';
      const stage = Security.el('div', { className: 'video-stage' });
      const aspect = Security.el('div', { className: 'video-aspect' });

      const ytId = Security.extractYouTubeId(exp.video);
      const localVideoPath = `dersler/${exp.courseFolder}/${exp.expFolder}/video.mp4`;

      if (ytId) {
        const iframe = Security.el('iframe', {
          src: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`,
          title: exp.baslik,
          loading: 'lazy'
        });
        iframe.setAttribute(
          'allow',
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        );
        iframe.setAttribute('allowfullscreen', '');
        aspect.appendChild(iframe);
        stage.appendChild(aspect);
        stage.appendChild(
          Security.el('div', { className: 'video-caption' }, [
            Security.el('span', { text: 'YouTube Video Kaydı' }),
            Security.el('span', { text: '16:9 Oynatıcı' })
          ])
        );
        container.appendChild(stage);
        return;
      }

      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'none';
      video.playsInline = true;
      video.setAttribute('aria-label', exp.baslik);

      const source = document.createElement('source');
      source.src =
        exp.video && !exp.video.startsWith('http')
          ? `dersler/${exp.courseFolder}/${exp.expFolder}/${exp.video}`
          : localVideoPath;
      source.type = 'video/mp4';
      video.appendChild(source);

      const showFallback = () => {
        aspect.innerHTML = '';
        aspect.appendChild(
          Security.el('div', { className: 'video-placeholder' }, [
            Security.el('div', { className: 'code-badge', text: 'VİDEO KAYDI BULUNAMADI' }),
            Security.el('h3', { text: 'Bu deney için henüz video dosyası yüklenmemiş' }),
            Security.el('p', {
              className: 'section-desc',
              text: 'Deney föyünü, teorik açıklamaları ve uygulama adımlarını aşağıdan inceleyebilirsiniz.'
            })
          ])
        );
      };

      video.addEventListener('error', showFallback);
      source.addEventListener('error', showFallback);

      aspect.appendChild(video);
      stage.appendChild(aspect);
      stage.appendChild(
        Security.el('div', { className: 'video-caption' }, [
          Security.el('span', { text: 'Laboratuvar Video Kaydı (MP4)' }),
          Security.el('span', { text: 'Oynatmak için tıklayın' })
        ])
      );
      container.appendChild(stage);
    }
  };

  /* --------------------------------------------------------------------------
     6. SAYFA KONTROLCÜLERİ
     -------------------------------------------------------------------------- */
  const Pages = {
    async initHome() {
      const { courses, experiments } = await DataStore.loadAll();

      const statCourses = document.getElementById('stat-courses');
      const statExps = document.getElementById('stat-experiments');
      if (statCourses) statCourses.textContent = String(courses.length).padStart(2, '0');
      if (statExps) statExps.textContent = String(experiments.length).padStart(2, '0');

      const featuredGrid = document.getElementById('featured-experiments');
      if (featuredGrid) {
        featuredGrid.innerHTML = '';
        const slice = experiments.slice(0, 3);
        if (!slice.length) {
          featuredGrid.appendChild(
            Security.el('div', { className: 'empty-state' }, [
              Security.el('h3', { text: 'Henüz kayıtlı deney bulunamadı' }),
              Security.el('p', { text: 'dersler/liste.json dosyasını veya yerel sunucu bağlantısını kontrol edin.' })
            ])
          );
        } else {
          slice.forEach((exp) => featuredGrid.appendChild(Components.createExperimentCard(exp)));
        }
      }

      const coursesGrid = document.getElementById('home-courses');
      if (coursesGrid) {
        coursesGrid.innerHTML = '';
        if (!courses.length) {
          coursesGrid.appendChild(
            Security.el('div', { className: 'empty-state' }, [
              Security.el('h3', { text: 'Henüz kayıtlı ders bulunamadı' })
            ])
          );
        } else {
          courses.forEach((c) => coursesGrid.appendChild(Components.createCourseCard(c)));
        }
      }

      VisualFX.initScrollReveal();
    },

    async initCoursesPage() {
      const params = new URLSearchParams(window.location.search);
      const selectedCourseSlug = params.get('ders');
      const { courses } = await DataStore.loadAll();

      const listView = document.getElementById('courses-list-view');
      const detailView = document.getElementById('course-detail-view');

      if (selectedCourseSlug && Security.isValidSlug(selectedCourseSlug)) {
        const course = courses.find((c) => c.folder === selectedCourseSlug);
        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';

        if (!course) {
          detailView.innerHTML = '';
          detailView.appendChild(
            Security.el('div', { className: 'container section' }, [
              Security.el('div', { className: 'empty-state' }, [
                Security.el('h3', { text: '404 — Ders Bulunamadı' }),
                Security.el('p', { text: 'Aradığınız ders klasörü sistemde kayıtlı değil.' }),
                Security.el('a', { href: 'dersler.html', className: 'btn btn-secondary', text: '← Tüm Derslere Dön' })
              ])
            ])
          );
          return;
        }

        document.title = `${course.kod} ${course.ad} | GAÜN Fizik Mühendisliği`;
        document.getElementById('cd-breadcrumb').textContent = `${course.kod} – ${course.ad}`;
        document.getElementById('cd-code').textContent = course.kod;
        document.getElementById('cd-title').textContent = course.ad;
        document.getElementById('cd-desc').textContent = course.ozet;

        const expContainer = document.getElementById('cd-experiments');
        expContainer.innerHTML = '';
        if (!course.deneyler.length) {
          expContainer.appendChild(
            Security.el('div', { className: 'empty-state' }, [
              Security.el('h3', { text: 'Bu derse henüz deney eklenmemiş' })
            ])
          );
        } else {
          course.deneyler.forEach((exp) => expContainer.appendChild(Components.createExperimentCard(exp)));
        }
        VisualFX.initScrollReveal();
        return;
      }

      const grid = document.getElementById('courses-grid');
      grid.innerHTML = '';
      if (!courses.length) {
        grid.appendChild(
          Security.el('div', { className: 'empty-state' }, [
            Security.el('h3', { text: 'Kayıtlı ders bulunamadı' })
          ])
        );
        return;
      }
      courses.forEach((c) => grid.appendChild(Components.createCourseCard(c)));
      VisualFX.initScrollReveal();
    },

    async initExperimentsPage() {
      const params = new URLSearchParams(window.location.search);
      const cSlug = params.get('ders');
      const eSlug = params.get('deney');
      const { courses, experiments } = await DataStore.loadAll();

      const archiveView = document.getElementById('experiments-archive-view');
      const detailView = document.getElementById('experiment-detail-view');

      if (cSlug && eSlug && Security.isValidSlug(cSlug) && Security.isValidSlug(eSlug)) {
        if (archiveView) archiveView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';

        const exp = experiments.find((x) => x.courseFolder === cSlug && x.expFolder === eSlug);
        if (!exp) {
          detailView.innerHTML = '';
          detailView.appendChild(
            Security.el('div', { className: 'container section' }, [
              Security.el('div', { className: 'empty-state' }, [
                Security.el('h3', { text: '404 — Deney Bulunamadı' }),
                Security.el('p', { text: 'İstenen deney dosyası sistemde mevcut değil.' }),
                Security.el('a', { href: 'deneyler.html', className: 'btn btn-secondary', text: '← Deney Arşivine Dön' })
              ])
            ])
          );
          return;
        }

        document.title = `${exp.baslik} | GAÜN Fizik Mühendisliği`;
        const courseLink = document.getElementById('ed-course-link');
        courseLink.href = `dersler.html?ders=${encodeURIComponent(exp.courseFolder)}`;
        courseLink.textContent = `${exp.dersKod} – ${exp.dersAd}`;

        document.getElementById('ed-breadcrumb-title').textContent = exp.baslik;
        document.getElementById('ed-code').textContent = exp.dersKod;
        document.getElementById('ed-title').textContent = exp.baslik;
        document.getElementById('ed-course-name').textContent = `${exp.dersKod} ${exp.dersAd}`;

        Components.renderPdfButton(document.getElementById('ed-pdf-action'), exp);
        Components.renderVideoPlayer(document.getElementById('ed-video-container'), exp);

        const warnBox = document.getElementById('ed-warning-box');
        if (exp.uyari) {
          warnBox.style.display = 'flex';
          document.getElementById('ed-warning-text').textContent = exp.uyari;
        }

        const qtyBox = document.getElementById('ed-quantities');
        qtyBox.innerHTML = '';
        if (exp.olculen.length) {
          exp.olculen.forEach((q) => qtyBox.appendChild(Security.el('span', { className: 'quantity-tag', text: q })));
        } else {
          qtyBox.appendChild(Security.el('span', { className: 'section-desc', text: 'Belirtilmemiş' }));
        }

        document.getElementById('ed-purpose').textContent = exp.amac || 'Bu deney için amaç açıklaması girilmemiştir.';
        document.getElementById('ed-theory').textContent = exp.teori || 'Bu deney için teorik açıklama girilmemiştir.';

        const matList = document.getElementById('ed-materials');
        matList.innerHTML = '';
        if (exp.malzeme.length) {
          exp.malzeme.forEach((m) => matList.appendChild(Security.el('li', { text: m })));
        } else {
          matList.appendChild(Security.el('li', { text: 'Standart laboratuvar ekipmanları' }));
        }

        const stepsList = document.getElementById('ed-steps');
        stepsList.innerHTML = '';
        if (exp.adimlar.length) {
          exp.adimlar.forEach((s) => stepsList.appendChild(Security.el('li', { text: s })));
        } else {
          stepsList.appendChild(Security.el('li', { text: 'Uygulama adımları henüz eklenmemiş.' }));
        }

        const noteBlock = document.getElementById('ed-note-block');
        if (exp.not) {
          noteBlock.style.display = 'block';
          document.getElementById('ed-note').textContent = exp.not;
        }

        const relatedGrid = document.getElementById('ed-related');
        relatedGrid.innerHTML = '';
        const related = experiments.filter((x) => x.courseFolder === exp.courseFolder && x.expFolder !== exp.expFolder);
        related.forEach((r) => relatedGrid.appendChild(Components.createExperimentCard(r)));

        VisualFX.initScrollReveal();
        return;
      }

      const grid = document.getElementById('experiments-grid');
      const courseSelect = document.getElementById('exp-course-filter');
      const catSelect = document.getElementById('exp-cat-filter');

      courses.forEach((c) => {
        courseSelect.appendChild(Security.el('option', { value: c.folder, text: `${c.kod} – ${c.ad}` }));
      });

      const categories = [...new Set(experiments.map((e) => e.kategori).filter(Boolean))];
      categories.forEach((cat) => {
        catSelect.appendChild(Security.el('option', { value: cat, text: cat }));
      });

      function render() {
        const cVal = courseSelect.value;
        const catVal = catSelect.value;

        const filtered = experiments.filter((e) => {
          const matchCourse = !cVal || e.courseFolder === cVal;
          const matchCat = !catVal || e.kategori === catVal;
          return matchCourse && matchCat;
        });

        grid.innerHTML = '';
        if (!filtered.length) {
          grid.appendChild(
            Security.el('div', { className: 'empty-state' }, [
              Security.el('h3', { text: 'Filtrelere uygun deney bulunamadı' }),
              Security.el('p', { text: 'Filtre seçimlerini sıfırlayarak tüm arşivi görüntüleyebilirsiniz.' })
            ])
          );
          return;
        }
        filtered.forEach((e) => grid.appendChild(Components.createExperimentCard(e)));
        VisualFX.initScrollReveal();
      }

      courseSelect.addEventListener('change', render);
      catSelect.addEventListener('change', render);
      render();
    }
  };

  /* --------------------------------------------------------------------------
     7. UYGULAMA BAŞLATICI
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    VisualFX.initHeader();
    VisualFX.initCardSpotlight();
    VisualFX.initHeroCanvas();

    const pageType = document.body.getAttribute('data-page');
    if (pageType === 'home') Pages.initHome();
    else if (pageType === 'courses') Pages.initCoursesPage();
    else if (pageType === 'experiments') Pages.initExperimentsPage();
    else VisualFX.initScrollReveal();
  });
})();
