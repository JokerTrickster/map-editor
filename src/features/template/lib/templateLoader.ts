import { TemplateSchema } from '@/entities/schema/templateSchema';
import type { Template } from '@/entities/schema/types';

/**
 * Available template IDs
 */
export const TEMPLATE_IDS = {
  PARKING: 'parking',
  CONSTRUCTION: 'construction',
  FACTORY: 'factory',
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];

/**
 * Template metadata for listing/selection
 */
export interface TemplateMetadata {
  id: TemplateId;
  name: string;
  description: string;
  thumbnail?: string;
  status: 'available' | 'coming-soon';
  category: string;
}

/**
 * Load template JSON file from public folder
 */
export async function loadTemplate(templateId: TemplateId): Promise<Template> {
  try {
    const response = await fetch(`/templates/${templateId}.json`);

    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate with Zod schema
    const validatedTemplate = TemplateSchema.parse(data);

    return validatedTemplate;
  } catch (error) {
    console.error(`Error loading template ${templateId}:`, error);
    throw new Error(`Failed to load template: ${templateId}`);
  }
}

/**
 * Load all available template metadata (without full content)
 */
export async function loadTemplateList(): Promise<TemplateMetadata[]> {
  const templateIds = Object.values(TEMPLATE_IDS);

  try {
    const templates = await Promise.all(
      templateIds.map(async (id): Promise<TemplateMetadata | null> => {
        try {
          const template = await loadTemplate(id);
          return {
            id: template.id as TemplateId,
            name: template.name,
            description: template.description,
            thumbnail: template.thumbnail,
            status: template.status,
            category: template.category,
          };
        } catch (error) {
          console.error(`Error loading template ${id}:`, error);
          return null;
        }
      })
    );

    // Filter out failed loads and return valid templates
    return templates.filter((t): t is TemplateMetadata => t !== null);
  } catch (error) {
    console.error('Error loading template list:', error);
    return [];
  }
}

/**
 * Get template display name by ID
 */
export function getTemplateName(templateId: TemplateId): string {
  const names: Record<TemplateId, string> = {
    [TEMPLATE_IDS.PARKING]: '주차장',
    [TEMPLATE_IDS.CONSTRUCTION]: '공사현장',
    [TEMPLATE_IDS.FACTORY]: '공장',
  };

  return names[templateId] || templateId;
}
