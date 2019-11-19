var JiraClient = require('evva-jira-connector');
// const config = require('./config.js');
const config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json'), 'utf8');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
JiraClient.oauth_util.swapRequestTokenWithAccessToken({
  host: config.jirahost,
  oauth: {
    token: config.token,
    token_secret: config.token_secret,
    oauth_verifier: config.oauth_verifier,
    consumer_key: config.consumer_key,
    private_key: config.consumerPrivateKey
  }
}, function(error, oauth) {
  console.log(error);
  console.log('access_token:', oauth);
});
// jscs:enable
