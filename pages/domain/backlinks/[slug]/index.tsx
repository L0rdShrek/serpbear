import React, { useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { CSSTransition } from 'react-transition-group';
import Sidebar from '../../../../components/common/Sidebar';
import TopBar from '../../../../components/common/TopBar';
import DomainHeader from '../../../../components/domains/DomainHeader';
import AddDomain from '../../../../components/domains/AddDomain';
import DomainSettings from '../../../../components/domains/DomainSettings';
import Settings from '../../../../components/settings/Settings';
import { useFetchDomains } from '../../../../services/domains';
import { useFetchSettings } from '../../../../services/settings';
import { useFetchBacklinks, useRefreshBacklinks } from '../../../../services/backlinks';
import BacklinksTable from '../../../../components/backlinks/BacklinksTable';
import Footer from '../../../../components/common/Footer';

const BacklinksPage: NextPage = () => {
   const router = useRouter();
   const [showDomainSettings, setShowDomainSettings] = useState(false);
   const [showSettings, setShowSettings] = useState(false);
   const [showAddDomain, setShowAddDomain] = useState(false);

   const { data: appSettings } = useFetchSettings();
   const { data: domainsData } = useFetchDomains(router);
   const hasScraperConfigured = !!(appSettings?.settings?.scraper_type);
   const { data: backlinksData, isLoading: backlinksLoading } = useFetchBacklinks(router, !!(domainsData?.domains?.length));

   const theDomains: DomainType[] = (domainsData && domainsData.domains) || [];
   const backlinks: BacklinkItem[] = backlinksData?.data?.backlinks || [];

   const activDomain: DomainType | null = useMemo(() => {
      let active: DomainType | null = null;
      if (domainsData?.domains && router.query?.slug) {
         active = domainsData.domains.find((x: DomainType) => x.slug === router.query.slug) || null;
      }
      return active;
   }, [router.query.slug, domainsData]);

   const { mutate: refreshBacklinks, isLoading: isRefreshing } = useRefreshBacklinks(() => {});

   return (
      <div className="Domain ">
         {activDomain && activDomain.domain
         && <Head>
               <title>{`${activDomain.domain} - Backlinks - SerpBear`}</title>
            </Head>
         }
         <TopBar showSettings={() => setShowSettings(true)} showAddModal={() => setShowAddDomain(true)} />
         <div className="flex w-full max-w-7xl mx-auto">
            <Sidebar domains={theDomains} showAddModal={() => setShowAddDomain(true)} />
            <div className="domain_keywords px-5 pt-10 lg:px-0 lg:pt-8 w-full">
               {activDomain && activDomain.domain ? (
                  <DomainHeader
                     domain={activDomain}
                     domains={theDomains}
                     showAddModal={() => {}}
                     showSettingsModal={setShowDomainSettings}
                     exportCsv={() => {}}
                  />
               ) : <div className='w-full lg:h-[100px]'></div>}
               <BacklinksTable
                  isLoading={backlinksLoading}
                  isRefreshing={isRefreshing}
                  domain={activDomain}
                  backlinks={backlinks}
                  hasScraperConfigured={hasScraperConfigured}
                  onRefresh={() => activDomain && refreshBacklinks(activDomain.domain)}
               />
            </div>
         </div>

         <CSSTransition in={showAddDomain} timeout={300} classNames="modal_anim" unmountOnExit mountOnEnter>
            <AddDomain closeModal={() => setShowAddDomain(false)} domains={domainsData?.domains || []} />
         </CSSTransition>

         <CSSTransition in={showDomainSettings} timeout={300} classNames="modal_anim" unmountOnExit mountOnEnter>
            <DomainSettings
               domain={showDomainSettings && theDomains && activDomain && activDomain.domain ? activDomain : false}
               closeModal={setShowDomainSettings}
            />
         </CSSTransition>
         <CSSTransition in={showSettings} timeout={300} classNames="settings_anim" unmountOnExit mountOnEnter>
            <Settings closeSettings={() => setShowSettings(false)} />
         </CSSTransition>
         <Footer currentVersion={appSettings?.settings?.version ? appSettings.settings.version : ''} />
      </div>
   );
};

export default BacklinksPage;
