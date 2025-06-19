import WinnerRunnerGame from '@/components/winner-runner/WinnerRunnerGame';
import { Helmet } from 'react-helmet-async';

export default function WinnerRunner() {
  return (
    <>
      <Helmet>
        <title>WinnerRunner</title>
      </Helmet>
      <div className="flex justify-center">
        <WinnerRunnerGame />
      </div>
    </>
  );
}
