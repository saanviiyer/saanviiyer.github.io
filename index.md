---
layout: default
title: Saanvi S. Subramanian
---

<style>
/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

/* ── Reset & Base ── */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Source Sans 3', sans-serif;
  font-weight: 400;
  background: #faf8fd;
  color: #2d2040;
  line-height: 1.7;
}

/* ── Two-column wrapper ── */
.page-wrapper {
  display: grid;
  grid-template-columns: 300px 1fr;
  min-height: 100vh;
  max-width: 1100px;
  margin: 0 auto;
  gap: 0;
}

/* ════════════════════════════════
   LEFT SIDEBAR
════════════════════════════════ */
.sidebar {
  background: linear-gradient(160deg, #4a1a7a 0%, #6b2fa0 55%, #8b44c4 100%);
  color: #f0e6ff;
  padding: 48px 28px 48px 32px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-right: 3px solid #c084fc;
}

.sidebar-name {
  font-family: 'Lora', serif;
  font-size: 1.65rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  margin-bottom: 10px;
  letter-spacing: -0.3px;
}

.sidebar-title {
  font-size: 0.82rem;
  font-weight: 500;
  color: #d8b4fe;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.sidebar h2 {
  font-family: 'Lora', serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #e9d5ff;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 28px 0 14px;
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar ul li {
  font-size: 0.88rem;
  color: #f0e6ff;
  margin-bottom: 14px;
  padding-left: 14px;
  position: relative;
  line-height: 1.45;
}

.sidebar ul li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: #c084fc;
  font-size: 0.7rem;
  top: 2px;
}

.sidebar ul li strong {
  display: block;
  font-weight: 600;
  color: #ffffff;
  font-size: 0.9rem;
}

.sidebar-github {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 28px;
  padding: 10px 18px;
  background: rgba(255,255,255,0.12);
  border: 1.5px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;
}
.sidebar-github:hover {
  background: rgba(255,255,255,0.22);
  border-color: #e9d5ff;
  color: #ffffff;
}
.sidebar-github svg {
  flex-shrink: 0;
}

/* ════════════════════════════════
   MAIN CONTENT (RIGHT)
════════════════════════════════ */
.main-content {
  padding: 52px 56px 64px 52px;
  background: #faf8fd;
}

/* Welcome banner */
.welcome-banner {
  background: linear-gradient(135deg, #f5edff 0%, #ede9fe 100%);
  border-left: 4px solid #7c3aed;
  border-radius: 0 12px 12px 0;
  padding: 22px 28px;
  margin-bottom: 44px;
}

.welcome-banner p {
  font-size: 1.02rem;
  color: #3b1f6e;
  line-height: 1.75;
}

.welcome-banner strong {
  color: #6b21a8;
  font-weight: 600;
}

/* Section headings */
.main-content h2 {
  font-family: 'Lora', serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: #5b21b6;
  margin: 44px 0 18px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9d5ff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-content h2::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #7c3aed;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Research interests list */
.interests-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 24px;
  margin-top: 4px;
}

.interest-tag {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.93rem;
  color: #3b1f6e;
  padding: 8px 0;
}

.interest-tag::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #a855f7;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Publication card */
.pub-card {
  background: #ffffff;
  border: 1px solid #e4d7f7;
  border-left: 4px solid #7c3aed;
  border-radius: 10px;
  padding: 20px 22px;
  margin-bottom: 14px;
  transition: box-shadow 0.2s, border-left-color 0.2s;
}

.pub-card:hover {
  box-shadow: 0 4px 20px rgba(124,58,237,0.1);
  border-left-color: #a855f7;
}

.pub-card a {
  font-size: 0.96rem;
  font-weight: 600;
  color: #6d28d9;
  text-decoration: none;
  line-height: 1.5;
}

.pub-card a:hover {
  color: #4c1d95;
  text-decoration: underline;
}

.pub-year {
  display: inline-block;
  margin-top: 8px;
  font-size: 0.78rem;
  color: #9f75d4;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

/* Awards list */
.awards-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.awards-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.93rem;
}

.award-bullet {
  display: inline-block;
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.6rem;
}

.awards-list a {
  color: #6d28d9;
  font-weight: 500;
  text-decoration: none;
  line-height: 1.5;
  border-bottom: 1px solid #d8b4fe;
  transition: border-color 0.2s, color 0.2s;
}

.awards-list a:hover {
  color: #4c1d95;
  border-color: #7c3aed;
}

/* Highlighted award */
.award-highlight {
  background: linear-gradient(135deg, #f5f3ff, #ede9fe);
  border: 1px solid #ddd6fe;
  border-radius: 8px;
  padding: 12px 16px 12px 12px;
}

.award-highlight a {
  font-weight: 700;
  font-size: 0.97rem;
  color: #5b21b6;
  border-bottom: 1.5px solid #a78bfa;
}

/* Contact section */
.contact-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.95rem;
}

.contact-label {
  font-weight: 600;
  color: #7c3aed;
  width: 60px;
  flex-shrink: 0;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.contact-item a {
  color: #6d28d9;
  text-decoration: none;
  border-bottom: 1px solid #ddd6fe;
  transition: color 0.2s, border-color 0.2s;
}

.contact-item a:hover {
  color: #4c1d95;
  border-color: #7c3aed;
}

/* Divider */
.section-divider {
  border: none;
  height: 1px;
  background: linear-gradient(to right, #e9d5ff, transparent);
  margin: 8px 0 0;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .page-wrapper {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: static;
    height: auto;
  }
  .main-content {
    padding: 32px 24px;
  }
  .interests-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<div class="page-wrapper">

  <!-- ═══════════════════ SIDEBAR ═══════════════════ -->
  <aside class="sidebar">
    <div class="sidebar-name">Saanvi S.<br>Subramanian</div>
    <div class="sidebar-title">Computation &amp; Neural Systems<br>Student at Caltech</div>

    <h2>Projects</h2>
    <ul>
      <li>
        <strong>BCI Signal Analysis</strong>
        Real-time non-invasive brain signal processing.
      </li>
      <li>
        <strong>Multimodal MedAI</strong>
        Foundation model fusing EEG and imaging data.
      </li>
      <li>
        <strong>Protein Mutation Prediction</strong>
        Leveraging protein LMs for mutation effects.
      </li>
    </ul>

    <a href="https://github.com/saanviiyer" class="sidebar-github">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
      View My GitHub Profile
    </a>
  </aside>

  <!-- ═══════════════════ MAIN ═══════════════════ -->
  <main class="main-content">

    <div class="welcome-banner">
      <p>
        I'm a Computation and Neural Systems undergraduate researcher at the
        <strong>California Institute of Technology</strong>. My research focuses on
        <strong>brain stimulation and medical AI</strong>, with particular interest in BCI development.
      </p>
    </div>

    <h2>Research Interests</h2>
    <div class="interests-grid">
      <div class="interest-tag">Brain stimulation &amp; neural signal processing</div>
      <div class="interest-tag">Multimodal medical foundation models</div>
      <div class="interest-tag">Protein mutation effects via language models</div>
      <div class="interest-tag">Topic modeling in brain tumor development</div>
      <div class="interest-tag">Multisensory perception in humans</div>
    </div>

    <h2>Publications</h2>
    <div class="pub-card">
      <a href="https://www.biorxiv.org/content/10.1101/2025.11.12.687706v1">
        Elucidating Neurodevelopmental Trajectories in Cancer with Topic Modeling: Revealing Persistent External Granule Layer Lineages in Medulloblastoma
      </a>
      <div class="pub-year">2025</div>
    </div>

    <h2>Awards</h2>
    <ul class="awards-list">
      <li>
        <span class="award-bullet">★</span>
        <a href="https://drive.google.com/file/d/1jMRbw48vh7ewmfSiXvcXfDMqBXOKrYhw/view?pli=1">
          People's Choice Award @ Stanford Medicine Comprehensive Cancer Research Conference, 2024
        </a>
      </li>
      <li>
        <span class="award-bullet">★</span>
        <a href="https://wssef.org/wssef-2023-special-awards-grades-9-12-2/">
          Sigma Xi Best Display of Interdisciplinary Research, 2024
        </a>
      </li>
      <li>
        <span class="award-bullet">★</span>
        <a href="https://wssef.org/wssef-2023-special-awards-grades-9-12-2/">
          Armed Forces Excellence in Technology (PNW), 2024
        </a>
      </li>
      <li>
        <span class="award-bullet">★</span>
        <a href="https://swe.org/outreach/swenext-awards/">
          SWENext Global Innovator Award, 2024 &amp; 2025
        </a>
      </li>
      <li class="award-highlight">
        <span class="award-bullet">★</span>
        <a href="https://www.nasa.gov/stmd-flight-opportunities/access-flight-tests/techrise/winners-of-fourth-techrise-student-challenge/">
          NASA Techrise Winner (Team Lead), 2024 &amp; 2025
        </a>
      </li>
    </ul>

    <h2>Contact</h2>
    <div class="contact-grid">
      <div class="contact-item">
        <span class="contact-label">Email</span>
        <a href="mailto:ssubramanian@caltech.edu">ssubramanian@caltech.edu</a>
      </div>
      <div class="contact-item">
        <span class="contact-label">GitHub</span>
        <a href="https://github.com/saanviiyer">saanviiyer</a>
      </div>
    </div>

  </main>
</div>