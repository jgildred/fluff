
// APP CONFIGURATION

// Edit these values before you start the app.
// This data is required for the app to run.

exports.Info = {
  initialize  : true,      // Set this to true to initialize DB with data from seed.js on startup.
  app_service : 'Heroku',   // 'Heroku', 'AppFog' or 'Custom' ('' is same as 'Custom')
  db_service  : 'MongoLab', // 'MongoLab' or 'MongoDB' ('' is same as 'MongoDB'). If app_service is 'Custom', then db_service is ignored and db_uri is used.
  db_uri      : 'mongodb://localhost:27017/idio' // Used when app_service is 'Custom'. Fluff will fall back to this uri if the Heroku or AppFog environment variable is missing.
}