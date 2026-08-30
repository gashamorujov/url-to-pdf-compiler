# URL to PDF Compiler

Müasir, sürətli və responsive web application. İstifadəçi çoxlu image URL-ləri toplu şəkildə daxil edir; sistem URL-ləri analiz edir, səhifə nömrələrini avtomatik aşkarlayıb ardıcıllıqla sıralayır, şəkilləri preview edir və seçimə əsasən bütün şəkilləri bir PDF faylında birləşdirib yükləyir.

## Features

- **Bulk URL input** – hər sətirdə bir URL, clipboard-dan minlərlə URL paste, və ya `.txt` drag & drop.
- **Automatic page detection** – `pageNumber`, `page`, `p`, `page_num`, `page-number`, `pageId`, `pg` parametrlərini aşkarlayır (case-insensitive).
- **Automatic sorting** – səhifə nömrəli URL-lər ascending sıralanır; nömrəsi olmayanlar istifadəçi ardıcıllığında saxlanılır.
- **Duplicate & invalid detection** – dublikat URL-lər silinir, dublikat səhifə nömrələri barədə xəbərdarlıq edilir.
- **Live image preview** – Grid və List view, hər kartda page number + loading/error status. Preview Ctrl/⌘+Shift+P və ya düymə ilə açılıb-bağlanır.
- **CORS-safe image loading** – birbaşa fetch uğursuz olarsa (CORS/network), app avtomatik olaraq təhlükəsiz eyni-origin proxy-ə keçir.
- **PDF generation** – Web Worker daxilində, `pdf-lib` ilə; hər image ayrıca səhifə kimi, original pixel ölçüsündə, aspect ratio dəyişdirilmədən əlavə edilir. JPEG/PNG original binary olaraq saxlanılır (keyfiyyət itkisi yoxdur).
- **Concurrency limit** – default 4 (1–8 arası seçilə bilər) yüklənmə eyni anda işləyir ki, browser RAM-ı yüklənməsin.
- **Export** – analiz edilmiş URL siyahısını TXT və CSV formatında export.
- **Error handling** – Network / CORS / HTTP 404 / HTTP 403 / HTTP 401 / Invalid Image / Timeout statusları, hər error üçün Retry.
- **Dark mode** – Light/Dark toggle, localStorage-da saxlanılır.
- **Responsive** – desktop və mobil uyğun.

## Installation

```bash
npm install
```

Node.js 18+ (recommended 20+) tələb olunur.

## Development

```bash
npm run dev
```

Vite development server-i işə salır (default `http://localhost:5173`). Dev server-də **built-in CORS proxy** də aktivdir: `GET /@proxy?url=<encoded-image-url>`. Bu proxy SSRF-qorumalıdır, yalnız image cavablarını ötürür və heç bir authorization header-i forward etmir.

## Production build

```bash
npm run build      # TypeScript type-check + production build
npm run preview    # build nəticəsini local olaraq test et (built-in proxy ilə)
```

Build çıxışı `dist/` qovluğunda yaranır və istənilən statik hostda deploy edilə bilər.

## CORS proxy options

Bəzi üçüncü tərəf hostlar (məsələn `imo-epublications.org`) şəkilləri **`Access-Control-Allow-Origin` header-i olmadan** qaytarır. Browser-ə birbaşa `fetch` etməyə icazə verilmədiyi üçün app avtomatik olaraq aşağıdakı üsullardan birini sınayır:

1. **Birbaşa fetch** – host CORS-a icazə verirsə, proxy-ə ehtiyac yoxdur.
2. **Eyni-origin proxy endpoint** – aşağıdakı endpoint-lər sıra ilə yoxlanılır:
   - `/@proxy` (Vite dev/preview built-in)
   - `/api/image-proxy` (Vercel)
   - `/.netlify/functions/image-proxy` (Netlify)
3. **`VITE_CORS_PROXY`** – öz backend proxy-iniz.

### Vite dev server

```bash
npm run dev
# /@proxy endpoint avtomatik aktivdir
```

### Netlify

Repo-da hazır `netlify/functions/image-proxy.mjs` function var. Deploy etdikdə `/.netlify/functions/image-proxy` endpoint-i avtomatik işləyir:

```bash
# Netlify UI-da: build command "npm run build", publish "dist"
```

### Vercel

Repo-da hazır `api/image-proxy.mjs` function var. Deploy etdikdə `/api/image-proxy` endpoint-i avtomatik işləyir.

### Standalone Node proxy

İstənilən Node platformada (Render, Railway, Fly.io, VPS və s.):

```bash
npm run proxy        # http://localhost:8787/proxy
```

Və client-ə endpoint-i bildirin (`.env`):

```bash
VITE_CORS_PROXY=http://YOUR_HOST:8787/proxy
```

Sonra yenidən qurun:

```bash
npm run build
```

## Environment variables

| Variable | Açıqlama |
| --- | --- |
| `VITE_CORS_PROXY` | Opsional. Öz deploy etdiyiniz CORS proxy endpoint-i (məsələn `https://your-proxy.example.com/proxy`). App ona `?url=<encoded>` əlavə edir. |
| `PORT` | Standalone proxy server üçün port (default `8787`). |

## CORS limitations

- Şəkillər birbaşa browser-dən fetch olunur və üçüncü tərəf server CORS header-ləri göndərmirsə, brauzer fetch-i bloklayacaq.
- Bu halda status **`CORS blocked`** kimi göstərilir və app avtomatik olaraq proxy-ə keçir.
- HTTP `401`/`403` cavabları proxy-ə **ötürülmür** — aydın xəta göstərilir, access control bypass edilmir.
- **Qeyd:** Bu application heç bir DRM, authentication, paywall və ya access-control mexanizmini bypass etmir. Yalnız istifadəçinin qanuni şəkildə daxil ola bildiyi və browser tərəfindən əlçatan olan image URL-ləri emal edir.

## Security considerations

Proxy kod (`src/server/proxy-core.mjs`) aşağıdakı müdafiə mexanizmlərini tətbiq edir:

- Yalnız `http`/`https` URL-lərə icazə verilir (`file://`, `ftp://` və s. rədd edilir).
- SSRF protection: `localhost`, private IP-lər, link-local, metadata endpoint-ləri və bare IPv4 ünvanlar bloklanır.
- Redirect-lər limitli sayda (5) izlənir və hər addım yenidən yoxlanılır.
- Request timeout (25 saniyə).
- Maksimum response size (50 MB).
- Cookie/authorization heç vaxt nə götürülür, nə forward edilir, nə də loglanır.
- Giriş sessiyası tələb edən (401/403) resurslar bypass edilmir.

## PDF generation architecture

1. İstifadəçi URL-ləri analiz edəndə hər URL ayrıca fetch olunur (concurrency limit ilə; birbaşa → CORS uğursuzdursa proxy).
2. Fetch nəticəsi `Blob` kimi saxlanılır; JPEG/PNG birbaşa (original binary saxlanmaqla), WebP/AVIF/GIF/BMP kimi formatlar itkisiz PNG-ə konvert edilir.
3. "Download PDF" basıldıqda yüklənmiş image buffer-ları **Web Worker**'a transfer edilir (`transferable` sayəsində kopyalanmadan — memory-efficient).
4. Worker `pdf-lib` ilə hər image-i ayrıca səhifə kimi, orijinal pixel ölçüsündə və aspect ratio qorunaraq əlavə edir (landscape → landscape page, portrait → portrait page).
5. Yaranan PDF blob-u browser download-a ötürülür.
6. PDF generation zamanı progress bar real-time yenilənir (page x / total).

## Project structure

```
src/
  components/          UI componentləri
  lib/                 analyze, imageLoader, pdfGenerator, export
  workers/             pdf.worker.ts (PDF generation)
  server/              proxy-core.mjs + server.mjs (CORS proxy)
  hooks/               theme & toasts
  types.ts             TypeScript tipləri
api/
  image-proxy.mjs      Vercel function
netlify/functions/
  image-proxy.mjs      Netlify function
```

## License

MIT
