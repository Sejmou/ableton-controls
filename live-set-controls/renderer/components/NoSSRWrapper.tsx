import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const NoSSRWrapper = (props: { children: ReactNode }) => <>{props.children}</>;

export default dynamic(() => Promise.resolve(NoSSRWrapper), {
  ssr: false,
});
