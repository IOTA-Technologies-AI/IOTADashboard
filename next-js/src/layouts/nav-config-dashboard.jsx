import BusinessIcon from '@mui/icons-material/Business';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />;

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  vat: icon('ic-tax'), // reuse invoice icon for VAT
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  params: icon('ic-params'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  subpaths: icon('ic-subpaths'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  vendor: <HandshakeIcon style={{ width: 24, height: 24 }} />,
  expense: <MoneyOffIcon style={{ width: 24, height: 24 }} />,
  commission: <BusinessIcon style={{ width: 24, height: 24 }} />,
  payroll: <AttachMoneyIcon style={{ width: 24, height: 24 }} />,
  sales: <LeaderboardIcon style={{ width: 24, height: 24 }} />,
  todo: <FormatListNumberedIcon style={{ width: 24, height: 24 }} />,
  profile: icon('ic-user'),
};

// ----------------------------------------------------------------------

/**
 * Input nav data is an array of navigation section items used to define the structure and content of a navigation bar.
 * Each section contains a subheader and an array of items, which can include nested children items.
 *
 * Each item can have the following properties:
 * - `title`: The title of the navigation item.
 * - `path`: The URL path the item links to.
 * - `icon`: An optional icon component to display alongside the title.
 * - `info`: Optional additional information to display, such as a label.
 * - `allowedRoles`: An optional array of roles that are allowed to see the item.
 * - `caption`: An optional caption to display below the title.
 * - `children`: An optional array of nested navigation items.
 * - `disabled`: An optional boolean to disable the item.
 * - `deepMatch`: An optional boolean to indicate if the item should match subpaths.
 */
export const navData = [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      { title: 'App', path: paths.dashboard.root, icon: ICONS.dashboard },
      { title: 'Ecommerce', path: paths.dashboard.general.ecommerce, icon: ICONS.ecommerce },
      { title: 'Analytics', path: paths.dashboard.general.analytics, icon: ICONS.analytics },
      { title: 'Banking', path: paths.dashboard.general.banking, icon: ICONS.banking },
      {
        title: 'Candidate',
        path: paths.dashboard.profile.root,
        icon: ICONS.profile,
        children: [
          { title: 'Overview', path: paths.dashboard.profile.root },
          { title: 'Job Descriptions', path: paths.dashboard.profile.jd.root },
          { title: 'Resumes', path: paths.dashboard.profile.resumes },
          { title: 'Candidates', path: paths.dashboard.profile.candidates.root },
          { title: 'Matching', path: paths.dashboard.profile.matching },
          { title: 'Resource Calculation', path: paths.dashboard.profile.resourceCalculation.root },
        ],
      },
      { title: 'Accounts', path: paths.dashboard.general.account, icon: ICONS.dashboard },
      { title: 'File', path: paths.dashboard.general.file, icon: ICONS.file },
      {
        title: 'Sales',
        path: paths.dashboard.sales.root,
        icon: ICONS.sales,
        children: [
          { title: 'Overview', path: paths.dashboard.sales.root },
          { title: 'Pipeline', path: paths.dashboard.sales.pipeline },
          { title: 'Deals', path: paths.dashboard.sales.deals.root },
          { title: 'New Deal', path: paths.dashboard.sales.deals.new },
          { title: 'Contacts', path: paths.dashboard.sales.contacts },
          { title: 'Reports', path: paths.dashboard.sales.reports },
          { title: 'Activity Ledger', path: paths.dashboard.sales.activityLedger },
        ],
      },
      { title: 'To Do', path: paths.dashboard.todo, icon: ICONS.todo },
      {
        title: 'Reports',
        path: paths.dashboard.general.reports.root,
        icon: ICONS.course,
        children: [
          { title: 'P&L Report', path: paths.dashboard.general.reports.root },
          { title: 'BDM Report', path: paths.dashboard.general.reports.bdm },
        ],
      },
    ],
  },
  /**
   * Management
   */
  {
    subheader: 'Management',
    items: [
      {
        title: 'User',
        path: paths.dashboard.user.root,
        icon: ICONS.user,
        children: [
          { title: 'Profile', path: paths.dashboard.user.root },
          { title: 'Cards', path: paths.dashboard.user.cards },
          { title: 'List', path: paths.dashboard.user.list },
          { title: 'Create', path: paths.dashboard.user.new },
          { title: 'Account', path: paths.dashboard.user.account, deepMatch: true },
        ],
      },
      {
        title: 'Access Control',
        path: paths.dashboard.access.root,
        icon: ICONS.lock,
        allowedRoles: ['superAdmin', 'admin'],
      },
      {
        title: 'HR',
        path: paths.dashboard.hr.root,
        icon: ICONS.user,
        children: [
          {
            title: 'Employee Management',
            path: paths.dashboard.hr.employee.root,
            children: [
              { title: 'All Employees', path: paths.dashboard.hr.employee.root },
              {
                title: 'Finance',
                path: paths.dashboard.hr.employee.finance.payroll.root,
                children: [
                  {
                    title: 'Payroll',
                    path: paths.dashboard.hr.employee.finance.payroll.root,
                  },
                ],
              },
              {
                title: 'Insurance',
                path: paths.dashboard.hr.insurance.root,
                children: [
                  { title: 'Insurance Records', path: paths.dashboard.hr.insurance.root },
                  { title: 'Providers', path: paths.dashboard.hr.insurance.providers },
                ],
              },
              {
                title: 'Employee Requests',
                path: paths.dashboard.hr.employeeRequests.root,
                children: [
                  {
                    title: 'Pending Approvals',
                    path: paths.dashboard.hr.employeeRequests.pendingApprovals,
                  },
                  { title: 'Visa Requests', path: paths.dashboard.hr.employeeRequests.visa.root },
                  {
                    title: 'Service Requests',
                    path: paths.dashboard.hr.employeeRequests.service.root,
                  },
                  {
                    title: 'Reimbursements',
                    path: paths.dashboard.hr.employeeRequests.reimbursement.root,
                  },
                  {
                    title: 'Travel Tickets',
                    path: paths.dashboard.hr.employeeRequests.travel.root,
                  },
                  {
                    title: 'Letter Requests',
                    path: paths.dashboard.hr.employeeRequests.letter.root,
                  },
                ],
              },
              {
                title: 'ID Management',
                path: paths.dashboard.hr.idManagement.root,
                children: [
                  { title: 'All Employees', path: paths.dashboard.hr.idManagement.root },
                  { title: 'Expiring Documents', path: paths.dashboard.hr.idManagement.expiring },
                ],
              },
              {
                title: 'Leave Management',
                path: paths.dashboard.hr.leave.root,
                children: [
                  { title: 'Leave Summary', path: paths.dashboard.hr.leave.summary },
                  { title: 'All Requests', path: paths.dashboard.hr.leave.root },
                ],
              },
            ],
          },
          { title: 'Employee Offer Management', path: paths.dashboard.hr.offerManagement.root },
          { title: 'NDA Management', path: paths.dashboard.hr.ndaManagement.root },
          { title: 'Candidate Intake', path: paths.dashboard.hr.candidateIntake.root },
          {
            title: 'Partnership Agreements',
            path: paths.dashboard.hr.partnershipAgreement.root,
            info: <Label color="warning">Soon</Label>,
          },
          { title: 'Business Visa Requests', path: paths.dashboard.hr.businessVisa.root },
          { title: 'Audit Log', path: paths.dashboard.hr.auditLog },
        ],
      },
      {
        title: 'Product',
        path: paths.dashboard.product.root,
        icon: ICONS.product,
        children: [
          { title: 'List', path: paths.dashboard.product.root },
          { title: 'Details', path: paths.dashboard.product.demo.details },
          { title: 'Create', path: paths.dashboard.product.new },
          { title: 'Edit', path: paths.dashboard.product.demo.edit },
        ],
      },
      {
        title: 'VAT',
        path: paths.dashboard.vat.root,
        icon: ICONS.vat,
        children: [
          { title: 'Summary', path: paths.dashboard.vat.root },
          { title: 'AR', path: paths.dashboard.vat.ar },
          { title: 'AP', path: paths.dashboard.vat.ap },
        ],
      },
      {
        title: 'Invoice',
        path: paths.dashboard.invoice.root,
        icon: ICONS.invoice,
        children: [
          { title: 'List', path: paths.dashboard.invoice.root },
          { title: 'Details', path: paths.dashboard.invoice.demo.details },
          { title: 'Create', path: paths.dashboard.invoice.new },
          { title: 'Edit', path: paths.dashboard.invoice.demo.edit },
        ],
      },
      {
        title: 'Vendor',
        path: paths.dashboard.vendor.root,
        icon: ICONS.vendor,
        children: [
          { title: 'List', path: paths.dashboard.vendor.root },
          { title: 'Details', path: paths.dashboard.vendor.demo.details },
          { title: 'Create', path: paths.dashboard.vendor.new },
          { title: 'Edit', path: paths.dashboard.vendor.demo.edit },
        ],
      },
      {
        title: 'Expense',
        path: paths.dashboard.expense.root,
        icon: ICONS.expense,
        children: [
          { title: 'List', path: paths.dashboard.expense.root },
          { title: 'Details', path: paths.dashboard.expense.demo.details },
          { title: 'Create', path: paths.dashboard.expense.new },
          { title: 'Edit', path: paths.dashboard.expense.demo.edit },
          { title: 'Wallet Management', path: paths.dashboard.expense.wallet.root },
        ],
      },
      {
        title: 'Commission',
        path: paths.dashboard.commission.root,
        icon: ICONS.commission,
        children: [
          { title: 'All Commissions', path: paths.dashboard.commission.root },
          { title: 'Create Commission', path: paths.dashboard.commission.new },
          { title: 'BDM Management', path: paths.dashboard.commission.bdm },
        ],
      },
      {
        title: 'Policies',
        path: paths.dashboard.policies.root,
        icon: ICONS.blog,
        children: [{ title: 'All Policies', path: paths.dashboard.policies.root }],
      },
      {
        title: 'Job',
        path: paths.dashboard.job.root,
        icon: ICONS.job,
        children: [
          { title: 'List', path: paths.dashboard.job.root },
          { title: 'Details', path: paths.dashboard.job.demo.details },
          { title: 'Create', path: paths.dashboard.job.new },
          { title: 'Edit', path: paths.dashboard.job.demo.edit },
        ],
      },
      {
        title: 'Integrations',
        path: paths.dashboard.integration.root,
        icon: <IntegrationInstructionsIcon style={{ width: 24, height: 24 }} />,
        children: [
          { title: 'All Integrations', path: paths.dashboard.integration.root },
          { title: 'Add New', path: paths.dashboard.integration.new },
          { title: 'Webhook Logs', path: paths.dashboard.webhookLogs.root },
          { title: 'Resend Logs', path: paths.dashboard.webhookLogs.resend },
          { title: 'Vercel Logs', path: paths.dashboard.webhookLogs.vercel },
          { title: 'Encore Logs', path: paths.dashboard.webhookLogs.encore },
        ],
      },
      // File manager commented out - using OneDrive file page instead
      // { title: 'File manager', path: paths.dashboard.fileManager, icon: ICONS.folder },
      {
        title: 'Mail',
        path: paths.dashboard.mail,
        icon: ICONS.mail,
        info: (
          <Label color="error" variant="inverted">
            +32
          </Label>
        ),
      },
      { title: 'Chat', path: paths.dashboard.chat, icon: ICONS.chat },
      { title: 'Calendar', path: paths.dashboard.calendar, icon: ICONS.calendar },
    ],
  },
  // ============================================================
  // MISC SECTION - COMMENTED OUT (Not required now)
  // Uncomment below to re-enable
  // ============================================================
  // /**
  //  * Item state
  //  */
  // {
  //   subheader: 'Misc',
  //   items: [
  //     {
  //       title: 'Permission',
  //       path: paths.dashboard.permission,
  //       icon: ICONS.lock,
  //       allowedRoles: ['admin', 'manager'],
  //       caption: 'Only admin can see this item.',
  //     },
  //     {
  //       title: 'Level',
  //       path: '#/dashboard/menu-level',
  //       icon: ICONS.menuItem,
  //       children: [
  //         {
  //           title: 'Level 1a',
  //           path: '#/dashboard/menu-level/1a',
  //           children: [
  //             { title: 'Level 2a', path: '#/dashboard/menu-level/1a/2a' },
  //             {
  //               title: 'Level 2b',
  //               path: '#/dashboard/menu-level/1a/2b',
  //               children: [
  //                 { title: 'Level 3a', path: '#/dashboard/menu-level/1a/2b/3a' },
  //                 { title: 'Level 3b', path: '#/dashboard/menu-level/1a/2b/3b' },
  //               ],
  //             },
  //           ],
  //         },
  //         { title: 'Level 1b', path: '#/dashboard/menu-level/1b' },
  //       ],
  //     },
  //     { title: 'Disabled', path: '#disabled', icon: ICONS.disabled, disabled: true },
  //     {
  //       title: 'Label',
  //       path: '#label',
  //       icon: ICONS.label,
  //       info: (
  //         <Label
  //           color="info"
  //           variant="inverted"
  //           startIcon={<Iconify icon="solar:bell-bing-bold-duotone" />}
  //         >
  //           NEW
  //         </Label>
  //       ),
  //     },
  //     {
  //       title: 'Caption',
  //       path: '#caption',
  //       icon: ICONS.menuItem,
  //       caption:
  //         'Quisque malesuada placerat nisl. In hac habitasse platea dictumst. Cras id dui. Pellentesque commodo eros a enim. Morbi mollis tellus ac sapien.',
  //     },
  //     {
  //       title: 'Params',
  //       path: '/dashboard/params?id=e99f09a7-dd88-49d5-b1c8-1daf80c2d7b1',
  //       icon: ICONS.params,
  //     },
  //     { title: 'Subpaths', path: '/dashboard/subpaths', icon: ICONS.subpaths, deepMatch: true },
  //     {
  //       title: 'External link',
  //       path: 'https://www.google.com/',
  //       icon: ICONS.external,
  //       info: <Iconify width={18} icon="eva:external-link-fill" />,
  //     },
  //     { title: 'Blank', path: paths.dashboard.blank, icon: ICONS.blank },
  //   ],
  // },
];
