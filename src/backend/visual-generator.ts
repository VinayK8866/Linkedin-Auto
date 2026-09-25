import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MEDIA_DIR = path.resolve(process.cwd(), 'data/generated_media');
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

export interface QuoteCardOptions {
  quoteText: string;
  authorName?: string;
  authorRole?: string;
  theme?: 'dark-indigo' | 'cyber-blue' | 'emerald-glow';
}

export function generateQuoteCardHtml(options: QuoteCardOptions): string {
  const { quoteText, authorName = 'Vinay', authorRole = 'Tech Founder', theme = 'dark-indigo' } = options;

  let accentColor = '#6366F1';
  let accentGlow = 'rgba(99, 102, 241, 0.35)';
  if (theme === 'cyber-blue') {
    accentColor = '#0EA5E9';
    accentGlow = 'rgba(14, 165, 233, 0.35)';
  } else if (theme === 'emerald-glow') {
    accentColor = '#10B981';
    accentGlow = 'rgba(16, 185, 129, 0.35)';
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800;900&family=Inter:wght@400;600&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1200px;
      height: 675px;
      background: #0A0F1D;
      background-image: 
        radial-gradient(circle at 15% 20%, ${accentGlow} 0%, transparent 50%),
        radial-gradient(circle at 85% 80%, rgba(255, 255, 255, 0.03) 0%, transparent 45%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      color: #F8FAFC;
      overflow: hidden;
    }

    .card {
      width: 1040px;
      height: 530px;
      background: rgba(17, 24, 39, 0.75);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 28px;
      backdrop-filter: blur(24px);
      padding: 60px 70px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
    }

    .quote-mark {
      font-family: 'Outfit', sans-serif;
      font-size: 110px;
      font-weight: 900;
      color: ${accentColor};
      line-height: 0.8;
      opacity: 0.6;
      margin-bottom: -15px;
    }

    .quote-body {
      font-family: 'Outfit', sans-serif;
      font-size: 42px;
      font-weight: 800;
      line-height: 1.3;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 24px;
    }

    .author-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .author-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${accentColor}, #0A66C2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 22px;
      color: #FFFFFF;
      box-shadow: 0 4px 16px ${accentGlow};
    }

    .author-details strong {
      display: block;
      font-size: 22px;
      font-family: 'Outfit', sans-serif;
      color: #F8FAFC;
    }

    .author-details span {
      font-size: 17px;
      color: #94A3B8;
    }

    .brand-chip {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: ${accentColor};
      letter-spacing: 1.5px;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 18px;
      border-radius: 999px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div>
      <div class="quote-mark">&ldquo;</div>
      <div class="quote-body">${escapeHtml(quoteText)}</div>
    </div>

    <div class="card-footer">
      <div class="author-info">
        <div class="author-avatar">${escapeHtml((authorName[0] || 'V').toUpperCase())}</div>
        <div class="author-details">
          <strong>${escapeHtml(authorName)}</strong>
          <span>${escapeHtml(authorRole)}</span>
        </div>
      </div>
      <div class="brand-chip">LinkedIn Insight</div>
    </div>
  </div>
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

export async function compileQuoteCardToPng(options: QuoteCardOptions): Promise<{ pngPath: string; filename: string }> {
  const timestamp = Date.now();
  const filename = `quotecard_${timestamp}.png`;
  const htmlFilename = `quotecard_${timestamp}.html`;

  const htmlPath = path.join(MEDIA_DIR, htmlFilename);
  const pngPath = path.join(MEDIA_DIR, filename);

  const htmlContent = generateQuoteCardHtml(options);
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

  // Screenshot using Chrome headless
  const chromeCmd = `google-chrome --headless --disable-gpu --no-sandbox --screenshot="${pngPath}" --window-size=1200,675 "file://${htmlPath}"`;
  await execAsync(chromeCmd);

  try {
    fs.unlinkSync(htmlPath);
  } catch {}

  return {
    pngPath,
    filename
  };
}
