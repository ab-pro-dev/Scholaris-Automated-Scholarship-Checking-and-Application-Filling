/**
 * Domain Credibility & Academic Registry Verifier
 * Evaluates domain credibility based on academic TLDs, government affiliations,
 * and recognized international scholarship bodies.
 */

export interface DomainCredibilityResult {
  domain: string;
  isAcademicTld: boolean;
  isGovernmentTld: boolean;
  isKnownScholarshipProvider: boolean;
  category: 'ACADEMIC' | 'GOVERNMENT' | 'VERIFIED_PROVIDER' | 'GENERAL';
  baseCredibilityScore: number; // 0 to 50
  notes: string;
}

// Academic Top-Level Domains and Second-Level Domains worldwide
const ACADEMIC_DOMAINS = [
  '.edu',
  '.ac.uk',
  '.edu.au',
  '.ac.nz',
  '.edu.sg',
  '.ac.jp',
  '.edu.cn',
  '.edu.et',
  '.ac.za',
  '.edu.za',
  '.edu.in',
  '.ac.in',
  '.edu.ca',
  '.ac.be',
  '.edu.my',
  '.ac.kr',
  '.edu.hk',
  '.edu.tw',
];

// Government & Intergovernmental TLDs
const GOVERNMENT_DOMAINS = [
  '.gov',
  '.gov.uk',
  '.gov.au',
  '.gov.et',
  '.europa.eu',
  '.int',
  '.mil',
  '.state.gov',
];

// Recognized Global Scholarship Organizations, National Agencies, and Foundations
const VERIFIED_SCHOLARSHIP_PROVIDERS: Record<string, string> = {
  'daad.de': 'German Academic Exchange Service (DAAD)',
  'fulbrightprogram.org': 'Fulbright Foreign Student Program (US Department of State / IIE)',
  'iie.org': 'Institute of International Education',
  'chevening.org': 'Chevening Secretariat (UK FCDO)',
  'rhodeshouse.ox.ac.uk': 'Rhodes Trust',
  'gatescambridge.org': 'Gates Cambridge Trust',
  'erasmus-plus.ec.europa.eu': 'European Commission (Erasmus+ / Erasmus Mundus)',
  'cscuk.fcdo.gov.uk': 'Commonwealth Scholarship Commission UK',
  'campuschina.org': 'China Scholarship Council (CSC)',
  'csc.edu.cn': 'China Scholarship Council',
  'mext.go.jp': 'Japanese Government (MEXT) Scholarships',
  'si.se': 'Swedish Institute',
  'worldbank.org': 'World Bank Scholarships Program',
  'rotary.org': 'Rotary Peace Fellowships',
  'schwarzmanscholars.org': 'Schwarzman Scholars',
  'weidenfeld-hoffmann.org': 'Weidenfeld-Hoffmann Trust',
  'mofa.go.kr': 'Korean Government Scholarship Program (Global Korea Scholarship)',
};

/**
 * Evaluates whether a domain matches known academic, governmental, or verified registry credentials.
 */
export function evaluateDomainCredibility(domain: string): DomainCredibilityResult {
  const normalized = (domain || '').toLowerCase().trim().replace(/^www\./i, '');

  // 1. Check known international scholarship providers
  for (const [providerDomain, orgName] of Object.entries(VERIFIED_SCHOLARSHIP_PROVIDERS)) {
    if (normalized === providerDomain || normalized.endsWith(`.${providerDomain}`)) {
      return {
        domain: normalized,
        isAcademicTld: false,
        isGovernmentTld: false,
        isKnownScholarshipProvider: true,
        category: 'VERIFIED_PROVIDER',
        baseCredibilityScore: 50,
        notes: `Officially recognized international scholarship provider: ${orgName}`,
      };
    }
  }

  // 2. Check Government / Intergovernmental TLDs
  for (const govTld of GOVERNMENT_DOMAINS) {
    if (normalized.endsWith(govTld)) {
      return {
        domain: normalized,
        isAcademicTld: false,
        isGovernmentTld: true,
        isKnownScholarshipProvider: false,
        category: 'GOVERNMENT',
        baseCredibilityScore: 45,
        notes: `Official government or intergovernmental domain (${govTld})`,
      };
    }
  }

  // 3. Check Academic TLDs (.edu, .ac.uk, etc.)
  for (const academicTld of ACADEMIC_DOMAINS) {
    if (normalized.endsWith(academicTld)) {
      return {
        domain: normalized,
        isAcademicTld: true,
        isGovernmentTld: false,
        isKnownScholarshipProvider: false,
        category: 'ACADEMIC',
        baseCredibilityScore: 45,
        notes: `Accredited university / educational institution domain (${academicTld})`,
      };
    }
  }

  // 4. General / Commercial domain
  return {
    domain: normalized,
    isAcademicTld: false,
    isGovernmentTld: false,
    isKnownScholarshipProvider: false,
    category: 'GENERAL',
    baseCredibilityScore: 10,
    notes: 'General or non-academic top-level domain; requires secondary verification',
  };
}
