import { GithubApi } from "../src/AuthnApi/Downstream/GithubApi";

describe("GithubApi", () => {
  test("user deets", () => {
    console.log("xxx");
    const api = new GithubApi();
    // fails because of https://stackoverflow.com/questions/72641681
    api.mapOidcAttributes("xxx");
  });

});