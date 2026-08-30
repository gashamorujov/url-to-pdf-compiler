# URL to PDF Compiler

Müasir, sürətli və responsive web application. İstifadəçi çoxlu image URL-ləri toplu şəkildə daxil edir; sistem URL-ləri analiz edir, səhifə nömrələrini avtomatik aşkarlayıb ardıcıllıqla sıralayır, şəkilləri preview edir və seçimə əsasən bütün şəkilləri bir PDF faylında birləşdirib yükləyir.

## Features

- **Bulk URL input** – hər sətirdə bir URL, clipboard-dan minlərlə URL paste, və ya `.txt` drag & drop.
- **Automatic page detection** – `pageNumber`, `page`, `p`, `page_num`, `page-number`, `pageId`, `pg` parametrlərini aşkarlayır (case-insensitive).
- **Automatic sorting** – səhifə nömrəli URL-lər ascending sıralanır; nömrəsi olmayanlar istifadəçi ardıcıllığında saxlanılır.
- **Duplicate & invalid detection** – dublikat URL-lər silinir, dublikat səhifə nömrələri barədə xəbərdarlıq edilir.
- **Live image preview** – Grid və List view, hər kartda page number + loading/error status.
- **Ctrl/⌘ + Shift + P** – preview panelini açıb-bağlamaq üçün shortcut.
- **PDF generation** – Web Worker daxilində, `pdf-lib` ilə; hər image ayrıca səhifə kimi, original pixel ölçüsündə, aspect ratio dəyişdirilmədən əlavə edilir.
- **Concurrency limit** – default 4 (1–8 arası seçilə bilər) yüklənmə eyni anda işləyir ki, browser RAM-ı yüklənməsin.
- **Export** – analiz edilmiş URL siyahısını TXT və CSV formatında export.
- **Error handling** – Network / CORS / HTTP 404 / HTTP 403 / Invalid Image / Timeout statusları.
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

Bu, Vite development server-i işə salır (default `http://localhost:5173`).

## Production build

```bash
npm run build      # TypeScript type-check + production build
npm run preview    # build nəticəsini local olaraq test et
```

Build çıxışı `dist/` qovluğunda yaranır və istənilən statik hostda (Vercel, Netlify, GitHub Pages, Cloudflare Pages, nginx və s.) deploy edilə bilər — backend server tələb olunmur.

## Environment variables

`.env` faylında aşağıdakı dəyişənləri təyin edə bilərsiniz:

| Variable | Açıqlama |
| --- | --- |
| `VITE_CORS_PROXY` | Opsional CORS proxy endpoint. Yalnız üçüncü tərəf hostlar browser-ə birbaşa image fetch etməyə icazə vermədikdə istifadə edin. URL-in encoded forması bu endpoint-ə append edilir: `${VITE_CORS_PROXY}/<encoded-url>` |

Misal:

```bash
VITE_CORS_PROXY=https://your-proxy.example.com/proxy
```

Proxy quraşdırarkən aşağıdakı məhdudiyyətləri tətbiq edin (bax: Security considerations).

## CORS limitations

- Şəkillər birbaşa **browser-dən** fetch olunur və üçüncü tərəf server CORS header-ləri göndərmirsə, brauzer fetch-i bloklayacaq.
- Bu halda status **`CORS blocked`** kimi göstərilir və sayt çökmür.
- Həlli üçün `VITE_CORS_PROXY` vasitəsilə öz proxy-inizdən istifadə edin (aşağıdakı təhlükəsizlik qaydalarına riayət edərək).
- **Qeyd:** Bu application heç bir DRM, authentication, paywall və ya access-control mexanizmini bypass etmir. Yalnız istifadəçinin qanuni şəkildə daxil ola bildiyi və browser tərəfindən əlçatan olan image URL-ləri emal edir.

## Security considerations

Server tərəfli CORS proxy yazırsanız:

- Yalnız `http`/`https` URL-lərə icazə verin; digər protokolları (file, ftp, data və s.) bloklayın.
- SSRF protection: `localhost`, private IP, reserved/internal network və cloud metadata endpoint-lərini bloklayın.
- Redirect-ləri təhlükəsiz idarə edin (limitli redirect sayı, son redirect-in də validasiyası).
- Request timeout tətbiq edin.
- Maksimum response size məhdudiyyəti qoyun.
- Rate limiting əlavə edin.

Bu layihə istifadəçidən heç bir cookie, authorization header və ya digər həssas credential tələb etmir və heç nəyi loglamır.

## PDF generation architecture

1. İstifadəçi URL-ləri analiz edəndə hər URL ayrıca fetch olunur (concurrency limit ilə).
2. Fetch nəticəsi `Blob` kimi saxlanılır; JPEG/PNG birbaşa, WebP/AVIF/GIF/BMP kimi formatlar itkisiz PNG-ə konvert edilir ki, PDF-də düzgün göstərilsin.
3. "Download PDF" basıldıqda yüklənmiş image buffer-ları **Web Worker**'a transfer edilir (`transferable` sayəsində kopyalanmadan — memory-efficient).
4. Worker `pdf-lib` ilə hər image-i ayrıca səhifə kimi, orijinal pixel ölçüsündə və aspect ratio qorunaraq əlavə edir (landscape → landscape page, portrait → portrait page).
5. Yaranan PDF blob-u browser download-a ötürülür.
6. PDF generation zamanı progress bar real-time yenilənir (page x / total).

## Project structure

```
src/
  components/     UI componentləri
  lib/            analyze, imageLoader, pdfGenerator, export
  workers/        pdf.worker.ts (PDF generation)
  hooks/          theme & toasts
  types.ts        TypeScript tipləri
```

## License

MIT
