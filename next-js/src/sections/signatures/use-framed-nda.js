'use client';

import { useState, useEffect } from 'react';

import { withFramedNdaSignatures } from 'src/utils/signature-frame';

/**
 * The NDA with its recorded signatures framed with their signature IDs, for
 * previews. Returns the NDA as given until the frames are ready.
 */
export function useFramedNda(nda) {
  const [framed, setFramed] = useState(nda);
  useEffect(() => {
    let live = true;
    setFramed(nda);
    withFramedNdaSignatures(nda).then((value) => live && setFramed(value));
    return () => {
      live = false;
    };
  }, [nda]);
  return framed;
}
