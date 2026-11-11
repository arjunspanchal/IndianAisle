// Gujarati, keyed by the exact English text. One file per part of the app,
// merged here. If the same English appears in two files the later one wins, so
// keep shared words in common.ts.

import common from './common';

export const gu: Record<string, string> = {
  ...common,
};
