var JiraClient = require('evva-jira-connector');
// const config = require('./config.js');
const config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json'), 'utf8');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
JiraClient.oauth_util.getAuthorizeURL({
  host: config.jirahost,
  oauth: {
    consumer_key: config.consumer_key,
    private_key: config.consumerPrivateKey
  }
}, function(error, oauth) {
  if(error){
    console.log(error);
    process.exit(1);
  }
  console.log(oauth);
});
// jscs:enable
