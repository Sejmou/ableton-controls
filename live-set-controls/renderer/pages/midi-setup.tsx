import Head from 'next/head';
import MIDIInputSelect from '~/components/MIDIInputSelect';
import NoSSRWrapper from '~/components/NoSSRWrapper';
import { FaArrowLeft } from 'react-icons/fa';
import { useRouter } from 'next/router';
import Button from '~/components/Button';

function MIDISetup() {
  const router = useRouter();
  const handleClick = () => {
    router.push('/home');
  };
  return (
    <>
      <Head>
        <title>Live Setlist Controls - MIDI Setup</title>
      </Head>
      <NoSSRWrapper>
        <div className="w-full h-full flex flex-col items-center justify-center p-4 ">
          <div className="flex items-center gap-2 justify-between w-full">
            <Button onClick={handleClick} icon={<FaArrowLeft />} />
            <h2>MIDI Settings</h2>
            <span />
          </div>
          <MIDIInputSelect />
        </div>
      </NoSSRWrapper>
    </>
  );
}

export default MIDISetup;
