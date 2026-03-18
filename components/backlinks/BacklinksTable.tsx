import React, { useState, useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import Icon from '../common/Icon';
import useWindowResize from '../../hooks/useWindowResize';
import useIsMobile from '../../hooks/useIsMobile';

type BacklinksTableProps = {
   domain: DomainType | null,
   backlinks: BacklinkItem[],
   isLoading: boolean,
   isRefreshing: boolean,
   hasScraperConfigured: boolean,
   onRefresh: () => void,
}

const BacklinksTable = (props: BacklinksTableProps) => {
   const { domain, backlinks = [], isLoading = true, isRefreshing = false, hasScraperConfigured = true, onRefresh } = props;
   const [search, setSearch] = useState('');
   const [listHeight, setListHeight] = useState(500);
   const [isMobile] = useIsMobile();
   useWindowResize(() => setListHeight(window.innerHeight - (isMobile ? 200 : 400)));

   const filteredBacklinks = useMemo(() => {
      if (!search) return backlinks;
      const term = search.toLowerCase();
      return backlinks.filter((bl) => bl.title.toLowerCase().includes(term) || bl.url.toLowerCase().includes(term));
   }, [backlinks, search]);

   const extractDomain = (url: string): string => {
      try {
         return new URL(url.includes('://') ? url : `https://${url}`).hostname;
      } catch {
         return url;
      }
   };

   const Row = ({ data, index, style }: ListChildComponentProps) => {
      const bl: BacklinkItem = data[index];
      const isLast = index === filteredBacklinks.length - 1;
      return (
         <div
            style={style}
            className={`flex items-center px-6 py-2 ${!isLast ? 'border-b border-gray-100' : ''} hover:bg-[#FCFCFF]`}
         >
            <span className='w-10 text-gray-400 text-xs shrink-0'>{bl.position}</span>
            <div className='flex-1 min-w-0'>
               <a
                  href={bl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className='block text-blue-600 hover:text-blue-800 hover:underline truncate text-sm'
                  title={bl.url}
               >
                  {bl.title.replace(/<[^>]*>/g, '') || bl.url}
               </a>
               <span className='text-xs text-gray-400 truncate block'>{extractDomain(bl.url)}</span>
            </div>
            <a
               href={bl.url}
               target="_blank"
               rel="noopener noreferrer"
               className='ml-2 text-gray-400 hover:text-blue-600 shrink-0'
               title="Open link"
            >
               <Icon type="link" size={14} />
            </a>
         </div>
      );
   };

   return (
      <div>
         <div className='domKeywords flex flex-col bg-[white] rounded-md text-sm border mb-4'>
            <div className='flex items-center justify-between p-4 px-6 border-b'>
               <div className='flex items-center gap-3'>
                  <div className='relative'>
                     <Icon type="search" size={14} classes="absolute left-2 top-[10px] text-gray-400" />
                     <input
                        type="text"
                        placeholder="Filter backlinks..."
                        className='border border-gray-200 rounded px-3 py-1.5 pl-8 text-sm w-48 lg:w-64'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                     />
                  </div>
                  <span className='text-gray-500 text-xs'>
                     {filteredBacklinks.length} backlink{filteredBacklinks.length !== 1 ? 's' : ''}
                  </span>
               </div>
               <button
                  className='flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 px-3 py-1.5 border border-gray-200 rounded'
                  onClick={onRefresh}
                  disabled={isRefreshing}
               >
                  <Icon type="reload" size={12} />
                  <span className='hidden lg:inline'>{isRefreshing ? 'Searching...' : 'Search Backlinks'}</span>
               </button>
            </div>
            <div className='styled-scrollbar w-full overflow-auto min-h-[60vh]'>
               <div className='lg:min-w-[600px]'>
                  <div className='hidden lg:flex p-3 px-6 bg-[#FCFCFF] text-gray-600 justify-between items-center font-semibold border-b'>
                     <span className='w-10 shrink-0'>#</span>
                     <span className='flex-1'>Linking Page</span>
                     <span className='w-10 shrink-0'></span>
                  </div>
                  <div className='min-h-[55vh] relative'>
                     {!isLoading && !isRefreshing && filteredBacklinks.length > 0 && (
                        <List
                           innerElementType="div"
                           itemData={filteredBacklinks}
                           itemCount={filteredBacklinks.length}
                           itemSize={isMobile ? 80 : 57}
                           height={listHeight}
                           width={'100%'}
                           className={'styled-scrollbar'}
                        >
                           {Row}
                        </List>
                     )}
                     {(isLoading || isRefreshing) && (
                        <p className='p-9 pt-[10%] text-center text-gray-500'>
                           {isRefreshing ? 'Searching for backlinks...' : 'Loading backlinks...'}
                        </p>
                     )}
                     {!isLoading && !isRefreshing && filteredBacklinks.length === 0 && hasScraperConfigured && (
                        <p className='p-9 pt-[10%] text-center text-gray-500'>
                           No backlinks found. Click &quot;Search Backlinks&quot; to discover pages linking to {domain?.domain || 'your domain'}.
                        </p>
                     )}
                     {!hasScraperConfigured && (
                        <p className='p-9 pt-[10%] text-center text-gray-500'>
                           No scraper configured. Please configure a scraper in Settings to search for backlinks.
                        </p>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default BacklinksTable;
