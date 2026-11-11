// Gujarati, keyed by the exact English text. One file per part of the app,
// merged here. Later files win when the same English appears twice, so:
//   1. site.ts first: the wedding website's own wording, which screens may refine.
//   2. one file per screen or group of screens.
//   3. common.ts last: shared words (Save, Cancel, the tab names) read the same everywhere.

import challenges from './challenges';
import common from './common';
import home from './home';
import menus from './menus';
import more from './more';
import plan from './plan';
import polls from './polls';
import ride from './ride';
import site from './site';
import social from './social';
import wishes from './wishes';

export const gu: Record<string, string> = {
  ...site,
  ...home,
  ...plan, // after home: where both translate a line from the website, this one uses the website's own words
  ...more,
  ...social,
  ...ride,
  ...wishes,
  ...polls,
  ...challenges,
  ...menus,
  ...common,
};
