import { getBearerToken } from "../src/Util/Header";
import {
  signAuthzToken,
  verifyAuthzToken
} from "../src/ZincApi/Authz/AuthzToken";

/*
 needs lots more tests
 * algorithm:none, etc. (not actually sure what the lib does here)
 * unexpected/unknown algorithms, negotiation broadens attack surface too much, 
   pick an alg and bounce anything else
 * iat, exp (should be taken care of by the lib verification)
 * db validation
   * user existence
   * user enabled
   * user onlyAfter
 * need to write custom token generation logic to create truly gnarly edge-case 
   tokens that attackers will generate.   
*/


describe("Authz token signing verificaiton", () => {
  const secrets = ["blah", "bleah"];
  const userId = "someIdpIdentifier";
  const email = "test@example.com";
  const payload = {
    userId, email, role: "test", userCreated: new Date()
  }
  test("it should verify against first secret", () => {
    const accessToken = signAuthzToken({
      payload, secret: secrets[0], expiresInSeconds: 5 });
    const result = verifyAuthzToken({accessToken: accessToken, secrets});

    expect(result.email).toEqual(email);
  });
  
  test("it should verify against second secret", () => {
    const accessToken = signAuthzToken({
      payload, secret: secrets[1], expiresInSeconds: 5 });
    const result = verifyAuthzToken({accessToken: accessToken, secrets});

    expect(result.userId).toEqual(userId);
    expect(result.email).toEqual(email);
  });
  
  test("it should fail against an unknown secret", () => {
    const accessToken = signAuthzToken({
      payload, secret: "something else", expiresInSeconds: 5 });
    
    expect(()=>{
      verifyAuthzToken({accessToken: accessToken, secrets});
    }).toThrowError("failed AuthzToken verification");
  });
  
});

describe("auth header extraction", () => {
  it("should match auth header regardless of case", () => {
    expect(getBearerToken( {"Authorization": "bearer x"})).toEqual("x");
    expect(getBearerToken( {"Authorization": "Bearer x"})).toEqual("x");
    expect(getBearerToken( {"authorization": "bearer x"})).toEqual("x");
    expect(getBearerToken( {"authorization": "Bearer x"})).toEqual("x");
  });

  // probably SHOULDN'T, this just makes current behaviour explicit
  it("does not match uppercase auth header", () => {
    expect(getBearerToken( {"AUTHORIZATION": "bearer x"})).toBeFalsy();
  });
  
  it("should not match substring header", () => {
    expect(getBearerToken( {"Authorizationx": "bearer x"})).toBeFalsy();
    expect(getBearerToken( {"xauthorization": "bearer x"})).toBeFalsy();
  });


  it("should trim token value", () => {
    expect(getBearerToken( {"authorization": "bearer x "})).toEqual("x");
  });

  it("should not change token case", () => {
    expect(getBearerToken( {"Authorization": "bearer x"})).toEqual("x");
    expect(getBearerToken( {"Authorization": "Bearer X"})).toEqual("X");
    expect(getBearerToken( {"Authorization": "Bearer xX"})).toEqual("xX");
  });

  it("should not match non-bearer header values", () => {
    expect( ()=>
      getBearerToken( {"Authorization": "x"})
    ).toThrowError("does not contain bearer token");
    expect( ()=>
      getBearerToken( {"Authorization": "bearerx"})
    ).toThrowError("does not contain bearer token");
    expect( ()=>
      getBearerToken( {"Authorization": " bearer x"})
    ).toThrowError("does not contain bearer token");
  });


});