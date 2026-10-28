FONTS
=====

tajawal/   Tajawal (Regular, Medium, Bold, ExtraBold) — Arabic body text, and titles
           until 29LT Bukra is added. Open Font License (OFL.txt), self-hosted, free to use.
           Trimmed to Arabic + Latin characters to stay small (~24 KB per weight).

29LT BUKRA (main titles and subtitles in Arabic) — NOT INCLUDED
---------------------------------------------------------------
29LT Bukra is a commercial typeface by 29LT (29Letters). It needs a web-font licence
(check the licence covers web use on your domain). It is not bundled here.

When you have the licensed files:
  1. Create the folder  public/fonts/bukra/
  2. Put the web fonts in it with exactly these names:
       29LT-Bukra-Bold.woff2      (main titles)
       29LT-Bukra-Medium.woff2    (subtitles)
     (convert from .otf/.ttf with a tool allowed by your licence, if needed)
  3. In ".env" (and in your hosting settings) add:
       VITE_ARABIC_HEADING_FONT=bukra
  4. Rebuild:  npm run build   (or restart  npm run dev)

Until then the Arabic site uses Tajawal ExtraBold for titles and Tajawal Bold for subtitles.
