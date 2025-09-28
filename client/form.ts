import { type } from "arktype";

// TODO: Will define schema type later
export function formBuilder<T extends Record<string, any>>(data: T, _schema: any = null) {
    let initialData = { ...data };
    let schema = type(_schema);
    return {
        data: { ...data },
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
            if (!schema) return null
            const result = schema(this.data);
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
