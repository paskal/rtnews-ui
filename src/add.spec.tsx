import { mount } from "enzyme";

import * as API from "./api";
import AddArticleForm from "./add";
import { sleep } from "./utils";

jest.mock("./api");
jest.mock("./notifications");

describe("AddArticleForm", () => {
	test("reports the url it submitted in automatic mode", async () => {
		(API.addArticle as any).mockImplementation(async () => null);
		const onAdd = jest.fn();
		const link = "https://example.com/news/1";
		const container = document.createElement("div");
		document.body.appendChild(container);
		mount(<AddArticleForm onAdd={onAdd} />, { attachTo: container });

		const input = container.querySelector(
			".add-form__article-url"
		) as HTMLInputElement;
		input.value = link;
		input.dispatchEvent(new Event("input", { bubbles: true }));
		const form = container.querySelector("form") as HTMLFormElement;
		form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
		await sleep(100);

		expect(API.addArticle).toBeCalledWith(link);
		expect(onAdd).toBeCalledWith(link);
		(API.addArticle as any).mockClear();
	});
});
