import { describe, it, expect } from 'vitest'
import { REGEX, validate } from './validation'

describe('Validation Constants', () => {
  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      expect(validate.email('test@example.com')).toBe(true)
      expect(validate.email('user.name+tag@example.co.kr')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validate.email('invalid')).toBe(false)
      expect(validate.email('test@')).toBe(false)
      expect(validate.email('@example.com')).toBe(false)
    })
  })

  describe('Phone Number Validation', () => {
    it('should validate Korean phone numbers', () => {
      expect(validate.phone('010-1234-5678')).toBe(true)
      expect(validate.phone('01012345678')).toBe(true)
      expect(validate.phone('011-123-4567')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(validate.phone('123-456-7890')).toBe(false)
      expect(validate.phone('010-12-3456')).toBe(false)
    })
  })

  describe('Virtual Code Validation', () => {
    it('should validate 12-character alphanumeric codes', () => {
      expect(validate.virtualCode('A1B2C3D4E5F6')).toBe(true)
      expect(validate.virtualCode('ABCDEF123456')).toBe(true)
    })

    it('should reject invalid virtual codes', () => {
      expect(validate.virtualCode('SHORT')).toBe(false)
      expect(validate.virtualCode('TOO-LONG-CODE')).toBe(false)
      expect(validate.virtualCode('lowercase123')).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should validate passwords with letters and numbers', () => {
      expect(validate.password('password123')).toBe(true)
      expect(validate.password('MyP@ssw0rd')).toBe(true)
    })

    it('should reject weak passwords', () => {
      expect(validate.password('short')).toBe(false)
      expect(validate.password('12345678')).toBe(false) // No letters
      expect(validate.password('password')).toBe(false) // No numbers
    })
  })

  describe('Business Number Validation', () => {
    it('should validate Korean business registration numbers', () => {
      expect(validate.businessNumber('123-45-67890')).toBe(true)
      expect(validate.businessNumber('1234567890')).toBe(true)
    })

    it('should reject invalid business numbers', () => {
      expect(validate.businessNumber('123-456-7890')).toBe(false)
      expect(validate.businessNumber('12-34-56789')).toBe(false)
    })
  })

  describe('Lot Number Validation', () => {
    it('should validate lot numbers in ND-YYYYMMDD-NNN format', () => {
      expect(validate.lotNumber('ND-20250122-001')).toBe(true)
      expect(validate.lotNumber('AB-20230515-999')).toBe(true)
    })

    it('should reject invalid lot numbers', () => {
      expect(validate.lotNumber('ND-2025-001')).toBe(false)
      expect(validate.lotNumber('ND-20250122-1')).toBe(false)
      expect(validate.lotNumber('ND20250122001')).toBe(false)
    })
  })

  describe('Regex Patterns', () => {
    it('should have consistent regex patterns', () => {
      expect(REGEX.EMAIL).toBeInstanceOf(RegExp)
      expect(REGEX.PASSWORD).toBeInstanceOf(RegExp)
      expect(REGEX.PHONE_KR).toBeInstanceOf(RegExp)
      expect(REGEX.VIRTUAL_CODE).toBeInstanceOf(RegExp)
      expect(REGEX.LOT_NUMBER).toBeInstanceOf(RegExp)
    })
  })
})
