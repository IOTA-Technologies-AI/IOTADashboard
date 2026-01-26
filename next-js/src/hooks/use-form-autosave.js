'use client';

import { useRef, useState, useEffect } from 'react';

/**
 * useFormAutosave - Auto-saves form data to sessionStorage to prevent data loss
 * when navigating away and coming back
 *
 * Usage:
 * const [formData, setFormData] = useState({});
 * useFormAutosave('expenseForm', formData);
 *
 * On component load:
 * const savedData = loadFormData('expenseForm');
 * if (savedData) setFormData(savedData);
 */

const AUTOSAVE_DELAY = 500; // Wait 500ms after last change before saving
const SESSION_STORAGE_PREFIX = 'formData_';
const MAX_BYTES = 1_000_000; // ~1MB safeguard per form key

const log = (...args) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
};

// Safely serialize objects (drop functions/undefined and avoid circular refs)
const safeSerialize = (value) => {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, val) => {
    if (typeof val === 'function' || typeof val === 'undefined') return undefined;
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  });
};

/**
 * Save form data to sessionStorage
 */
export const saveFormData = (formKey, data) => {
  if (typeof window === 'undefined') return;

  try {
    const key = `${SESSION_STORAGE_PREFIX}${formKey}`;
    const serialized = safeSerialize(data);
    if (!serialized) return;

    // Guard against very large payloads to avoid quota errors
    if (serialized.length > MAX_BYTES) {
      console.warn(
        `❌ Form data too large to save (${(serialized.length / 1024).toFixed(1)} KB): ${formKey}`
      );
      return;
    }

    sessionStorage.setItem(key, serialized);
    log(`✅ Form data saved: ${formKey}`, data);
  } catch (error) {
    console.warn(`❌ Failed to save form data for ${formKey}:`, error);
    // Storage quota exceeded or other storage error
  }
};

/**
 * Load form data from sessionStorage
 */
export const loadFormData = (formKey) => {
  if (typeof window === 'undefined') return null;

  try {
    const key = `${SESSION_STORAGE_PREFIX}${formKey}`;
    const data = sessionStorage.getItem(key);
    if (data) {
      log(`✅ Form data loaded: ${formKey}`);
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.warn(`❌ Failed to load form data for ${formKey}:`, error);
    return null;
  }
};

/**
 * Clear form data from sessionStorage
 */
export const clearFormData = (formKey) => {
  if (typeof window === 'undefined') return;

  try {
    const key = `${SESSION_STORAGE_PREFIX}${formKey}`;
    sessionStorage.removeItem(key);
    log(`✅ Form data cleared: ${formKey}`);
  } catch (error) {
    console.warn(`❌ Failed to clear form data for ${formKey}:`, error);
  }
};

/**
 * Hook: Auto-save form data with debouncing
 */
export const useFormAutosave = (formKey, data, enabled = true) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled || !data) {
      return undefined; // no-op cleanup
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      saveFormData(formKey, data);
    }, AUTOSAVE_DELAY);

    // Cleanup on unmount or when data changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formKey, data, enabled]);
};

/**
 * Hook: Load saved form data on component mount
 */
export const useLoadSavedFormData = (formKey) => {
  const [savedData, setSavedData] = useState(null);

  useEffect(() => {
    const data = loadFormData(formKey);
    setSavedData(data);
  }, [formKey]);

  return savedData;
};

/**
 * Quick autosave without hook (for simple use cases)
 */
export const setupFormAutosave = (formKey, formElement, interval = 1000) => {
  if (typeof window === 'undefined') return () => {};

  const intervalId = setInterval(() => {
    if (formElement) {
      const formData = new FormData(formElement);
      const data = Object.fromEntries(formData);
      saveFormData(formKey, data);
    }
  }, interval);

  return () => clearInterval(intervalId);
};
