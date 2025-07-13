export function formBuilder<T extends Record<string, any>>(data: T) {
    let initialData = { ...data };
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
    };
}

export default formBuilder;
