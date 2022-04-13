* Authztoken is a unit real test, it's self-contained and self-checking.  
  * Needs to have lots more tests though.
* DynamoDb is a dev-harness (which I haven't figured out how to do in a 
NPM codebase yet) that needs to be setup and leaves test rows in the table. 
  * The plan is to turn this into a real unit test by using one of the 
  * fake/local DDB libraries.