import Head from 'next/head';
import SongDisplay from '~/components/SongDisplay';
import NoSSRWrapper from '~/components/NoSSRWrapper';
import { FaCog } from 'react-icons/fa';
import { useRouter } from 'next/router';
import Button from '~/components/Button';
import SongTracks from '~/components/SongTracks';

function Home() {
  const router = useRouter();
  const handleClick = () => {
    router.push('/midi-setup');
  };

  return (
    <>
      <Head>
        <title>Live Setlist Controls</title>
      </Head>
      <NoSSRWrapper>
        <div className="w-full h-full flex flex-col items-center justify-center p-4 ">
          <div className="flex w-full justify-between items-center">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
              My <span className="text-[hsl(280,100%,70%)]">Live</span> Set
            </h1>
            <Button
              onClick={handleClick}
              icon={<FaCog />}
              label="MIDI Settings"
            />
          </div>
          <SongDisplay />
          <SongTracks />
        </div>
      </NoSSRWrapper>
    </>
  );
}

export default Home;
