// Centralized worker communication helpers.
//
// Business modules should route all progress/logging/result messages through
// these functions instead of calling the global `postMessage` directly. This
// decouples them from the Web Worker context, making them testable by
// injecting a fake reporter (the default simply maps to postMessage).

let post = postMessage;

// Allow tests / non-worker contexts to substitute a fake reporter.
function setPostMessage(handler) {
  post = handler;
}

function debug(msg) {
  post(['debug', msg]);
}

function info(msg) {
  post(['info', msg]);
}

function warning(msg) {
  post(['warning', msg]);
}

function error(msg) {
  post(['error', msg]);
}

function fail(msg) {
  post(['fail', msg]);
}

function progress(percent, msg) {
  post(['progress', percent, msg]);
}

function result(...args) {
  post(['result', ...args]);
}

module.exports = {
  setPostMessage,
  debug,
  info,
  warning,
  error,
  fail,
  progress,
  result,
};
