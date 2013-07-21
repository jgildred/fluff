
// APP CONFIGURATION

// Edit these values before you start the app.
// This data is required for the app to run.

exports.Info = {
  initialize  : false,       // set to true to initialize DB with data from seed.js on startup
  app_service : 'Heroku',    // 'Heroku', 'AppFog' or 'Custom' (blank = 'Custom')
  db : {
    service   : 'MongoLab',   // 'MongoLab' or 'MongoDB' (blank = 'MongoDB')
    uri       : 'mongodb://localhost:27017/fluff' // uri required when 'Custom' + 'MongoDB'
  }
}