import { Op } from 'sequelize';
import Keyword from '../database/models/keyword';
import parseKeywords from './parseKeywords';
import { readLocalSCData } from './searchConsole';
import logger from './logger';

/**
 * The function `getdomainStats` takes an array of domain objects, retrieves keyword and stats data for
 * each domain, and calculates various statistics for each domain.
 * @param {DomainType[]} domains - An array of objects of type DomainType.
 * @returns {DomainType[]} - An array of objects of type DomainType.
 */
const getdomainStats = async (domains:DomainType[]): Promise<DomainType[]> => {
   logger.debug('Loading stats for domains:', domains.length);

   // Batch load ALL keywords for ALL domains in a single query (fixes N+1)
   const domainNames = domains.map((d) => d.domain);
   const allKeywordsRaw: Keyword[] = await Keyword.findAll({
      where: { domain: { [Op.in]: domainNames } },
   });
   const allKeywords: KeywordType[] = parseKeywords(allKeywordsRaw.map((e) => e.get({ plain: true })));

   // Group keywords by domain
   const keywordsByDomain = new Map<string, KeywordType[]>();
   allKeywords.forEach((kw) => {
      const existing = keywordsByDomain.get(kw.domain) || [];
      existing.push(kw);
      keywordsByDomain.set(kw.domain, existing);
   });

   // Load SC data in parallel
   const scDataResults = await Promise.all(
      domains.map((domain) => readLocalSCData(domain.domain)),
   );

   const finalDomains: DomainType[] = domains.map((domain, idx) => {
      const domainWithStat = domain;
      const keywords = keywordsByDomain.get(domain.domain) || [];

      domainWithStat.keywordCount = keywords.length;
      const keywordPositions = keywords.reduce((acc, itm) => (acc + itm.position), 0);
      const KeywordsUpdateDates: number[] = keywords.reduce((acc: number[], itm) => [...acc, new Date(itm.lastUpdated).getTime()], [0]);
      const lastKeywordUpdateDate = Math.max(...KeywordsUpdateDates);
      domainWithStat.keywordsUpdated = new Date(lastKeywordUpdateDate || new Date(domain.lastUpdated).getTime()).toJSON();
      domainWithStat.avgPosition = keywords.length > 0 ? Math.round(keywordPositions / keywords.length) : 0;

      // Read SC data from parallel results
      const localSCData = scDataResults[idx];
      const days = 7;
      if (localSCData && localSCData.stats && localSCData.stats.length) {
         const lastSevenStats = localSCData.stats.slice(-days);
         const totalStats = lastSevenStats.reduce((acc, item) => {
            return {
               impressions: item.impressions + acc.impressions,
               clicks: item.clicks + acc.clicks,
               ctr: item.ctr + acc.ctr,
               position: item.position + acc.position,
            };
         }, { impressions: 0, clicks: 0, ctr: 0, position: 0 });
         domainWithStat.scVisits = totalStats.clicks;
         domainWithStat.scImpressions = totalStats.impressions;
         domainWithStat.scPosition = Math.round(totalStats.position / days);
      }

      return domainWithStat;
   });

   return finalDomains;
};

export default getdomainStats;
