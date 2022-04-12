import { signAuthzToken, verifyAuthzToken } from "../src/Jwt/AuthzToken";

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

  test("it should verify against first secret", () => {
    const accessToken = signAuthzToken({
      userId, email, secret: secrets[0], expiresInSeconds: 5 });
    const result = verifyAuthzToken({accessToken: accessToken, secrets});

    expect(result.email).toEqual(email);
  });
  
  test("it should verify against second secret", () => {
    const accessToken = signAuthzToken({
      userId, email, secret: secrets[1], expiresInSeconds: 5 });
    const result = verifyAuthzToken({accessToken: accessToken, secrets});

    expect(result.userId).toEqual(userId);
    expect(result.email).toEqual(email);
  });
  
  test("it should fail against an unknown secret", () => {
    const accessToken = signAuthzToken({
      userId, email, secret: "something else", expiresInSeconds: 5 });
    
    expect(()=>{
      verifyAuthzToken({accessToken: accessToken, secrets});
    }).toThrowError("failed AuthzToken verification");
  });
  
});
