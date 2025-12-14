import { kebabCase } from 'es-toolkit';

import { _id, _postTitles } from 'src/_mock/assets';

// ----------------------------------------------------------------------

const MOCK_ID = _id[1];
const MOCK_TITLE = _postTitles[2];

const ROOTS = {
  AUTH: '/auth',
  AUTH_DEMO: '/auth-demo',
  DASHBOARD: '/dashboard',
};

// ----------------------------------------------------------------------
const path = (root, sublink) => `${root}${sublink}`;
export const paths = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  pricing: '/pricing',
  payment: '/payment',
  about: '/about-us',
  contact: '/contact-us',
  faqs: '/faqs',
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  components: '/components',
  docs: 'https://docs.minimals.cc/',
  changelog: 'https://docs.minimals.cc/changelog/',
  zoneStore: 'https://mui.com/store/items/zone-landing-page/',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  freeUI: 'https://mui.com/store/items/minimal-dashboard-free/',
  figmaUrl: 'https://www.figma.com/design/WadcoP3CSejUDj7YZc87xj/%5BPreview%5D-Minimal-Web.v7.3.0',
  product: {
    root: `/product`,
    checkout: `/product/checkout`,
    details: (id) => `/product/${id}`,
    demo: { details: `/product/${MOCK_ID}` },
  },
  post: {
    root: `/post`,
    details: (title) => `/post/${kebabCase(title)}`,
    demo: { details: `/post/${kebabCase(MOCK_TITLE)}` },
  },
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: { signIn: `${ROOTS.AUTH}/auth0/sign-in` },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  authDemo: {
    split: {
      signIn: `${ROOTS.AUTH_DEMO}/split/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/split/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/split/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/split/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/split/verify`,
    },
    centered: {
      signIn: `${ROOTS.AUTH_DEMO}/centered/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/centered/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/centered/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/centered/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/centered/verify`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    mail: `${ROOTS.DASHBOARD}/mail`,
    chat: `${ROOTS.DASHBOARD}/chat`,
    blank: `${ROOTS.DASHBOARD}/blank`,
    kanban: `${ROOTS.DASHBOARD}/kanban`,
    calendar: `${ROOTS.DASHBOARD}/calendar`,
    fileManager: `${ROOTS.DASHBOARD}/file-manager`,
    permission: `${ROOTS.DASHBOARD}/permission`,
    general: {
      app: `${ROOTS.DASHBOARD}/app`,
      ecommerce: `${ROOTS.DASHBOARD}/ecommerce`,
      analytics: `${ROOTS.DASHBOARD}/analytics`,
      banking: `${ROOTS.DASHBOARD}/banking`,
      booking: `${ROOTS.DASHBOARD}/booking`,
      company: `${ROOTS.DASHBOARD}/company`,
      account: `${ROOTS.DASHBOARD}/accounts`,
      file: `${ROOTS.DASHBOARD}/file`,
      course: `${ROOTS.DASHBOARD}/course`,
    },
    finance: {
      root: `${ROOTS.DASHBOARD}/finance`,
      dashboard: `${ROOTS.DASHBOARD}/finance/dashboard`,
      payments: {
        root: `${ROOTS.DASHBOARD}/finance/payments`,
        new: `${ROOTS.DASHBOARD}/finance/payments/new`,
        details: (id) => `${ROOTS.DASHBOARD}/finance/payments/${id}`,
        edit: (id) => `${ROOTS.DASHBOARD}/finance/payments/${id}/edit`,
      },
      reports: {
        arAging: `${ROOTS.DASHBOARD}/finance/reports/ar-aging`,
        apAging: `${ROOTS.DASHBOARD}/finance/reports/ap-aging`,
        paymentHistory: `${ROOTS.DASHBOARD}/finance/reports/payment-history`,
        expenseByCategory: `${ROOTS.DASHBOARD}/finance/reports/expense-by-category`,
      },
      chartOfAccounts: `${ROOTS.DASHBOARD}/finance/chart-of-accounts`,
      generalLedger: `${ROOTS.DASHBOARD}/finance/general-ledger`,
      journalEntries: `${ROOTS.DASHBOARD}/finance/journal-entries`,
    },
    deals: {
      root: `${ROOTS.DASHBOARD}/deals`,
      new: `${ROOTS.DASHBOARD}/deals/new`,
      details: (id) => `${ROOTS.DASHBOARD}/deals/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/deals/${id}/edit`,
      bdm: `${ROOTS.DASHBOARD}/bdm`,
    },
    bdm: {
      root: `${ROOTS.DASHBOARD}/bdm`,
      details: (id) => `${ROOTS.DASHBOARD}/bdm/${id}`,
    },
    hr: {
      root: path(ROOTS.DASHBOARD, '/hr'),
      employee: {
        root: path(ROOTS.DASHBOARD, '/hr/employee'),
        new: path(ROOTS.DASHBOARD, '/hr/employee/new'),
        edit: (id) => path(ROOTS.DASHBOARD, `/hr/employee/${id}/edit`),
        details: (id) => path(ROOTS.DASHBOARD, `/hr/employee/${id}`),
        finance: {
          payroll: {
            root: path(ROOTS.DASHBOARD, '/hr/employee/finance/payroll'),
            generate: path(ROOTS.DASHBOARD, '/hr/employee/finance/payroll/generate'),
          },
        },
      },

      offerManagement: {
        root: path(ROOTS.DASHBOARD, '/hr/offer-management'),
        new: path(ROOTS.DASHBOARD, '/hr/offer-management/new'),
        edit: (id) => path(ROOTS.DASHBOARD, `/hr/offer-management/${id}/edit`),
        details: (id) => path(ROOTS.DASHBOARD, `/hr/offer-management/${id}`),
      },
      businessVisa: {
        root: path(ROOTS.DASHBOARD, '/hr/business-visa'),
        new: path(ROOTS.DASHBOARD, '/hr/business-visa/new'),
        edit: (id) => path(ROOTS.DASHBOARD, `/hr/business-visa/${id}/edit`),
        details: (id) => path(ROOTS.DASHBOARD, `/hr/business-visa/${id}`),
      },
      leave: {
        root: path(ROOTS.DASHBOARD, '/hr/leave'),
        summary: path(ROOTS.DASHBOARD, '/hr/leave/summary'),
        new: path(ROOTS.DASHBOARD, '/hr/leave/new'),
        edit: (id) => path(ROOTS.DASHBOARD, `/hr/leave/${id}/edit`),
        details: (id) => path(ROOTS.DASHBOARD, `/hr/leave/${id}`),
      },
    },
    user: {
      root: `${ROOTS.DASHBOARD}/user`,
      new: `${ROOTS.DASHBOARD}/user/new`,
      list: `${ROOTS.DASHBOARD}/user/list`,
      cards: `${ROOTS.DASHBOARD}/user/cards`,
      profile: `${ROOTS.DASHBOARD}/user/profile`,
      account: `${ROOTS.DASHBOARD}/user/account`,
      edit: (id) => `${ROOTS.DASHBOARD}/user/${id}/edit`,
      demo: { edit: `${ROOTS.DASHBOARD}/user/${MOCK_ID}/edit` },
    },
    product: {
      root: `${ROOTS.DASHBOARD}/product`,
      new: `${ROOTS.DASHBOARD}/product/new`,
      details: (id) => `${ROOTS.DASHBOARD}/product/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/product/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/product/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/product/${MOCK_ID}/edit`,
      },
    },
    vendor: {
      root: `${ROOTS.DASHBOARD}/vendor`,
      new: `${ROOTS.DASHBOARD}/vendor/new`,
      details: (id) => `${ROOTS.DASHBOARD}/vendor/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/vendor/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/vendor/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/vendor/${MOCK_ID}/edit`,
      },
    },
    expense: {
      root: `${ROOTS.DASHBOARD}/expense`,
      new: `${ROOTS.DASHBOARD}/expense/new`,
      details: (id) => `${ROOTS.DASHBOARD}/expense/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/expense/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/expense/1`,
        edit: `${ROOTS.DASHBOARD}/expense/1/edit`,
      },
    },
    invoice: {
      root: `${ROOTS.DASHBOARD}/invoice`,
      new: `${ROOTS.DASHBOARD}/invoice/new`,
      details: (id) => `${ROOTS.DASHBOARD}/invoice/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/invoice/${id}/edit`,
      vat: `${ROOTS.DASHBOARD}/invoice/vat`, // ✅ ADD THIS LINE
      demo: {
        details: `${ROOTS.DASHBOARD}/invoice/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/invoice/${MOCK_ID}/edit`,
      },
    },
    post: {
      root: `${ROOTS.DASHBOARD}/post`,
      new: `${ROOTS.DASHBOARD}/post/new`,
      details: (title) => `${ROOTS.DASHBOARD}/post/${kebabCase(title)}`,
      edit: (title) => `${ROOTS.DASHBOARD}/post/${kebabCase(title)}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/post/${kebabCase(MOCK_TITLE)}`,
        edit: `${ROOTS.DASHBOARD}/post/${kebabCase(MOCK_TITLE)}/edit`,
      },
    },
    order: {
      root: `${ROOTS.DASHBOARD}/order`,
      details: (id) => `${ROOTS.DASHBOARD}/order/${id}`,
      demo: { details: `${ROOTS.DASHBOARD}/order/${MOCK_ID}` },
    },
    job: {
      root: `${ROOTS.DASHBOARD}/job`,
      new: `${ROOTS.DASHBOARD}/job/new`,
      details: (id) => `${ROOTS.DASHBOARD}/job/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/job/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/job/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/job/${MOCK_ID}/edit`,
      },
    },
    tour: {
      root: `${ROOTS.DASHBOARD}/tour`,
      new: `${ROOTS.DASHBOARD}/tour/new`,
      details: (id) => `${ROOTS.DASHBOARD}/tour/${id}`,
      edit: (id) => `${ROOTS.DASHBOARD}/tour/${id}/edit`,
      demo: {
        details: `${ROOTS.DASHBOARD}/tour/${MOCK_ID}`,
        edit: `${ROOTS.DASHBOARD}/tour/${MOCK_ID}/edit`,
      },
    },
  },
};
