import { useGameStore } from './stores/gameStore';
import { CRTOverlay } from './components/CRTOverlay';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { ModeSelect } from './pages/ModeSelect';
import { VSScreen } from './pages/VSScreen';
import { Arena } from './pages/Arena';
import { Results } from './pages/Results';

export default function App() {
  const screen = useGameStore(s => s.screen);

  return (
    <div className="relative min-h-screen bg-arena-bg font-mono">
      <CRTOverlay />
      {screen === 'landing' && <Landing />}
      {screen === 'login' && <Login />}
      {screen === 'mode_select' && <ModeSelect />}
      {screen === 'vs_screen' && <VSScreen />}
      {screen === 'arena' && <Arena />}
      {screen === 'results' && <Results />}
    </div>
  );
}
