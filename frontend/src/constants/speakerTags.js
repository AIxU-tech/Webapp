/**
 * Speaker background tags
 *
 * These tags describe the primary background or perspective a guest speaker brings.
 * They are optional, can be multi-select, and are used only for filtering/searching
 * on the speakers page (not displayed on individual speaker cards).
 *
 * NOTE: Keep in sync with backend SPEAKER_TAG_CHOICES in:
 *   backend/routes_v2/speakers/routes.py
 */

export const SPEAKER_TAGS = [
  {
    id: 'academic_research',
    label: 'Academic research (professor / PhD)',
  },
  {
    id: 'industry_ml_engineer',
    label: 'Industry ML / data science',
  },
  {
    id: 'startup_founder',
    label: 'Startup founder / entrepreneur',
  },
  {
    id: 'product_manager',
    label: 'Product / PM',
  },
  {
    id: 'policy_ethics',
    label: 'AI policy & ethics',
  },
  {
    id: 'vc_investor',
    label: 'VC / investor',
  },
  {
    id: 'student',
    label: 'Student speaker',
  },
  {
    id: 'alumni',
    label: 'Alumni speaker',
  },
];

