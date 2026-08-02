export default {
  async fetch(request, env, ctx) {
    try {
      // 1. Meneruskan request ke server asli (Cloudflare Tunnel)
      const response = await fetch(request);
      
      // 2. Jika tunnel sedang down/mati, Cloudflare akan mengembalikan error 5xx
      // Terutama 502 (Bad Gateway), 521 (Web Server Is Down), 523, 530
      if (response.status >= 500 && response.status <= 530) {
        return serveMaintenancePage();
      }
      
      // Jika aman, kembalikan response aslinya
      return response;
    } catch (err) {
      // 3. Jika koneksi ke origin benar-benar gagal
      return serveMaintenancePage();
    }
  },
};

function serveMaintenancePage() {
  // Catatan: Karena server down, gambar logo.png tidak bisa dimuat. 
  // Kita menggunakan SVG bawaan dan CSS murni agar halaman tetap cantik meskipun server mati total.
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistem dalam Perbaikan | Seleksia</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --color-primary: #059669;
            --color-primary-hover: #047857;
            --color-primary-glow: rgba(5, 150, 105, 0.3);
            --color-accent: #007B83;
            --color-bg-base: #F8F9FA;
            --color-bg-card: #FFFFFF;
            --color-text-main: #1A3C40;
            --color-text-sub: #636E72;
            --radius-xl: 28px;
            --shadow-card: 0 10px 30px rgba(26, 60, 64, 0.08);
        }

        body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--color-bg-base);
            font-family: 'Inter', system-ui, sans-serif;
            color: var(--color-text-main);
            overflow: hidden;
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(5, 150, 105, 0.05), transparent 25%),
                radial-gradient(circle at 85% 30%, rgba(0, 123, 131, 0.05), transparent 25%);
        }

        .container {
            background: var(--color-bg-card);
            padding: 3.5rem 3rem;
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-card);
            text-align: center;
            max-width: 500px;
            width: 90%;
            position: relative;
            border: 1px solid rgba(0, 123, 131, 0.1);
            animation: floatUp 0.8s ease-out forwards;
        }

        .brand-text {
            font-size: 1.2rem;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--color-primary);
            margin-bottom: 2.5rem;
            display: block;
        }

        .icon-wrapper {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
            box-shadow: 0 0 20px var(--color-primary-glow);
            position: relative;
        }

        .icon-wrapper::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid var(--color-primary);
            animation: ripple 2s infinite ease-out;
        }

        .icon-wrapper svg {
            width: 40px;
            height: 40px;
            color: white;
            animation: spin 8s linear infinite;
        }

        h1 {
            font-size: 1.8rem;
            font-weight: 800;
            margin: 0 0 1rem;
            color: var(--color-text-main);
            letter-spacing: -0.5px;
        }

        p {
            font-size: 1rem;
            line-height: 1.6;
            color: var(--color-text-sub);
            margin: 0 0 2rem;
        }

        .contact-btn {
            display: inline-block;
            background-color: transparent;
            color: var(--color-primary);
            font-weight: 600;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 999px;
            border: 2px solid var(--color-primary);
            transition: all 0.3s ease;
        }

        .contact-btn:hover {
            background-color: var(--color-primary);
            color: white;
            box-shadow: 0 4px 15px var(--color-primary-glow);
            transform: translateY(-2px);
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background-color: rgba(5, 150, 105, 0.1);
            border-radius: 999px;
            margin-top: 2.5rem;
            overflow: hidden;
            position: relative;
        }

        .progress-bar .inner {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 30%;
            background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
            border-radius: 999px;
            animation: indeterminate 2s infinite ease-in-out;
        }

        @keyframes floatUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
            0% { transform: scale(0.98); }
            100% { transform: scale(1.02); }
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        @keyframes ripple {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes indeterminate {
            0% { left: -30%; width: 30%; }
            50% { width: 60%; }
            100% { left: 100%; width: 30%; }
        }

        .particle {
            position: absolute;
            background: var(--color-primary);
            border-radius: 50%;
            opacity: 0.2;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="particle" style="width: 15px; height: 15px; top: 10%; left: 20%; animation: pulse 4s infinite"></div>
    <div class="particle" style="width: 8px; height: 8px; top: 30%; right: 15%; animation: pulse 3s infinite"></div>
    <div class="particle" style="width: 12px; height: 12px; bottom: 20%; left: 10%; animation: pulse 5s infinite; background: var(--color-accent)"></div>
    <div class="particle" style="width: 20px; height: 20px; bottom: 15%; right: 25%; animation: pulse 6s infinite"></div>

    <div class="container">
        <span class="brand-text">SELEKSIA</span>
        
        <div class="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </div>

        <h1>Sedang Dalam Perbaikan</h1>
        <p>Sistem Seleksia saat ini sedang menjalani proses peningkatan dan perbaikan berkala untuk memberikan pengalaman terbaik kepada Anda. Kami akan segera kembali!</p>
        
        <a href="mailto:support@seleksia.com" class="contact-btn">Hubungi Dukungan</a>

        <div class="progress-bar">
            <div class="inner"></div>
        </div>
    </div>
</body>
</html>`;

  // Mengembalikan response dengan HTTP Status 503 (Service Unavailable)
  // Status 503 penting agar Search Engine (Google) tahu situs sedang maintenance, bukan mati permanen.
  return new Response(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Retry-After": "3600" // Coba lagi dalam 1 jam
    },
  });
}
