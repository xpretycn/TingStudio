export interface FillResult {
  key: string;
  value: unknown;
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

function fillTDesignInput(container: HTMLElement, value: unknown): FillResult | null {
  const innerInput = container.querySelector<HTMLInputElement>("input.t-input__inner");
  if (innerInput) {
    setNativeValue(innerInput, String(value));
    return null;
  }
  return null;
}

function fillTDesignTextarea(container: HTMLElement, value: unknown): FillResult | null {
  const innerTextarea = container.querySelector<HTMLTextAreaElement>("textarea.t-textarea__inner");
  if (innerTextarea) {
    setNativeValue(innerTextarea, String(value));
    return null;
  }
  return null;
}

function fillTDesignInputNumber(container: HTMLElement, value: unknown): FillResult | null {
  const innerInput = container.querySelector<HTMLInputElement>("input.t-input-number__input");
  if (!innerInput) {
    const fallbackInput = container.querySelector<HTMLInputElement>("input.t-input__inner");
    if (fallbackInput) {
      setNativeValue(fallbackInput, String(value));
      return null;
    }
    return null;
  }
  setNativeValue(innerInput, String(value));
  return null;
}

interface PartialFillResult {
  value: unknown;
  success: boolean;
  error?: string;
}

function fillTDesignSelect(container: HTMLElement, value: unknown): PartialFillResult {
  const options = container.querySelectorAll<HTMLElement>(".t-select-option, .t-select__option");
  for (const opt of options) {
    const optText = opt.textContent?.trim();
    const optValue = opt.getAttribute("data-value") || opt.getAttribute("value");
    if (optText === String(value) || optValue === String(value)) {
      opt.click();
      return { value, success: true };
    }
  }

  const input = container.querySelector<HTMLInputElement>("input.t-input__inner");
  if (input) {
    input.focus();
    setNativeValue(input, String(value));
    return { value, success: true };
  }

  return { value, success: false, error: "下拉选项未匹配" };
}

function fillTDesignRadioGroup(container: HTMLElement, value: unknown): PartialFillResult {
  const radios = container.querySelectorAll<HTMLInputElement>("input[type=\"radio\"]");
  for (const radio of radios) {
    if (radio.value === String(value)) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      const label = radio.closest<HTMLElement>("label") || radio.parentElement;
      if (label) label.click();
      return { value, success: true };
    }
  }

  const labels = container.querySelectorAll<HTMLElement>(".t-radio, .t-radio-button");
  for (const label of labels) {
    const labelText = label.textContent?.trim();
    if (labelText === String(value)) {
      label.click();
      return { value, success: true };
    }
  }

  const valueMap: Record<string, string> = {
    "药材": "herb",
    "辅料": "supplement",
    "是": "true",
    "否": "false",
  };
  const mappedValue = valueMap[String(value)];
  if (mappedValue) {
    for (const radio of radios) {
      if (radio.value === mappedValue) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        const label = radio.closest<HTMLElement>("label") || radio.parentElement;
        if (label) label.click();
        return { value, success: true };
      }
    }
  }

  return { value, success: false, error: "单选值未匹配" };
}

function fillSingleField(key: string, value: unknown): FillResult {
  const el = findInput(key);
  if (!el) {
    return { key, value, success: false, error: "未找到对应输入框" };
  }

  const isTDesignSelect = el.classList.contains("t-select") || el.classList.contains("t-select__wrap")
    || el.querySelector(".t-select") !== null;
  const isTDesignRadioGroup = el.classList.contains("t-radio-group")
    || el.querySelector(".t-radio-group") !== null;
  const isTDesignInputNumber = el.classList.contains("t-input-number")
    || el.querySelector(".t-input-number") !== null;
  const isTDesignInput = el.classList.contains("t-input") || el.querySelector("input.t-input__inner") !== null;
  const isTDesignTextarea = el.classList.contains("t-textarea") || el.querySelector("textarea.t-textarea__inner") !== null;

  if (isTDesignSelect) {
    const selectEl = el.classList.contains("t-select") ? el : el.querySelector<HTMLElement>(".t-select") || el;
    const result = fillTDesignSelect(selectEl, value);
    return { key, ...result };
  }

  if (isTDesignRadioGroup) {
    const radioEl = el.classList.contains("t-radio-group") ? el : el.querySelector<HTMLElement>(".t-radio-group") || el;
    const result = fillTDesignRadioGroup(radioEl, value);
    return { key, ...result };
  }

  if (isTDesignInputNumber) {
    const numEl = el.classList.contains("t-input-number") ? el : el.querySelector<HTMLElement>(".t-input-number") || el;
    fillTDesignInputNumber(numEl, value);
    return { key, value, success: true };
  }

  if (isTDesignTextarea) {
    const taEl = el.classList.contains("t-textarea") ? el : el.querySelector<HTMLElement>(".t-textarea") || el;
    fillTDesignTextarea(taEl, value);
    return { key, value, success: true };
  }

  if (isTDesignInput) {
    const inputEl = el.classList.contains("t-input") ? el : el.querySelector<HTMLElement>(".t-input") || el;
    fillTDesignInput(inputEl, value);
    return { key, value, success: true };
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
    if (innerInput.tagName.toLowerCase() === "select") {
      return fillSingleField(key, value);
    }
    setNativeValue(innerInput as HTMLInputElement, String(value));
    return { key, value, success: true };
  }

  return { key, value, success: false, error: "不支持的元素类型" };
}

export function fillFormFields(fields: Record<string, unknown>): FillResult[] {
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
