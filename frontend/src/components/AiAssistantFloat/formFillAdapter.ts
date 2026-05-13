export interface FillResult {
  key: string;
  value: any;
  success: boolean;
  error?: string;
}

function findInput(key: string): HTMLElement | null {
  const selectors = [
    `[data-field="${key}"]`,
    `input[name="${key}"]`,
    `textarea[name="${key}"]`,
    `select[name="${key}"]`,
    `[data-testid="${key}"]`,
    `#${key}`,
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (valueSetter) {
    valueSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillSingleField(key: string, value: any): FillResult {
  const el = findInput(key);
  if (!el) {
    return { key, value, success: false, error: "未找到对应输入框" };
  }

  const tag = el.tagName.toLowerCase();

  if (tag === "select") {
    const select = el as HTMLSelectElement;
    const option = Array.from(select.options).find(
      o => o.value === String(value) || o.textContent?.trim() === String(value),
    );
    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { key, value, success: true };
    }
    return { key, value, success: false, error: "下拉选项未匹配" };
  }

  if (tag === "input") {
    const input = el as HTMLInputElement;
    const type = input.type?.toLowerCase();

    if (type === "checkbox") {
      input.checked = !!value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { key, value, success: true };
    }

    if (type === "radio") {
      const radio = document.querySelector<HTMLInputElement>(
        `input[type="radio"][name="${key}"][value="${value}"]`,
      );
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        return { key, value, success: true };
      }
      return { key, value, success: false, error: "单选值未匹配" };
    }

    setNativeValue(input, String(value));
    return { key, value, success: true };
  }

  if (tag === "textarea") {
    setNativeValue(el as HTMLTextAreaElement, String(value));
    return { key, value, success: true };
  }

  const innerInput = el.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea, select");
  if (innerInput) {
    return fillSingleField(key, value);
  }

  return { key, value, success: false, error: "不支持的元素类型" };
}

export function fillFormFields(fields: Record<string, any>): FillResult[] {
  const results: FillResult[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;

    if (key === "materials" && typeof value === "string") {
      const parts = value.split(",").map(s => s.trim()).filter(Boolean);
      let filled = false;
      for (const part of parts) {
        const [matName, amount] = part.split(":").map(s => s.trim());
        if (matName) {
          const r = fillSingleField("material_name", matName);
          if (r.success) filled = true;
        }
        if (amount) {
          const r = fillSingleField("material_amount", amount);
          if (r.success) filled = true;
        }
      }
      results.push({ key, value, success: filled });
      continue;
    }

    results.push(fillSingleField(key, value));
  }

  return results;
}
