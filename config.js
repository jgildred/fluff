
// APP CONFIGURATION

// Edit these values before you start the app.
// This data is required for the app to run.

exports.Info = {
  initialize  : false,       // Set this to true to initialize DB with data from seed.js on startup.
  app_service : 'Heroku',    // 'Heroku', 'AppFog' or 'Custom' (blank = 'Custom')
  db : {
    service   : 'MongoLab',   // 'MongoLab' or 'MongoDB' (blank = 'MongoDB')
    uri       : 'mongodb://localhost:27017/fluff' // Used when app_service is 'Custom' and db.uri is 'MongoDB'. Fluff will fall back to this uri if the Heroku or AppFog environment var is missing.
  }
}