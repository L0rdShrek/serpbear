import { NextRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from 'react-query';

export async function fetchBacklinks(router: NextRouter) {
   const res = await fetch(`${window.location.origin}/api/backlinks?domain=${router.query.slug}`, { method: 'GET' });
   if (res.status >= 400 && res.status < 600) {
      if (res.status === 401) {
         router.push('/login');
      }
      throw new Error('Bad response from server');
   }
   return res.json();
}

export function useFetchBacklinks(router: NextRouter, enabled: boolean = true) {
   return useQuery('backlinks', () => router.query.slug && fetchBacklinks(router), { enabled });
}

export function useRefreshBacklinks(onSuccess: () => void) {
   const queryClient = useQueryClient();
   return useMutation(
      async (domain: string) => {
         const res = await fetch(`${window.location.origin}/api/backlinks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain }),
         });
         if (res.status >= 400) {
            throw new Error('Failed to refresh backlinks');
         }
         return res.json();
      },
      {
         onSuccess: () => {
            queryClient.invalidateQueries('backlinks');
            onSuccess();
         },
      },
   );
}
