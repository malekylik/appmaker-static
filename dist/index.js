"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { getScriptExports } from './appmaker/generate-utils';
const command_line_1 = require("./command-line");
const handlers_1 = require("./handlers");
async function run() {
    const options = (0, command_line_1.parseCommandLineArgs)();
    console.log(`Run with mode "${options.mode}"`);
    try {
        if (options.mode === command_line_1.ApplicationMode.remote) {
            await (0, handlers_1.handleRemoteApplicationMode)(options);
        }
        if (options.mode === command_line_1.ApplicationMode.offline) {
            await (0, handlers_1.handleOfflineApplicationMode)(options);
        }
        if (options.mode === command_line_1.ApplicationMode.interactive) {
            await (0, handlers_1.handleInteractiveApplicationMode)(options);
        }
        else {
            console.log(`Unsupported modes: "${options.mode}"`);
        }
    }
    catch (e) {
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
