I can't figure out how to get `create-react-app` to use shared code in a 
monorepo Typescript setup like Zinc.

My current bodgey work-around is to put the shared code underneath the CRA 
project and import it into the lambda code with a relative reference all the
way into [/client/src/Shared](/client/src/Shared) from the lambda 
[package.json](/aws-infra/lambda/package.json).

---

Things that don't work for me:
* CRA doesn't support NPM/Yarn workspaces or Lerna: https://github.com/facebook/create-react-app/issues?q=is%3Aissue+is%3Aopen+workspaces
* CRA doesn't support Typescript project references 
* CRA has an [explicit restriction](https://stackoverflow.
  com/a/44115058/924597) on importing code from outside its `/src` directory.
* CRA "mods" like `craco` or `rewire` don't yet support CRA v5, and I avoid
  tools like that anyway - the whole point of using CRA is to avoid build 
  hassles.
* I tried using NPM `file:` dependencies but it doesn't work well with 
  Typescript, see commit `cb7c9f1a` for the last version of the code using that
  approach.
* I don't want to use NPM linking because of needing to re-run the 
  compile/plublish cycle after each change.

Other approaches:
* put the shared code back in a top-level directory and just use a simple build
  `copy` command to copy the code out into each project that needs it. 
  Could make a `watch` style command that you run during dev to constantly 
  copy changes as you make them, relying on running process to pick up changes
  via hot module reloading for front end.
  * I'm in favor of this because at the end of the day, in a real repo, I'd be
  doing something like this based on an IDL to share interfaces across 
  different language implementations anyway. 


