import Head from 'next/head';
import Songs from '~/components/Songs';
import NoSSRWrapper from '~/components/NoSSRWrapper';
import { FaCog } from 'react-icons/fa';
import { useRouter } from 'next/router';
import Button from '~/components/Button';
import SongSoundSelection from '~/components/SongSoundSelection';
import SongPlayback from '~/components/SongPlayback';
import SongPlaybackTracks from '~/components/SongPlaybackTracks';
import SongSections from '~/components/SongSections';

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
            <h2>
              My{' '}
              <span className="bg-[rgb(51,51,51)] text-white px-1">Live</span>{' '}
              Set
            </h2>
            <Button
              onClick={handleClick}
              icon={<FaCog />}
              label="MIDI Settings"
            />
          </div>
          <Songs />
          <SongSoundSelection />
          <SongPlaybackTracks />
          <SongSections />
          <SongPlayback />
        </div>
      </NoSSRWrapper>
    </>
  );
}

export default Home;
