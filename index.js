const JiraClient = require('evva-jira-connector');
const fs = require('fs');
const sw_version = require('./package.json');
var readlineSync = require('readline-sync');

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const config_json = 'config.json'

if(process.argv[2] == '-version' || process.argv[2] == '--version'){
  console.log(sw_version.version);
  process.exit(0);
}
if(process.argv[2] == '-h' || process.argv[2] == '--help'){
  console.log("default is to clone all cycles and their folders from the version 'Testbasis GST' to a given version (parameter 1, non-optional).\nadditionally you can choose to delete all cycles of specific version if you provide a second parameter called 'delete'. Be very careful with this option.");
  process.exit(0);
}
if(fs.existsSync(process.cwd() + '/' + config_json) == false){
  console.log(config_json + ' not found!');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(process.cwd() + '/' + config_json), 'utf8');

const xs3ProjectId = 11600;
const testbasisVersionId = 14919;
var newVersionId = -1;
var versionIdToDelete = -1;

const version_param = process.argv[2];
const delete_param = process.argv[3];

if (version_param === undefined) {
  console.log('Parameter missing.\nPlease provide a Version to which the Testbasis Cycles shall be cloned to.\ne.g. 3.0.216');
  process.exit(1);
}

var jira = new JiraClient({
  host: config.jirahost,
  timeout: 20000,
  oauth: {
    consumer_key: config.consumer_key,
    private_key: config.consumerPrivateKey,
    token: config.access_token,
    token_secret: config.token_secret
  },
  strictSSL: false,
  pool: {
    maxSockets: 10000
  }
});

if (delete_param === 'delete'){
  var answer = readlineSync.keyInYN('Do you really want to delete all Testcycles from Version: ' + version_param + '? This is irreversible!');
  if (answer) {
    console.log('I hope you know what you are doing..\n');
    jira.project.getVersions({
      projectIdOrKey: xs3ProjectId
    }, function (error, getVersionsResult) {
        if (error) {
            console.log(error);
            process.exit(1);
          } else {
            var versions = [];
            for (var i = 0; i < getVersionsResult.length; i++) {
              if(getVersionsResult[i].name == version_param){
                versionIdToDelete = getVersionsResult[i].id;
              }
            }
            if (versionIdToDelete == -1) {
              console.log("\nVersion with name: '" + version_param + "' was not found.\nNo Cycles deleted.\n");
              process.exit(1);
            }
            //console.log(versions);
            console.log("VersionID of '" + version_param + "' is: " + versionIdToDelete + "\n\nStart deleting cycles..");
            jira.cycle.getCyclesOfVersion({
              versionid: versionIdToDelete
            }, function (error, getCyclesOfVersionResult) {
                if (error) {
                  console.log(error);
                  process.exit(1);
                } else {
                  var keys = [];
                  for(var k in getCyclesOfVersionResult) keys.push(k);
                  cycleIds = Object.keys(getCyclesOfVersionResult);
                  cycleIds.splice(cycleIds.length-2,2); //strip the last two elements of the Array since the last one is the element count of the result and the second last is the hardcoded 'Ad Hoc' Cycle.
                  console.log("Cycle Ids to be deleted:");
                  console.log(cycleIds + "\n");
                  //console.log(getCyclesOfVersionResult);

                  for (var i = 0; i < cycleIds.length; i++) {
                    (function(i){
                      jira.cycle.deleteCycle({
                        cycleid: cycleIds[i]
                      }, function (error, deleteCycleResult){
                        if (error) {
                          console.log(error);
                          process.exit(1);
                        } else {
                          console.log("Cycle: " + cycleIds[i] + " deleted.");
                          if (i==cycleIds.length-1) {
                            setTimeout(function(){ console.log(cycleIds.length + " cycles deleted.") },1000);
                          }
                        }
                      });
                    })(i);
                  }
                  if(cycleIds.length==0) console.log(cycleIds.length + " cycles deleted.");
                }
              }
            );
          }
        }
      );
  } else {
    console.log('Aborting..');
    process.exit(1);
  }
} else if (delete_param === undefined){
  jira.project.getVersions({
    projectIdOrKey: xs3ProjectId
  }, function (error, getVersionsResult) {
      if (error) {
          console.log(error);
          process.exit(1);
        } else {
          var versions = [];
          for (var i = 0; i < getVersionsResult.length; i++) {
            if(getVersionsResult[i].name == version_param) newVersionId = getVersionsResult[i].id;
            versions.push(getVersionsResult[i].name);
            //console.log(getVersionsResult[i].name);
          }
          if (newVersionId == -1) {
            console.log("\nVersion with name: '" + version_param + "' was not found.\nExiting.\n");
            process.exit(1);
          }
          //console.log(versions);
          console.log("\nVersionID of '" + version_param + "' is: " + newVersionId + "\nContinuing..\n");
          jira.cycle.getCyclesOfVersion({
            versionid: testbasisVersionId
          }, function (error, getCyclesOfVersionResult) {
              if (error) {
                console.log(error);
                process.exit(1);
              } else {
                var keys = [];
                for(var k in getCyclesOfVersionResult) keys.push(k);
                cycleIds = Object.keys(getCyclesOfVersionResult);
                cycleIds.splice(cycleIds.length-2,2); //strip the last two elements of the Array since the last one is the element count of the result and the second last is the hardcoded 'Ad Hoc' Cycle.
                console.log("Cycle Ids to be cloned from Testbasis (VersionID " + testbasisVersionId + ") to new Version '" + version_param + "' :");
                console.log(cycleIds + "\n");
                console.log("Start Cloning, this may take some time...\n");

                for (var i = 0; i < cycleIds.length; i++) {
                  jira.cycle.getCycleInformation({
                    cycleid: cycleIds[i]
                  }, function (error, getCycleInformationResult){
                    if (error) {
                      console.log(error);
                      process.exit(1);
                    } else {
                      console.log("Cloning Cycle: " + getCycleInformationResult.name);

          // ----- Clone every Cycle
                      jira.cycle.cloneCycle({
                        clonedcycleid: getCycleInformationResult.id,
                        cyclename: getCycleInformationResult.name,
                        versionid: newVersionId,
                        projectid: xs3ProjectId
                      }, function (error, cloneCycleResult) {
                        if (error) {
                          console.log(error);
                          process.exit(1);
                        } else {
                          //console.log("Clone Cycle Result:");
                          //console.log(cloneCycleResult);

          // ----- Get Details of Clone-Job to get the Cycle-ID
                          jira.cycle.getJobDetails({
                            jobprogresstoken: cloneCycleResult.jobProgressToken
                          }, function (error, getJobDetailsResult) {
                            if (error) {
                              console.log(error);
                              process.exit(1);
                            } else {
                              //console.log("\nGet Job Details Result:");
                              //console.log(getJobDetailsResult);
                              //console.log("Job Details Message: " + getJobDetailsResult.message);
                              setTimeout(function(){
                              jira.cycle.getCycleInformation({
                                cycleid: getJobDetailsResult.entityId
                              }, function (error, getNewCycleInformationResult){
                                if (error) {
                                  console.log(error);
                                  process.exit(1);
                                } else {
                                  console.log("Cloned Cycle: " + getCycleInformationResult.name + " (id: " + getCycleInformationResult.id + ") to new Cycle: " + getNewCycleInformationResult.name + " (id: " + getJobDetailsResult.entityId + ")");

          // ----- Get the Folders to later update the name of them
                                  //setTimeout(function(){//folders are not created fast enough
                                    jira.cycle.getFolders({
                                      cycleid: getJobDetailsResult.entityId,
                                      projectid: xs3ProjectId,
                                      versionid: newVersionId
                                    }, function (error, getFoldersResult) {
                                      if (error) {
                                        console.log(error);
                                        process.exit(1);
                                      } else {
                                        //console.log("\nGet Folders Result:");
                                        //console.log(getFoldersResult);
                                        //console.log("\n" + getFoldersResult.length + " Folders found for Cycle: " + getNewCycleInformationResult.name);

          // ----- Update Foldernames
                                        for (var j = 0; j < getFoldersResult.length; j++) {
                                          (function(j){
                                            jira.cycle.updateFolderDetails({
                                              folderid: getFoldersResult[j].folderId,
                                              foldername: getFoldersResult[j].folderName.substr(6),//strip "Clone "
                                              cycleid: getJobDetailsResult.entityId,
                                              projectid: xs3ProjectId,
                                              versionid: newVersionId
                                            }, function (error, updateFolderDetailsResult) {
                                              if (error) {
                                                console.log(error);
                                                process.exit(1);
                                              } else {
                                                //console.log("\nindex: " + j);
                                                //console.log("Get Folders Result:");
                                                //console.log(getFoldersResult);
                                                //console.log("\nChanging Folder Names at Cycle: " + getNewCycleInformationResult.name);
                                                //console.log("  Old Folder Name: " + getFoldersResult[j].folderName + "\n  New Folder Name: " + (updateFolderDetailsResult.responseMessage.substr(7)).substr(0,updateFolderDetailsResult.responseMessage.length-28));
                                              }
                                            });
                                          })(j);
                                        }
                                      }
                                    });
                                  //}, 13000);
                                }
                              });
                            }, 13000);//kann bei Testbasis (43 Cycles à 1-5 Folders atm) ewig dauern bis alle Folder erstellt sind
                            }
                          });
                        }
                      });
                    }
                  });
                }
              }
            }
          );
        }
  });
} else {
  console.log("'" + delete_param + "' is not a valid parameter.\nUse 'delete' for deleting all cycles from a version.\nKeep undefined for cloning all cycles from 'Testbasis GST' to a specific version.");
  process.exit(1);
}