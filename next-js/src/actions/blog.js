import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetPosts() {
  const url = endpoints.post.list;

  const { data, isLoading, error, isValidating } = useSWR(url, fetcher, {
    ...swrOptions,
  });

  return useMemo(
    () => ({
      posts: data?.posts || [],
      postsLoading: isLoading,
      postsError: error,
      postsValidating: isValidating,
      postsEmpty: !isLoading && !data?.posts.length,
    }),
    [data?.posts, error, isLoading, isValidating]
  );
}

// ----------------------------------------------------------------------

export function useGetPost(title) {
  const url = title ? [endpoints.post.details, { params: { title } }] : '';

  const { data, isLoading, error, isValidating } = useSWR(url, fetcher, {
    ...swrOptions,
  });

  return useMemo(
    () => ({
      post: data?.post,
      postLoading: isLoading,
      postError: error,
      postValidating: isValidating,
    }),
    [data?.post, error, isLoading, isValidating]
  );
}

// ----------------------------------------------------------------------

export function useGetLatestPosts(title) {
  const url = title ? [endpoints.post.latest, { params: { title } }] : '';

  const { data, isLoading, error, isValidating } = useSWR(url, fetcher, {
    ...swrOptions,
  });

  return useMemo(
    () => ({
      latestPosts: data?.latestPosts || [],
      latestPostsLoading: isLoading,
      latestPostsError: error,
      latestPostsValidating: isValidating,
      latestPostsEmpty: !isLoading && !data?.latestPosts.length,
    }),
    [data?.latestPosts, error, isLoading, isValidating]
  );
}

// ----------------------------------------------------------------------

export function useSearchPosts(query) {
  const url = query ? [endpoints.post.search, { params: { query } }] : '';

  const { data, isLoading, error, isValidating } = useSWR(url, fetcher, {
    ...swrOptions,
    keepPreviousData: true,
  });

  return useMemo(
    () => ({
      searchResults: data?.results || [],
      searchLoading: isLoading,
      searchError: error,
      searchValidating: isValidating,
      searchEmpty: !isLoading && !isValidating && !data?.results.length,
    }),
    [data?.results, error, isLoading, isValidating]
  );
}
