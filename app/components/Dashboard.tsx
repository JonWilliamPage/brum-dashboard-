'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Ward, DataSources, DataMeta, EducationWard, EduDataMeta, NeetCityData, CrimeWard, BenefitsData, UcEmpData, HousingBenefitData, ClaimantData, UcCombinedData, BenefitsBillData, TwoChildData, ChildPovertyData, ConMoneyData, PipData, WrongPaymentsData, UcWeatherData, PipPlaceData, OzzyStageData, UcPaymentsData, CrimeObsData, FlyTipData } from '@/lib/types';
import { RAMP } from '@/lib/constants';
import GridView from './tabs/GridView';
import TableView from './tabs/TableView';
import LabourScatter from './tabs/LabourScatter';
import EconomicMatrix from './tabs/EconomicMatrix';
import Compare from './tabs/Compare';
import DetailPanel from './detail/DetailPanel';
import CrimeDetailPanel from './detail/CrimeDetailPanel';
import CrimeTable from './tabs/crime/CrimeTable';
import CrimeGrid from './tabs/crime/CrimeGrid';
import QualGrid from '../education/components/QualGrid';
import QualTable from '../education/components/QualTable';
import QualBars from '../education/components/QualBars';
import EduDetailPanel from '../education/components/EduDetailPanel';
import YouthDashboard from '../youth/components/YouthDashboard';
import NeetDetailPanel from '../youth/components/NeetDetailPanel';
import HousingDashboard from '../housing/components/HousingDashboard';
import HousingDetailPanel from '../housing/components/HousingDetailPanel';
import { buildHousingWards } from '@/lib/synth-housing';
import { buildFiscalWards } from '@/lib/synth-fiscal';
import type { HousingWard, FiscalWard } from '@/lib/types';
import FiscalDashboard from '../fiscal/components/FiscalDashboard';
import FiscalDetailPanel from '../fiscal/components/FiscalDetailPanel';
import BenefitsDashboard from '../benefits/components/BenefitsDashboard';
import UcEmpDashboard from '../uc-employment/components/UcEmpDashboard';
import HousingBenefitView from '../housing-benefit/components/HousingBenefitView';
import FlyTippingView from '../fly-tipping/components/FlyTippingView';
import ClaimantDashboard from '../claimant-count/components/ClaimantDashboard';
import UcCombinedDashboard from '../uc-combined/components/UcCombinedDashboard';
import BenefitsBillView from '../benefits-bill/components/BenefitsBillView';
import TwoChildView from '../two-child/components/TwoChildView';
import ChildPovertyDashboard from '../child-poverty/components/ChildPovertyDashboard';
import ConMoneyDashboard from '../constituency-money/components/ConMoneyDashboard';
import PipDashboard from '../pip/components/PipDashboard';
import WrongPaymentsView from '../wrong-payments/components/WrongPaymentsView';
import UcPaymentsView from '../uc-payments/components/UcPaymentsView';
import UcWeatherView from '../uc-weather/components/UcWeatherView';
import PipPlaceView from '../pip-place/components/PipPlaceView';
import UcStageView from '../uc-stage/components/UcStageView';
import PipStageView from '../pip-stage/components/PipStageView';
import OzzyStageView from '../ozzy-stage/components/OzzyStageView';
import CrimeObsView from '../crime-observatory/components/CrimeObsView';
import ScoringNote from './brand/ScoringNote';

const EduMap = dynamic(() => import('../education/components/EduMap'), { ssr: false });

const MapView = dynamic(() => import('./tabs/MapView'), { ssr: false });
const CrimeMap = dynamic(() => import('./tabs/crime/CrimeMap'), { ssr: false });

type View = 'employment' | 'crime' | 'education' | 'youth' | 'housing' | 'fiscal' | 'benefits' | 'ucemp' | 'hbenefit' | 'flytip' | 'claimant' | 'bill' | 'twochild' | 'childpov' | 'conmoney' | 'pip' | 'wrongpay' | 'ucpayments' | 'ucweather' | 'pipplace' | 'ucstage' | 'pipstage' | 'ozzystage' | 'crimeobs';
type EmpSub = 'grid' | 'list' | 'scatter' | 'matrix' | 'map' | 'compare';
type CrimeSub = 'crime-table' | 'crime-grid' | 'crime-map';
type EduSub = 'edu-grid' | 'edu-table' | 'edu-chart' | 'edu-map';

interface Props {
  wards: Ward[];
  dsrc: DataSources;
  dsmeta: DataMeta;
  nomisDate: string;
  eduWards: EducationWard[];
  eduMeta: EduDataMeta;
  neetData: NeetCityData;
  crimeWards: CrimeWard[];
  crimeMonth: string;
}

const EDU_SOURCES = [
  {
    nm: 'Census 2021 — Highest Level of Qualification',
    ep: 'census-2021-highest-level-of-qualification-birmingham-wards',
    pub: 'ONS / Birmingham City Observatory',
    href: 'https://cityobservatory.birmingham.gov.uk/explore/dataset/census-2021-highest-level-of-qualification-birmingham-wards/',
    desc: 'Usual residents aged 16+ by qualification level. 68 Birmingham wards. March 2021.',
  },
  {
    nm: 'IMD 2025 — Education, Skills & Training Domain',
    ep: 'imd-indices-of-deprivation-2025-wmca-wards-2024',
    pub: 'DLUHC / Birmingham City Observatory',
    href: 'https://cityobservatory.birmingham.gov.uk/explore/dataset/imd-indices-of-deprivation-2025-wmca-wards-2024/',
    desc: 'Education deprivation domain from IMD 2025, ward level for all WMCA wards.',
  },
  {
    nm: 'NOMIS — Census 2021 TS067 (Qualifications)',
    ep: 'NM_2084_1 · census2021-ts067-ward.csv',
    pub: 'ONS / NOMIS',
    href: 'https://www.nomisweb.co.uk/sources/census_2021',
    desc: 'Authoritative Census 2021 qualifications ZIP. Filter to E05011xxx for Birmingham wards.',
  },
];

export default function Dashboard({ wards, dsrc, dsmeta, nomisDate, eduWards, eduMeta, neetData, crimeWards, crimeMonth }: Props) {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('employment');
  const [empSub, setEmpSub] = useState<EmpSub>('grid');
  const [crimeSub, setCrimeSub] = useState<CrimeSub>('crime-table');
  const [eduSub, setEduSub] = useState<EduSub>('edu-grid');
  const [selected, setSelected] = useState<Ward | null>(null);
  const [selectedEdu, setSelectedEdu] = useState<EducationWard | null>(null);
  const [selectedYouth, setSelectedYouth] = useState<Ward | null>(null);
  const [selectedHousing, setSelectedHousing] = useState<string | null>(null);
  const [selectedFiscal, setSelectedFiscal] = useState<string | null>(null);
  const [selectedCrime, setSelectedCrime] = useState<string | null>(null);
  const [pinnedWards, setPinnedWards] = useState<string[]>([]);
  const [trendMode, setTrendMode] = useState<'12m' | 'pandemic'>('12m');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [benefitsData, setBenefitsData] = useState<BenefitsData | null>(null);
  const [ucEmpData, setUcEmpData] = useState<UcEmpData | null>(null);
  const [hbData, setHbData] = useState<HousingBenefitData | null>(null);
  const [flyTipData, setFlyTipData] = useState<FlyTipData | null>(null);
  const [claimantData, setClaimantData] = useState<ClaimantData | null>(null);
  const [ucCombinedData, setUcCombinedData] = useState<UcCombinedData | null>(null);
  const [billData, setBillData] = useState<BenefitsBillData | null>(null);
  const [twoChildData, setTwoChildData] = useState<TwoChildData | null>(null);
  const [childPovData, setChildPovData] = useState<ChildPovertyData | null>(null);
  const [conMoneyData, setConMoneyData] = useState<ConMoneyData | null>(null);
  const [pipData, setPipData] = useState<PipData | null>(null);
  const [wrongPayData, setWrongPayData] = useState<WrongPaymentsData | null>(null);
  const [ucPaymentsData, setUcPaymentsData] = useState<UcPaymentsData | null>(null);
  const [ucWeatherData, setUcWeatherData] = useState<UcWeatherData | null>(null);
  const [pipPlaceData, setPipPlaceData] = useState<PipPlaceData | null>(null);
  const [crimeObsData, setCrimeObsData] = useState<CrimeObsData | null>(null);
  const [ucStageData, setUcStageData] = useState<UcWeatherData | null>(null);
  const [pipStageData, setPipStageData] = useState<PipPlaceData | null>(null);
  const [ozzyStageData, setOzzyStageData] = useState<OzzyStageData | null>(null);

  // Load PUBLISHED dashboards at runtime. Each is present only once its proposal has
  // been accepted in /review (which writes public/data/<id>.json). Client-side fetch →
  // Accept makes the sidebar entry appear with no rebuild.
  useEffect(() => {
    fetch('/data/uc-wards.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards) setBenefitsData({
          as_of: j.as_of, city_pct: j.city_pct, total_claimants: j.total_claimants,
          total_population: j.total_population, sources: j.sources ?? (j.source ? [j.source] : []), wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/uc-employment.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards) setUcEmpData({
          as_of: j.as_of, ward_mean_pct: j.ward_mean_pct,
          sources: j.sources ?? (j.source ? [j.source] : []), wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });

    // uc-combined upgrades the Universal Credit tab in place once accepted.
    fetch('/data/uc-combined.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards && j?.city) setUcCombinedData({
          as_of: j.as_of, city: j.city, sources: j.sources ?? (j.source ? [j.source] : []), wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/benefits-bill.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.lines) setBillData({
          year: j.year ?? '', total_m: j.total_m ?? 0, per_head: j.per_head ?? null,
          population: j.population ?? null, sources: j.sources ?? (j.source ? [j.source] : []), lines: j.lines,
          history: j.history ?? [],
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/two-child.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.constituencies && j?.city) setTwoChildData({
          as_of: j.as_of, child_element_month: j.child_element_month ?? 292.81,
          city: j.city, sources: j.sources ?? (j.source ? [j.source] : []), constituencies: j.constituencies,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/pip-conditions.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.categories) setPipData({
          years: j.years ?? [], categories: j.categories, conditions: j.conditions ?? [],
          gb_total_real_latest: j.gb_total_real_latest ?? 0, gb_total_nominal_latest: j.gb_total_nominal_latest ?? 0,
          birmingham_pip_m: j.birmingham_pip_m ?? null, sources: j.sources ?? (j.source ? [j.source] : []),
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/constituency-money.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.constituencies) setConMoneyData({
          year: j.year ?? '', benefit_labels: j.benefit_labels ?? {}, uc_years: j.uc_years ?? [],
          city: j.city ?? { sum_m: 0, la_total_m: 0, drift_pct: 0 },
          sources: j.sources ?? (j.source ? [j.source] : []), constituencies: j.constituencies,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/child-poverty.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards && j?.years) setChildPovData({
          as_of: j.as_of, years: j.years,
          city: j.city ?? { city_series: null, england_series: null, city_latest: null, england_latest: null },
          sources: j.sources ?? (j.source ? [j.source] : []), wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/claimant-count.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards) setClaimantData({
          as_of: j.as_of, months: j.months ?? [], ward_mean_pct: j.ward_mean_pct ?? null,
          total_claimants: j.total_claimants ?? 0,
          sources: j.sources ?? (j.source ? [j.source] : []), wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/housing-benefit.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.areas) setHbData({
          as_of: j.as_of, metric: j.metric, geography: j.geography ?? 'local-authority',
          areas: j.areas, benchmarks: j.benchmarks ?? { wmca: null, england: null },
          birmingham_value: j.birmingham_value ?? null, birmingham_rank: j.birmingham_rank ?? null,
          sources: j.sources ?? (j.source ? [j.source] : []),
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/fly-tipping.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.areas && j?.years) setFlyTipData({
          as_of: j.as_of ?? j.source?.as_of ?? '',
          metric: j.metric ?? 'Fly-tipping incidents per 1,000 people',
          geography: j.geography ?? 'local-authority',
          years: j.years,
          areas: j.areas,
          benchmarks: j.benchmarks ?? { wmca: null, england: null },
          bench_series: j.bench_series ?? { wmca: [], england: [] },
          city: j.city ?? { series: [], latest: null, first: null, change: null, peak: null, peak_year: null, rank: null },
          birmingham_value: j.birmingham_value ?? j.city?.latest ?? j.validation?.birmingham_value ?? null,
          birmingham_rank: j.birmingham_rank ?? j.city?.rank ?? j.validation?.birmingham_rank ?? null,
          sources: j.sources ?? (j.source ? [j.source] : []),
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/wrong-payments.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.lines && j?.city && j?.national) setWrongPayData({
          year: j.year ?? '', as_of: j.as_of ?? '',
          sources: j.sources ?? (j.source ? [j.source] : []),
          national: j.national, city: j.city,
          uc_reasons: j.uc_reasons ?? [], lines: j.lines,
          method_notes: j.method_notes,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/uc-payments.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.city?.series && j?.award_bands && j?.family_types) setUcPaymentsData({
          as_of: j.as_of ?? '',
          sources: j.sources ?? (j.source ? [j.source] : []),
          months: j.months ?? [],
          month_keys: j.month_keys,
          city: j.city,
          award_bands: j.award_bands,
          family_types: j.family_types,
          method_notes: j.method_notes,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/uc-weather.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards && j?.months && j?.city) setUcWeatherData({
          as_of: j.as_of ?? '', sources: j.sources ?? [],
          months: j.months, month_keys: j.month_keys,
          city: j.city, wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/crime-observatory.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards && j?.months && j?.city) setCrimeObsData({
          as_of: j.as_of ?? '', sources: j.sources ?? [],
          months: j.months, categories: j.categories ?? [],
          city: j.city, wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/pip-place.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards && j?.months && j?.city) setPipPlaceData({
          as_of: j.as_of ?? '', sources: j.sources ?? [],
          months: j.months, month_keys: j.month_keys,
          city: j.city, wards: j.wards,
          category_mix: j.category_mix ?? { early_month: null, latest_month: null, early: [], latest: [] },
          gb_conditions: j.gb_conditions ?? null,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/uc-stage.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards && j?.months && j?.city) setUcStageData({
          as_of: j.as_of ?? '', sources: j.sources ?? [],
          months: j.months, month_keys: j.month_keys,
          city: j.city, wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/pip-stage.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards && j?.months && j?.city) setPipStageData({
          as_of: j.as_of ?? '', sources: j.sources ?? [],
          months: j.months, month_keys: j.month_keys,
          city: j.city, wards: j.wards,
          category_mix: j.category_mix ?? { early_month: null, latest_month: null, early: [], latest: [] },
          gb_conditions: j.gb_conditions ?? null,
        });
      })
      .catch(() => { /* not published yet */ });

    fetch('/data/ozzy-stage.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (j?.wards && j?.uc && j?.pip) setOzzyStageData({
          as_of: j.as_of ?? '', sources: j.sources ?? [],
          uc: j.uc, pip: j.pip, wards: j.wards,
        });
      })
      .catch(() => { /* not published yet */ });
  }, []);

  useEffect(() => {
    try {
      const lev = localStorage.getItem('lastEmploymentView') as EmpSub | null;
      if (lev) setEmpSub(lev);
      const lcv = localStorage.getItem('lastCrimeView') as CrimeSub | null;
      if (lcv) setCrimeSub(lcv);
      const lev2 = localStorage.getItem('lastEduView') as EduSub | null;
      if (lev2) setEduSub(lev2);
      const sc = localStorage.getItem('sidebarCollapsed');
      if (sc === '1') setSidebarCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebarCollapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 650);
    return () => clearTimeout(t);
  }, []);


  const togglePin = (code: string) => {
    setPinnedWards(prev => {
      const idx = prev.indexOf(code);
      if (idx >= 0) return prev.filter(c => c !== code);
      if (prev.length < 2) return [...prev, code];
      return [prev[1], code];
    });
  };

  const setEmpSubPersist = (s: EmpSub) => {
    setEmpSub(s);
    try { localStorage.setItem('lastEmploymentView', s); } catch { /* ignore */ }
  };
  const setCrimeSubPersist = (s: CrimeSub) => {
    setCrimeSub(s);
    try { localStorage.setItem('lastCrimeView', s); } catch { /* ignore */ }
  };
  const setEduSubPersist = (s: EduSub) => {
    setEduSub(s);
    try { localStorage.setItem('lastEduView', s); } catch { /* ignore */ }
  };

  const isCrime   = view === 'crime';
  const selectedCrimeWard = crimeWards.find(w => w.ward_code === selectedCrime) ?? null;
  const isEdu     = view === 'education';
  const isYouth   = view === 'youth';
  const isHousing = view === 'housing';
  const isFiscal  = view === 'fiscal';
  const isBenefits = view === 'benefits';
  const isUcEmp = view === 'ucemp';
  const isHBenefit = view === 'hbenefit';
  const isFlyTip = view === 'flytip';
  const isClaimant = view === 'claimant';
  const isBill = view === 'bill';
  const isTwoChild = view === 'twochild';
  const isChildPov = view === 'childpov';
  const isConMoney = view === 'conmoney';
  const isPip = view === 'pip';
  const isWrongPay = view === 'wrongpay';
  const isUcPayments = view === 'ucpayments';
  const isUcWeather = view === 'ucweather';
  const isPipPlace = view === 'pipplace';
  const isUcStage = view === 'ucstage';
  const isPipStage = view === 'pipstage';
  const isOzzyStage = view === 'ozzystage';
  const isCrimeObs = view === 'crimeobs';

  const housingWards: HousingWard[] = useMemo(() => buildHousingWards(wards), [wards]);
  const fiscalWards: FiscalWard[] = useMemo(() => buildFiscalWards(wards), [wards]);

  const bodyClass = isCrime ? ' crime-mode' : isEdu ? ' edu-mode' : '';

  const emptyBull = (
    <div className="r-empty">
      <div className="ascii-ward">{`┌─────────────────────┐
 │  (\\/)  (\\/)         │
 │   \\  \\/  /          │
 │ .--\\----/--.        │
 │/  ( o)(o)  \\        │
 │|    (---)   |       │
 │ \\___________/       │
 └─────────────────────┘`}</div>
      <p>Select any ward to see a detailed breakdown.</p>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 9, fontStyle: 'normal', color: 'rgba(14,15,17,.18)', letterSpacing: '.18em' }}>THE BULL OF BIRMINGHAM</p>
    </div>
  );

  return (
    <>
      {/* Loading overlay */}
      <div id="overlay" className={ready ? 'fade' : ''}>
        <div className="splash">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/birmingham-coat-of-arms.png" alt="" aria-hidden="true" className="splash-crest" />
          <div className="splash-wordmark">BIRMINGHAM</div>
          <div className="splash-sub">City Dashboard · Ozzy Intelligence</div>
        </div>
      </div>

      <div className="error-toast" id="error-toast"><span>⚠</span><span id="etxt" /></div>

      {/* Treatment A — permanent sidebar + main column */}
      <div className={`dash-shell${sidebarCollapsed ? ' collapsed' : ''}`} style={{ display: ready ? 'grid' : 'none' }}>

        {/* Permanent sidebar */}
        <aside className="dash-sidebar">
          {/* Brand */}
          <div className="dash-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/birmingham-coat-of-arms.png" alt="Birmingham crest" className="dash-crest" />
            <div>
              <div className="dash-brand-name">Birmingham</div>
              <div className="dash-brand-sub">City Dashboard</div>
            </div>
          </div>

          {/* Dashboards nav */}
          <div className="dash-nav-section">
            <div className="dash-nav-section-ttl">Reporting</div>
            <button className={`dash-nav-btn${view === 'employment' ? ' active' : ''}`} onClick={() => setView('employment')}>
              <span className="dash-nav-glyph">▦</span> Employment
            </button>
            <button className={`dash-nav-btn${isCrime ? ' active' : ''}`} onClick={() => setView('crime')}>
              <span className="dash-nav-glyph">⚠</span> Crime
              {dsrc.crime === 'live' && <span className="dash-live-dot">●</span>}
            </button>
            <button className={`dash-nav-btn${isEdu ? ' active' : ''}`} onClick={() => setView('education')}>
              <span className="dash-nav-glyph">◈</span> Education &amp; Skills
            </button>
            <button className={`dash-nav-btn${isYouth ? ' active' : ''}`} onClick={() => setView('youth')}>
              <span className="dash-nav-glyph">◑</span> Youth &amp; NEET
              {dsrc.neet === 'live' && <span className="dash-live-dot">●</span>}
            </button>
            <button className={`dash-nav-btn${isHousing ? ' active' : ''}`} onClick={() => setView('housing')}>
              <span className="dash-nav-glyph">⌂</span> Housing
            </button>
            <button className={`dash-nav-btn${isFiscal ? ' active' : ''}`} onClick={() => setView('fiscal')}>
              <span className="dash-nav-glyph">£</span> Fiscal Balance
            </button>
            {benefitsData && (
              <button className={`dash-nav-btn${isBenefits ? ' active' : ''}`} onClick={() => setView('benefits')}>
                <span className="dash-nav-glyph">▤</span> Benefits (UC)
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {ucEmpData && (
              <button className={`dash-nav-btn${isUcEmp ? ' active' : ''}`} onClick={() => setView('ucemp')}>
                <span className="dash-nav-glyph">◧</span> UC in Work
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {hbData && (
              <button className={`dash-nav-btn${isHBenefit ? ' active' : ''}`} onClick={() => setView('hbenefit')}>
                <span className="dash-nav-glyph">⌂</span> Housing Benefit
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {flyTipData && (
              <button className={`dash-nav-btn${isFlyTip ? ' active' : ''}`} onClick={() => setView('flytip')}>
                <span className="dash-nav-glyph">⚠</span> Fly-tipping
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {claimantData && (
              <button className={`dash-nav-btn${isClaimant ? ' active' : ''}`} onClick={() => setView('claimant')}>
                <span className="dash-nav-glyph">▥</span> Claimant Count
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {billData && (
              <button className={`dash-nav-btn${isBill ? ' active' : ''}`} onClick={() => setView('bill')}>
                <span className="dash-nav-glyph">£</span> Benefits Bill
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {twoChildData && (
              <button className={`dash-nav-btn${isTwoChild ? ' active' : ''}`} onClick={() => setView('twochild')}>
                <span className="dash-nav-glyph">◔</span> Two-Child Limit
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {childPovData && (
              <button className={`dash-nav-btn${isChildPov ? ' active' : ''}`} onClick={() => setView('childpov')}>
                <span className="dash-nav-glyph">◒</span> Child Poverty
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {conMoneyData && (
              <button className={`dash-nav-btn${isConMoney ? ' active' : ''}`} onClick={() => setView('conmoney')}>
                <span className="dash-nav-glyph">◈</span> Money Map (£)
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {pipData && (
              <button className={`dash-nav-btn${isPip ? ' active' : ''}`} onClick={() => setView('pip')}>
                <span className="dash-nav-glyph">✚</span> PIP Deep Dive
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {wrongPayData && (
              <button className={`dash-nav-btn${isWrongPay ? ' active' : ''}`} onClick={() => setView('wrongpay')}>
                <span className="dash-nav-glyph">⚠</span> Wrong Payments
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {ucPaymentsData && (
              <button className={`dash-nav-btn${isUcPayments ? ' active' : ''}`} onClick={() => setView('ucpayments')}>
                <span className="dash-nav-glyph">£</span> UC Payments
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {ucWeatherData && (
              <button className={`dash-nav-btn${isUcWeather ? ' active' : ''}`} onClick={() => setView('ucweather')}>
                <span className="dash-nav-glyph">☁</span> UC Weather
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {pipPlaceData && (
              <button className={`dash-nav-btn${isPipPlace ? ' active' : ''}`} onClick={() => setView('pipplace')}>
                <span className="dash-nav-glyph">✚</span> PIP Place
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {ucStageData && (
              <button className={`dash-nav-btn${isUcStage ? ' active' : ''}`} onClick={() => setView('ucstage')}>
                <span className="dash-nav-glyph">▣</span> UC Stage 3D
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {pipStageData && (
              <button className={`dash-nav-btn${isPipStage ? ' active' : ''}`} onClick={() => setView('pipstage')}>
                <span className="dash-nav-glyph">▣</span> PIP Stage 3D
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {ozzyStageData && (
              <button className={`dash-nav-btn${isOzzyStage ? ' active' : ''}`} onClick={() => setView('ozzystage')}>
                <span className="dash-nav-glyph">◉</span> Ozzy Stage
                <span className="dash-live-dot">●</span>
              </button>
            )}
            {crimeObsData && (
              <button className={`dash-nav-btn${isCrimeObs ? ' active' : ''}`} onClick={() => setView('crimeobs')}>
                <span className="dash-nav-glyph">✚</span> Crime Deep Dive
                <span className="dash-live-dot">●</span>
              </button>
            )}
          </div>

          {/* Ask Ozzy link */}
          <div className="dash-nav-section">
            <div className="dash-nav-section-ttl">Ozzy</div>
            <a href="/ozzy" className="dash-nav-btn">
              <span className="dash-nav-glyph">?</span> Ask Ozzy
            </a>
            <a href="/about" className="dash-nav-btn">
              <span className="dash-nav-glyph">◉</span> About Ozzy
            </a>
          </div>

          {/* FORWARD scroll */}
          <div className="dash-sidebar-foot">
            <svg viewBox="0 0 200 44" width="150" height="33" aria-label="Forward — city motto">
              <path d="M14 14 L2 8 L6 22 L2 36 L14 30 Z" fill="var(--herald-navy)" />
              <path d="M186 14 L198 8 L194 22 L198 36 L186 30 Z" fill="var(--herald-navy)" />
              <path d="M14 8 L186 8 L180 22 L186 36 L14 36 L20 22 Z" fill="#f6f4ee" stroke="var(--herald-navy)" strokeWidth="1.4" />
              <text x="100" y="27" textAnchor="middle" fontFamily="Baskervville, Georgia, serif" fontSize="15" fontWeight="600" letterSpacing="3" fill="var(--herald-red)">FORWARD</text>
            </svg>
          </div>
        </aside>

        {/* Main column */}
        <div className="wrap">

          {/* Top bar */}
          <div className="hdr">
            <div className="hdr-brand">
              <button
                className="hdr-sidebar-toggle"
                onClick={toggleSidebar}
                aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                  <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <div>
                <div className="hdr-title">
                  {isCrimeObs ? 'Crime — Deep Dive' : isOzzyStage ? 'Ozzy Stage' : isPipStage ? 'PIP Stage 3D' : isUcStage ? 'UC Stage 3D' : isPipPlace ? 'PIP Place' : isUcWeather ? 'UC Money Weather' : isUcPayments ? 'UC Payments' : isWrongPay ? 'Wrong Payments' : isPip ? 'PIP: Where the Money Goes' : isConMoney ? 'The Constituency Money Map' : isChildPov ? 'Child Poverty' : isBill ? 'The Benefits Bill' : isTwoChild ? 'Two-Child Limit' : isClaimant ? 'Claimant Count' : isFlyTip ? 'Fly-tipping' : isHBenefit ? 'Housing Benefit' : isUcEmp ? 'UC Claimants in Work' : isBenefits ? 'Universal Credit' : isEdu ? 'Education & Skills' : isYouth ? 'Youth & NEET Risk' : isCrime ? 'Crime Dashboard' : isHousing ? 'Housing Affordability' : isFiscal ? 'Ward Net Fiscal Balance' : 'Employment & Benefits'}
                </div>
                <div className="hdr-sub">
                  {isCrimeObs ? `69 wards · offences / 1,000 · 36-month trend · outcomes · ${crimeObsData?.months[0] ?? ''}→${crimeObsData?.as_of ?? ''} · ${crimeObsData?.city.latest_total?.toLocaleString() ?? ''} offences latest`
                    : isOzzyStage ? `Three.js theatre · UC + PIP dual extrusions · drag · play`
                    : isPipStage ? `Three.js · PIP caseload extrusions · ${pipStageData?.months[0] ?? ''}→${pipStageData?.months.at(-1) ?? ''}`
                    : isUcStage ? `Three.js · UC caseload extrusions · ${ucStageData?.months[0] ?? ''}→${ucStageData?.months.at(-1) ?? ''}`
                    : isPipPlace ? `69 wards · PIP caseload play · city £ · GB conditions · ${pipPlaceData?.months[0] ?? ''}→${pipPlaceData?.months.at(-1) ?? ''}`
                    : isUcWeather ? `69 wards · UC caseload play · city £ · ${ucWeatherData?.months[0] ?? ''}→${ucWeatherData?.months.at(-1) ?? ''} · ${ucWeatherData?.city.latest?.toLocaleString() ?? ''} latest`
                    : isUcPayments ? `LA · households · mean award £ · ${ucPaymentsData?.as_of ?? ''} · ${ucPaymentsData?.city.latest_households?.toLocaleString() ?? ''} hh · mean £${ucPaymentsData?.city.latest_mean_payment_gbp ?? '—'}`
                    : isWrongPay ? `Illustrative leakage · national fraud/error rates × city spend · £${((wrongPayData?.city.overpaid_m ?? 0)).toFixed(0)}m · 1 in ${wrongPayData?.city.one_in ?? '—'}`
                    : isPip ? `Great Britain · by medical condition · 2013/14–${pipData?.years.at(-1) ?? ''} · £${((pipData?.gb_total_real_latest ?? 0) / 1000).toFixed(1)}bn real`
                    : isConMoney ? `9 constituencies · actual DWP £ by benefit · ${conMoneyData?.year ?? ''} · £${(((conMoneyData?.city.sum_m ?? 0)) / 1000).toFixed(2)}bn`
                    : isChildPov ? `69 wards · % of children 0–15 in absolute low income · ${childPovData?.as_of ?? ''} · DWP/HMRC`
                    : isBill ? `Local authority · actual DWP expenditure · ${billData?.year ?? ''} · £${((billData?.total_m ?? 0) / 1000).toFixed(2)}bn`
                    : isTwoChild ? `Constituencies · policy abolished 6 Apr 2026 · ${twoChildData?.as_of ?? ''} · DWP`
                    : isClaimant ? `69 wards · % of 16–64 residents claiming · ${claimantData?.as_of ?? ''} · DWP`
                    : isFlyTip ? `Local authority · no ward breakdown · incidents / 1,000 · ${flyTipData?.years[0] ?? ''}→${flyTipData?.as_of ?? ''} · Defra`
                    : isHBenefit ? `Local authority · no ward breakdown · % of households · ${hbData?.as_of ?? ''} · DWP`
                    : isUcEmp ? `69 wards · % of claimants in employment · ${ucEmpData?.as_of ?? ''} · DWP`
                    : isBenefits && ucCombinedData ? `69 wards · total / in work / not in work · ${ucCombinedData.as_of} · DWP`
                    : isBenefits ? `69 wards · % of residents on UC · ${benefitsData?.as_of ?? ''} · DWP`
                    : isEdu ? '68 wards · qualifications & skills'
                    : isYouth ? '68 wards · 16–24 NEET risk'
                    : isHousing ? '68 wards · affordability pressure · modelled'
                    : isFiscal ? '68 wards · net fiscal balance per head · modelled'
                    : isCrime ? `${crimeWards.length} wards · recorded crime · ${crimeMonth} · data.police.uk`
                    : '68 wards · claimant rate & deprivation'}
                </div>
              </div>
            </div>
            <div className="hdr-right">
              <a href="/sources" className="refresh-btn"><span>⌥</span> Sources</a>
              <button className="print-btn" onClick={() => window.print()}>⎙ print</button>
          </div>

        </div>
        <div className="hdr-dancetty" aria-hidden="true" />

        {isOzzyStage && ozzyStageData ? (
          <OzzyStageView data={ozzyStageData} />
        ) : isPipStage && pipStageData ? (
          <PipStageView data={pipStageData} />
        ) : isUcStage && ucStageData ? (
          <UcStageView data={ucStageData} />
        ) : isPipPlace && pipPlaceData ? (
          <PipPlaceView data={pipPlaceData} />
        ) : isCrimeObs && crimeObsData ? (
          <CrimeObsView data={crimeObsData} />
        ) : isUcWeather && ucWeatherData ? (
          <UcWeatherView data={ucWeatherData} />
        ) : isUcPayments && ucPaymentsData ? (
          <UcPaymentsView data={ucPaymentsData} />
        ) : isWrongPay && wrongPayData ? (
          <WrongPaymentsView data={wrongPayData} />
        ) : isPip && pipData ? (
          <PipDashboard data={pipData} />
        ) : isConMoney && conMoneyData ? (
          <ConMoneyDashboard data={conMoneyData} />
        ) : isChildPov && childPovData ? (
          <ChildPovertyDashboard data={childPovData} />
        ) : isBill && billData ? (
          <BenefitsBillView data={billData} />
        ) : isTwoChild && twoChildData ? (
          <TwoChildView data={twoChildData} />
        ) : isClaimant && claimantData ? (
          <ClaimantDashboard data={claimantData} />
        ) : isHBenefit && hbData ? (
          <HousingBenefitView data={hbData} />
        ) : isFlyTip && flyTipData ? (
          <FlyTippingView data={flyTipData} />
        ) : isBenefits && ucCombinedData ? (
          <UcCombinedDashboard data={ucCombinedData} />
        ) : isBenefits && benefitsData ? (
          <BenefitsDashboard data={benefitsData} />
        ) : isUcEmp && ucEmpData ? (
          <UcEmpDashboard data={ucEmpData} />
        ) : (
        <div className={`body${bodyClass}`}>
          <div className="lcol">

            {/* Top stat-tile rows removed across all dashboards — per design review */}

            {/* Education stats row removed — per design review */}

            {/* Per-view scoring / ranking explainer */}
            {view === 'employment' && (
              <ScoringNote label="How wards are scored">
                Wards are ranked by a composite disadvantage score — IMD employment 40%, claimant count 35%,
                health inactivity 25% — then split into deciles 1–10. Decile 10 (darkest) = most disadvantaged;
                decile 1 (lightest) = least. The Economic Matrix instead plots workplace output (GVA per head)
                against this deprivation.
              </ScoringNote>
            )}
            {isCrime && (
              <ScoringNote label="What you're seeing">
                Wards are ranked by recorded crimes per 1,000 residents (West Midlands Police). Darker = a higher
                crime rate; #1 = the highest-crime ward. Rates are population-adjusted so large and small wards
                compare fairly.
              </ScoringNote>
            )}
            {isEdu && (
              <ScoringNote label="How wards are scored">
                Wards are shaded by the % of residents with no qualifications and ranked on the IMD 2025
                education-skills domain (deciles 1–10).
              </ScoringNote>
            )}
            {isYouth && (
              <ScoringNote label="How wards are scored">
                A modelled NEET-risk score ranks wards by youth disadvantage — youth UC claimants 50%, health
                inactivity 30%, employment deprivation 20% — split into deciles 1–10. Decile 10 = highest risk.
                This is an estimate; no official ward-level NEET data exists.
              </ScoringNote>
            )}
            {isHousing && (
              <ScoringNote label="How wards are scored">
                A modelled housing-pressure score ranks wards on affordability — overcrowding 45%, rent-to-income
                35%, price-to-income 20% — split into deciles 1–10. Decile 10 (darkest) = highest pressure. A
                modelled estimate, not an official measure.
              </ScoringNote>
            )}
            {isFiscal && (
              <ScoringNote label="What you're seeing">
                Each ward's net fiscal balance per head = revenue raised − (benefits + service spend). Positive
                (green) = a net contributor to the public purse; negative (red) = a net recipient. All figures are
                modelled estimates.
              </ScoringNote>
            )}

            {/* Breadcrumb + legend — employment */}
            {view === 'employment' && (
              <div className="data-view-toolbar">
                <div className="legend-row">
                  <span className="llbl" style={{ marginRight: 2 }}>Low</span>
                  {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
                  <span className="llbl" style={{ marginLeft: 2 }}>High disadvantage</span>
                </div>
              </div>
            )}

            {/* Breadcrumb + legend — education */}
            {isEdu && (
              <div className="data-view-toolbar">
                <div className="legend-row">
                  <span className="llbl" style={{ marginRight: 2 }}>Low</span>
                  {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
                  <span className="llbl" style={{ marginLeft: 2 }}>High — % no quals</span>
                </div>
              </div>
            )}

            {/* Breadcrumb + legend — housing */}
            {isHousing && (
              <div className="data-view-toolbar">
                <div className="legend-row">
                  <span className="llbl" style={{ marginRight: 2 }}>Lower pressure</span>
                  {RAMP.map((c, i) => <div key={i} className="lsw" style={{ background: c }} />)}
                  <span className="llbl" style={{ marginLeft: 2 }}>Higher</span>
                </div>
              </div>
            )}

            {/* Employment sub-tabs */}
            {view === 'employment' && (
              <div className="sub-tab-bar">
                {([['grid', 'Grid'], ['list', 'Table'], ['scatter', 'Labour Scatter'], ['matrix', 'Economic Matrix'], ['map', 'Map'], ['compare', 'Compare']] as [EmpSub, string][]).map(([s, lbl]) => (
                  <button key={s} className={`sub-tab${empSub === s ? ' active' : ''}`} onClick={() => setEmpSubPersist(s)}>
                    {lbl}
                  </button>
                ))}
              </div>
            )}

            {/* Crime sub-tabs */}
            {isCrime && (
              <div className="sub-tab-bar">
                {([['crime-table', 'Table'], ['crime-grid', 'Grid'], ['crime-map', 'Map']] as [CrimeSub, string][]).map(([s, lbl]) => (
                  <button key={s} className={`sub-tab${crimeSub === s ? ' active' : ''}`} onClick={() => setCrimeSubPersist(s)}>
                    {lbl}
                  </button>
                ))}
              </div>
            )}

            {/* Education sub-tabs */}
            {isEdu && (
              <div className="sub-tab-bar">
                {([['edu-grid', 'Grid'], ['edu-table', 'Table'], ['edu-chart', 'Distribution'], ['edu-map', 'Map']] as [EduSub, string][]).map(([s, lbl]) => (
                  <button key={s} className={`sub-tab${eduSub === s ? ' active' : ''}`} onClick={() => setEduSubPersist(s)}>
                    {lbl}
                  </button>
                ))}
              </div>
            )}

            {/* Panel */}
            <div className="panel" style={{ flex: 1, position: 'relative' }}>
              <div className="panel-body">
                {/* Employment sub-views */}
                {view === 'employment' && empSub === 'grid'    && <GridView wards={wards} selected={selected} onSelect={code => setSelected(wards.find(w => w.ward_code === code) ?? null)} />}
                {view === 'employment' && empSub === 'list'    && <TableView wards={wards} selected={selected} onSelect={code => setSelected(wards.find(w => w.ward_code === code) ?? null)} />}
                {view === 'employment' && empSub === 'scatter' && <LabourScatter wards={wards} onSelect={code => setSelected(wards.find(w => w.ward_code === code) ?? null)} />}
                {view === 'employment' && empSub === 'matrix'  && <EconomicMatrix wards={wards} selected={selected} onSelect={code => setSelected(wards.find(w => w.ward_code === code) ?? null)} />}
                {view === 'employment' && empSub === 'map'     && <MapView wards={wards} onSelect={code => setSelected(wards.find(w => w.ward_code === code) ?? null)} />}
                {view === 'employment' && empSub === 'compare' && <Compare wards={wards} pinnedWards={pinnedWards} onUnpin={togglePin} />}
                {/* Crime sub-views */}
                {isCrime && crimeSub === 'crime-table' && <CrimeTable wards={crimeWards} selected={selectedCrimeWard} onSelect={code => setSelectedCrime(prev => prev === code ? null : code)} />}
                {isCrime && crimeSub === 'crime-grid'  && <CrimeGrid  wards={crimeWards} selected={selectedCrimeWard} onSelect={code => setSelectedCrime(prev => prev === code ? null : code)} />}
                {isCrime && crimeSub === 'crime-map'   && <CrimeMap   wards={crimeWards} onSelect={code => setSelectedCrime(prev => prev === code ? null : code)} />}
                {/* Education sub-views */}
                {isEdu && eduSub === 'edu-grid'  && <QualGrid  wards={eduWards} selected={selectedEdu} onSelect={code => setSelectedEdu(eduWards.find(w => w.ward_code === code) ?? null)} />}
                {isEdu && eduSub === 'edu-table' && <QualTable wards={eduWards} selected={selectedEdu} onSelect={code => setSelectedEdu(eduWards.find(w => w.ward_code === code) ?? null)} />}
                {isEdu && eduSub === 'edu-chart' && (
                  <div style={{ padding: '18px 18px 0' }}>
                    <QualBars wards={eduWards} selected={selectedEdu} />
                  </div>
                )}
                {isEdu && eduSub === 'edu-map' && (
                  <EduMap wards={eduWards} onSelect={code => setSelectedEdu(eduWards.find(w => w.ward_code === code) ?? null)} />
                )}
                {/* Youth & NEET risk */}
                {isYouth && <YouthDashboard wards={wards} selected={selectedYouth} onSelect={code => setSelectedYouth(prev => prev?.ward_code === code ? null : (wards.find(w => w.ward_code === code) ?? null))} />}
                {/* Housing Affordability */}
                {isHousing && <HousingDashboard wards={housingWards} selected={selectedHousing} onSelect={code => setSelectedHousing(prev => prev === code ? null : code)} />}
                {/* Ward Net Fiscal Balance */}
                {isFiscal && <FiscalDashboard wards={fiscalWards} selected={selectedFiscal} onSelect={code => setSelectedFiscal(prev => (!code || prev === code) ? null : code)} />}
              </div>
              <div className="bham-watermark">FORWARD · BIRMINGHAM</div>
            </div>

          </div>

          {/* Right detail panel */}
          <div className="rcol">
            {isEdu ? (
              selectedEdu ? (
                <EduDetailPanel
                  ward={selectedEdu}
                  wards={eduWards}
                  onClose={() => setSelectedEdu(null)}
                />
              ) : (
                <>
                  <div className="r-empty">
                    <div className="ascii-ward">{`┌─────────────────────┐
 │  (\\/)  (\\/)         │
 │   \\  \\/  /          │
 │ .--\\----/--.        │
 │/  ( o)(o)  \\        │
 │|    (---)   |       │
 │ \\___________/       │
 └─────────────────────┘`}</div>
                    <p>Select any ward to see its full qualification breakdown.</p>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 9, fontStyle: 'normal', color: 'rgba(14,15,17,.18)', letterSpacing: '.18em' }}>THE BULL OF BIRMINGHAM</p>
                  </div>
                  {/* Data sources — visible in right panel when no ward selected */}
                  <div style={{ margin: '0 18px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ padding: '14px 0 8px', fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>Data sources</div>
                    {EDU_SOURCES.map(s => (
                      <div key={s.nm} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{s.nm}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 5 }}>{s.desc}</div>
                        <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#1a2a3a', textDecoration: 'underline' }}>
                          View dataset ↗
                        </a>
                      </div>
                    ))}
                    <div style={{ padding: '10px 0', fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted2)', lineHeight: 1.6 }}>
                      All sources are publicly available. No API key required.
                      {' Education: committed Census 2021 snapshot.'}
                    </div>
                  </div>
                </>
              )
            ) : isYouth ? (
              selectedYouth ? (
                <NeetDetailPanel ward={selectedYouth} wards={wards} onClose={() => setSelectedYouth(null)} />
              ) : emptyBull
            ) : isHousing ? (
              selectedHousing ? (
                <HousingDetailPanel ward={housingWards.find(w => w.ward_code === selectedHousing)!} wards={housingWards} onClose={() => setSelectedHousing(null)} />
              ) : emptyBull
            ) : isFiscal ? (
              selectedFiscal ? (
                <FiscalDetailPanel ward={fiscalWards.find(w => w.ward_code === selectedFiscal)!} wards={fiscalWards} onClose={() => setSelectedFiscal(null)} />
              ) : emptyBull
            ) : isCrime ? (
              selectedCrimeWard ? (
                <CrimeDetailPanel ward={selectedCrimeWard} wards={crimeWards} onClose={() => setSelectedCrime(null)} />
              ) : emptyBull
            ) : selected ? (
              <DetailPanel
                ward={selected}
                wards={wards}
                dsrc={dsrc}
                isPinned={pinnedWards.includes(selected.ward_code)}
                onPin={() => togglePin(selected.ward_code)}
                onClose={() => setSelected(null)}
                trendMode={trendMode}
                onTrendMode={setTrendMode}
              />
            ) : (
              emptyBull
            )}
          </div>
        </div>
        )}
        </div>{/* end .wrap */}
      </div>{/* end .dash-shell */}
    </>
  );
}
