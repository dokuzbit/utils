import { expect, test } from "bun:test";
import { formBuilder } from "../../client/form";

const data = {
    name: "John Doe",
    email: "john.doe@example.com",
    age: 3,
};

const schema = {
    name: "string",
    email: "string.email | undefined | ''?",
    age: "number.integer >= 18",
}

const form = formBuilder(data, schema);
console.log(form.validate());

test("formBuilder", () => {
    expect(form.data).toEqual(data);
});