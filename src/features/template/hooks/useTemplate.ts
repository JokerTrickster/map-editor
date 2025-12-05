import { useState, useEffect } from 'react';
import type { Template } from '@/entities/schema/types';
import { loadTemplate, loadTemplateList, type TemplateId, type TemplateMetadata } from '../lib/templateLoader';

/**
 * Hook to load a specific template
 */
export function useTemplate(templateId: TemplateId | null) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) {
      setTemplate(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchTemplate(id: TemplateId) {
      setLoading(true);
      setError(null);

      try {
        const data = await loadTemplate(id);

        if (!cancelled) {
          setTemplate(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load template');
          setTemplate(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTemplate(templateId);

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  return { template, loading, error };
}

/**
 * Hook to load all available templates
 */
export function useTemplateList() {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTemplates() {
      setLoading(true);
      setError(null);

      try {
        const data = await loadTemplateList();

        if (!cancelled) {
          setTemplates(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load templates');
          setTemplates([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  return { templates, loading, error };
}
