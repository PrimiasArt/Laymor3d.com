const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'thumbnails');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function svgWrapper(category, title, accentColor, glowColor, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-${title.toLowerCase().replace(/[^a-z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="60%" stop-color="#111827" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>
    <radialGradient id="glow-${title.toLowerCase().replace(/[^a-z0-9]/g, '')}" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${glowColor}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${glowColor}" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="${accentColor}" flood-opacity="0.35" />
    </filter>
  </defs>
  <rect width="600" height="400" fill="url(#bg-${title.toLowerCase().replace(/[^a-z0-9]/g, '')})" />
  <rect width="600" height="400" fill="url(#glow-${title.toLowerCase().replace(/[^a-z0-9]/g, '')})" />
  
  <!-- Perspective Print Bed Grid -->
  <g stroke="#1f2937" stroke-width="1.2" opacity="0.6">
    <path d="M50 340 L550 340 M100 365 L500 365 M150 385 L450 385" stroke-dasharray="6 4" />
    <path d="M150 385 L50 340 M250 385 L200 340 M350 385 L400 340 M450 385 L550 340" />
  </g>

  <!-- Main Themed Illustration -->
  <g filter="url(#shadow)">
    ${content}
  </g>

  <!-- Badges -->
  <rect x="24" y="24" width="auto" height="26" rx="6" fill="#1e293b" stroke="#334155" opacity="0.9" />
  <text x="36" y="41" fill="${accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">${category.toUpperCase()}</text>
  <text x="576" y="41" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="600" text-anchor="end">${title.toUpperCase()}</text>
</svg>`;
}

const svgs = {
  // 1. Benchy
  'benchy.svg': svgWrapper('Calibration & Test', '3D Benchy', '#38bdf8', '#0284c7', `
    <!-- Benchy Hull -->
    <path d="M150 260 C200 315, 380 320, 450 250 L430 215 L180 215 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="2.5" />
    <!-- Deck Box -->
    <rect x="230" y="190" width="150" height="25" rx="3" fill="#1e293b" stroke="#475569" stroke-width="2" />
    <!-- Cabin Base -->
    <rect x="250" y="125" width="110" height="65" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="2.5" />
    <!-- Cabin Roof -->
    <path d="M235 125 C235 110, 375 110, 375 125 Z" fill="#334155" stroke="#64748b" stroke-width="2" />
    <!-- Windows -->
    <circle cx="280" cy="155" r="13" fill="#0f172a" stroke="#94a3b8" stroke-width="2" />
    <circle cx="330" cy="155" r="13" fill="#0f172a" stroke="#94a3b8" stroke-width="2" />
    <!-- Chimney -->
    <rect x="305" y="80" width="24" height="42" rx="3" fill="#ef4444" stroke="#fca5a5" stroke-width="2" />
    <ellipse cx="317" cy="80" rx="12" ry="4" fill="#f87171" stroke="#fca5a5" stroke-width="1.5" />
    <!-- Hawse Hole -->
    <circle cx="185" cy="232" r="8" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
  `),

  // 2. Dragon
  'dragon.svg': svgWrapper('Art & Toys', 'Crystal Dragon', '#a855f7', '#7e22ce', `
    <!-- Dragon Body & Wings -->
    <path d="M160 270 Q240 160 300 240 T440 220" fill="none" stroke="#9333ea" stroke-width="22" stroke-linecap="round" />
    <path d="M160 270 Q240 160 300 240 T440 220" fill="none" stroke="#c084fc" stroke-width="12" stroke-linecap="round" />
    <!-- Dragon Head -->
    <polygon points="430,225 480,210 470,240 435,235" fill="#e9d5ff" stroke="#a855f7" stroke-width="2" />
    <!-- Horns -->
    <polygon points="440,210 465,160 450,210" fill="#f43f5e" stroke="#fda4af" stroke-width="1.5" />
    <polygon points="430,212 445,168 438,214" fill="#fb7185" stroke="#fda4af" stroke-width="1.5" />
    <!-- Left Wing -->
    <polygon points="260,220 220,110 270,160 290,120 310,180 340,140 330,230" fill="#7e22ce" stroke="#c084fc" stroke-width="2" opacity="0.9" />
    <!-- Right Wing -->
    <polygon points="280,230 330,120 350,170 380,130 380,200 410,160 380,235" fill="#a855f7" stroke="#e9d5ff" stroke-width="2" opacity="0.9" />
    <!-- Crystal Spine Spikes -->
    <polygon points="190,230 195,200 205,230" fill="#f472b6" />
    <polygon points="220,200 226,170 234,202" fill="#f472b6" />
    <polygon points="340,235 348,205 356,236" fill="#f472b6" />
    <polygon points="380,226 386,200 393,228" fill="#f472b6" />
  `),

  // 3. Robot
  'robot.svg': svgWrapper('Robotics & Toys', 'Retro Fidget Bot', '#10b981', '#059669', `
    <!-- Antenna -->
    <line x1="300" y1="110" x2="300" y2="75" stroke="#6ee7b7" stroke-width="4" />
    <circle cx="300" cy="70" r="10" fill="#ef4444" stroke="#fca5a5" stroke-width="2" />
    <!-- Head -->
    <rect x="235" y="110" width="130" height="90" rx="16" fill="#1e293b" stroke="#34d399" stroke-width="3" />
    <!-- Ears -->
    <rect x="215" y="135" width="20" height="40" rx="4" fill="#334155" stroke="#10b981" stroke-width="2" />
    <rect x="365" y="135" width="20" height="40" rx="4" fill="#334155" stroke="#10b981" stroke-width="2" />
    <!-- Eyes Screen -->
    <rect x="255" y="130" width="90" height="35" rx="8" fill="#022c22" stroke="#059669" stroke-width="2" />
    <circle cx="280" cy="147" r="9" fill="#10b981" />
    <circle cx="320" cy="147" r="9" fill="#10b981" />
    <!-- Smile -->
    <path d="M280 180 Q300 190 320 180" fill="none" stroke="#6ee7b7" stroke-width="3" stroke-linecap="round" />
    <!-- Neck -->
    <rect x="285" y="200" width="30" height="15" fill="#475569" />
    <!-- Body -->
    <rect x="220" y="215" width="160" height="100" rx="14" fill="#0f172a" stroke="#10b981" stroke-width="3" />
    <!-- Chest Dial -->
    <circle cx="270" cy="265" r="22" fill="#1e293b" stroke="#34d399" stroke-width="2" />
    <line x1="270" y1="265" x2="282" y2="253" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
    <!-- Chest Buttons -->
    <circle cx="335" cy="250" r="8" fill="#f59e0b" />
    <circle cx="335" cy="275" r="8" fill="#3b82f6" />
  `),

  // 4. Gear
  'gear.svg': svgWrapper('Mechanics', 'Planetary Gear', '#f59e0b', '#d97706', `
    <!-- Outer Ring Gear -->
    <circle cx="300" cy="200" r="115" fill="none" stroke="#d97706" stroke-width="18" stroke-dasharray="14 10" />
    <circle cx="300" cy="200" r="125" fill="none" stroke="#f59e0b" stroke-width="4" />
    <!-- Planet Gear 1 -->
    <circle cx="300" cy="135" r="42" fill="#1e293b" stroke="#fbbf24" stroke-width="4" stroke-dasharray="8 6" />
    <circle cx="300" cy="135" r="12" fill="#0f172a" stroke="#f59e0b" stroke-width="3" />
    <!-- Planet Gear 2 -->
    <circle cx="240" cy="240" r="42" fill="#1e293b" stroke="#fbbf24" stroke-width="4" stroke-dasharray="8 6" />
    <circle cx="240" cy="240" r="12" fill="#0f172a" stroke="#f59e0b" stroke-width="3" />
    <!-- Planet Gear 3 -->
    <circle cx="360" cy="240" r="42" fill="#1e293b" stroke="#fbbf24" stroke-width="4" stroke-dasharray="8 6" />
    <circle cx="360" cy="240" r="12" fill="#0f172a" stroke="#f59e0b" stroke-width="3" />
    <!-- Sun Gear (Center) -->
    <circle cx="300" cy="200" r="28" fill="#b45309" stroke="#fef3c7" stroke-width="3" stroke-dasharray="6 4" />
    <circle cx="300" cy="200" r="8" fill="#f8fafc" />
  `),

  // 5. Helmet
  'helmet.svg': svgWrapper('Cosplay & Sci-Fi', 'Mecha Helmet', '#06b6d4', '#0891b2', `
    <!-- Helmet Main Dome -->
    <path d="M210 230 C210 130, 390 130, 390 230 L380 280 L220 280 Z" fill="#0f172a" stroke="#06b6d4" stroke-width="3" />
    <!-- Brow Plate -->
    <path d="M200 195 L300 170 L400 195 L390 220 L300 195 L210 220 Z" fill="#1e293b" stroke="#22d3ee" stroke-width="2" />
    <!-- Visor Glowing Band -->
    <path d="M225 215 Q300 235 375 215 L370 245 Q300 265 230 245 Z" fill="#0891b2" stroke="#67e8f9" stroke-width="2.5" />
    <!-- HUD Center Line -->
    <line x1="260" y1="235" x2="340" y2="235" stroke="#ec4899" stroke-width="3" stroke-dasharray="10 5" />
    <!-- Chin Guard -->
    <polygon points="260,280 300,320 340,280 300,290" fill="#164e63" stroke="#22d3ee" stroke-width="2" />
    <!-- Ears Canisters -->
    <rect x="185" y="210" width="25" height="50" rx="6" fill="#1e293b" stroke="#06b6d4" stroke-width="2" />
    <rect x="390" y="210" width="25" height="50" rx="6" fill="#1e293b" stroke="#06b6d4" stroke-width="2" />
    <circle cx="197" cy="235" r="5" fill="#22d3ee" />
    <circle cx="403" cy="235" r="5" fill="#22d3ee" />
  `),

  // 6. Turbine
  'turbine.svg': svgWrapper('Aerospace', 'Jet Engine Turbofan', '#f97316', '#c2410c', `
    <!-- Outer Nacelle Cowl -->
    <circle cx="300" cy="200" r="110" fill="#0f172a" stroke="#ea580c" stroke-width="8" />
    <circle cx="300" cy="200" r="98" fill="#1e293b" stroke="#fb923c" stroke-width="3" />
    <!-- Blades (Curved) -->
    ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => `
      <g transform="rotate(${deg} 300 200)">
        <path d="M300 200 Q325 150 310 105" fill="none" stroke="#fed7aa" stroke-width="5" stroke-linecap="round" />
      </g>
    `).join('')}
    <!-- Center Nose Cone -->
    <circle cx="300" cy="200" r="32" fill="#c2410c" stroke="#ffedd5" stroke-width="2.5" />
    <!-- Spiral Line on Cone -->
    <path d="M300 185 Q315 200 300 215" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
  `),

  // 7. Eiffel Tower
  'eiffel.svg': svgWrapper('Architecture', 'Eiffel Tower', '#eab308', '#ca8a04', `
    <!-- Spire & Tip -->
    <line x1="300" y1="70" x2="300" y2="120" stroke="#facc15" stroke-width="3" />
    <polygon points="296,120 304,120 308,180 292,180" fill="#854d0e" stroke="#facc15" stroke-width="2" />
    <!-- Platform 2 -->
    <rect x="270" y="180" width="60" height="8" rx="2" fill="#ca8a04" stroke="#fef08a" stroke-width="1.5" />
    <!-- Mid Section -->
    <polygon points="280,188 320,188 335,250 265,250" fill="#713f12" stroke="#facc15" stroke-width="2" />
    <!-- Platform 1 -->
    <rect x="245" y="250" width="110" height="12" rx="3" fill="#ca8a04" stroke="#fef08a" stroke-width="2" />
    <!-- Legs & Arch Base -->
    <polygon points="255,262 280,262 230,340 195,340" fill="#854d0e" stroke="#facc15" stroke-width="2" />
    <polygon points="345,262 320,262 370,340 405,340" fill="#854d0e" stroke="#facc15" stroke-width="2" />
    <!-- Base Arch -->
    <path d="M230 340 Q300 280 370 340" fill="none" stroke="#fef08a" stroke-width="4" />
  `),

  // 8. Flexi Rex
  'flexi-rex.svg': svgWrapper('Toys & Fidget', 'Flexi Rex Dinosaur', '#22c55e', '#16a34a', `
    <!-- Dinosaur Silhouette with Joint Segments -->
    <!-- Head & Open Jaw -->
    <path d="M200 190 Q220 130 280 140 L310 160 L290 180 L315 200 L270 215 L250 195 Z" fill="#15803d" stroke="#86efac" stroke-width="2.5" />
    <!-- Eye & Teeth -->
    <circle cx="260" cy="160" r="4" fill="#facc15" />
    <polygon points="295,170 302,175 292,177" fill="#ffffff" />
    <polygon points="280,205 285,198 290,206" fill="#ffffff" />
    <!-- Body Segment 1 -->
    <rect x="270" y="210" width="45" height="40" rx="8" fill="#166534" stroke="#4ade80" stroke-width="2" />
    <!-- Body Segment 2 & Leg -->
    <rect x="310" y="215" width="45" height="45" rx="8" fill="#15803d" stroke="#4ade80" stroke-width="2" />
    <path d="M330 260 L330 320 L355 320" fill="none" stroke="#22c55e" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Tail Segments -->
    <rect x="355" y="225" width="30" height="28" rx="6" fill="#166534" stroke="#4ade80" stroke-width="2" />
    <rect x="385" y="235" width="25" height="22" rx="5" fill="#15803d" stroke="#4ade80" stroke-width="2" />
    <rect x="410" y="245" width="20" height="16" rx="4" fill="#166534" stroke="#4ade80" stroke-width="2" />
    <rect x="430" y="252" width="16" height="12" rx="3" fill="#15803d" stroke="#4ade80" stroke-width="2" />
  `),

  // 9. Octopus
  'octopus.svg': svgWrapper('Toys & Animals', 'Cute Octopus', '#ec4899', '#db2777', `
    <!-- Head Dome -->
    <path d="M210 210 C210 110, 390 110, 390 210 C390 240, 210 240, 210 210 Z" fill="#db2777" stroke="#f472b6" stroke-width="3" />
    <!-- Kawaii Eyes -->
    <circle cx="265" cy="185" r="14" fill="#0f172a" stroke="#ffffff" stroke-width="2" />
    <circle cx="270" cy="180" r="5" fill="#ffffff" />
    <circle cx="335" cy="185" r="14" fill="#0f172a" stroke="#ffffff" stroke-width="2" />
    <circle cx="340" cy="180" r="5" fill="#ffffff" />
    <!-- Cheeks & Smile -->
    <circle cx="245" cy="205" r="8" fill="#fda4af" opacity="0.6" />
    <circle cx="355" cy="205" r="8" fill="#fda4af" opacity="0.6" />
    <path d="M292 200 Q300 210 308 200" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
    <!-- Waving Tentacles -->
    <path d="M220 225 Q180 260 190 290 Q200 320 240 310" fill="none" stroke="#be185d" stroke-width="16" stroke-linecap="round" />
    <path d="M250 230 Q250 280 270 315" fill="none" stroke="#db2777" stroke-width="16" stroke-linecap="round" />
    <path d="M300 230 Q300 290 310 325" fill="none" stroke="#ec4899" stroke-width="16" stroke-linecap="round" />
    <path d="M350 230 Q350 280 340 315" fill="none" stroke="#db2777" stroke-width="16" stroke-linecap="round" />
    <path d="M380 225 Q420 260 410 290 Q400 320 360 310" fill="none" stroke="#be185d" stroke-width="16" stroke-linecap="round" />
  `),

  // 10. Honeycomb Storage Wall
  'hsw.svg': svgWrapper('Workshop & Storage', 'Honeycomb Wall (HSW)', '#38bdf8', '#0369a1', `
    <!-- Hexagonal Matrix -->
    ${[
      [220, 150], [280, 150], [340, 150], [400, 150],
      [190, 200], [250, 200], [310, 200], [370, 200], [430, 200],
      [220, 250], [280, 250], [340, 250], [400, 250],
      [250, 300], [310, 300], [370, 300]
    ].map(([cx, cy]) => `
      <polygon points="${cx},${cy-25} ${cx+22},${cy-12} ${cx+22},${cy+12} ${cx},${cy+25} ${cx-22},${cy+12} ${cx-22},${cy-12}" 
        fill="#1e293b" stroke="#38bdf8" stroke-width="2.5" />
    `).join('')}
    <!-- Center Hook Insert -->
    <rect x="295" y="190" width="30" height="40" rx="4" fill="#f59e0b" stroke="#fde68a" stroke-width="2" />
    <circle cx="310" cy="202" r="5" fill="#78350f" />
  `),

  // 11. Gridfinity
  'gridfinity.svg': svgWrapper('Organization', 'Gridfinity System', '#6366f1', '#4338ca', `
    <!-- Isometric Grid Base -->
    <!-- Bin 1 Left -->
    <polygon points="180,210 260,170 340,210 260,250" fill="#4338ca" stroke="#818cf8" stroke-width="2" />
    <polygon points="180,210 260,250 260,310 180,270" fill="#312e81" stroke="#818cf8" stroke-width="2" />
    <polygon points="260,250 340,210 340,270 260,310" fill="#3730a3" stroke="#818cf8" stroke-width="2" />
    <!-- Bin 2 Right -->
    <polygon points="280,160 360,120 440,160 360,200" fill="#6366f1" stroke="#a5b4fc" stroke-width="2" />
    <polygon points="280,160 360,200 360,260 280,220" fill="#4338ca" stroke="#a5b4fc" stroke-width="2" />
    <polygon points="360,200 440,160 440,220 360,260" fill="#4f46e5" stroke="#a5b4fc" stroke-width="2" />
    <!-- Stacking Lip Accent -->
    <path d="M260 170 L340 210" stroke="#f8fafc" stroke-width="3" stroke-linecap="round" />
  `),

  // 12. Pumpkin
  'pumpkin.svg': svgWrapper('Seasonal', 'Pumpkin Bucket', '#f97316', '#c2410c', `
    <!-- Bucket Handle -->
    <path d="M210 200 C210 90, 390 90, 390 200" fill="none" stroke="#1e293b" stroke-width="8" stroke-linecap="round" />
    <!-- Pumpkin Body -->
    <ellipse cx="300" cy="235" rx="110" ry="85" fill="#ea580c" stroke="#fb923c" stroke-width="3" />
    <ellipse cx="300" cy="235" rx="70" ry="85" fill="#f97316" stroke="#fb923c" stroke-width="2" />
    <!-- Stem -->
    <rect x="290" y="130" width="20" height="28" rx="4" fill="#15803d" stroke="#4ade80" stroke-width="2" />
    <!-- Glowing Carved Face -->
    <!-- Eyes -->
    <polygon points="250,200 270,220 230,220" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5" />
    <polygon points="350,200 370,220 330,220" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5" />
    <!-- Nose -->
    <polygon points="300,225 310,240 290,240" fill="#fef08a" />
    <!-- Jack-o'-Lantern Mouth -->
    <path d="M245 260 L260 275 L275 260 L290 275 L305 260 L320 275 L335 260 L350 275 L340 290 L255 290 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
  `),

  // 13. Laptop Stand
  'laptop-stand.svg': svgWrapper('Office & Ergonomics', 'Laptop Stand', '#94a3b8', '#475569', `
    <!-- Laptop silhouette -->
    <polygon points="200,160 400,160 420,230 180,230" fill="#334155" stroke="#94a3b8" stroke-width="2" />
    <!-- Screen glow -->
    <polygon points="215,168 385,168 395,215 205,215" fill="#0284c7" opacity="0.8" />
    <!-- Aluminum Triangular Legs -->
    <polygon points="180,230 300,320 220,320" fill="none" stroke="#f1f5f9" stroke-width="6" stroke-linejoin="round" />
    <polygon points="420,230 300,320 380,320" fill="none" stroke="#f1f5f9" stroke-width="6" stroke-linejoin="round" />
    <!-- Crossbar -->
    <line x1="220" y1="315" x2="380" y2="315" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" />
  `),

  // 14. Headphone Hanger
  'headphone-hanger.svg': svgWrapper('Desk Accessories', 'Headphone Hanger', '#ec4899', '#9d174d', `
    <!-- Desk Shelf Edge -->
    <rect x="150" y="140" width="180" height="20" rx="2" fill="#334155" stroke="#64748b" stroke-width="2" />
    <!-- C-Clamp Top & Screw -->
    <rect x="230" y="125" width="40" height="50" rx="3" fill="#1e293b" stroke="#ec4899" stroke-width="2" />
    <rect x="245" y="165" width="10" height="35" fill="#94a3b8" />
    <!-- Arm Extending Out -->
    <path d="M250 170 L250 220 L350 220" fill="none" stroke="#ec4899" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Curved Headband Rest -->
    <path d="M330 220 Q350 205 370 220" fill="none" stroke="#f472b6" stroke-width="12" stroke-linecap="round" />
    <!-- Hanging Headphones -->
    <!-- Headband -->
    <path d="M320 220 C300 230, 300 270, 315 285" fill="none" stroke="#475569" stroke-width="6" />
    <path d="M380 220 C400 230, 400 270, 385 285" fill="none" stroke="#475569" stroke-width="6" />
    <!-- Ear Cups -->
    <rect x="305" y="275" width="22" height="35" rx="8" fill="#1e1b4b" stroke="#a855f7" stroke-width="3" />
    <rect x="375" y="275" width="22" height="35" rx="8" fill="#1e1b4b" stroke="#a855f7" stroke-width="3" />
  `),

  // 15. Moon Lamp
  'moon-lamp.svg': svgWrapper('Home & Lighting', 'Moon Lamp 3D', '#fef08a', '#ca8a04', `
    <!-- Moon Sphere -->
    <circle cx="300" cy="180" r="85" fill="#fef9c3" stroke="#fef08a" stroke-width="3" />
    <!-- Moon Craters -->
    <ellipse cx="270" cy="160" rx="16" ry="12" fill="#fde047" opacity="0.6" />
    <ellipse cx="330" cy="150" rx="22" ry="16" fill="#fde047" opacity="0.6" />
    <ellipse cx="295" cy="210" rx="26" ry="18" fill="#fde047" opacity="0.6" />
    <ellipse cx="345" cy="215" rx="14" ry="10" fill="#fde047" opacity="0.6" />
    <ellipse cx="245" cy="200" rx="10" ry="8" fill="#fde047" opacity="0.6" />
    <!-- Wooden Tripod Base -->
    <polygon points="300,240 240,330 255,330 300,255" fill="#b45309" stroke="#78350f" stroke-width="1.5" />
    <polygon points="300,240 360,330 345,330 300,255" fill="#d97706" stroke="#78350f" stroke-width="1.5" />
    <polygon points="295,245 305,245 305,320 295,320" fill="#92400e" />
  `),

  // 16. Dice Tower
  'dice-tower.svg': svgWrapper('Gaming & RPG', 'Spiral Dice Tower', '#8b5cf6', '#6d28d9', `
    <!-- Castle Tower Body -->
    <rect x="240" y="110" width="120" height="170" rx="6" fill="#1e293b" stroke="#8b5cf6" stroke-width="3" />
    <!-- Battlements -->
    <polygon points="240,110 240,85 260,85 260,98 285,98 285,85 315,85 315,98 340,98 340,85 360,85 360,110" fill="#334155" stroke="#a78bfa" stroke-width="2" />
    <!-- Helical Interior Opening -->
    <path d="M260 140 Q300 160 340 140 L340 180 Q300 200 260 180 Z" fill="#0f172a" stroke="#c4b5fd" stroke-width="1.5" />
    <path d="M260 210 Q300 230 340 210 L340 250 Q300 270 260 250 Z" fill="#0f172a" stroke="#c4b5fd" stroke-width="1.5" />
    <!-- Exit Tray -->
    <polygon points="230,280 370,280 400,325 200,325" fill="#1e1b4b" stroke="#8b5cf6" stroke-width="2" />
    <!-- Polyhedral d20 Dice in tray -->
    <polygon points="300,285 320,300 312,320 288,320 280,300" fill="#ec4899" stroke="#fbcfe8" stroke-width="2" />
    <text x="300" y="310" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">20</text>
  `),

  // 17. Airless Basketball
  'airless-ball.svg': svgWrapper('Sports & Elastic', 'Airless Basketball', '#f97316', '#ea580c', `
    <!-- Outer Basketball Circle -->
    <circle cx="300" cy="200" r="95" fill="none" stroke="#ea580c" stroke-width="5" />
    <!-- Porous Hexagonal Lattice Matrix -->
    ${[
      [300, 150], [255, 175], [345, 175],
      [300, 200], [255, 225], [345, 225], [300, 250],
      [220, 200], [380, 200]
    ].map(([x, y]) => `
      <polygon points="${x},${y-16} ${x+14},${y-8} ${x+14},${y+8} ${x},${y+16} ${x-14},${y+8} ${x-14},${y-8}" 
        fill="#0f172a" stroke="#f97316" stroke-width="3" />
    `).join('')}
    <!-- Motion lines -->
    <path d="M190 280 Q200 310 230 320" fill="none" stroke="#fed7aa" stroke-width="3" stroke-linecap="round" />
    <path d="M410 280 Q400 310 370 320" fill="none" stroke="#fed7aa" stroke-width="3" stroke-linecap="round" />
  `),

  // 18. C-Clamp
  'c-clamp.svg': svgWrapper('Workshop & Tools', 'Heavy Duty C-Clamp', '#64748b', '#334155', `
    <!-- Thick C-Frame Cast Iron -->
    <path d="M340 130 L250 130 C200 130, 200 270, 250 270 L340 270" fill="none" stroke="#3b82f6" stroke-width="24" stroke-linecap="square" />
    <path d="M340 130 L250 130 C200 130, 200 270, 250 270 L340 270" fill="none" stroke="#1d4ed8" stroke-width="16" stroke-linecap="square" />
    <!-- Upper Anvil Pad -->
    <rect x="330" y="112" width="22" height="35" rx="3" fill="#94a3b8" stroke="#f1f5f9" stroke-width="2" />
    <!-- Lower Screw Thread -->
    <line x1="340" y1="160" x2="340" y2="300" stroke="#cbd5e1" stroke-width="12" stroke-dasharray="4 2" />
    <!-- Lower Swivel Pad -->
    <rect x="328" y="160" width="24" height="12" rx="2" fill="#94a3b8" stroke="#f1f5f9" stroke-width="1.5" />
    <!-- T-Handle -->
    <rect x="290" y="300" width="100" height="10" rx="3" fill="#ef4444" stroke="#fca5a5" stroke-width="2" />
  `),

  // 19. PCB Clamping Arm
  'pcb-arm.svg': svgWrapper('Electronics', 'PCB Workstation Arm', '#10b981', '#047857', `
    <!-- Base Plate -->
    <rect x="180" y="300" width="240" height="25" rx="5" fill="#1e293b" stroke="#334155" stroke-width="2" />
    <!-- Flexible Gooseneck Arms -->
    <path d="M220 300 Q190 220 240 180" fill="none" stroke="#64748b" stroke-width="10" stroke-linecap="round" />
    <path d="M380 300 Q410 220 360 180" fill="none" stroke="#64748b" stroke-width="10" stroke-linecap="round" />
    <!-- Alligator Clips -->
    <rect x="235" y="172" width="16" height="16" rx="2" fill="#ef4444" />
    <rect x="350" y="172" width="16" height="16" rx="2" fill="#ef4444" />
    <!-- Held PCB Board -->
    <rect x="245" y="145" width="110" height="70" rx="4" fill="#047857" stroke="#34d399" stroke-width="2.5" />
    <!-- IC Chip -->
    <rect x="280" y="165" width="40" height="30" rx="3" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5" />
    <!-- Traces -->
    <path d="M255 160 L280 160 M255 180 L280 180 M320 170 L345 170 M320 190 L345 190" stroke="#facc15" stroke-width="2" />
  `),

  // 20. Caliper
  'caliper.svg': svgWrapper('Measurement', 'Vernier Caliper', '#38bdf8', '#0284c7', `
    <!-- Main Rule Beam -->
    <rect x="150" y="190" width="320" height="24" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="2" />
    <!-- Millimeter Tick Marks -->
    ${[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260].map(x => `
      <line x1="${200 + x}" y1="190" x2="${200 + x}" y2="202" stroke="#334155" stroke-width="1.5" />
    `).join('')}
    <!-- Fixed Left Jaw -->
    <polygon points="150,190 150,285 175,270 175,190" fill="#94a3b8" stroke="#334155" stroke-width="2" />
    <polygon points="150,190 150,135 170,145 170,190" fill="#94a3b8" stroke="#334155" stroke-width="2" />
    <!-- Sliding Vernier Jaw -->
    <rect x="260" y="178" width="60" height="48" rx="3" fill="#3b82f6" stroke="#93c5fd" stroke-width="2" />
    <polygon points="260,226 260,285 280,270 280,226" fill="#2563eb" stroke="#93c5fd" stroke-width="2" />
    <!-- Digital LCD display -->
    <rect x="268" y="185" width="44" height="20" rx="3" fill="#0f172a" />
    <text x="290" y="200" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">25.40</text>
  `),

  // 21. Battery Caddy
  'battery-caddy.svg': svgWrapper('Household', 'Battery Dispenser', '#eab308', '#a16207', `
    <!-- Storage Rack Housing -->
    <rect x="220" y="110" width="160" height="190" rx="8" fill="#1e293b" stroke="#eab308" stroke-width="3" />
    <!-- Vertical Dispenser Chute -->
    <line x1="250" y1="120" x2="250" y2="250" stroke="#475569" stroke-width="2" stroke-dasharray="4 4" />
    <line x1="350" y1="120" x2="350" y2="250" stroke="#475569" stroke-width="2" stroke-dasharray="4 4" />
    <!-- Stacked Cylindrical Batteries -->
    ${[140, 180, 220].map(y => `
      <g>
        <rect x="260" y="${y}" width="76" height="28" rx="4" fill="#ca8a04" stroke="#fef08a" stroke-width="2" />
        <rect x="336" y="${y+7}" width="6" height="14" rx="2" fill="#fef08a" />
        <text x="298" y="${y+18}" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">18650</text>
      </g>
    `).join('')}
    <!-- Gravity Feed Output Lip -->
    <path d="M220 280 L280 305 L350 280" fill="none" stroke="#eab308" stroke-width="4" stroke-linecap="round" />
  `),

  // 22. Spiral Vase
  'spiral-vase.svg': svgWrapper('Decor & Art', 'Spiral Modern Vase', '#ec4899', '#be185d', `
    <!-- Modern Twisted Fluted Vase Silhouette -->
    <path d="M270 120 Q240 180 310 230 Q250 280 260 320 L340 320 Q350 280 290 230 Q360 180 330 120 Z" 
      fill="#db2777" stroke="#f472b6" stroke-width="3" />
    <!-- Spiral Highlights -->
    <path d="M280 125 Q250 185 305 230 Q265 275 275 315" fill="none" stroke="#fbcfe8" stroke-width="3" />
    <path d="M300 125 Q270 185 325 230 Q285 275 295 315" fill="none" stroke="#f472b6" stroke-width="2" />
    <!-- Vase Rim Top -->
    <ellipse cx="300" cy="120" rx="30" ry="8" fill="#9d174d" stroke="#fbcfe8" stroke-width="2" />
  `),

  // 23. Oni Mask
  'oni-mask.svg': svgWrapper('Cosplay & Props', 'Cyberpunk Oni Mask', '#ef4444', '#b91c1c', `
    <!-- Mask Brow & Horns -->
    <polygon points="240,160 210,90 255,140" fill="#dc2626" stroke="#fca5a5" stroke-width="2" />
    <polygon points="360,160 390,90 345,140" fill="#dc2626" stroke="#fca5a5" stroke-width="2" />
    <!-- Face Shield -->
    <polygon points="230,160 370,160 360,280 300,320 240,280" fill="#1e1b4b" stroke="#ef4444" stroke-width="3" />
    <!-- Angry Slanted Eyes -->
    <polygon points="255,185 285,195 260,205" fill="#facc15" stroke="#fef08a" stroke-width="1.5" />
    <polygon points="345,185 315,195 340,205" fill="#facc15" stroke="#fef08a" stroke-width="1.5" />
    <!-- Fanged Teeth Grin -->
    <path d="M260 240 L270 255 L280 240 L290 255 L300 240 L310 255 L320 240 L330 255 L340 240" stroke="#f8fafc" stroke-width="3" stroke-linecap="round" />
    <!-- Respirator Canisters (Cyberpunk) -->
    <circle cx="230" cy="250" r="18" fill="#334155" stroke="#22d3ee" stroke-width="2.5" />
    <circle cx="370" cy="250" r="18" fill="#334155" stroke="#22d3ee" stroke-width="2.5" />
  `),

  // 24. Bambu Accessories (Spool Winder & AMS)
  'bambu-acc.svg': svgWrapper('Printer Upgrades', 'Bambu AMS Extender', '#10b981', '#059669', `
    <!-- Spool Silhouette -->
    <ellipse cx="300" cy="180" rx="90" ry="90" fill="#0f172a" stroke="#10b981" stroke-width="6" />
    <circle cx="300" cy="180" r="40" fill="#1e293b" stroke="#34d399" stroke-width="3" />
    <circle cx="300" cy="180" r="15" fill="#0f172a" />
    <!-- Filament Coils -->
    <ellipse cx="300" cy="180" rx="72" ry="72" fill="none" stroke="#059669" stroke-width="16" stroke-dasharray="12 4" />
    <!-- Extender Mounting Bracket -->
    <polygon points="230,260 370,260 390,320 210,320" fill="#1e293b" stroke="#10b981" stroke-width="3" />
    <circle cx="260" cy="290" r="6" fill="#f8fafc" />
    <circle cx="340" cy="290" r="6" fill="#f8fafc" />
  `),

  // 25. Voron Toolhead
  'voron-toolhead.svg': svgWrapper('CoreXY & Upgrades', 'Voron Stealthburner', '#ef4444', '#b91c1c', `
    <!-- Main Cowling -->
    <polygon points="250,110 350,110 380,210 350,290 300,315 250,290 220,210" fill="#1e1b4b" stroke="#ef4444" stroke-width="3" />
    <!-- Dual Part Cooling Fans -->
    <circle cx="270" cy="180" r="24" fill="#0f172a" stroke="#f87171" stroke-width="2" />
    <circle cx="330" cy="180" r="24" fill="#0f172a" stroke="#f87171" stroke-width="2" />
    <!-- Neopixel LED Logo Bar -->
    <polygon points="285,130 315,130 300,150" fill="#38bdf8" filter="url(#shadow)" />
    <!-- Hotend Nozzle Tip -->
    <polygon points="292,315 308,315 300,335" fill="#f59e0b" stroke="#fef08a" stroke-width="1.5" />
  `),

  // 26. Raspberry Pi Case
  'rpi5-case.svg': svgWrapper('Gadgets & SBC', 'Raspberry Pi 5 Case', '#dc2626', '#991b1b', `
    <!-- Armor Enclosure -->
    <rect x="210" y="140" width="180" height="130" rx="10" fill="#1e293b" stroke="#ef4444" stroke-width="3" />
    <!-- Aluminum Heatsink Fins -->
    ${[160, 175, 190, 205, 220].map(y => `
      <rect x="235" y="${y}" width="80" height="6" rx="2" fill="#475569" stroke="#94a3b8" stroke-width="1" />
    `).join('')}
    <!-- Active Cooling Fan Circular Grille -->
    <circle cx="345" cy="195" r="28" fill="#0f172a" stroke="#f87171" stroke-width="2" />
    <circle cx="345" cy="195" r="10" fill="#dc2626" />
    <!-- GPIO / USB Port Outlines -->
    <rect x="200" y="160" width="10" height="30" fill="#94a3b8" />
    <rect x="200" y="200" width="10" height="30" fill="#94a3b8" />
  `),

  // 27. Articulated Snake
  'snake.svg': svgWrapper('Toys & Animals', 'Mechanical Snake', '#10b981', '#059669', `
    <!-- S-Curve Jointed Snake -->
    <path d="M170 280 Q220 180 290 250 T410 200 L440 180" fill="none" stroke="#047857" stroke-width="24" stroke-linecap="round" />
    <path d="M170 280 Q220 180 290 250 T410 200 L440 180" fill="none" stroke="#34d399" stroke-width="14" stroke-linecap="round" />
    <!-- Scale Bands -->
    <path d="M170 280 Q220 180 290 250 T410 200 L440 180" fill="none" stroke="#064e3b" stroke-width="16" stroke-dasharray="8 8" />
    <!-- Head & Tongue -->
    <polygon points="435,175 465,165 460,195 435,185" fill="#10b981" stroke="#a7f3d0" stroke-width="2" />
    <circle cx="450" cy="175" r="3" fill="#facc15" />
    <path d="M465 172 L485 170 L492 163 M485 170 L492 177" fill="none" stroke="#ef4444" stroke-width="2" />
  `),

  // 28. HueForge Art
  'hueforge.svg': svgWrapper('Art & Multi-Color', 'HueForge Skyline', '#8b5cf6', '#6d28d9', `
    <!-- Picture Frame -->
    <rect x="180" y="100" width="240" height="190" rx="8" fill="#0f172a" stroke="#8b5cf6" stroke-width="3" />
    <!-- Multi-Color Layer Relief (Mountains & Aurora) -->
    <!-- Sky Layer -->
    <rect x="190" y="110" width="220" height="170" fill="#1e1b4b" />
    <!-- Sun/Moon Glow -->
    <circle cx="300" cy="160" r="35" fill="#f43f5e" opacity="0.8" />
    <!-- Mountain Layer 1 -->
    <polygon points="190,280 240,190 290,240 350,180 410,280" fill="#4338ca" />
    <!-- Mountain Layer 2 (Foreground) -->
    <polygon points="190,280 230,230 270,260 320,220 380,280" fill="#1e1b4b" stroke="#a78bfa" stroke-width="1.5" />
    <!-- Grid Horizon -->
    <line x1="190" y1="280" x2="410" y2="280" stroke="#06b6d4" stroke-width="2" />
  `),

  // 29. Woodworking Drill Guide
  'drill-guide.svg': svgWrapper('Woodworking & Tools', 'Drill Guide Jig', '#f59e0b', '#b45309', `
    <!-- V-Block Guide Body -->
    <polygon points="210,240 300,150 390,240 390,290 210,290" fill="#1e293b" stroke="#f59e0b" stroke-width="3" />
    <!-- Hardened Steel Bushing Holes -->
    <circle cx="260" cy="225" r="14" fill="#0f172a" stroke="#fbbf24" stroke-width="3" />
    <circle cx="300" cy="205" r="18" fill="#0f172a" stroke="#fbbf24" stroke-width="3" />
    <circle cx="340" cy="225" r="14" fill="#0f172a" stroke="#fbbf24" stroke-width="3" />
    <!-- Centering Centerline -->
    <line x1="300" y1="150" x2="300" y2="290" stroke="#ef4444" stroke-width="2" stroke-dasharray="6 4" />
  `),

  // 30. Axolotl
  'axolotl.svg': svgWrapper('Toys & Animals', 'Articulated Axolotl', '#f43f5e', '#be123c', `
    <!-- Axolotl Body & Gills -->
    <!-- Head -->
    <ellipse cx="290" cy="170" rx="55" ry="42" fill="#fda4af" stroke="#f43f5e" stroke-width="3" />
    <!-- External Gills (Left) -->
    <path d="M245 155 Q205 130 210 115" fill="none" stroke="#e11d48" stroke-width="6" stroke-linecap="round" />
    <path d="M240 170 Q195 160 200 145" fill="none" stroke="#e11d48" stroke-width="6" stroke-linecap="round" />
    <path d="M245 185 Q205 200 215 210" fill="none" stroke="#e11d48" stroke-width="6" stroke-linecap="round" />
    <!-- External Gills (Right) -->
    <path d="M335 155 Q375 130 370 115" fill="none" stroke="#e11d48" stroke-width="6" stroke-linecap="round" />
    <path d="M340 170 Q385 160 380 145" fill="none" stroke="#e11d48" stroke-width="6" stroke-linecap="round" />
    <path d="M335 185 Q375 200 365 210" fill="none" stroke="#e11d48" stroke-width="6" stroke-linecap="round" />
    <!-- Cute Eyes & Smile -->
    <circle cx="270" cy="165" r="6" fill="#0f172a" />
    <circle cx="310" cy="165" r="6" fill="#0f172a" />
    <path d="M280 185 Q290 195 300 185" fill="none" stroke="#be123c" stroke-width="2.5" stroke-linecap="round" />
    <!-- Tail Segments -->
    <path d="M290 210 Q280 270 330 310" fill="none" stroke="#fb7185" stroke-width="22" stroke-linecap="round" />
    <path d="M290 210 Q280 270 330 310" fill="none" stroke="#fda4af" stroke-width="12" stroke-linecap="round" />
  `),

  // 31. Rugged EDC Box
  'rugged-box.svg': svgWrapper('Tools & Storage', 'Rugged Utility Box', '#f59e0b', '#b45309', `
    <rect x="190" y="140" width="220" height="150" rx="16" fill="#d97706" stroke="#fbbf24" stroke-width="3" />
    <rect x="200" y="150" width="200" height="25" rx="6" fill="#78350f" />
    <rect x="270" y="130" width="60" height="18" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="2" />
    <line x1="230" y1="185" x2="230" y2="275" stroke="#92400e" stroke-width="8" stroke-linecap="round" />
    <line x1="300" y1="185" x2="300" y2="275" stroke="#92400e" stroke-width="8" stroke-linecap="round" />
    <line x1="370" y1="185" x2="370" y2="275" stroke="#92400e" stroke-width="8" stroke-linecap="round" />
    <rect x="280" y="165" width="40" height="35" rx="5" fill="#1e293b" stroke="#f8fafc" stroke-width="2" />
  `),

  // 32. Karambit Knife
  'karambit.svg': svgWrapper('Toys & Fidget', 'Gravity Karambit', '#ec4899', '#9d174d', `
    <path d="M220 250 C200 170, 320 120, 390 170 C340 180, 290 220, 270 290 Z" fill="#db2777" stroke="#f472b6" stroke-width="3" />
    <circle cx="240" cy="270" r="26" fill="none" stroke="#f472b6" stroke-width="8" />
    <circle cx="240" cy="270" r="14" fill="#0f172a" stroke="#fbcfe8" stroke-width="2" />
    <path d="M280 180 Q340 160 370 180" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
  `),

  // 33. Snowman Music Box
  'snowman.svg': svgWrapper('Seasonal', 'Snowman Music Box', '#38bdf8', '#0284c7', `
    <rect x="230" y="270" width="140" height="50" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
    <circle cx="300" cy="295" r="14" fill="#f59e0b" stroke="#fde68a" stroke-width="2" />
    <circle cx="300" cy="220" r="55" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2.5" />
    <circle cx="300" cy="140" r="38" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2.5" />
    <polygon points="300,140 335,145 300,150" fill="#ea580c" />
    <circle cx="288" cy="132" r="4" fill="#0f172a" />
    <circle cx="312" cy="132" r="4" fill="#0f172a" />
    <rect x="265" y="102" width="70" height="8" rx="2" fill="#0f172a" stroke="#ef4444" stroke-width="1.5" />
    <rect x="276" y="70" width="48" height="32" rx="3" fill="#0f172a" />
    <rect x="276" y="94" width="48" height="6" fill="#ef4444" />
  `)
};

let count = 0;
for (const [filename, content] of Object.entries(svgs)) {
  fs.writeFileSync(path.join(outDir, filename), content.trim(), 'utf8');
  count++;
}
console.log(`Generated ${count} SVG thumbnails successfully in ${outDir}`);
