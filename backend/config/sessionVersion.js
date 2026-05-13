const getSessionVersion = () => {
  return (
    process.env.SESSION_VERSION
    || process.env.RAILWAY_DEPLOYMENT_ID
    || process.env.RAILWAY_GIT_COMMIT_SHA
    || process.env.RENDER_GIT_COMMIT
    || 'local-dev'
  );
};

module.exports = { getSessionVersion };
