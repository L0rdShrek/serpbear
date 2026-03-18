import { readFile, writeFile, unlink } from 'fs/promises';
import { getScraperClient, extractScrapedResult } from './scraper';
import logger from './logger';

/**
 * Fetches backlinks for a domain by searching Google for pages that mention the domain.
 * Uses the query: "domain.com" -site:domain.com
 * @param {string} domainName - The domain to find backlinks for.
 * @param {SettingsType} settings - App settings containing scraper configuration.
 * @returns {Promise<BacklinkItem[]>}
 */
export const fetchBacklinks = async (domainName: string, settings: SettingsType): Promise<BacklinkItem[]> => {
   const searchQuery = `"${domainName}" -site:${domainName}`;

   // Create a fake keyword object to use with the existing scraper
   const fakeKeyword: KeywordType = {
      ID: 0,
      keyword: searchQuery,
      device: 'desktop',
      country: 'US',
      domain: domainName,
      lastUpdated: '',
      added: '',
      position: 0,
      volume: 0,
      sticky: false,
      history: {},
      lastResult: [],
      url: '',
      tags: [],
      updating: false,
      lastUpdateError: false,
   };

   const allScrapers = (await import('../scrapers/index')).default;
   const scraperType = settings?.scraper_type || '';
   const scraperObj = allScrapers.find((s: ScraperSettings) => s.id === scraperType);

   const nativePagination = { start: 0, num: 100, page: 1 };
   const scraperClient = getScraperClient(fakeKeyword, settings, scraperObj, nativePagination);
   if (!scraperClient) {
      logger.error('Failed to create scraper client for backlink search');
      return [];
   }

   try {
      let res: Record<string, unknown>;
      if (scraperType === 'proxy' && settings.proxy) {
         res = await scraperClient as unknown as Record<string, unknown>;
      } else {
         const rawRes = await scraperClient;
         res = await (rawRes as Response).json();
      }

      const scraperResult = scraperObj?.resultObjectKey && res[scraperObj.resultObjectKey] ? res[scraperObj.resultObjectKey] : '';
      const scrapeResult: string = (res.data || res.html || res.results || scraperResult || '') as string;

      if (res && scrapeResult) {
         const extracted = scraperObj?.serpExtractor
            ? scraperObj.serpExtractor(scrapeResult)
            : extractScrapedResult(scrapeResult, 'desktop');

         // Filter out results from the domain itself
         const backlinks: BacklinkItem[] = extracted
            .filter((item) => {
               try {
                  const itemHost = new URL(item.url.includes('://') ? item.url : `https://${item.url}`).hostname.replace(/^www\./, '');
                  const domainHost = domainName.replace(/^www\./, '');
                  return itemHost !== domainHost;
               } catch {
                  return true;
               }
            })
            .map((item, i) => ({
               title: item.title,
               url: item.url,
               position: i + 1,
            }));

         logger.info(`[Backlinks] Found ${backlinks.length} backlinks for ${domainName}`);
         return backlinks;
      }
   } catch (error) {
      logger.error('Error fetching backlinks for:', domainName, error instanceof Error ? error.message : String(error));
   }

   return [];
};

/**
 * Fetches and caches backlink data for a domain.
 * @param {string} domainName - The domain name.
 * @param {SettingsType} settings - App settings.
 * @returns {Promise<BacklinkDomainData>}
 */
export const fetchDomainBacklinks = async (domainName: string, settings: SettingsType): Promise<BacklinkDomainData> => {
   const data: BacklinkDomainData = { backlinks: [], lastFetched: '', lastFetchError: '' };

   try {
      const backlinks = await fetchBacklinks(domainName, settings);
      data.backlinks = backlinks;
      data.lastFetched = new Date().toJSON();
      await updateLocalBacklinkData(domainName, data);
   } catch (error) {
      data.lastFetchError = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching domain backlinks:', error);
   }

   return data;
};

/**
 * Reads cached backlink data from local JSON file.
 * @param {string} domain - The domain name.
 * @returns {Promise<BacklinkDomainData|false>}
 */
export const readLocalBacklinkData = async (domain: string): Promise<BacklinkDomainData | false> => {
   try {
      const filePath = `${process.cwd()}/data/BL_${domain.replaceAll('/', '-')}.json`;
      const raw = await readFile(filePath, { encoding: 'utf-8' }).catch(() => '');
      if (!raw) return false;
      return JSON.parse(raw);
   } catch {
      return false;
   }
};

/**
 * Writes backlink data to local JSON file cache.
 * @param {string} domain - The domain name.
 * @param {BacklinkDomainData} data - The backlink data.
 */
export const updateLocalBacklinkData = async (domain: string, data?: BacklinkDomainData): Promise<BacklinkDomainData | false> => {
   try {
      const filePath = `${process.cwd()}/data/BL_${domain.replaceAll('/', '-')}.json`;
      const emptyData: BacklinkDomainData = { backlinks: [], lastFetched: '', lastFetchError: '' };
      await writeFile(filePath, JSON.stringify(data || emptyData), { encoding: 'utf-8' });
      return data || emptyData;
   } catch (error) {
      logger.error('Error writing backlink data:', error);
      return false;
   }
};

/**
 * Removes the cached backlink data file for a domain.
 * @param {string} domain - The domain name.
 */
export const removeLocalBacklinkData = async (domain: string): Promise<boolean> => {
   try {
      const filePath = `${process.cwd()}/data/BL_${domain.replaceAll('/', '-')}.json`;
      await unlink(filePath);
      return true;
   } catch {
      return false;
   }
};
