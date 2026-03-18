import type { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs/promises';
import Cryptr from 'cryptr';
import db from '../../database/database';
import Domain from '../../database/models/domain';
import { fetchDomainBacklinks, readLocalBacklinkData } from '../../utils/backlinks';
import verifyUser from '../../utils/verifyUser';
import logger from '../../utils/logger';

type BacklinksResponse = {
   data: BacklinkDomainData | null,
   error?: string | null,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
   await db.sync();
   const authorized = verifyUser(req, res);
   if (authorized !== 'authorized') {
      return res.status(401).json({ error: authorized });
   }
   if (req.method === 'GET') {
      return getBacklinks(req, res);
   }
   if (req.method === 'POST') {
      return refreshBacklinks(req, res);
   }
   return res.status(502).json({ error: 'Unrecognized Route.' });
}

const getSettings = async (): Promise<SettingsType | null> => {
   try {
      const settingsRaw = await readFile(`${process.cwd()}/data/settings.json`, { encoding: 'utf-8' });
      const settings: SettingsType = settingsRaw ? JSON.parse(settingsRaw) : {};
      if (settings.scaping_api) {
         const cryptr = new Cryptr(process.env.SECRET as string);
         settings.scaping_api = cryptr.decrypt(settings.scaping_api);
      }
      return settings;
   } catch {
      return null;
   }
};

const getBacklinks = async (req: NextApiRequest, res: NextApiResponse<BacklinksResponse>) => {
   if (!req.query.domain || typeof req.query.domain !== 'string') {
      return res.status(400).json({ data: null, error: 'Domain is Missing.' });
   }
   const domainname = (req.query.domain as string).replaceAll('-', '.').replaceAll('_', '-');

   // Return cached data if available
   const localData = await readLocalBacklinkData(domainname);
   if (localData && localData.backlinks && localData.backlinks.length > 0) {
      return res.status(200).json({ data: localData });
   }

   // Otherwise fetch fresh data
   try {
      const settings = await getSettings();
      if (!settings || !settings.scraper_type) {
         return res.status(200).json({ data: null, error: 'No scraper configured. Please configure a scraper in Settings.' });
      }
      const backlinkData = await fetchDomainBacklinks(domainname, settings);
      return res.status(200).json({ data: backlinkData });
   } catch (error) {
      logger.error('Error getting backlinks for:', domainname, error);
      return res.status(400).json({ data: null, error: 'Error fetching backlinks.' });
   }
};

const refreshBacklinks = async (req: NextApiRequest, res: NextApiResponse<BacklinksResponse>) => {
   if (!req.body.domain || typeof req.body.domain !== 'string') {
      return res.status(400).json({ data: null, error: 'Domain is Missing.' });
   }
   const domainname = req.body.domain;

   try {
      const query = { domain: domainname };
      const foundDomain: Domain | null = await Domain.findOne({ where: query });
      if (!foundDomain) {
         return res.status(404).json({ data: null, error: 'Domain not found.' });
      }

      const settings = await getSettings();
      if (!settings || !settings.scraper_type) {
         return res.status(200).json({ data: null, error: 'No scraper configured. Please configure a scraper in Settings.' });
      }

      const backlinkData = await fetchDomainBacklinks(domainname, settings);
      return res.status(200).json({ data: backlinkData });
   } catch (error) {
      logger.error('Error refreshing backlinks for:', domainname, error);
      return res.status(400).json({ data: null, error: 'Error refreshing backlinks.' });
   }
};
