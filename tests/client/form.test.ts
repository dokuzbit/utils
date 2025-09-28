import { expect, test } from "bun:test";
import { formBuilder } from "../../client/form";
import { type } from "arktype";

const data = {
    name: "John Doe",
    email: "john.doe@example.com",
    age: 3,
};

const emptyData = {
    name: "",
    email: "",
    age: 0,
};

const schema = {
    name: "string",
    email: "string.email | undefined | ''?",
    age: "number.integer >= 18",
}



test("emptyForm", () => {
    const form = formBuilder(undefined, schema);
    expect(form.data).not.toBeNull();
    // expect(Object.keys(form.data)).toEqual(Object.keys(schema));
});

test("filledForm", () => {
    const form = formBuilder(data, schema);
    expect(form.data).not.toBeNull();
    expect(form.data).toEqual(data);
});