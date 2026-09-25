import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MEDIA_DIR = path.resolve(process.cwd(), 'data/generated_media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

export interface SlideData {
  slideNumber: number;
  slideType: string;
  headline: string;
  content: string;
}

export interface CarouselOptions {
  slides: SlideData[];
  authorName?: string;
  authorHandle?: string;
  theme?: 'dark-indigo' | 'cyber-blue' | 'emerald-glow';
}

export function generateCarouselHtml(options: CarouselOptions): string {
  const { slides, authorName = 'Vinay', authorHandle = '@vinay', theme = 'dark-indigo' } = options;
  const totalSlides = slides.length;

  let accentColor = '#6366F1';
  let accentGlow = 'rgba(99, 102, 241, 0.25)';
  if (theme === 'cyber-blue') {
    accentColor = '#0EA5E9';
    accentGlow = 'rgba(14, 165, 233, 0.25)';
  } else if (theme === 'emerald-glow') {
    accentColor = '#10B981';
    accentGlow = 'rgba(16, 185, 129, 0.25)';
  }

  const slidesHtml = slides.map((slide, index) => {
    const isCover = slide.slideType === 'cover' || index === 0;
    const isRecap = slide.slideType === 'recap' || index === totalSlides - 2;
    const isCta = slide.slideType === 'cta' || index === totalSlides - 1;

    return `
      <section class="slide ${isCover ? 'slide-cover' : ''} ${isRecap ? 'slide-recap' : ''} ${isCta ? 'slide-cta' : ''}">
        <div class="slide-header">
          <div class="slide-badge">${slide.slideType.toUpperCase()}</div>
          <div class="slide-counter">${slide.slideNumber} / ${totalSlides}</div>
        </div>

        <div class="slide-content">
          ${isCover ? `
            <div class="cover-hook-tag">FRAMEWORK BREAKDOWN</div>
            <h1 class="cover-headline">${escapeHtml(slide.headline)}</h1>
            <p class="cover-subtitle">${escapeHtml(slide.content)}</p>
            <div class="swipe-hint">SWIPE TO READ &rarr;</div>
          ` : `
            <h2 class="slide-headline">${escapeHtml(slide.headline)}</h2>
            <div class="slide-body">
              ${escapeHtml(slide.content).replace(/\n/g, '<br/>')}
            </div>
          `}
        </div>

        <div class="slide-footer">
          <div class="author-tag">
            <span class="avatar-dot"></span>
            <strong>${escapeHtml(authorName)}</strong>
            <span class="handle">${escapeHtml(authorHandle)}</span>
          </div>
          <div class="brand-watermark">LinkedIn Insights</div>
        </div>
      </section>
    `;
  }).join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LinkedIn Carousel Document</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

    @page {
      size: 1080px 1350px;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: #090D16;
      color: #F8FAFC;
      font-family: 'Inter', -apple-system, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .slide {
      width: 1080px;
      height: 1350px;
      page-break-after: always;
      position: relative;
      background: #090D16;
      background-image: 
        radial-gradient(circle at 80% 20%, ${accentGlow} 0%, transparent 45%),
        radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.03) 0%, transparent 45%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 90px 100px;
      overflow: hidden;
    }

    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .slide-badge {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: ${accentColor};
      letter-spacing: 2px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 24px;
      border-radius: 999px;
    }

    .slide-counter {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #64748B;
    }

    .slide-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin: 40px 0;
    }

    /* Cover Slide */
    .cover-hook-tag {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: ${accentColor};
      letter-spacing: 3px;
      margin-bottom: 24px;
    }

    .cover-headline {
      font-family: 'Outfit', sans-serif;
      font-size: 76px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -1.5px;
      color: #FFFFFF;
      margin-bottom: 36px;
    }

    .cover-subtitle {
      font-size: 34px;
      line-height: 1.4;
      color: #94A3B8;
      max-width: 850px;
      margin-bottom: 60px;
    }

    .swipe-hint {
      display: inline-block;
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: ${accentColor};
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid ${accentColor};
      padding: 16px 36px;
      border-radius: 999px;
      width: fit-content;
    }

    /* Regular Slides */
    .slide-headline {
      font-family: 'Outfit', sans-serif;
      font-size: 64px;
      font-weight: 800;
      line-height: 1.2;
      color: #FFFFFF;
      margin-bottom: 36px;
      letter-spacing: -1px;
    }

    .slide-body {
      font-size: 36px;
      line-height: 1.5;
      color: #CBD5E1;
      max-width: 880px;
    }

    /* Slide Footer */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 2px solid rgba(255, 255, 255, 0.08);
      padding-top: 36px;
    }

    .author-tag {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 26px;
    }

    .avatar-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${accentColor};
      box-shadow: 0 0 16px ${accentColor};
    }

    .author-tag strong {
      color: #F8FAFC;
    }

    .author-tag .handle {
      color: #64748B;
    }

    .brand-watermark {
      font-size: 22px;
      color: #475569;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  ${slidesHtml}
</body>
</html>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function compileCarouselToPdf(options: CarouselOptions): Promise<{ pdfPath: string; filename: string }> {
  const timestamp = Date.now();
  const filename = `carousel_${timestamp}.pdf`;
  const htmlFilename = `carousel_${timestamp}.html`;

  const htmlPath = path.join(MEDIA_DIR, htmlFilename);
  const pdfPath = path.join(MEDIA_DIR, filename);

  const htmlContent = generateCarouselHtml(options);
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

  // Compile using Chrome headless
  const chromeCmd = `google-chrome --headless --disable-gpu --no-sandbox --print-to-pdf="${pdfPath}" --print-to-pdf-no-header "file://${htmlPath}"`;
  await execAsync(chromeCmd);

  // Clean up temporary HTML
  try {
    fs.unlinkSync(htmlPath);
  } catch {}

  return {
    pdfPath,
    filename
  };
}
