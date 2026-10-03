import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-installation-guide',
  template: `
    <div class="doc-container">
      <!-- Non-Print Sticky Navigation Bar -->
      <header class="doc-navbar no-print">
        <div class="nav-left">
          <button (click)="goBack()" class="btn-back">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Fleet Hub
          </button>
          <div class="nav-brand">
            <span class="brand-badge">PDF MANUAL</span>
            <h2 class="doc-title-bar">Client Hardware Installation Guide</h2>
          </div>
        </div>

        <div class="nav-right">
          <button (click)="printDocument()" class="btn-print">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print / Save as PDF
          </button>
        </div>
      </header>

      <!-- Main Document Layout -->
      <div class="doc-layout">
        <!-- Sticky Table of Contents (On-Screen Desktop Only) -->
        <aside class="doc-sidebar no-print">
          <div class="toc-title">TABLE OF CONTENTS</div>
          <nav class="toc-nav">
            <a href="#overview">1. System Architecture Overview</a>
            <a href="#pairing">2. Zero-Friction PIN Pairing</a>
            <a href="#raspberry-pi">3. Raspberry Pi 3/4/5 Setup</a>
            <a href="#fire-tv">4. Amazon Fire TV & Fire Stick</a>
            <a href="#ipad-ios">5. Apple iPad (Guided Access Kiosk)</a>
            <a href="#android-tablet">6. Android Tablets & Displays</a>
            <a href="#windows-mini-pc">7. Windows & Mini PC Kiosk</a>
            <a href="#troubleshooting">8. Diagnostics & Troubleshooting</a>
          </nav>

          <div class="sidebar-help-card">
            <span class="sidebar-help-title">💡 Pro-Tip</span>
            <p>Click <strong>Print / Save as PDF</strong> in the top-right to generate a clean, bounded PDF export.</p>
          </div>
        </aside>

        <!-- Printable Document Content Area -->
        <main class="doc-content printable-area">
          <!-- Document Header -->
          <div class="manual-cover">
            <div class="cover-badge">OFFICIAL HARDWARE & CLIENT MANUAL</div>
            <h1 class="manual-title">Smart Display Multi-Platform Installation Guide</h1>
            <p class="manual-subtitle">Complete deployment instructions for Raspberry Pi, Amazon Fire TV, Apple iPad, Android Tablets, and Windows Mini PCs.</p>
            
            <div class="meta-row">
              <div class="meta-item"><span class="meta-label">Document Version:</span> 2.5.0 (Enterprise)</div>
              <div class="meta-item"><span class="meta-label">Target Cloud URL:</span> https://smart-kiosk.online</div>
              <div class="meta-item"><span class="meta-label">Protocol:</span> Web PWA / Chromium Kiosk / REST API</div>
            </div>
            <hr class="doc-divider" />
          </div>

          <!-- Section 1: Overview -->
          <section id="overview" class="doc-section">
            <div class="section-num">01</div>
            <h2>System Architecture Overview</h2>
            <p>
              Smart Display is a 100% web-native, zero-install digital canvas architecture. Any hardware device with a modern web engine (Chromium, WebKit, or Blink) can act as a permanent, 24/7 dedicated wall kiosk with zero compilation required on the physical device.
            </p>

            <div class="info-card">
              <div class="info-card-header">🔑 Key Display Endpoints</div>
              <ul class="info-list">
                <li><strong>Fleet & Admin Management Hub:</strong> <code>https://smart-kiosk.online/#/admin/displays</code></li>
                <li><strong>Hardware 6-Digit PIN Pairing Screen:</strong> <code>https://smart-kiosk.online/#/pair</code></li>
                <li><strong>Direct Kiosk Screen URL:</strong> <code>https://smart-kiosk.online/#/display/YOUR_SCREEN_TOKEN</code></li>
                <li><strong>Mobile WallDrop Portal:</strong> <code>https://smart-kiosk.online/#/drop/YOUR_SCREEN_TOKEN</code></li>
              </ul>
            </div>
          </section>

          <!-- Section 2: Zero-Friction PIN Pairing -->
          <section id="pairing" class="doc-section">
            <div class="section-num">02</div>
            <h2>Zero-Friction 6-Digit PIN Pairing Flow</h2>
            <p>
              For enterprise security and fast on-site commissioning without typing passwords on remote controls or touchscreens:
            </p>
            <ol class="step-list">
              <li>
                <strong>Launch Pairing Screen on Client Device:</strong>
                Navigate client browser to <code>/#/pair</code> (or <code>/#/display</code>). A prominent 6-digit code (e.g. <code>UP-4821</code>) is displayed alongside a QR code.
              </li>
              <li>
                <strong>Bond from Admin Fleet Hub:</strong>
                From your phone or laptop, open <strong>Fleet Hub</strong> ➔ Click <strong>"⚡ Pair Screen with PIN"</strong> ➔ Enter the 6-digit PIN and select the target display layout.
              </li>
              <li>
                <strong>Instant Hardware Bonding:</strong>
                The client screen automatically binds to the display token and launches the visual dashboard with zero manual interaction.
              </li>
            </ol>
          </section>

          <!-- Section 3: Raspberry Pi Setup -->
          <section id="raspberry-pi" class="doc-section">
            <div class="section-num">03</div>
            <h2>Raspberry Pi 3 / 4 / 5 Deployment Guide</h2>
            <p class="section-lead">
              Recommended for wall-mounted monitors (1080p Full HD, 2560×1440 2K QHD, or 4K UHD screens).
            </p>

            <h3>Step 3.1: Resolution & Screen Setup</h3>
            <p>Determine your monitor's native resolution and ensure proper HDMI drive output:</p>
            <div class="code-box">
              <div class="code-title">Terminal / SSH Command (Detect Active Resolution)</div>
              <pre><code>cat /sys/class/drm/card*-HDMI-A-1/mode
# Or check framebuffer:
fbset -s</code></pre>
            </div>

            <p>To force HDMI audio to your TV or monitor speakers, ensure <code>hdmi_drive=2</code> is in your boot configuration:</p>
            <div class="code-box">
              <div class="code-title">/boot/firmware/config.txt (or /boot/config.txt)</div>
              <pre><code># Force HDMI audio output
hdmi_drive=2

# Optional: Force 2560x1440 QHD &#64; 60Hz if not auto-detected
# hdmi_group=2
# hdmi_mode=87
# hdmi_cvt=2560 1440 60 3 0 0 0</code></pre>
            </div>

            <h3>Step 3.2: Disable Screen Blanking & Sleep</h3>
            <p>Prevent Raspberry Pi OS from turning off the screen or going into standby:</p>
            <div class="code-box">
              <div class="code-title">Terminal Commands (X11 Desktop)</div>
              <pre><code># Disable screen saver & DPMS power management
xset s off
xset -dpms
xset s noblank</code></pre>
            </div>
            <p>Or via GUI: <strong>Raspberry Pi Menu ➔ Preferences ➔ Raspberry Pi Configuration ➔ Display ➔ Screen Blanking: OFF</strong>.</p>

            <h3>Step 3.3: Configure Fullscreen Kiosk Autostart</h3>
            <p>Create an autostart desktop entry so the Smart Display boots automatically on power-on:</p>
            <div class="code-box">
              <div class="code-title">~/.config/autostart/smartdisplay.desktop</div>
              <pre><code>[Desktop Entry]
Type=Application
Name=Smart Display Kiosk
Exec=chromium-browser --password-store=basic --ignore-certificate-errors --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --disable-pinch --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required https://smart-kiosk.online/#/display/YOUR_TOKEN
X-GNOME-Autostart-enabled=true</code></pre>
            </div>

            <h3>Step 3.4: Audio Volume Management</h3>
            <div class="code-box">
              <div class="code-title">Set Master Audio Volume to 100%</div>
              <pre><code># For PipeWire (Raspberry Pi OS Bookworm):
wpctl set-volume &#64;DEFAULT_AUDIO_SINK&#64; 100%

# For ALSA (Raspberry Pi OS Bullseye):
amixer set Master 100%</code></pre>
            </div>
          </section>

          <!-- Section 4: Amazon Fire TV -->
          <section id="fire-tv" class="doc-section">
            <div class="section-num">04</div>
            <h2>Amazon Fire TV / Fire Stick Deployment Guide</h2>
            <p class="section-lead">
              Ideal for living room TVs, office lobbies, and conference rooms using standard Fire TV remotes.
            </p>

            <h3>Method A: Amazon Silk Web Browser (Zero Sideloading)</h3>
            <ol class="step-list">
              <li>Open the <strong>Amazon Silk Browser</strong> from the Fire TV App Store.</li>
              <li>Navigate to your pairing URL: <code>https://smart-kiosk.online/#/pair</code> (or direct screen link).</li>
              <li>Press the <strong>Menu Button (☰)</strong> on your Alexa Voice Remote ➔ Select <strong>"Fullscreen Mode"</strong> to hide address bar and tabs.</li>
              <li>Add the URL to your Silk Bookmarks for 1-click launch.</li>
            </ol>

            <h3>Method B: Fully Kiosk Browser APK (Enterprise 24/7 Mode)</h3>
            <ol class="step-list">
              <li>Install the free <strong>Downloader</strong> app from the Amazon Appstore.</li>
              <li>Open Downloader and enter short code <strong>356512</strong> (or download Fully Kiosk Fire OS APK).</li>
              <li>Install and open Fully Kiosk Browser.</li>
              <li>In Fully Kiosk Settings ➔ Set <strong>Start URL</strong> to your display token URL.</li>
              <li>Enable <strong>"Start on Boot"</strong> and <strong>"Keep Screen On"</strong>.</li>
            </ol>
          </section>

          <!-- Section 5: Apple iPad -->
          <section id="ipad-ios" class="doc-section">
            <div class="section-num">05</div>
            <h2>Apple iPad & iOS Dedicated Wall Kiosk Setup</h2>
            <p class="section-lead">
              Perfect for kitchen counters, smart home control stations, and bedside nightstand displays.
            </p>

            <h3>Step 5.1: Install as a Fullscreen Web App (PWA)</h3>
            <ol class="step-list">
              <li>Open <strong>Safari</strong> on your iPad and go to your display URL (e.g. <code>https://smart-kiosk.online/#/display/YOUR_TOKEN</code>).</li>
              <li>Tap the <strong>Share Button</strong> (square with arrow) at the top of Safari.</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
              <li>Name it <em>"Smart Display"</em> and tap <strong>Add</strong>.</li>
              <li>Launch the newly created icon from your Home Screen. It now runs in <strong>100% frameless standalone window mode</strong> with zero browser navigation bars.</li>
            </ol>

            <h3>Step 5.2: Lock with iOS Guided Access (24/7 Kiosk Lock)</h3>
            <p>Prevent guests or family from accidentally closing or swiping out of the kiosk:</p>
            <ol class="step-list">
              <li>Open iPad <strong>Settings</strong> ➔ <strong>Accessibility</strong> ➔ <strong>Guided Access</strong>.</li>
              <li>Toggle <strong>Guided Access: ON</strong> and set a PIN passcode.</li>
              <li>Set <strong>Display Auto-Lock</strong> to <strong>"Never"</strong>.</li>
              <li>Open your Smart Display web app and <strong>Triple-click the Top / Home button</strong>.</li>
              <li>Tap <strong>Start</strong> in the top right. The iPad is now permanently locked into Smart Display kiosk mode!</li>
            </ol>
          </section>

          <!-- Section 6: Android Tablets -->
          <section id="android-tablet" class="doc-section">
            <div class="section-num">06</div>
            <h2>Android Tablet & Smart Display Setup</h2>
            <ol class="step-list">
              <li>Open <strong>Google Chrome</strong> on the Android tablet and navigate to your display URL.</li>
              <li>Tap the <strong>Three Dots (⋮)</strong> menu ➔ Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
              <li>For 24/7 wall displays, install <strong>Fully Kiosk Browser</strong> from Google Play Store for motion detection screen wake-up, battery protection, and lock-task mode.</li>
              <li>Enable Android <strong>App Pinning</strong> (Settings ➔ Security ➔ Advanced ➔ App Pinning) to lock the display.</li>
            </ol>
          </section>

          <!-- Section 7: Windows & Mini PCs -->
          <section id="windows-mini-pc" class="doc-section">
            <div class="section-num">07</div>
            <h2>Windows Mini PC & Intel NUC Kiosk Deployment</h2>
            <p>Create a Windows shortcut in the Startup folder for unattended auto-launch:</p>
            <div class="code-box">
              <div class="code-title">Windows Run Command (Win + R)</div>
              <pre><code>shell:startup</code></pre>
            </div>
            <div class="code-box">
              <div class="code-title">Shortcut Target Line</div>
              <pre><code>"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required https://smart-kiosk.online/#/display/YOUR_TOKEN</code></pre>
            </div>
          </section>

          <!-- Section 8: Troubleshooting -->
          <section id="troubleshooting" class="doc-section">
            <div class="section-num">08</div>
            <h2>Diagnostics & Troubleshooting Reference</h2>
            <div class="table-responsive">
              <table class="trouble-table">
                <thead>
                  <tr>
                    <th style="width: 25%;">Symptom</th>
                    <th style="width: 30%;">Root Cause</th>
                    <th style="width: 45%;">Remedy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Red "Offline Mode" badge</strong></td>
                    <td>Network connectivity dropped or Wi-Fi sleeping</td>
                    <td>Display automatically serves cached data and auto-reconnects every 15 seconds. Check Wi-Fi sleep policy.</td>
                  </tr>
                  <tr>
                    <td><strong>No audio on alerts</strong></td>
                    <td>Browser autoplay policy requires muted initial media</td>
                    <td>Launch Chromium with <code>--autoplay-policy=no-user-gesture-required</code> or tap screen once to grant audio permission.</td>
                  </tr>
                  <tr>
                    <td><strong>Screen edges cut off on TV</strong></td>
                    <td>TV HDMI Overscan enabled by default</td>
                    <td>Open TV Picture Settings ➔ Set Aspect Ratio to "Just Scan", "Screen Fit", or "1:1 Pixel Mapping" (disable Overscan).</td>
                  </tr>
                  <tr>
                    <td><strong>Screen goes black after 10m</strong></td>
                    <td>OS power management / DPMS active</td>
                    <td>Disable screen blanking in Raspberry Pi / iPad / Windows power options.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Document Footer -->
          <footer class="doc-footer">
            <div class="footer-brand">Smart Display Digital Ecosystem</div>
            <div class="footer-copy">© 2026 Smart Display Platform. All rights reserved. Self-hosted & Cloud Enterprise Edition.</div>
          </footer>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      user-select: text;
    }

    * {
      box-sizing: border-box;
    }

    .doc-container {
      min-height: 100vh;
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      overflow-y: visible;
      user-select: text;
    }

    /* Navbar */
    .doc-navbar {
      height: 64px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(12px);
    }
    .nav-left {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
    }
    .btn-back {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #38bdf8;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .btn-back:hover {
      background: rgba(56, 189, 248, 0.15);
      color: #ffffff;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }
    .brand-badge {
      font-size: 0.65rem;
      font-weight: 800;
      background: #0ea5e9;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .doc-title-bar {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-print {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      border: none;
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
      transition: all 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .btn-print:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(14, 165, 233, 0.6);
    }

    /* Layout */
    .doc-layout {
      max-width: 1160px;
      margin: 0 auto;
      display: flex;
      padding: 28px 20px;
      gap: 32px;
      box-sizing: border-box;
      width: 100%;
    }

    /* Sidebar TOC */
    .doc-sidebar {
      width: 240px;
      flex-shrink: 0;
      position: sticky;
      top: 92px;
      height: calc(100vh - 120px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .toc-title {
      font-size: 0.7rem;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .toc-nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .toc-nav a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 6px 10px;
      border-radius: 6px;
      transition: all 0.2s;
      line-height: 1.35;
    }
    .toc-nav a:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #38bdf8;
    }
    .sidebar-help-card {
      background: rgba(14, 165, 233, 0.08);
      border: 1px solid rgba(14, 165, 233, 0.2);
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 0.75rem;
    }
    .sidebar-help-title {
      font-weight: 700;
      color: #38bdf8;
      display: block;
      margin-bottom: 4px;
    }
    .sidebar-help-card p {
      color: #94a3b8;
      margin: 0;
      line-height: 1.4;
    }

    /* Content Area */
    .doc-content {
      flex: 1;
      min-width: 0;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      box-sizing: border-box;
      overflow: hidden;
    }

    .cover-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .manual-title {
      font-size: 1.85rem;
      font-weight: 900;
      color: #ffffff;
      margin: 0 0 10px 0;
      line-height: 1.25;
    }
    .manual-subtitle {
      font-size: 0.95rem;
      color: #94a3b8;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 0.78rem;
      color: #cbd5e1;
      background: rgba(0, 0, 0, 0.3);
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      word-break: break-all;
    }
    .meta-label {
      color: #64748b;
      font-weight: 600;
    }
    .doc-divider {
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin: 28px 0;
    }

    /* Sections */
    .doc-section {
      margin-bottom: 36px;
      position: relative;
    }
    .section-num {
      font-size: 0.72rem;
      font-weight: 900;
      color: #0ea5e9;
      font-family: monospace;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }
    .doc-section h2 {
      font-size: 1.3rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 14px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 6px;
    }
    .doc-section h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #e2e8f0;
      margin: 20px 0 8px 0;
    }
    .doc-section p {
      font-size: 0.88rem;
      color: #cbd5e1;
      line-height: 1.6;
      margin: 0 0 12px 0;
    }
    .section-lead {
      font-size: 0.95rem;
      color: #94a3b8;
    }

    /* Cards & Lists */
    .info-card {
      background: rgba(14, 165, 233, 0.06);
      border: 1px solid rgba(14, 165, 233, 0.2);
      border-radius: 10px;
      padding: 14px 16px;
      margin: 14px 0;
    }
    .info-card-header {
      font-size: 0.82rem;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 8px;
    }
    .info-list {
      margin: 0;
      padding-left: 18px;
      font-size: 0.82rem;
      color: #cbd5e1;
      line-height: 1.6;
    }
    .info-list li {
      margin-bottom: 4px;
      word-break: break-all;
    }
    .step-list {
      padding-left: 18px;
      color: #cbd5e1;
      font-size: 0.88rem;
      line-height: 1.65;
    }
    .step-list li {
      margin-bottom: 10px;
    }

    /* Code Blocks */
    .code-box {
      background: #070a12;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin: 12px 0;
      overflow: hidden;
      max-width: 100%;
    }
    .code-title {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.04);
      padding: 6px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      font-family: monospace;
    }
    .code-box pre {
      margin: 0;
      padding: 12px 14px;
      overflow-x: auto;
      max-width: 100%;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .code-box code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.8rem;
      color: #38bdf8;
      line-height: 1.45;
      background: none;
      padding: 0;
    }
    code {
      font-family: monospace;
      background: rgba(0, 0, 0, 0.4);
      color: #38bdf8;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 0.82em;
      word-break: break-word;
    }

    /* Troubleshooting Table */
    .table-responsive {
      width: 100%;
      overflow-x: auto;
      margin: 14px 0;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .trouble-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      table-layout: auto;
    }
    .trouble-table th, .trouble-table td {
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }
    .trouble-table th {
      background: rgba(255, 255, 255, 0.06);
      color: #ffffff;
      font-weight: 700;
      white-space: nowrap;
    }
    .trouble-table td {
      color: #cbd5e1;
      line-height: 1.4;
    }

    /* Footer */
    .doc-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: #64748b;
      flex-wrap: wrap;
      gap: 10px;
    }

    /* Responsive Screen Styles */
    @media (max-width: 900px) {
      .doc-layout {
        flex-direction: column;
        padding: 16px 12px;
        gap: 20px;
      }
      .doc-sidebar {
        display: none;
      }
      .doc-content {
        padding: 24px 18px;
        border-radius: 12px;
      }
      .manual-title {
        font-size: 1.45rem;
      }
      .doc-navbar {
        padding: 0 14px;
      }
      .doc-title-bar {
        display: none;
      }
    }

    /* Publication-Grade Print & PDF Styles */
    @media print {
      @page {
        size: letter portrait;
        margin: 14mm 14mm 14mm 14mm;
      }

      html, body {
        background: #ffffff !important;
        color: #111827 !important;
        font-size: 10pt !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }

      .no-print {
        display: none !important;
      }

      .doc-container {
        background: #ffffff !important;
        color: #111827 !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: auto !important;
      }

      .doc-layout {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        width: 100% !important;
      }

      .doc-content {
        background: #ffffff !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        color: #111827 !important;
        width: 100% !important;
        overflow: visible !important;
      }

      .manual-cover {
        margin-bottom: 20pt;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .manual-title {
        color: #0f172a !important;
        font-size: 20pt !important;
        margin-bottom: 6pt !important;
      }

      .manual-subtitle {
        color: #475569 !important;
        font-size: 10.5pt !important;
        margin-bottom: 14pt !important;
      }

      .cover-badge {
        border: 1pt solid #0284c7 !important;
        color: #0369a1 !important;
        background: #f0f9ff !important;
      }

      .meta-row {
        background: #f8fafc !important;
        border: 1pt solid #e2e8f0 !important;
        color: #334155 !important;
        padding: 8pt 10pt !important;
      }

      .meta-label {
        color: #64748b !important;
      }

      .doc-divider {
        border-top: 1pt solid #cbd5e1 !important;
        margin: 16pt 0 !important;
      }

      .doc-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 18pt !important;
      }

      .doc-section h2 {
        color: #0f172a !important;
        font-size: 13pt !important;
        border-bottom: 1.5pt solid #0f172a !important;
        padding-bottom: 4pt !important;
        margin-bottom: 8pt !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      .doc-section h3 {
        color: #1e293b !important;
        font-size: 11pt !important;
        margin: 12pt 0 4pt 0 !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      .doc-section p, .step-list, .step-list li {
        color: #334155 !important;
        line-height: 1.5 !important;
      }

      .code-box {
        background: #f8fafc !important;
        border: 1pt solid #cbd5e1 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin: 8pt 0 !important;
        width: 100% !important;
      }

      .code-title {
        background: #e2e8f0 !important;
        color: #334155 !important;
        font-size: 8pt !important;
        padding: 4pt 8pt !important;
        border-bottom: 1pt solid #cbd5e1 !important;
      }

      .code-box pre {
        padding: 8pt 10pt !important;
        white-space: pre-wrap !important;
        word-break: break-all !important;
        overflow-wrap: anywhere !important;
      }

      .code-box code {
        color: #0369a1 !important;
        font-size: 8.5pt !important;
        line-height: 1.4 !important;
      }

      code {
        background: #f1f5f9 !important;
        color: #0369a1 !important;
        border: 0.5pt solid #e2e8f0 !important;
        font-size: 8.5pt !important;
        word-break: break-all !important;
      }

      .info-card {
        background: #f0f9ff !important;
        border: 1pt solid #bae6fd !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin: 10pt 0 !important;
      }

      .info-card-header {
        color: #0369a1 !important;
      }

      .table-responsive {
        border: 1pt solid #cbd5e1 !important;
        overflow: visible !important;
        margin: 10pt 0 !important;
      }

      .trouble-table {
        width: 100% !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        table-layout: fixed !important;
      }

      .trouble-table th {
        background: #f1f5f9 !important;
        color: #0f172a !important;
        border: 1pt solid #cbd5e1 !important;
        padding: 6pt 8pt !important;
        font-size: 8.5pt !important;
      }

      .trouble-table td {
        border: 1pt solid #cbd5e1 !important;
        color: #334155 !important;
        padding: 6pt 8pt !important;
        font-size: 8pt !important;
        word-break: break-word !important;
      }

      .doc-footer {
        border-top: 1pt solid #cbd5e1 !important;
        color: #64748b !important;
        margin-top: 24pt !important;
        padding-top: 10pt !important;
        font-size: 7.5pt !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  `]
})
export class InstallationGuideComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/admin/displays']);
  }

  printDocument(): void {
    window.print();
  }
}
