const JiraClient = require('evva-jira-connector');
const fs = require('fs');
const sw_version = require('./package.json');
var readlineSync = require('readline-sync');
const async = require('async'), operations = [];;

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
const testbasisVersionId = 14919;//15410
var newVersionId = -1, oldVersionId = -1, versionIdToDelete = -1, global_projectId = -1;
var cycleIterator = 0;
var oldCycleIds, oldCycles;
var cycleIdsToDelete = [];

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
  deleteCycles();
} else if (delete_param === undefined){
  cloneAndUpdateFoldernames();
} else {
  console.log("'" + delete_param + "' is not a valid parameter.\nUse 'delete' for deleting all cycles from a version.\nKeep undefined for cloning all cycles from 'Testbasis GST' to a specific version.");
  process.exit(1);
}

//main clone function
function cloneAndUpdateFoldernames() {
  async.waterfall([
    async function getVersions(){
      var versions = await getVersionIds(xs3ProjectId);
      var baseVersion = versions.baseVersion;
      return [baseVersion, xs3ProjectId];
    },
    async function getCyclesOfVersion([versionId, projectId]){
      var baseCycles = await _getCyclesOfVersion(versionId);
      var baseCycleIds = Object.keys(baseCycles)
      return [baseCycles, newVersionId, projectId, baseCycleIds];
    },
    async function cloneCycle([baseCycles, versionId, projectId, baseCycleIds]){
      var jobDetails = [];
      for (var j in baseCycles){
        var jobProgressToken = await cloning(j, baseCycles, versionId, projectId, baseCycleIds);
        var temp = await getJobDetails(jobProgressToken)
        jobDetails.push(temp.entityId);
        var cycleInformation = await getCycleInformation(jobDetails[cycleIterator]);
        cycleIterator++;
      }

      var folderI = 0;
      for (var j in baseCycles){
        var folders = await getFolders(jobDetails[folderI], projectId, versionId);
        await iterateFolders(folders, jobDetails[folderI], projectId, versionId);
        folderI++;
      }
    }
    ], function(err, result) {
      if (err) {
        console.log(err);
        process.exit(1);
      } else {}
    });
}

//main delete function
function deleteCycles(){
  var answer = readlineSync.keyInYN('Do you really want to delete all Testcycles from Version: ' + version_param + '? This is irreversible!');
  if (answer) {
    console.log('\nI hope you know what you are doing..\n');
    async.waterfall([
      async function getVersions(){
        var versions = await getVersionIds(xs3ProjectId);
        var paramVersion = versions.newVersion;
        return paramVersion;
      },
      async function getCyclesOfVersion(versionId){
        var newCycles = await _getCyclesOfVersion(versionId);
        var newCycleIds = Object.keys(newCycles)
        return newCycleIds;
      },
      async function deleteCycles(cycleIds){
        for (var i = 0; i < cycleIds.length; i++) {
          await _deleteCycle(cycleIds[i]);
          if (i==cycleIds.length-1) {
            console.log("\n" + cycleIds.length + " cycles deleted.");
          }
        }
        if(cycleIds.length==0) console.log(cycleIds.length + " cycles deleted.");
      }
    ], function(err, result) {
        if (err) {
          console.log(err);
          process.exit(1);
        } else {}
      }
    );
  } else {
    console.log('Aborting..');
    process.exit(1);
  }
}

//base functions
//vvvvvvvvvvvvvv

function getVersionIds (projectId) {
  return new Promise((r, rj) => {
    jira.project.getVersions({
      projectIdOrKey: projectId
    }, function (error, getVersionsResult) {
        if (error) {
            console.log(error);
            process.exit(1);
          } else {
            for (var i = 0; i < getVersionsResult.length; i++) {
              if(getVersionsResult[i].name == version_param) newVersionId = getVersionsResult[i].id;
            }
            if (newVersionId == -1) {
              console.log("\nVersion with name: '" + version_param + "' was not found.\nExiting.\n");
              process.exit(1);
            }
            console.log("\nVersionID of '" + version_param + "' is: " + newVersionId + "\nContinuing..\n");
            let promiseResolution = {
              newVersion : newVersionId,
              baseVersion : testbasisVersionId,
            }
            r(promiseResolution);
          }
      });
  });
}

function _getCyclesOfVersion (versionId){
  return new Promise((r, rj) => {
    jira.cycle.getCyclesOfVersion({
      versionid: versionId
    }, function (error, getCyclesOfVersionResult) {
        if (error) {
          console.log(error);
          process.exit(1);
        } else {
          var cycleIterator = 0;
          delete getCyclesOfVersionResult['recordsCount'];
          delete getCyclesOfVersionResult['-1'];
          cycleIds = Object.keys(getCyclesOfVersionResult);
          cyclesObj = getCyclesOfVersionResult;
          for(var k in cyclesObj) {
            console.log("Found Cycle: " + cyclesObj[k].name + "  (ID: " + cycleIds[cycleIterator] + ")");
            cycleIterator++;
          }
          r(cyclesObj);
        }
      });
  });
}

function cloning (j, oldCycles, versionId, projectId, oldCycleIds){
  return new Promise((r, rj) => {
    jira.cycle.cloneCycle({
      clonedcycleid: oldCycleIds[cycleIterator],
      cyclename: oldCycles[j].name,
      versionid: versionId,
      projectid: projectId
    }, function (error, cloneCycleResult) {
      if (error) {
        console.log(error);
        process.exit(1);
      } else {
        console.log("Cloned Cycle: " + oldCycles[j].name);
        r(cloneCycleResult);
      }
    })
  });
}

function getJobDetails(res){
  return new Promise((r, rj) => {
    jira.cycle.getJobDetails({
      jobprogresstoken: res.jobProgressToken
    }, function (error, getJobDetailsResult) {
      if (error) {
        console.log(error);
        process.exit(1);
      } else {
        r(getJobDetailsResult);
      }
    })
  });
}

function getCycleInformation(id){
  return new Promise((r, rj) => {
    jira.cycle.getCycleInformation({
      cycleid: id
    }, function (error, getNewCycleInformationResult){
      if (error) {
        console.log(error);
        process.exit(1);
      } else {
        r(getNewCycleInformationResult);
      }
    })
  });
}

function getFolders(id, xs3ProjectId, newVersionId){ 
  return new Promise((r, rj) => {
    jira.cycle.getFolders({
      cycleid: id,
      projectid: xs3ProjectId,
      versionid: newVersionId
    }, function (error, getFoldersResult) {
      if (error) {
        console.log(error);
        process.exit(1);
      } else {
        r(getFoldersResult);
      }
    })
  });
}

function iterateFolders(folders, jobdetails, xs3ProjectId, newVersionId){ 
  return new Promise((r, rj) => {
    for (var it = 0; it < folders.length; it++) {
      updateFolders(it, folders, jobdetails, xs3ProjectId, newVersionId);
    }
    r();
  });
}

function updateFolders(i, folders, cycleId, xs3ProjectId, newVersionId){ 
  return new Promise((r, rj) => {
    jira.cycle.updateFolderDetails({
      folderid: folders[i].folderId,
      foldername: folders[i].folderName.substr(6),//strip "Clone "
      cycleid: cycleId,
      projectid: xs3ProjectId,
      versionid: newVersionId
    }, function (error, updateFolderDetailsResult) {
      if (error) {
        console.log(error);
        process.exit(1);
      } else {
        console.log(updateFolderDetailsResult.responseMessage + " From Cycle: " + updateFolderDetailsResult.cycleName);
        r();
      }
    })
  });
}

function _deleteCycle(cycleId) {
  return new Promise((r, rj) => {
    jira.cycle.deleteCycle({
      cycleid: cycleId
    }, function (error, deleteCycleResult){
      if (error) {
        console.log(error);
        process.exit(1);
      } else {
        console.log("Cycle: " + cycleId + " deleted.");
        r();
      }
    });
  });
}