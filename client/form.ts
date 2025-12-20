/**
 * @description formBuilder
 * @lastModified 09.10.2025
 * 
 * @param data - The data to initialize the form with.
 * @param schema - The schema to validate the form with.
 * @param options - The options to configure the form.
 * @returns an object with data and fallowing getters and methods
 * 
 * @option generate - Generate return object from schema. none | required | all (default: required)
 * @option genmerge - Merge generated object with data (default: false)
 * 
 * @getter isDirty - A boolean indicating if the form is dirty
 * @getter dirtyFields - An array of the dirty fields of the form.
 * @getter isValid - A boolean indicating if the form is valid.
 * @getter err - string[] of errors for each field. { field: [error1, error2, ...] }
 * @getter canSubmit - A boolean indicating if the form can submit.
 * 
 * @method save() - Save the form data to initial data, clear dirty fields and errors.
 * @method reset() - Reset the form data to initial values.
 * @method clear() - Clear the form data setting each field empty value.
 * @method validate() - Validate the form data against the schema and return data or false.
 * 
 * // TODO: Empty Object craation and validation error parsing now supports Arktype only. Will test other libraries later.
 */

type Options = {
  generate?: 'none' | 'required' | 'all';
  genmerge?: boolean;
}

const defaults = new Map<string, any>([
  ["string", ""],
  ["number", 0],
  ["bigint", BigInt(0)],
  ["boolean", false],
  ["null", null],
  ["undefined", undefined],
  ["object", {}],
  ["array", []],
  ["date", new Date()],
]);


export class FormBuilder<T extends Record<string, any>> {
  data: T;
  #err: Partial<Record<keyof T, string[]>> = {};
  #schema?: Function;
  #initialData: T;
  options?: Options;

  constructor(data?: T, schema?: Function, options?: Options) {
    // Eğer data boşsa şemadan oluşturmayı deneyelim
    this.options = options || {};
    this.#schema = schema || undefined;
    const generatedData = schema && typeof schema === "function" ? this.#createObject<T>(schema) : {}
    if (this.options?.genmerge) {
      this.data = { ...data, ...generatedData } as T;
    } else {
      this.data = data ? data : generatedData as T;
    }
    // this.data = data ? data : (schema && typeof schema === "function") ? this.#createObject<T>(schema) : {} as T;
    this.#initialData = { ...this.data } as T;
  }

  get isDirty() { return JSON.stringify(this.data) !== JSON.stringify(this.#initialData); }

  get dirtyFields() {
    return Object.keys(this.data).filter(
      (key) => this.data[key as keyof T] !== this.#initialData[key as keyof T]
    );
  }

  get isValid() { return this.validate() ? true : false; }

  get err() {
    this.validate();
    return this.#err;
  }

  get canSubmit() {
    const hasValues = Object.values(this.data).some(
      (value) => value.toString().trim() !== ''
    );
    return (this.isDirty && this.isValid && hasValues);
  }

  save(newData?: T) {
    if (newData) {
      this.data = { ...newData };
      this.#initialData = { ...newData };
    } else {
      this.#initialData = { ...this.data };
    }
    this.#err = {};
  }

  reset() {
    Object.assign(this.data, this.#initialData);
    this.#err = {};
  }

  clear() {
    Object.keys(this.data).forEach((key) => {
      this.data[key as keyof T] = defaults.get(typeof this.data[key as keyof T]) as T[keyof T];
    });
    this.#err = {};
  }

  validate(): T | false {
    if (!this.#schema) return this.data;
    if (!this.#schema && typeof this.#schema !== "function") {
      this.#err = { generalError: ['Schema is not a function.'] } as Partial<Record<keyof T, string[]>>;
      return false;
    }

    const result = this.#schema(this.data);
    // Check if result is ArkErrors instance
    if (result[' arkKind'] === 'errors') {
      // Clear previous errors before populating new ones
      this.#err = {};
      Object.keys(result.flatByPath).forEach((key) => {
        result.flatByPath[key].forEach((error: any) => {
          this.#err[key as keyof T] = [error.message];
        });
      });
      return false;
    }
    // Check for other libraries errors
    if ('errors' in result || 'error' in result) {
      // Clear previous errors before populating new ones
      this.#err = { generalError: ['General validation error'] } as Partial<Record<keyof T, string[]>>;
      return false;
    }
    // Validation succeeded - clear errors and return result
    this.#err = {};
    return result as T;
  }

  #createObject<T>(schema: any): T {
    const empty = {} as T;
    if (this.options?.generate === 'none') return empty;
    if (!schema || typeof schema !== "function" || !schema.json) return empty;
    const jsonSchema = schema.json as any;

    const getDomain = (prop: any): string => {
      // Eğer value direkt string ise (örn: "string")
      if (typeof prop.value === "string") {
        return prop.value;
      }

      // Eğer value bir obje ise ve domain property'si varsa
      if (prop.value && typeof prop.value === "object" && "domain" in prop.value) {
        return prop.value.domain;
      }

      // Eğer value bir array ise, ilk elemanı kontrol et
      if (Array.isArray(prop.value)) {
        const firstItem = prop.value[0];
        if (firstItem && typeof firstItem === "object" && "domain" in firstItem) {
          return firstItem.domain;
        }
        // Array içinde unit varsa (undefined, null gibi)
        if (firstItem && "unit" in firstItem) {
          return firstItem.unit;
        }
      }

      return "undefined";
    };

    const required = jsonSchema.required || [];
    const optional = this.options?.generate === 'all' ? jsonSchema.optional || [] : [];

    [...required, ...optional].forEach((prop: any) => {
      const domain = getDomain(prop);
      empty[prop.key as keyof T] = defaults.get(domain) as T[keyof T];
    });
    return empty as typeof schema.infer;
  }
}

export function formBuilder<T extends Record<string, any>>(data?: T, schema?: Function, options?: Options) {
  return new FormBuilder<T>(data, schema, options);
}