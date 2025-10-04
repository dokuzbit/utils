import { type } from "arktype";

export function formBuilder<T extends Record<string, any> = Record<string, any>>(data?: T, schema?: any) {
    let arkSchema = schema ? type(schema) : null;

    // Eğer data verilmemişse veya boş obje ise ve schema varsa, default obje oluştur
    if ((!data || Object.keys(data).length === 0) && schema) data = createObject<T>(schema);
    data = data || {} as T;
    let initialData = { ...data };
    return {
        data,
        isLoading: false,
        allowEmptySubmit: false,
        err: {} as Partial<Record<keyof T, string[]>>,
        get isDirty() {
            return JSON.stringify(this.data) !== JSON.stringify(initialData);
        },
        get dirtyFields() {
            return Object.keys(this.data).filter(
                (key) => this.data[key] !== initialData[key]
            );
        },
        get canSubmit() {
            const hasValues = Object.values(this.data).some(
                (value) => value.toString().trim() !== ''
            );
            return (
                JSON.stringify(this.data) !== JSON.stringify(initialData) &&
                !this.isLoading &&
                (hasValues || this.allowEmptySubmit)
            );
        },
        save(newData?: T) {
            this.isLoading = false;
            initialData = newData ? { ...newData } : { ...this.data };
            Object.keys(this.err).forEach((key) => delete this.err[key]);
        },
        reset() {
            this.isLoading = false;
            Object.assign(this.data, initialData);
            Object.keys(this.err).forEach((key) => delete this.err[key]);
        },
        clear() {
            this.isLoading = false;
            Object.keys(this.data).forEach((key) => {
                (this.data as Record<string, any>)[key] =
                    this.data[key].constructor?.() ?? '';
            });
            Object.keys(this.err).forEach((key) => delete this.err[key]);
        },
        validate() {
            if (!arkSchema) return null
            const result = arkSchema(this.data);
            if (result instanceof type.errors) {
                result.flatMap(error => {
                    this.err[error.path[0] as keyof T] = [error.message];
                });
                console.log(this.err);
                return null
            } else {
                this.err = {};
                return this.data;
            }

        },
    };
}

export default formBuilder;

function createObject<T extends Record<string, any>>(schema: any) {
    let empty = {} as T;
    Object.keys(schema).forEach((key) => {
        empty[key as keyof T] = (schema[key].includes("string") ? "" :
            schema[key].includes("number") ? 0 :
                schema[key].includes("bigint") ? BigInt(0) :
                    schema[key].includes("boolean") ? false :
                        schema[key].includes("null") ? null :
                            schema[key].includes("undefined") ? undefined :
                                undefined) as T[keyof T];
    });
    return empty;
}