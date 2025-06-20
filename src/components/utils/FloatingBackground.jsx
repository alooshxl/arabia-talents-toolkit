import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './FloatingBackground.css';

// Simple placeholder SVG icons for PUBG items
const AWMIcon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <rect x="2" y="28" width="60" height="8" fill="currentColor" />
    <rect x="10" y="24" width="6" height="16" fill="currentColor" />
  </svg>
);

const PanIcon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <circle cx="32" cy="32" r="16" fill="currentColor" />
    <rect x="30" y="8" width="4" height="12" fill="currentColor" />
  </svg>
);

const Helmet2Icon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <path d="M16 40v-6c0-9 7-16 16-16s16 7 16 16v6H16z" fill="currentColor" />
    <rect x="20" y="40" width="24" height="6" fill="currentColor" />
  </svg>
);

const Helmet3Icon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <path d="M12 38v-4c0-10 8-18 20-18s20 8 20 18v4H12z" fill="currentColor" />
    <rect x="18" y="38" width="28" height="6" fill="currentColor" />
  </svg>
);

const icons = [
  { type: 'img', src: '/assets/facebook.svg' },
  { type: 'img', src: '/assets/tiktok.svg' },
  { type: 'img', src: '/assets/youtube.svg' },
  { type: 'img', src: '/assets/instagram.svg' },
  { type: 'img', src: '/assets/twitch.svg' },
  { type: 'img', src: '/assets/kick.svg' },
  { type: 'svg', component: AWMIcon },
  { type: 'svg', component: PanIcon },
  { type: 'svg', component: Helmet2Icon },
  { type: 'svg', component: Helmet3Icon },
  { type: 'img', src: '/assets/pubg_logo.svg' },
];

export default function FloatingBackground() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [items, setItems] = useState([]);

  useEffect(() => {
    const hiddenIndex = Math.floor(Math.random() * icons.length);
    const newItems = icons.map((icon, index) => ({
      ...icon,
      id: index,
      easter: index === hiddenIndex,
      style: {
        top: `${Math.random() * 90}vh`,
        left: `${Math.random() * 90}vw`,
        '--x': `${Math.random() * 40 - 20}vw`,
        '--y': `${Math.random() * 40 - 20}vh`,
        animationDuration: `${30 + Math.random() * 20}s`,
        animationDelay: `${-Math.random() * 20}s`,
      },
    }));
    setItems(newItems);
  }, [location.pathname]);

  const handleClick = (id, easter) => {
    if (!isHome) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (easter) {
      alert('Hi what are you doing?? stop playing around and do your work!!');
    }
  };

  return (
    <div className="floating-icons-container pointer-events-none">
      {items.map((item) => {
        const commonProps = {
          key: item.id,
          style: item.style,
          className: `floating-icon ${isHome ? 'home-clickable' : ''}`,
          onClick: () => handleClick(item.id, item.easter),
        };
        return item.type === 'img' ? (
          <img {...commonProps} src={item.src} alt="" />
        ) : (
          <item.component {...commonProps} />
        );
      })}
    </div>
  );
}
