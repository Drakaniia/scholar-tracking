const workspace = () => {
  return (
    <svg
      viewBox="0 0 500 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-w-md"
    >
      {/* Desk */}
      <rect x="50" y="280" width="400" height="20" rx="4" fill="#8B7355" />
      <rect x="70" y="300" width="15" height="80" fill="#8B7355" />
      <rect x="415" y="300" width="15" height="80" fill="#8B7355" />

      {/* Laptop */}
      <rect x="150" y="200" width="180" height="80" rx="8" fill="#2D3748" />
      <rect x="160" y="210" width="160" height="60" rx="4" fill="#1a936f" />
      <rect x="130" y="280" width="220" height="8" rx="2" fill="#4A5568" />
      
      {/* Screen content - simple lines */}
      <rect x="175" y="225" width="80" height="6" rx="2" fill="#88d4ab" />
      <rect x="175" y="240" width="60" height="4" rx="2" fill="#88d4ab" opacity="0.7" />
      <rect x="175" y="250" width="100" height="4" rx="2" fill="#88d4ab" opacity="0.5" />

      {/* Coffee mug */}
      <ellipse cx="380" cy="260" rx="25" ry="8" fill="#c25450" />
      <rect x="355" y="230" width="50" height="30" rx="4" fill="#e07a5f" />
      <ellipse cx="380" cy="230" rx="25" ry="8" fill="#c25450" />
      <path d="M405 240 C420 240, 420 260, 405 260" stroke="#e07a5f" strokeWidth="6" fill="none" />
      
      {/* Steam from coffee */}
      <path d="M370 210 Q365 195, 375 185" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M380 210 Q375 190, 385 180" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M390 210 Q385 195, 395 185" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.6" />

      {/* Plant pot */}
      <rect x="80" y="240" width="50" height="40" rx="4" fill="#c25450" />
      <ellipse cx="105" cy="240" rx="25" ry="6" fill="#a63d3d" />
      
      {/* Plant leaves */}
      <ellipse cx="95" cy="200" rx="15" ry="25" fill="#1a936f" transform="rotate(-20 95 200)" />
      <ellipse cx="105" cy="190" rx="12" ry="28" fill="#88d4ab" />
      <ellipse cx="115" cy="195" rx="14" ry="26" fill="#1a936f" transform="rotate(15 115 195)" />
      <ellipse cx="100" cy="210" rx="10" ry="20" fill="#114b5f" transform="rotate(-10 100 210)" />
      <ellipse cx="110" cy="205" rx="8" ry="18" fill="#88d4ab" transform="rotate(10 110 205)" />

      {/* Pencil holder */}
      <rect x="420" y="230" width="30" height="50" rx="4" fill="#4a5568" />
      <ellipse cx="435" cy="230" rx="15" ry="5" fill="#2d3748" />
      
      {/* Pencils */}
      <rect x="425" y="180" width="4" height="55" fill="#f6bd60" />
      <polygon points="425,180 429,180 427,170" fill="#ffd166" />
      <rect x="432" y="190" width="4" height="45" fill="#1a936f" />
      <polygon points="432,190 436,190 434,180" fill="#88d4ab" />
      <rect x="440" y="185" width="4" height="50" fill="#e07a5f" />
      <polygon points="440,185 444,185 442,175" fill="#f6bd60" />

      {/* Notebook */}
      <rect x="260" y="250" width="70" height="30" rx="2" fill="#f8f9fa" transform="rotate(-5 260 250)" />
      <rect x="265" y="255" width="60" height="3" rx="1" fill="#dee2e6" transform="rotate(-5 265 255)" />
      <rect x="265" y="262" width="45" height="3" rx="1" fill="#dee2e6" transform="rotate(-5 265 262)" />
      <rect x="265" y="269" width="55" height="3" rx="1" fill="#dee2e6" transform="rotate(-5 265 269)" />

      {/* Decorative shapes in background */}
      <circle cx="420" cy="100" r="40" fill="#88d4ab" opacity="0.3" />
      <circle cx="100" cy="80" r="30" fill="#1a936f" opacity="0.2" />
      <rect x="300" y="60" width="60" height="60" rx="10" fill="#114b5f" opacity="0.15" transform="rotate(15 330 90)" />
    </svg>
  );
};

export default workspace;
