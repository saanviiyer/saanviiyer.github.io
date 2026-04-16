<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Saanvi S. Subramanian</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/style.css" />
</head>
<body>

<nav>
  <a href="index.html" class="nav-name">Saanvi S. Subramanian</a>
  <ul class="nav-links">
    <li><a href="pages/research.html">Research &amp; Projects</a></li>
    <li><a href="pages/about.html">About Me</a></li>
    <li><a href="pages/thinking.html">Thinking Out Loud</a></li>
    <li><a href="pages/misc.html">Misc.</a></li>
    <li><a href="pages/contact.html">Contact</a></li>
  </ul>
</nav>

<main>
  <div class="page-content">

    <!-- NAME -->
    <h1 class="home-name">Saanvi S. Subramanian</h1>

    <!-- PHOTO + INTRO TEXT -->
    <div class="intro-row">
      <!-- Profile photo: replace src with your actual photo path -->
      <div class="profile-photo-placeholder" title="Add your photo here">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="30" r="16" stroke="#2B4EBF" stroke-width="2.5"/>
          <path d="M10 72c0-16.6 13.4-30 30-30s30 13.4 30 30" stroke="#2B4EBF" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>

      <div class="intro-text">
        <p>
          First-year undergraduate student at
          <a class="accent-link" href="https://www.caltech.edu" target="_blank" rel="noopener">Caltech</a>
          studying
          <a class="accent-link" href="https://www.cns.caltech.edu" target="_blank" rel="noopener">Computation and Neural Systems</a>
          + CS/IDS.
        </p>
        <a class="github-btn" href="https://github.com/" target="_blank" rel="noopener">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
          </svg>
          View my GitHub profile
        </a>
      </div>
    </div>

    <!-- BRAIN + MISSION -->
    <div class="brain-mission-row">

      <!-- INTERACTIVE BRAIN SVG -->
      <div class="brain-container">
        <div class="brain-svg-wrapper">
          <svg viewBox="0 0 280 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Brain navigation map">
            <defs>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#2B4EBF" flood-opacity="0.15"/>
              </filter>
            </defs>

            <!-- BRAIN OUTLINE (ambient shape) -->
            <!-- Research & Projects — LEFT lobe (blue) -->
            <a href="pages/research.html">
              <path class="brain-region"
                d="M40,110 C30,90 28,68 38,52 C48,36 62,28 78,30
                   C88,20 102,18 112,26 C116,30 118,38 116,46
                   C110,50 104,56 102,64 C98,76 100,90 104,102
                   C100,108 92,112 82,114 C68,116 52,116 40,110 Z"
                fill="#A8C5F0" stroke="#2B4EBF" stroke-width="1.5" filter="url(#shadow)"/>
              <text class="brain-label" x="72" y="74" text-anchor="middle">Research &amp;</text>
              <text class="brain-label" x="72" y="87" text-anchor="middle">Projects</text>
            </a>

            <!-- About Me — BOTTOM CENTER (green) -->
            <a href="pages/about.html">
              <path class="brain-region"
                d="M104,102 C108,110 112,120 112,132
                   C112,148 104,162 94,168
                   C84,174 70,174 60,168
                   C50,162 44,150 46,136
                   C48,124 56,114 68,110
                   C80,106 94,102 104,102 Z"
                fill="#9DDBA8" stroke="#2B9E4F" stroke-width="1.5" filter="url(#shadow)"/>
              <text class="brain-label" x="76" y="140" text-anchor="middle">About Me</text>
            </a>

            <!-- Thinking Out Loud — TOP RIGHT (yellow) -->
            <a href="pages/thinking.html">
              <path class="brain-region"
                d="M140,30 C152,20 168,18 180,26
                   C194,34 202,50 200,66
                   C198,78 190,88 178,92
                   C168,96 156,94 148,86
                   C138,78 134,64 136,50
                   C136,42 138,34 140,30 Z"
                fill="#F5E97A" stroke="#C4A600" stroke-width="1.5" filter="url(#shadow)"/>
              <text class="brain-label" x="170" y="58" text-anchor="middle">Thinking</text>
              <text class="brain-label" x="170" y="71" text-anchor="middle">Out Loud</text>
            </a>

            <!-- Misc. — RIGHT MIDDLE (pink/salmon) -->
            <a href="pages/misc.html">
              <path class="brain-region"
                d="M178,92 C192,96 206,106 212,120
                   C218,134 214,150 204,160
                   C196,168 184,170 174,164
                   C164,158 158,146 158,132
                   C158,118 164,104 174,96
                   C176,94 177,93 178,92 Z"
                fill="#F4A7B0" stroke="#C0435A" stroke-width="1.5" filter="url(#shadow)"/>
              <text class="brain-label" x="188" y="132" text-anchor="middle">Misc.</text>
            </a>

            <!-- Contact — BOTTOM BRIDGE (purple/lavender) -->
            <a href="pages/contact.html">
              <path class="brain-region"
                d="M104,132 C108,138 112,146 116,154
                   C122,164 132,172 144,174
                   C156,176 168,170 174,160
                   C176,156 177,152 176,148
                   C168,148 158,144 150,136
                   C140,126 130,118 118,118
                   C112,118 107,124 104,132 Z"
                fill="#C5B3E8" stroke="#6C3EB8" stroke-width="1.5" filter="url(#shadow)"/>
              <text class="brain-label" x="142" y="152" text-anchor="middle">Contact</text>
            </a>

            <!-- Brain outline / corpus - subtle unifying stroke -->
            <ellipse cx="130" cy="100" rx="96" ry="78" fill="none" stroke="#999" stroke-width="0.8" stroke-dasharray="3,4" opacity="0.4"/>
          </svg>
        </div>
        <p style="font-size:0.74rem; color:#888; margin-top:6px; text-align:center;">Click a brain region to navigate</p>
      </div>

      <!-- MISSION TEXT -->
      <div class="mission-side">
        <p class="mission-text">
          my mission: build innovative technologies to
          <span class="accent">solve the mysteries of the brain.</span>
        </p>

        <!-- ROTATING QUESTION -->
        <div class="rotating-section">
          <p class="rotating-heading">
            What is <span class="rotating-word" id="rotating-word">Intelligence</span>?
          </p>
        </div>

        <!-- TAGLINE -->
        <div class="tagline-row">
          neuroscience &nbsp;×&nbsp; technology &nbsp;→&nbsp; health <span class="heart">&nbsp;♡</span>
        </div>

        <!-- STAR BULLET LIST -->
        <ul class="star-bullet-list">
          <li>
            <img src="assets/star_diagram.png" alt="★" class="star-icon" />
            Foundation models for BCI + neuromodulation
          </li>
          <li>
            <img src="assets/star_diagram.png" alt="★" class="star-icon" />
            NeuroAI
          </li>
          <li>
            <img src="assets/star_diagram.png" alt="★" class="star-icon" />
            Computational biology
          </li>
        </ul>
      </div>
    </div>

  </div><!-- /.page-content -->
</main>

<footer>
  <svg class="email-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
  <span>Feel free to contact me @
    <a href="mailto:ssubramanian@caltech.edu">ssubramanian@caltech.edu</a>
  </span>
</footer>

<script>
  const words = [
    "Intelligence","Creativity","Emotion","Addiction",
    "Focus","Depression","Curiosity","Empathy","Consciousness","Imagination"
  ];
  let idx = 0;
  const el = document.getElementById('rotating-word');

  setInterval(() => {
    el.classList.add('fade-out');
    setTimeout(() => {
      idx = (idx + 1) % words.length;
      el.textContent = words[idx];
      el.classList.remove('fade-out');
    }, 400);
  }, 5000);
</script>

</body>
</html>