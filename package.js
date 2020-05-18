Package.describe({
  name: 'quave:definitions',
  version: '1.0.0',
  summary: 'Utility package to create Model and Enum definitions',
  git: 'https://github.com/quavedev/definitions',
});

Package.onUse(function(api) {
  api.versionsFrom('1.10.2');
  api.use('ecmascript');
  api.use('quave:settings@1.0.0');

  api.mainModule('definitions.js');
});
