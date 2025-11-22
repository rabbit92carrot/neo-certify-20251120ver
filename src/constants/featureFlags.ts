/**
 * Feature Flags - Toggle features between MVP and Production modes
 */

// Feature Flag Keys
export const FEATURE_FLAGS = {
  AUTO_APPROVE_ORGANIZATIONS: 'AUTO_APPROVE_ORGANIZATIONS',
  SKIP_EMAIL_VERIFICATION: 'SKIP_EMAIL_VERIFICATION',
  ENABLE_MOCK_KAKAOTALK: 'ENABLE_MOCK_KAKAOTALK',
  ENABLE_SMS_FALLBACK: 'ENABLE_SMS_FALLBACK',
  ENABLE_ADVANCED_REPORTS: 'ENABLE_ADVANCED_REPORTS',
} as const

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]

// Environment-based feature flags
const getEnvFlag = (key: string, defaultValue: boolean = false): boolean => {
  const envValue = import.meta.env[`VITE_${key}`]
  if (envValue === undefined) return defaultValue
  return envValue === 'true' || envValue === '1'
}

// Feature Flag Configuration
export const featureFlags = {
  // Auto-approve organizations (for MVP testing)
  [FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS]: getEnvFlag('AUTO_APPROVE_ORGANIZATIONS', true),

  // Skip email verification (for MVP testing)
  [FEATURE_FLAGS.SKIP_EMAIL_VERIFICATION]: getEnvFlag('SKIP_EMAIL_VERIFICATION', true),

  // Enable Mock KakaoTalk (for development/testing)
  [FEATURE_FLAGS.ENABLE_MOCK_KAKAOTALK]: getEnvFlag('ENABLE_MOCK_KAKAOTALK', true),

  // Enable SMS fallback (Post-MVP feature)
  [FEATURE_FLAGS.ENABLE_SMS_FALLBACK]: getEnvFlag('ENABLE_SMS_FALLBACK', false),

  // Enable advanced reports (Post-MVP feature)
  [FEATURE_FLAGS.ENABLE_ADVANCED_REPORTS]: getEnvFlag('ENABLE_ADVANCED_REPORTS', false),
} as const

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => {
  return featureFlags[flag] ?? false
}

// Helper function to get all enabled features
export const getEnabledFeatures = (): FeatureFlagKey[] => {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key as FeatureFlagKey)
}

// MVP Mode detection
export const isMVPMode = (): boolean => {
  return (
    isFeatureEnabled(FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS) &&
    isFeatureEnabled(FEATURE_FLAGS.SKIP_EMAIL_VERIFICATION)
  )
}

// Production Mode detection
export const isProductionMode = (): boolean => {
  return !isMVPMode()
}

// Feature Flag Descriptions (for admin UI)
export const FEATURE_FLAG_DESCRIPTIONS: Record<FeatureFlagKey, string> = {
  [FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS]: '조직 자동 승인 (MVP용)',
  [FEATURE_FLAGS.SKIP_EMAIL_VERIFICATION]: '이메일 인증 건너뛰기 (MVP용)',
  [FEATURE_FLAGS.ENABLE_MOCK_KAKAOTALK]: 'Mock KakaoTalk 사용',
  [FEATURE_FLAGS.ENABLE_SMS_FALLBACK]: 'SMS 대체 발송 (Post-MVP)',
  [FEATURE_FLAGS.ENABLE_ADVANCED_REPORTS]: '고급 리포트 (Post-MVP)',
}
