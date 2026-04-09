const core = require('@actions/core');
const { getOctokit, context } = require('@actions/github');

const githubToken = core.getInput('github-token') || '';
const branch = context.ref.replace('refs/heads/', '');
const users = (core.getInput('users') || '').split(',');
const teams = (core.getInput('teams') || '').split(',');
const contexts = (core.getInput('contexts') || '').split(',');
const protectionOn = core.getInput('protection') === 'on' ? true : false;

const run = async () => {
  try {
    const octokit = getOctokit(githubToken);
    const { owner, repo, ref } = context.repo;

    if (protectionOn) {
      await octokit.rest.repos.updateBranchProtection({
        owner,
        repo,
        branch,
        required_status_checks: {
          strict: true,
          contexts: [
            'Main / Basic validations (Unit, Lint)',
            'Main / End2End tests'
          ]
        }
      });

      core.info('Protection has been turned on.');

      if (users.length == 0) {
        core.info('No users have special privileges to bypass protections');
      }
    } else {
      try {
        const currProtection = await octokit.rest.repos.getBranchProtection({
          owner,
          repo,
          branch,
        });
        if (currProtection.status === 200) {
          await octokit.rest.repos.deleteBranchProtection({
            owner,
            repo,
            branch,
          });

          core.info('Protection has been turned off.');
        }
      } catch (err) {
        console.error(err.message);
      }
    }
  } catch (e) {
    console.error(e);
    core.setFailed(e.message);
  }
};

run();
