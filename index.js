const JiraClient = require('evva-jira-connector');
const fs = require('fs');
const sw_version = require('./package.json');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const config_json = 'config.json'

if(process.argv[2] == '-version' || process.argv[2] == '--version'){
  console.log(sw_version.version);
  process.exit(1);
}
if(fs.existsSync(process.cwd() + '/' + config_json) == false){
  console.log(config_json + ' not found!');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(process.cwd() + '/' + config_json), 'utf8');

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

jira.cycle.getCyclesOfVersion({
  versionid: 14919
}, function (error, getCyclesOfVersionResult) {
    if (error) {
      console.log(error);
      process.exit(1);
    } else {
      var keys = [];
      for(var k in getCyclesOfVersionResult) keys.push(k);
      cycleIds = Object.keys(getCyclesOfVersionResult);
      cycleIds.splice(cycleIds.length-2,2); //strip the last two elements of the Array since the last one ist the element count of the result and the second last is the hardcoded 'Ad Hoc' Cycle.
      console.log("\nCycle Ids:");
      console.log(cycleIds);
      console.log('Get Cycles of a Version - OK');

      jira.cycle.cloneCycle({
        clonedcycleid:  2660,
        cyclename: "TestCloneAPICall",
        versionid: 15410,
        projectid: 11600
      }, function (error, cloneCycleResult) {
        if (error) {
          console.log(error);
          process.exit(1);
        } else {
          console.log("\nClone Cycle Result:");
          console.log(cloneCycleResult);
          console.log('Clone Cycle - OK');

          var jobProgressToken = cloneCycleResult.jobProgressToken;

          jira.cycle.getJobDetails({
            jobprogresstoken: jobProgressToken
          }, function (error, getJobDetailsResult) {
            if (error) {
              console.log(error);
              process.exit(1);
            } else {
              console.log("\nGet Job Details Result:");
              console.log(getJobDetailsResult);
              console.log("Cycle ID: " + getJobDetailsResult.entityId);
              console.log("Get Job Details - OK");

              var createdCycleID = getJobDetailsResult.entityId;

              jira.cycle.getFolders({
                cycleid: createdCycleID,
                projectid: 11600,
                versionid: 15410
              }, function (error, getFoldersResult) {
                if (error) {
                  console.log(error);
                  process.exit(1);
                } else {
                  console.log("\nGet Folders Result:");
                  console.log(getFoldersResult);
                  console.log("Get Folders - OK");

                  console.log("First Folder ID: " + getFoldersResult[0].folderId);//need all

                  //var createdFolderID = getFoldersResult.folderId;
                  var initialFolderName = "initial folder name";
                  //TODO GET initial foldername at the beginning

                  jira.cycle.updateFolderDetails({
                    folderid: getFoldersResult[0].folderId,//just test, to modify after
                    foldername: initialFolderName,
                    cycleid: createdCycleID,
                    projectid: 11600,
                    versionid: 15410
                  }, function (error, updateFolderDetailsResult) {
                    if (error) {
                      console.log(error);
                      process.exit(1);
                    } else {
                      console.log("\nUpdate Folder Details Result:");
                      console.log(updateFolderDetailsResult);
                      console.log("Update Folder Details - OK");
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  }
);