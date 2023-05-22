import React from 'react';
import type { AppProps } from 'next/app';

import '../styles/globals.css';
import { useMidiMappings } from '~/state/midi';

function MyApp({ Component, pageProps }: AppProps) {
  useMidiMappings();

  return <Component {...pageProps} />;
}

export default MyApp;
