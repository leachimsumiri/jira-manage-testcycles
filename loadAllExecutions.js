// const JiraClient = require("jira-connector");
const JiraClient = require("evva-jira-connector");
// const config = require('./config.js');
const config = JSON.parse(fs.readFileSync(process.cwd() + '/config.json'), 'utf8');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var jira = new JiraClient({
  host: config.jirahost,
  oauth: {
    consumer_key: config.consumer_key,
    private_key: config.consumerPrivateKey,
    token: config.access_token,
    token_secret: config.token_secret
  },
  strictSSL: false
});

jira.zql.executeSearch({
  zqlQuery: 'project=11600',
  // zqlQuery: 'project=11600 and issuetype = test and status not in (Closed) and (labels not in (xs3xsystest-retest, xs3xsystest-plannedTests, xs3xsystest-testReviewAfterRelease, xs3xsystest-notImplementedInXS3.0) or labels is EMPTY)',
  maxRecords: 10000,
  expand: 'executionIds'
}, function (error, result) {
  if (error) {
    console.log(error);
  } else {
    console.log(result.executions.length);
    // console.log(result.executions[0].fields.summary);
  }
});