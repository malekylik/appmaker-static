/**
* @param {number} month - month starting from 0
* @param {number} year
*/
function daysInMonth (month, year) {
  return new Date(year, month + 1, 0).getDate();
}

// For calculation use counting from 0, because operator '%' can return 0
/**
* @param {Date} startDate - date from which quarters is started to calculate
* @param {number} monthOffset
*/
function getNextDate(startDate, monthOffset) {
  var dayOffset = 1;
  var nextYear = startDate.getFullYear();

  var nextMonth = ((startDate.getMonth() + monthOffset) % 12) | 0;
  nextYear += ((startDate.getMonth() + monthOffset) / 12) | 0;
  // - 1 since getDate starts counting from 1, not from 0
  var nextDay = (startDate.getDate() - 1 + dayOffset) % daysInMonth(startDate.getMonth(), startDate.getFullYear());
  nextMonth += ((startDate.getDate() - 1 + dayOffset) / daysInMonth(startDate.getMonth(), startDate.getFullYear())) | 0;
  nextYear += (nextMonth / 12) | 0;
  nextMonth = nextMonth % 12;
  var nextDate = new Date((nextMonth + 1) + '/' + (nextDay + 1) + '/' + nextYear);

  return nextDate;
}

/**
* @param {Date} from - date from which quarters is started to calculate
* @param {number} number - the number of generated quarters
*/
function getNextQuarters(from, number) {
  var currentYear = from.getFullYear();
  var currentQuarter = (from.getMonth() / 3) | 0;
  var quarters = [];

  for (var i = 1; i <= number; i++) {
    var month = ((currentQuarter + i) * 3) + 1;

    quarters.push(
      new Date((month % 12) + '/01/' + (currentYear + (month / 12 | 0)))
    );
  }

  return quarters;
}

/**
* @param {Date} date - date to convert to the coresponding quarter
*/
function dateToQuarter(date) {
  return 'Q' + ((date.getMonth() / 3 | 0) + 1) + '-' + date.getFullYear();
}

/**
* @param {Date} date - date to convert to the coresponding quarter
*/
function dateToQuarterReverse(date) {
  return date.getFullYear() + '-' + 'Q' + ((date.getMonth() / 3 | 0) + 1);
}

exports.daysInMonth = daysInMonth;
exports.getNextDate = getNextDate;
exports.getNextQuarters = getNextQuarters;
exports.dateToQuarter = dateToQuarter;
exports.dateToQuarterReverse = dateToQuarterReverse;

