import { kebabCase } from 'es-toolkit';

import { CONFIG } from 'src/global-config';
import axios, { endpoints } from 'src/lib/axios';
import { getPost, getLatestPosts } from 'src/actions/blog-ssr';

import { PostDetailsHomeView } from 'src/sections/blog/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Post details` };

export default async function Page({ params }) {
  const { title } = await params;

  const { post } = await getPost(title);
  const { latestPosts } = await getLatestPosts(title);

  return <PostDetailsHomeView post={post} latestPosts={latestPosts} />;
}

// ----------------------------------------------------------------------

/**
 * Static Exports in Next.js
 *
 * 1. Set `isStaticExport = true` in `next.config.{mjs|ts}`.
 * 2. This allows `generateStaticParams()` to pre-render dynamic routes at build time.
 *
 * For more details, see:
 * https://nextjs.org/docs/app/building-your-application/deploying/static-exports
 *
 * NOTE: Remove all "generateStaticParams()" functions if not using static exports.
 */
// export async function generateStaticParams() {
//   try {
//     const res = await axios.get(endpoints.post.list);
//     const posts = res?.data?.posts || [];
//     const data = CONFIG.isStaticExport ? posts : posts.slice(0, 1);

//     return data.map((post) => ({
//       title: kebabCase(post.title),
//     }));
//   } catch (error) {
//     console.warn('generateStaticParams posts failed', error?.message);
//     return [];
//   }
// }
