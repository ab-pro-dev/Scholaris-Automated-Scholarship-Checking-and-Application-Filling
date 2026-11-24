import { FieldType } from '@scholaris/database';

export interface ExtractedDOMField {
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  options: string[] | null;
  isRequired: boolean;
  pageNumber: number;
  selector: string;
  placeholder: string | null;
  defaultValue: string | null;
}

export interface ExtractedDOMFormSummary {
  formTitle: string | null;
  fields: ExtractedDOMField[];
  hasMultiPageWizard: boolean;
  estimatedPages: number;
}

/**
 * Pure DOM extraction function executed inside Playwright page.evaluate() context.
 * Inspects all interactive form controls, extracts semantic labels, normalizes types,
 * and identifies options and requirement markers.
 */
export function extractFormFieldsFromDOM(currentPageNumber: number = 1): ExtractedDOMFormSummary {
  // Helper to format clean text
  const clean = (str: string | null | undefined): string => {
    return (str || '').replace(/\s+/g, ' ').trim();
  };

  // Helper to find label text for an element
  const resolveLabel = (el: HTMLElement, id: string, name: string): string => {
    // 1. Explicit <label for="id">
    if (id) {
      const explicitLabel = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (explicitLabel) {
        const text = clean(explicitLabel.textContent);
        if (text) return text.replace(/\*$/, '').trim();
      }
    }

    // 2. Wrapping parent <label>
    const parentLabel = el.closest('label');
    if (parentLabel) {
      // Clone and remove the input itself to get clean label text
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      const childInputs = clone.querySelectorAll('input, select, textarea');
      childInputs.forEach((ci) => ci.remove());
      const text = clean(clone.textContent);
      if (text) return text.replace(/\*$/, '').trim();
    }

    // 3. aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && clean(ariaLabel)) {
      return clean(ariaLabel);
    }

    // 4. aria-labelledby
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl && clean(labelEl.textContent)) {
        return clean(labelEl.textContent);
      }
    }

    // 5. Enclosing fieldset legend (especially for radio groups)
    const fieldset = el.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend && clean(legend.textContent)) {
        const legendText = clean(legend.textContent);
        // If radio or checkbox, combine legend with individual label
        return legendText;
      }
    }

    // 6. Preceding sibling or nearby header/text element
    const prev = el.previousElementSibling;
    if (prev && (prev.tagName === 'SPAN' || prev.tagName === 'DIV' || prev.tagName === 'P' || prev.tagName.startsWith('H'))) {
      const prevText = clean(prev.textContent);
      if (prevText && prevText.length < 100) {
        return prevText.replace(/\*$/, '').trim();
      }
    }

    // 7. Placeholder attribute
    const placeholder = el.getAttribute('placeholder');
    if (placeholder && clean(placeholder)) {
      return clean(placeholder);
    }

    // 8. Fallback to name or id converted to human words
    const fallback = name || id || 'unlabeled_field';
    return fallback
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  };

  // Helper to determine whether an element is required
  const checkIsRequired = (el: HTMLElement, labelText: string): boolean => {
    if (el.hasAttribute('required')) return true;
    if (el.getAttribute('aria-required') === 'true') return true;

    // Check if label contains an asterisk
    if (labelText.includes('*')) return true;

    // Check if container or label has a required asterisk indicator
    const parent = el.parentElement;
    if (parent) {
      const asterisk = parent.querySelector('.required, [class*="required"], [class*="star"], [class*="mandatory"]');
      if (asterisk) return true;
    }

    return false;
  };

  // Find form controls: inputs, textareas, selects
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select'
    )
  );

  const fields: ExtractedDOMField[] = [];
  const processedRadioGroups = new Set<string>();

  for (const el of elements) {
    const tagName = el.tagName.toLowerCase();
    const typeAttr = (el.getAttribute('type') || '').toLowerCase();
    const id = el.id || '';
    const name = el.getAttribute('name') || '';

    // Classify FieldType
    let fieldType: FieldType = 'TEXT';
    let options: string[] | null = null;

    if (tagName === 'textarea') {
      fieldType = 'TEXTAREA';
    } else if (tagName === 'select') {
      fieldType = 'SELECT';
      const selectEl = el as HTMLSelectElement;
      options = Array.from(selectEl.options)
        .map((opt) => clean(opt.text || opt.value))
        .filter((opt) => opt.length > 0 && !opt.toLowerCase().includes('select'));
    } else if (typeAttr === 'radio') {
      fieldType = 'RADIO';
      // Group radios by name attribute
      if (name && processedRadioGroups.has(name)) {
        continue; // Already processed as a group
      }
      if (name) {
        processedRadioGroups.add(name);
        const siblings = Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`));
        options = siblings.map((r) => {
          const rLabel = resolveLabel(r, r.id, r.name);
          return rLabel || r.value || 'Option';
        });
      }
    } else if (typeAttr === 'checkbox') {
      fieldType = 'CHECKBOX';
    } else if (typeAttr === 'file') {
      fieldType = 'FILE';
    } else if (typeAttr === 'date' || typeAttr === 'datetime-local' || typeAttr === 'month') {
      fieldType = 'DATE';
    } else {
      fieldType = 'TEXT';
    }

    const rawLabel = resolveLabel(el, id, name);
    const isRequired = checkIsRequired(el, rawLabel);

    // Clean label of any residual asterisks
    const label = rawLabel.replace(/\*+/g, '').trim() || 'Untitled Field';

    // Unique field key
    const fieldKey =
      name ||
      id ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50) ||
      `field_${fields.length + 1}`;

    const placeholder = el.getAttribute('placeholder') || null;
    const defaultValue = (el as HTMLInputElement).value || null;

    // Selector definition
    let selector = '';
    if (id) {
      selector = `#${id}`;
    } else if (name) {
      selector = `[name="${name}"]`;
    } else {
      selector = `${tagName}[placeholder="${placeholder}"]`;
    }

    fields.push({
      fieldKey,
      label,
      fieldType,
      options,
      isRequired,
      pageNumber: currentPageNumber,
      selector,
      placeholder,
      defaultValue,
    });
  }

  // Detect multi-step indicators
  const pageText = document.body.innerText || '';
  const hasStepIndicator =
    /step\s+\d+\s+of\s+\d+/i.test(pageText) ||
    !!document.querySelector('[class*="step-indicator"], [class*="wizard"], [class*="progress-bar"], .steps, #steps');

  let estimatedPages = 1;
  const stepMatch = pageText.match(/step\s+\d+\s+of\s+(\d+)/i);
  if (stepMatch && stepMatch[1]) {
    estimatedPages = parseInt(stepMatch[1], 10) || 1;
  }

  // Detect form or portal header
  const titleEl = document.querySelector('h1, h2, .form-title, .portal-title');
  const formTitle = titleEl ? clean(titleEl.textContent) : null;

  return {
    formTitle,
    fields,
    hasMultiPageWizard: hasStepIndicator,
    estimatedPages,
  };
}
