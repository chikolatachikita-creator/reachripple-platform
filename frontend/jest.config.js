/**
 * Jest Configuration
 * 
 * This project uses react-scripts test (CRA) as the test runner.
 * This config file provides overrides that CRA picks up.
 */

module.exports = {
  // react-router-dom v7 has a broken "main" field (points to non-existent dist/main.js).
  // Jest 27 (bundled with CRA) does not support the "exports" field, so we
  // map directly to the CJS entry points.
  moduleNameMapper: {
    '^react-router-dom$': '<rootDir>/node_modules/react-router-dom/dist/index.js',
    '^react-router$': '<rootDir>/node_modules/react-router/dist/development/index.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
