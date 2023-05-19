import Head from 'next/head';
import dynamic from 'next/dynamic';

const LiveSetDataDisplay = dynamic(
  () => import('~/components/LiveSetDataDisplay'),
  {
    ssr: false,
  }
);

function Home() {
  return (
    <>
      <Head>
        <title>Live Setlist Controls</title>
      </Head>
      <div className="w-full h-full flex flex-col items-center justify-center p-4 ">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          My <span className="text-[hsl(280,100%,70%)]">Live</span> Set
        </h1>
        <LiveSetDataDisplay />
      </div>
    </>
  );
}

export default Home;
