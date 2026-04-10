// Polyfill TextEncoder/TextDecoder for jsdom (required by react-router v7)
// Must use require() and appear before imports, but since babel hoists imports,
// we use a separate global assignment approach.
const { TextEncoder: TE, TextDecoder: TD } = require('util');
global.TextEncoder = global.TextEncoder || TE;
global.TextDecoder = global.TextDecoder || TD;

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');
