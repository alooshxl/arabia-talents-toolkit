import Game from '@/components/game/Game'; // Assuming Game.jsx is in src/components/game/
import { Helmet } from 'react-helmet-async'; // For setting page title

export default function PubgMiniPage() {
  return (
    <>
      <Helmet>
        <title>PUBGMini - Mini Game</title>
      </Helmet>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
        boxSizing: 'border-box',
        // Optional: Add a background color to the page if desired
        // backgroundColor: '#f0f0f0',
      }}>
        {/* Optional: A title directly on the page if needed, but Helmet sets tab title */}
        {/* <h1 style={{ marginBottom: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>PUBGMini</h1> */}
        <Game />
      </div>
    </>
  );
}
