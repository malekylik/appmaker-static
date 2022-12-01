// import { getScriptExports } from './appmaker/generate-utils';
import { ApplicationMode, parseCommandLineArgs } from './command-line';
import { handleInteractiveApplicationMode, handleOfflineApplicationMode, handleRemoteApplicationMode } from './handlers';

async function run() {
  const options = parseCommandLineArgs();

  console.log(`Run with mode "${options.mode}"`);

  try {
    if (options.mode === ApplicationMode.remote) {
      await handleRemoteApplicationMode(options);
    } if (options.mode === ApplicationMode.offline) {
      await handleOfflineApplicationMode(options);
    } if (options.mode === ApplicationMode.interactive) {
      await handleInteractiveApplicationMode(options);
    } else {
      console.log(`Unsupported modes: "${options.mode}"`);
    }
  } catch (e) {
    console.log(e);
  }
}

run();

// var b = `
//   var res = executeSQL(sql, callback);

//   return res;
// }

// exports.getFilteredProcessWithRAForRiskAssessment.as   = getFilteredProcessWithRAForRiskAssessment;
// exports.getFilteredProcessWithRAForRiskAssessmentHistory = getFilteredProcessWithRAForRiskAssessmentHistory;
// exports.getRCOProcesses = getRCOProcesses;

// exports.getFiltersForLastRADate = getFiltersForLastRADate;
// exports.getFiltersForNextRADate = getFiltersForNextRADate;
// exports.getFiltersForHCProcessIdField = getFiltersForHCProcessIdField;
// exports.getFiltersForRALeadField = getFiltersForRALeadField;
// exports.getFiltersForGPOField = getFiltersForGPOField;
// exports.getFiltersForGPMField = getFiltersForGPMField;
// exports.getFiltersForRCOTowerField = getFiltersForRCOTowerField;
// exports.getFiltersForRCOSubTowerField = getFiltersForRCOSubTowerField;
// exports.getFiltersForProcessIDField = getFiltersForProcessIDField;`

// console.log(getScriptExports(b));
