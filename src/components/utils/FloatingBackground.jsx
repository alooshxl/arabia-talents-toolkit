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
      removing: false,
      style: {
        top: `${Math.random() * 100}vh`,
        left: `${Math.random() * 100}vw`,
        '--x': `${50 - Math.random() * 100}vw`,
        '--y': `${50 - Math.random() * 100}vh`,
        '--duration': `${40 + Math.random() * 30}s`,
        '--scale': `${0.5 + Math.random() * 1.5}`,
        '--size': `${20 + Math.random() * 40}px`,
        '--opacity': `${0.3 + Math.random() * 0.5}`,
        zIndex: Math.floor(Math.random() * 5),
        animationDelay: `${-Math.random() * 40}s`,
      },
    }));
    setItems(newItems);
  }, [location.pathname]);

  const removeItem = (id) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const handleIteration = (id) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.removing) return item;
        const top =
          (parseFloat(item.style.top) +
            parseFloat(item.style['--y']) +
            100) % 100;
        const left =
          (parseFloat(item.style.left) +
            parseFloat(item.style['--x']) +
            100) % 100;
        return {
          ...item,
          style: {
            ...item.style,
            top: `${top}vh`,
            left: `${left}vw`,
            '--x': `${50 - Math.random() * 100}vw`,
            '--y': `${50 - Math.random() * 100}vh`,
          },
        };
      })
    );
  };

  const handleClick = (id, easter) => {
    if (!isHome) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, removing: true } : i))
    );
    if (easter) {
      alert('Hi what are you doing?? stop playing around and do your work!!');
    }
  };

  return (
    <div className="floating-icons-container">
      {items.map((item) => {
        const commonProps = {
          key: item.id,
          style: item.style,
          className: `floating-icon ${
            isHome ? 'home-clickable' : ''
          } ${item.removing ? 'exit' : ''}`,
          onClick: () => handleClick(item.id, item.easter),
          onAnimationIteration: () => handleIteration(item.id),
          onAnimationEnd: () => item.removing && removeItem(item.id),
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

