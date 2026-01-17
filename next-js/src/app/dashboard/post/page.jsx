import { CONFIG } from 'src/global-config';

import { PostListView } from 'src/sections/blog/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Post list` };

export default function Page() {
  return <PostListView />;
}
